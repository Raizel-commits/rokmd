// =======================
// IMPORTS
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
const bots = new Map(); // number => { sock, commands, config, ownerNum, ownerLid }

function getLid(number, sock) {
  try {
    const data = JSON.parse(fs.readFileSync(`${PAIRING_DIR}/${number}/creds.json`, "utf8"));
    return data?.me?.lid || null;
  } catch {
    return null;
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

  sock.ev.on("creds.update", saveCreds);

  const commands = await loadCommands();
  const config = CONFIG[number] || { prefix: "!" };

  // Définition temporaire des propriétaires
  let ownerNum = null; // MP
  let ownerLid = null; // Groupe

  bots.set(number, { sock, commands, config, ownerNum, ownerLid });

  // =======================
  // CONNECTION HANDLER
  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      // Ici sock.user est défini
      ownerNum = jidClean(sock.user.id);
      ownerLid = getLid(number, sock);
      bots.get(number).ownerNum = ownerNum;
      bots.get(number).ownerLid = ownerLid;

      console.log(`Bot ${number} connecté`);
      console.log("Owner MP:", ownerNum);
      console.log("Owner LID:", ownerLid);
    }

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
    if (!bot.ownerNum) return; // propriétaire non défini
    const prefix = bot.config.prefix;
    const cmds = bot.commands;
    const isGroup = remoteJid.endsWith("@g.us");
    const senderClean = jidClean(participant);

    if (!text.startsWith(prefix)) return;

    // Autorisation : MP = ownerNum, Groupe = ownerLid
    let allowed = false;
    if (msg.key.fromMe) allowed = true;
    else if (!isGroup && senderClean === bot.ownerNum) allowed = true;
    else if (isGroup && bot.ownerLid && senderClean === bot.ownerLid) allowed = true;

    if (!allowed) return;

    const args = text.slice(prefix.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();

    // Reload commands
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

export default router;
