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

const router = express.Router();
const PAIRING_DIR = "./sessions";
const CONFIG_FILE = "./config.json";

// ========== UTILITIES ==========
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

// ========== CONFIG LOAD / SAVE ==========
let CONFIG = {};
if (fs.existsSync(CONFIG_FILE)) CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
async function saveConfig() { await fs.writeFile(CONFIG_FILE, JSON.stringify(CONFIG, null, 2)); }

// ========== BOTS MAP ==========
const bots = new Map(); // number => { sock, commands, config }

function getLid(number, sock) {
  try {
    const data = JSON.parse(fs.readFileSync(`${PAIRING_DIR}/${number}/creds.json`, "utf8"));
    return data?.me?.lid || sock.user?.lid || "";
  } catch {
    return sock.user?.lid || "";
  }
}

// ========== START PAIRING SESSION ==========
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

  const commands = await loadCommands();
  const config = CONFIG[number] || { prefix: "!" };
  bots.set(number, { sock, commands, config });

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
    const prefix = bot.config.prefix;
    const cmds = bot.commands;

    if (!text.startsWith(prefix)) return;

    const args = text.slice(prefix.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();

    const senderClean = jidClean(participant);
    const ownerClean = jidClean(sock.user.id);
    const isGroup = remoteJid.endsWith("@g.us");

    const allowed = msg.key.fromMe || senderClean === ownerClean || isGroup;
    if (!allowed) return;

    // Reload commands pour ce bot uniquement
    if (command === "reload") {
      bot.commands = await loadCommands();
      return sock.sendMessage(remoteJid, { text: "✅ Commandes rechargées pour ce bot uniquement" });
    }

    // Exécution commande
    if (cmds.has(command)) {
      try {
        await cmds.get(command).execute(sock, {
          raw: msg,
          from: remoteJid,
          sender: participant,
          isGroup,
          reply: (t) => sock.sendMessage(remoteJid, { text: t })
        }, args);
      } catch (err) {
        console.error("Erreur commande:", err);
        sock.sendMessage(remoteJid, { text: "❌ Erreur commande" });
      }
    }
  });

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

  if (!sock.authState.creds.registered) {
    await delay(1500);
    const code = await sock.requestPairingCode(number);
    return code.match(/.{1,4}/g).join("-");
  }

  return null;
}

// ========== ROUTES ==========

// Génération du code pairing
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

// Configuration bot (préfixe)
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

export default router;
