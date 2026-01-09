import express from "express";
import fs from "fs-extra";
import path from "path";
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
import pino from "pino";

const router = express.Router();
const PAIRING_DIR = "./sessions";
const sessionsActives = {};

const jidClean = (jid = "") => jid.split(":")[0];

function formatNumber(num) {
  const phone = pn("+" + num.replace(/\D/g, ""));
  if (!phone.isValid()) throw new Error("Numéro invalide");
  return phone.getNumber("e164").replace("+", "");
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
  });

  sock.ev.on("creds.update", saveCreds);
  sessionsActives[number] = { sock, qr: null };

  // Gestion connexion / QR
  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (connection === "close") {
      const status = lastDisconnect?.error?.output?.statusCode;
      if (status === DisconnectReason.loggedOut) {
        delete sessionsActives[number];
        await removeSession(SESSION_DIR);
      } else {
        console.log("⚠️ Reconnexion...");
        setTimeout(() => startQRSession(number), 3000);
      }
    }
    if (qr) {
      try {
        sessionsActives[number].qr = await QRCode.toDataURL(qr);
      } catch (err) {
        console.error("Erreur génération QR:", err);
      }
    }
  });

  // Timeout QR 60s
  const timeout = 60000;
  const start = Date.now();
  while (!sessionsActives[number].qr) {
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
