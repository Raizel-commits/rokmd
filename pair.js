// =======================
// IMPORTS
// =======================
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

// =======================
// UTILITIES
// =======================
function formatNumber(num) {
  const phone = pn("+" + num.replace(/\D/g, ""));
  if (!phone.isValid()) throw new Error("Numéro invalide");
  return phone.getNumber("e164").replace("+", "");
}

// =======================
// USERS HELPERS
// =======================
function loadUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, "utf8");
    return Array.isArray(JSON.parse(data)) ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// =======================
// CONFIG LOAD / SAVE
// =======================
let CONFIG = {};
if (fs.existsSync(CONFIG_FILE)) CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
async function saveConfig() { await fs.writeFile(CONFIG_FILE, JSON.stringify(CONFIG, null, 2)); }

// =======================
// BOTS MAP
// number => { sock, commands, config, features }
const bots = new Map();

// =======================
// LOAD COMMANDS
// =======================
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
// START PAIRING SESSION
// =======================
async function startPairingSession(number) {
  // Si bot déjà connecté, retourne null
  if (bots.has(number)) {
    const bot = bots.get(number);
    if (bot.sock.authState.creds.registered) return null;
  }

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
    if (!bot) return;
    const { commands, features } = bot;

    // =======================
    // AUTO FEATURES
    if (!msg.key.fromMe) {
      if (features.autoread) await sock.sendReadReceipt(remoteJid, participant, [msg.key.id]);
      if (features.autoreact) {
        const reactions = ["👍","❤️","😂","😮","😢","👏","🎉","🤔","🔥","😎","🙌","💯","✨","🥳","😡","😱","🤩","🙏","💔","🤷"];
        await sock.sendMessage(remoteJid, { react: { text: reactions[Math.floor(Math.random()*reactions.length)], key: msg.key } });
      }
      if (features.autotyping && remoteJid.endsWith("@g.us")) await sock.sendPresenceUpdate("composing", remoteJid);
      if (features.autorecording && remoteJid.endsWith("@g.us")) await sock.sendPresenceUpdate("recording", remoteJid);

      // ANTI-LINK
      if (features.antilink && remoteJid.endsWith("@g.us")) {
        try {
          const metadata = await sock.groupMetadata(remoteJid);
          const botJid = sock.user.id;
          const botParticipant = metadata.participants.find(p=>p.id===botJid);
          const botIsAdmin = botParticipant?.admin==="admin" || botParticipant?.admin==="superadmin";
          if (!botIsAdmin) return;

          const senderJid = participant;
          if (senderJid===botJid) return;

          const linkRegex = /(https?:\/\/|www\.|wa\.me\/|chat\.whatsapp\.com\/|t\.me\/|bit\.ly\/|facebook\.com\/|instagram\.com\/)/i;
          if (text.match(linkRegex)) {
            await sock.groupParticipantsUpdate(remoteJid,[participant],"remove");
            await sock.sendMessage(remoteJid,{text:`❌ @${participant.split("@")[0]} Links not allowed!`, mentions:[participant]});
          }
        } catch(e){ console.error("Anti-link error:",e); }
      }
    }

    // =======================
    // COMMANDS HANDLER
    const prefix = bot.config.prefix;
    if (text.startsWith(prefix)) {
      const args = text.slice(prefix.length).trim().split(/\s+/);
      const commandName = args.shift().toLowerCase();

      // CUSTOM COMMANDS
      if (commands.has(commandName)) {
        try {
          await commands.get(commandName).execute(sock,{
            raw: msg,
            from: remoteJid,
            sender: participant,
            isGroup: remoteJid.endsWith("@g.us"),
            reply: t=>sock.sendMessage(remoteJid,{text:t}),
            bots
          }, args);
        } catch(err) {
          console.error("Command error:",err);
          await sock.sendMessage(remoteJid,{text:"❌ Error executing command"});
        }
      }
    }
  });

  // =======================
  // PAIRING CODE
  if (!sock.authState.creds.registered) {
    await delay(1000);
    const code = await sock.requestPairingCode(number);
    return code.match(/.{1,4}/g).join("-");
  }

  return null;
}

// =======================
// ROUTE : PAIR-API
// =======================
router.get("/code", async (req,res)=>{
  try {
    if(!req.query.number) return res.status(400).json({error:"Numéro requis"});
    const num = formatNumber(req.query.number);

    const users = loadUsers();
    const user = users.find(u=>u.username===req.session.user?.username);
    if(!user) return res.status(401).json({error:"Utilisateur introuvable"});

    // Bot déjà connecté ?
    if(user.botNumber && bots.has(user.botNumber)) return res.json({status:"Bot déjà connecté"});

    if(!user.botNumber){
      user.botNumber = num;
      saveUsers(users);
    }

    const code = await startPairingSession(num);
    if(code) return res.json({code});
    return res.json({status:"Bot déjà connecté"});
  } catch(err){
    console.error("Pairing error:",err);
    res.status(500).json({error:err.message});
  }
});

// =======================
// CONFIG ROUTE
// =======================
router.post("/config", async (req,res)=>{
  try {
    let {number,prefix} = req.body;
    if(!number) return res.status(400).json({error:"Numéro requis"});
    number = formatNumber(number);
    if(!prefix) prefix="!";

    CONFIG[number]={prefix};
    if(bots.has(number)) bots.get(number).config={prefix};
    await fs.writeFile(CONFIG_FILE, JSON.stringify(CONFIG,null,2));

    res.json({status:"Configuration sauvegardée",prefix});
  } catch(err){
    console.error("Config error:",err);
    res.status(500).json({error:err.message});
  }
});

// =======================
// NETTOYAGE SESSIONS EXPIRÉES
// =======================
setInterval(async()=>{
  const users = loadUsers();
  const now = Date.now();
  for(const user of users){
    if(user.botNumber && user.botActiveUntil && user.botActiveUntil<now){
      const bot = bots.get(user.botNumber);
      if(bot) try{ await bot.sock.logout(); } catch{}
      bots.delete(user.botNumber);
      const dir = `./sessions/${user.botNumber}`;
      if(fs.existsSync(dir)) fs.rmSync(dir,{recursive:true,force:true});
      user.botNumber=null;
    }
  }
  saveUsers(users);
}, 60*1000);

export default router;
