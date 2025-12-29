import express from "express";
import fs from "fs-extra";
import path from "path";
import pino from "pino";
import pn from "awesome-phonenumber";
import {
  makeWASocket,
  useMultiFileAuthState,
  Browsers,
  fetchLatestBaileysVersion,
  DisconnectReason,
  delay,
  makeCacheableSignalKeyStore
} from "@whiskeysockets/baileys";

import protections from "./protections_commands.js";

const router = express.Router();
const PAIRING_DIR = "./sessions";

/* ================== UTILS ================== */
function formatNumber(num) {
  const phone = pn("+" + num.replace(/\D/g, ""));
  if (!phone.isValid()) throw new Error("Numéro invalide");
  return phone.getNumber("e164").replace("+", "");
}

const jidClean = (jid = "") => jid.split(":")[0];

async function removeSession(dir) {
  if (await fs.pathExists(dir)) await fs.remove(dir);
}

/* ================== GET LID ================== */
function getLid(number, sock) {
  try {
    const data = JSON.parse(fs.readFileSync(`${PAIRING_DIR}/${number}/creds.json`, "utf8"));
    return data?.me?.lid || sock.user?.lid || "";
  } catch {
    return sock.user?.lid || "";
  }
}

/* ================== START PAIRING SESSION ================== */
async function startPairingSession(number) {
  const SESSION_DIR = path.join(PAIRING_DIR, number);
  await fs.ensureDir(SESSION_DIR);

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
    },
    logger: pino({ level: "silent" }),
    browser: Browsers.windows("Chrome"),
    printQRInTerminal: false,
    markOnlineOnConnect: false
  });

  sock.ev.on("creds.update", saveCreds);

  // Initialise protections et commandes pour cette session
  const sessionID = jidClean(sock.user.id);
  protections.initSession(sessionID);
  await protections.loadCommands(sessionID);

  /* ================== MESSAGE HANDLER ================== */
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg || !msg.message) return;

    const remoteJid = msg.key.remoteJid;
    const participant = msg.key.participant || remoteJid;
    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      "";

    // Vérifie les protections
    const violation = await protections.checkProtections(sessionID, text, msg, sock);
    if (violation) return;

    if (!text.startsWith("!")) return;

    const lidRaw = getLid(sessionID, sock);
    const lid = lidRaw ? jidClean(lidRaw) + "@lid" : null;

    const senderClean = jidClean(participant);
    const ownerClean = jidClean(sock.user.id);

    // Autorisation simple
    const allowed =
      msg.key.fromMe ||
      senderClean === ownerClean ||
      participant === lid ||
      remoteJid === lid;

    if (!allowed) return;

    const args = text.slice(1).trim().split(/\s+/);
    const command = args.shift().toLowerCase();

    // Reload commandes session
    if (command === "reload") {
      await protections.loadCommands(sessionID);
      return sock.sendMessage(remoteJid, { text: "✅ Commandes rechargées" });
    }

    // Exécution commande via protections
    await protections.runCommand(sessionID, command, sock, msg, args);
  });

  /* ================== CONNECTION ================== */
  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const status = lastDisconnect?.error?.output?.statusCode;
      if (status === DisconnectReason.loggedOut) {
        await removeSession(SESSION_DIR);
      } else {
        setTimeout(() => startPairingSession(number), 2000);
      }
    }
  });

  /* ================== PAIRING CODE ================== */
  if (!sock.authState.creds.registered) {
    await delay(1500);
    const code = await sock.requestPairingCode(number);
    return code.match(/.{1,4}/g).join("-");
  }

  return null;
}

/* ================== API ROUTE ================== */
router.get("/", async (req, res) => {
  let num = req.query.number;
  if (!num) return res.status(400).json({ error: "Numéro requis" });

  try {
    num = formatNumber(num);
    const code = await startPairingSession(num);

    if (code) return res.json({ code });
    return res.json({ status: "Déjà connecté" });
  } catch (err) {
    console.error("Pairing error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
