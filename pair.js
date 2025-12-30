// pair.js
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
  makeCacheableSignalKeyStore,
  delay
} from "@whiskeysockets/baileys";
import { db } from "./firebase.js";

const router = express.Router();
const PAIRING_DIR = "./sessions";
const CONFIG_FILE = "./config.json";

// =======================
// UTILITIES
function formatNumber(num) {
  const phone = pn("+" + num.replace(/\D/g, ""));
  if (!phone.isValid()) throw new Error("Numéro invalide");
  return phone.getNumber("e164").replace("+", "");
}

const jidClean = (jid = "") => jid.split(":")[0];

async function removeSession(dir) {
  if (await fs.pathExists(dir)) await fs.remove(dir);
}

async function loadCommands() {
  const commands = new Map();
  const folder = path.join("./commands");
  await fs.ensureDir(folder);
  const files = fs.readdirSync(folder).filter(f => f.endsWith(".js"));

  for (const file of files) {
    const modulePath = `./commands/${file}?update=${Date.now()}`;
    const cmd = await import(modulePath);
    if (cmd.default?.name && typeof cmd.default.execute === "function") {
      commands.set(cmd.default.name.toLowerCase(), cmd.default);
    }
  }
  return commands;
}

// =======================
// CONFIG LOAD / SAVE
let CONFIG = {};
if (fs.existsSync(CONFIG_FILE)) CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
async function saveConfig() { await fs.writeFile(CONFIG_FILE, JSON.stringify(CONFIG, null, 2)); }

// =======================
// BOTS MAP
const bots = new Map(); // number => { sock, commands, config }

function getLid(number, sock) {
  try {
    const data = JSON.parse(fs.readFileSync(`${PAIRING_DIR}/${number}/creds.json`, "utf8"));
    return data?.me?.lid || sock.user?.lid || "";
  } catch {
    return sock.user?.lid || "";
  }
}

// =======================
// START PAIRING SESSION
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

  sock.ev.on("creds.update", async () => {
    await saveCreds();

    try {
      const credsPath = `${SESSION_DIR}/creds.json`;
      if (!fs.existsSync(credsPath)) return;

      let creds;
      try {
        const raw = fs.readFileSync(credsPath, "utf8");
        creds = raw ? JSON.parse(raw) : {};
      } catch {
        creds = {};
      }

      if (Object.keys(creds).length > 0) {
        await db.collection("sessions").doc(number).set({
          number,
          creds,
          updatedAt: new Date()
        });
        console.log("☁️ Session sauvegardée Firebase :", number);
      }
    } catch (e) {
      console.error("Firebase save error:", e.message);
    }
  });

  const commands = await loadCommands();
  const config = CONFIG[number] || { prefix: "!" };
  bots.set(number, { sock, commands, config });

  // =======================
  // MESSAGE HANDLER
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
    if (!text) return;

    const bot = bots.get(number);

    // ----------------------
    // Récupération du LID du bot
    const botNumber = sock.user?.id ? sock.user.id.split(":")[0] : "";
    let userLid = "";
    try {
      const data = JSON.parse(fs.readFileSync(`sessions/${botNumber}/creds.json`, "utf8"));
      userLid = data?.me?.lid || sock.user?.lid || "";
    } catch (e) {
      userLid = sock.user?.lid || "";
    }
    const lid = userLid ? [userLid.split(":")[0] + "@lid"] : [];

    const cleanParticipant = participant ? participant.split("@") : [];
    const cleanRemoteJid = remoteJid ? remoteJid.split("@") : [];

    const prefix = bot.config.prefix;
    const approvedUsers = bot.config.sudoList || [];

    // ----------------------
    // Vérification des autorisations
    if (
      text.startsWith(prefix) &&
      (msg.key.fromMe || approvedUsers.includes(cleanParticipant[0] || cleanRemoteJid[0]) || lid.includes(participant || remoteJid))
    ) {
      const args = text.slice(prefix.length).trim().split(/\s+/);
      const commandName = args.shift().toLowerCase();

      if (commands.has(commandName)) {
        try {
          await commands.get(commandName).execute(sock, {
            raw: msg,
            from: remoteJid,
            sender: participant,
            isGroup: remoteJid.endsWith("@g.us"),
            reply: (t) => sock.sendMessage(remoteJid, { text: t })
          }, args);
        } catch (err) {
          console.error("Erreur commande:", err);
          sock.sendMessage(remoteJid, { text: "❌ Erreur commande" });
        }
      }
    }
  });

  // =======================
  // CONNECTION HANDLER
  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const status = lastDisconnect?.error?.output?.statusCode;
      if (status === DisconnectReason.loggedOut) {
        await removeSession(SESSION_DIR);
        bots.delete(number);
      } else {
        setTimeout(() => startPairingSession(number), 2000);
      }
    }
  });

  // =======================
  // PAIRING CODE
  if (!sock.authState.creds.registered) {
    await delay(1500);
    const code = await sock.requestPairingCode(number);
    return code.match(/.{1,4}/g).join("-");
  }

  return null;
}

// =======================
// ROUTES
router.get("/code", async (req, res) => {
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

router.post("/config", async (req, res) => {
  try {
    let { number, prefix } = req.body;
    if (!number) return res.status(400).json({ error: "Numéro requis" });

    number = formatNumber(number);
    if (!prefix) prefix = "!";

    CONFIG[number] = { prefix };
    if (bots.has(number)) bots.get(number).config = { prefix };

    await fs.writeFile(CONFIG_FILE, JSON.stringify(CONFIG, null, 2));
    res.json({ status: "✅ Configuration sauvegardée pour ce bot", prefix });
  } catch (err) {
    console.error("Config error:", err);
    res.status(500).json({ error: err.message });
  }
});

export async function restoreFromFirebase() {
  try {
    const snap = await db.collection("sessions").get();
    if (snap.empty) {
      console.log("ℹ️ Aucune session Firebase à restaurer");
      return;
    }

    for (const doc of snap.docs) {
      const { number, creds } = doc.data();
      if (!number || !creds) continue;

      const dir = `${PAIRING_DIR}/${number}`;
      await fs.ensureDir(dir);
      await fs.writeFile(`${dir}/creds.json`, JSON.stringify(creds, null, 2));

      console.log("♻️ Session restaurée :", number);
      await startPairingSession(number);
    }
  } catch (err) {
    console.error("Firebase restore error:", err.message);
  }
}

export default router;
