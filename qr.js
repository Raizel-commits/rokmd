import express from "express";
import fs from "fs-extra";
import path from "path";
import pino from "pino";
import QRCode from "qrcode";
import pn from "awesome-phonenumber";
import {
  makeWASocket,
  useMultiFileAuthState,
  Browsers,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeCacheableSignalKeyStore
} from "@whiskeysockets/baileys";

const router = express.Router();
const PAIRING_DIR = "./sessions";
const COMMANDS_DIR = "./commands";

const sessionsActives = {};
const jidClean = (jid = "") => jid.split(":")[0];

function formatNumber(num) {
  const phone = pn("+" + num.replace(/\D/g, ""));
  if (!phone.isValid()) throw new Error("Numéro invalide");
  return phone.getNumber("e164").replace("+", "");
}

async function loadCommands() {
  const commands = new Map();
  await fs.ensureDir(COMMANDS_DIR);
  const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith(".js"));
  for (const file of files) {
    const cmd = await import(`${COMMANDS_DIR}/${file}?update=${Date.now()}`);
    if (cmd.default?.name && typeof cmd.default.execute === "function") {
      commands.set(cmd.default.name.toLowerCase(), cmd.default);
    }
  }
  return commands;
}

async function removeSession(dir) {
  if (await fs.pathExists(dir)) await fs.remove(dir);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function startQRSession(number) {
  if (sessionsActives[number]) return sessionsActives[number];

  const SESSION_DIR = path.join(PAIRING_DIR, number);
  await fs.ensureDir(SESSION_DIR);

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })) },
    logger: pino({ level: "silent" }),
    browser: Browsers.windows("Chrome"),
    markOnlineOnConnect: false,
    printQRInTerminal: true // utile pour debug
  });

  sock.ev.on("creds.update", saveCreds);
  let commands = await loadCommands();
  sessionsActives[number] = { sock, commands };

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

    if (!text || !text.startsWith("!")) return;

    const senderClean = jidClean(participant);
    const ownerClean = jidClean(sock.user.id);
    const lidRaw = sock.user?.lid || "";
    const lid = lidRaw ? jidClean(lidRaw) + "@lid" : null;

    const allowed = msg.key.fromMe || senderClean === ownerClean || participant === lid || remoteJid === lid;
    if (!allowed) return;

    const args = text.slice(1).trim().split(/\s+/);
    const command = args.shift().toLowerCase();

    if (command === "reload") {
      commands = await loadCommands();
      sessionsActives[number].commands = commands;
      return sock.sendMessage(remoteJid, { text: "✅ Commandes rechargées" });
    }

    if (commands.has(command)) {
      try {
        await commands.get(command).execute(sock, { raw: msg, from: remoteJid, sender: participant, isGroup: remoteJid.endsWith("@g.us"), reply: (t) => sock.sendMessage(remoteJid, { text: t }) }, args);
      } catch (err) {
        console.error("Erreur commande:", err);
        sock.sendMessage(remoteJid, { text: "❌ Erreur commande" });
      }
    }
  });

  // Gestion de la connexion et reconnexion
  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (connection === "close") {
      const status = lastDisconnect?.error?.output?.statusCode;
      if (status === DisconnectReason.loggedOut) {
        delete sessionsActives[number];
        await removeSession(SESSION_DIR);
      } else {
        console.log("⚠️ Connection fermée, tentative de reconnexion...");
        setTimeout(() => startQRSession(number), 3000);
      }
    }

    if (qr) {
      try {
        const qrDataURL = await QRCode.toDataURL(qr);
        sessionsActives[number].qr = qrDataURL;
      } catch (err) {
        console.error("Erreur génération QR:", err);
      }
    }
  });

  // Timeout QR 60s si pas connecté
  const timeout = 60000;
  const start = Date.now();
  while (!sock.authState.creds.registered) {
    if (sessionsActives[number].qr) break;
    if (Date.now() - start > timeout) throw new Error("Timeout QR");
    await delay(1000);
  }

  return sessionsActives[number];
}

// Route API
router.get("/", async (req, res) => {
  let num = req.query.number;
  if (!num) return res.status(400).json({ error: "Numéro requis" });

  try {
    num = formatNumber(num);
    const session = await startQRSession(num);
    if (session.qr) return res.json({ qr: session.qr });
    return res.json({ status: "Déjà connecté" });
  } catch (err) {
    console.error("QR error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
