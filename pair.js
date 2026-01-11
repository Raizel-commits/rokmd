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
  makeCacheableSignalKeyStore,
  delay
} from "@whiskeysockets/baileys";

const router = express.Router();
const PAIRING_DIR = "./sessions";
const CONFIG_FILE = "./config.json";
const USERS_FILE = "./users.json";

/* ================== HELPERS ================== */
function formatNumber(num) {
  const phone = pn("+" + num.replace(/\D/g, ""));
  if (!phone.isValid()) throw new Error("Numéro invalide");
  return phone.getNumber("e164").replace("+", "");
}

const loadUsers = () => {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8")) || []; }
  catch { return []; }
};
const saveUsers = (d) => fs.writeFileSync(USERS_FILE, JSON.stringify(d, null, 2));

let CONFIG = {};
if (fs.existsSync(CONFIG_FILE)) CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));

const bots = new Map(); // number => { sock, config, features }

/* ================== LOAD COMMANDS ================== */
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

/* ================== START PAIRING ================== */
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
    console.log("💾 Session sauvegardée localement :", number);
  });

  const commands = await loadCommands();
  const config = CONFIG[number] || { prefix: "!" };
  const features = {
    autoreact: false,
    autotyping: false,
    autorecording: false,
    autoread: false,
    welcome: false,
    bye: false,
    antilink: false
  };

  bots.set(number, { sock, commands, config, features });

  // ================== MESSAGE HANDLER ==================
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message) return;

    const remoteJid = msg.key.remoteJid;
    const participant = msg.key.participant || remoteJid;
    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      "";

    if (!text) return;

    const bot = bots.get(number);
    if (!bot) return;
    const { commands, features } = bot;

    // AUTO FEATURES
    if (!msg.key.fromMe) {
      if (features.autoread) await sock.sendReadReceipt(remoteJid, participant, [msg.key.id]);
      if (features.autoreact) {
        const reactions = ["👍","❤️","😂","😮","😢","👏","🎉","🤔","🔥","😎","🙌","💯","✨","🥳","😡","😱","🤩","🙏","💔","🤷"];
        await sock.sendMessage(remoteJid, { react: { text: reactions[Math.floor(Math.random()*reactions.length)], key: msg.key } });
      }
    }

    // COMMANDS HANDLER
    const prefix = bot.config.prefix;
    if (!text.startsWith(prefix)) return;

    const args = text.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    if (commands.has(commandName)) {
      try {
        await commands.get(commandName).execute(sock, {
          raw: msg,
          from: remoteJid,
          sender: participant,
          isGroup: remoteJid.endsWith("@g.us"),
          reply: t => sock.sendMessage(remoteJid, { text: t }),
          bots
        }, args);
      } catch (err) {
        console.error("Command error:", err);
        await sock.sendMessage(remoteJid, { text: "❌ Error executing command" });
      }
    }
  });

  // ================== PAIRING ==================
  if (!sock.authState.creds.registered) {
    await delay(1000);
    const qr = await sock.generatePairingQrCode();
    return qr; // retourne le QR code pour affichage
  }

  return null;
}

/* ================== PAIR-API ================== */
router.get("/code", async (req, res) => {
  let num = req.query.number;
  if (!num) return res.status(400).json({ error: "Numéro requis" });

  try {
    num = formatNumber(num);

    const users = loadUsers();
    const user = users.find(u => u.username === req.session.user.username);
    if (!user) return res.status(401).json({ error: "Utilisateur introuvable" });
    if (!user.botActiveUntil || user.botActiveUntil < Date.now()) return res.status(403).json({ error: "Bot inactif" });
    if (user.botNumber && user.botNumber !== num) return res.status(403).json({ error: "Un bot est déjà lié à ce compte" });

    if (!user.botNumber) {
      user.botNumber = num;
      saveUsers(users);
    }

    const qr = await startPairingSession(num);
    if (qr) return res.json({ qr });
    return res.json({ status: "Bot déjà connecté" });

  } catch (err) {
    console.error("Pairing error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
