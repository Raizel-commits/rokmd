// =======================
// IMPORTS
import express from "express";
import fs from "fs-extra";
import path from "path";
import pino from "pino";
import pn from "awesome-phonenumber";
import pkg from "pg";
import {
  makeWASocket,
  useMultiFileAuthState,
  Browsers,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  delay
} from "@whiskeysockets/baileys";

const router = express.Router();
const PAIRING_DIR = "./sessions";
const CONFIG_FILE = "./config.json";

const { Pool } = pkg;
const router = express.Router();
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
// POSTGRESQL (SANS ENV)
const pool = new Pool({
  connectionString: "postgresql://rokxd_db_user:THyZaovujnRMAnSxpuwpdcrCl6RZmhES@dpg-d5j882ur433s738vqqd0-a.virginia-postgres.render.com/rokxd_db",
  ssl: { rejectUnauthorized: false }
});

// =======================
// CONFIG LOAD / SAVE
let CONFIG = {};
if (fs.existsSync(CONFIG_FILE)) {
  CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
}
async function saveConfig() {
  await fs.writeFile(CONFIG_FILE, JSON.stringify(CONFIG, null, 2));
}

// =======================
// BOT ACTIVE CHECK (DB = SOURCE DE VÉRITÉ)
async function isBotActive(number) {
  const { rows } = await pool.query(
    "SELECT botActiveUntil FROM users WHERE username=$1",
    [number]
  );
  if (!rows.length) return false;
  return Number(rows[0].botactiveuntil) > Date.now();
}


// =======================
// BOTS MAP
const bots = new Map(); // number => { sock, commands, config, features }

// =======================
// FORCE LOGOUT
async function forceLogout(number) {
  const bot = bots.get(number);
  if (bot?.sock) {
    try { await bot.sock.logout(); } catch {}
  }
  bots.delete(number);
  console.log("⛔ Bot expiré :", number);
}

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

  // =======================
  // MESSAGE HANDLER
  // =======================
// MESSAGE HANDLER
sock.ev.on("messages.upsert", async ({ messages }) => {
  const msg = messages[0];
  if (!msg || !msg.message) return;

  // 🔒 CHECK BOT ACTIF (LIVE)
const active = await isBotActive(number);
if (!active) {
  await forceLogout(number);
  return;
}

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
  const { commands, features } = bot; // ✅ récupère commands et features

  // ----------------------
  // AUTO FEATURES (si ce n'est pas un message du bot)
  if (!msg.key.fromMe) {
    // AutoRead
    if (features.autoread) await sock.sendReadReceipt(remoteJid, participant, [msg.key.id]);

    // AutoReact 20 réactions
    if (features.autoreact) {
      const reactions = ["👍","❤️","😂","😮","😢","👏","🎉","🤔","🔥","😎","🙌","💯","✨","🥳","😡","😱","🤩","🙏","💔","🤷"];
      const react = reactions[Math.floor(Math.random() * reactions.length)];
      await sock.sendMessage(remoteJid, { react: { text: react, key: msg.key } });
    }

    // AutoTyping
    if (features.autotyping && remoteJid.endsWith("@g.us")) await sock.sendPresenceUpdate("composing", remoteJid);

    // AutoRecording
    if (features.autorecording && remoteJid.endsWith("@g.us")) await sock.sendPresenceUpdate("recording", remoteJid);
// =======================
// ANTI-LINK
if (features.antilink && remoteJid.endsWith("@g.us")) {
  try {
    const metadata = await sock.groupMetadata(remoteJid);

    // Récupération correcte du JID du bot
    const botJid = sock.user.id;
    const botParticipant = metadata.participants.find(p => p.id === botJid);
    const botIsAdmin = botParticipant?.admin === "admin" || botParticipant?.admin === "superadmin";
    if (!botIsAdmin) return; // Si le bot n'est pas admin, ne rien faire

    // Vérification du LID pour éviter de kicker les superadmins
    const senderJid = participant;
    const senderParticipant = metadata.participants.find(p => p.id === senderJid);
    const senderLid = senderParticipant?.id || "";

    if (senderJid === botJid) return; // Ne pas kicker soi-même
    if (senderLid === botJid) return; // Ne pas kicker le bot par LID

    // Regex améliorée pour tous types de liens
    const linkRegex = /(https?:\/\/|www\.|wa\.me\/|chat\.whatsapp\.com\/|t\.me\/|bit\.ly\/|facebook\.com\/|instagram\.com\/)/i;

    if (text.match(linkRegex)) {
      // Supprime le participant
      await sock.groupParticipantsUpdate(remoteJid, [participant], "remove");

      // Message stylé avec mention
      await sock.sendMessage(remoteJid, {
        text: `❌ @${participant.split("@")[0]} 𝙻𝚒𝚗𝚔𝚜 𝚊𝚛𝚎 𝚗𝚘𝚝 𝚊𝚕𝚕𝚘𝚠𝚎𝚍!`,
        mentions: [participant]
      });
    }

  } catch (e) {
    console.error("Anti-link error:", e);
  }
} 
  }
  // ----------------------
  // COMMANDS HANDLER
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

  if (
    text.startsWith(prefix) &&
    (msg.key.fromMe || approvedUsers.includes(cleanParticipant[0] || cleanRemoteJid[0]) || lid.includes(participant || remoteJid))
  ) {
    const args = text.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
 // =======================
// BUILT-IN FEATURE COMMANDS
// =======================
if (text.startsWith(prefix)) {
  const args = text.slice(prefix.length).trim().split(/\s+/);
  const cmd = args[0]?.toLowerCase();
  const state = args[1]?.toLowerCase();

  const featureMap = {
    autorecording: "autorecording",
    autotyping: "autotyping",
    autoread: "autoread",
    autoreact: "autoreact", 
    welcome: "welcome",
    bye: "bye",
    antilink: "antilink"
  };

  if (featureMap[cmd]) {
    if (!["on", "off"].includes(state)) {
      await sock.sendMessage(remoteJid, {
        text: `❌ Usage: .${cmd} on/off`
      });
      return;
    }

    bot.features[featureMap[cmd]] = state === "on";

    await sock.sendMessage(remoteJid, {
      text: `✅ 𝙰𝚌𝚝𝚒𝚟𝚎: ${cmd.toUpperCase()} → ${state.toUpperCase()}`
    });
    return;
  }
}

    if (commands.has(commandName)) {
      try {
        await commands.get(commandName).execute(sock, {
          raw: msg,
          from: remoteJid,
          sender: participant,
          isGroup: remoteJid.endsWith("@g.us"),
          reply: (t) => sock.sendMessage(remoteJid, { text: t }),
    bots
        }, args);
      } catch (err) {
        console.error("❌ Command error:", err);
        await sock.sendMessage(remoteJid, { text: "❌ 𝙴𝚛𝚛𝚘𝚛 𝚌𝚘𝚖𝚖𝚊𝚗𝚍" });
      }
    }
  }
});
    
sock.ev.on("group-participants.update", async (update) => {
  const bot = bots.get(number);
  const { features } = bot;
  const { participants, action, id: groupId } = update;

  for (const userJid of participants) {
    let profileName = "Member";
    try {
      const vcard = await sock.onWhatsApp(userJid);
      profileName = vcard?.[0]?.notify || userJid.split("@")[0];
    } catch {}

    let ppUrl;
    try { ppUrl = await sock.profilePictureUrl(userJid, "image"); } catch { ppUrl = null; }
    const numberFormatted = userJid.split("@")[0];

    if (action === "add" && features.welcome) {
      const text = `👋 Welcome @${numberFormatted}\n📛 Name: ${profileName}\n📱 Number: ${numberFormatted}`;
      if (ppUrl) await sock.sendMessage(groupId, { image: { url: ppUrl }, caption: text, mentions: [userJid] });
      else await sock.sendMessage(groupId, { text, mentions: [userJid] });
    }

    if (action === "remove" && features.bye) {
      const text = `😢 Goodbye @${numberFormatted}\n📛 Name: ${profileName}\n📱 Number: ${numberFormatted}`;
      if (ppUrl) await sock.sendMessage(groupId, { image: { url: ppUrl }, caption: text, mentions: [userJid] });
      else await sock.sendMessage(groupId, { text, mentions: [userJid] });
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

    // 🔒 CHECK BOT ACTIVE
    const active = await isBotActive(num);
    if (!active) {
      return res.status(403).json({
        error: "BOT_INACTIF",
        message: "Votre bot n'est pas actif. Veuillez acheter une activation."
      });
    }

    const code = await startPairingSession(num);
    if (code) return res.json({ code });

    return res.json({ status: "Déjà connecté" });
  } catch (err) {
    console.error("Pairing error:", err);
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

// EXPORTS
export { bots };  
export default router;
