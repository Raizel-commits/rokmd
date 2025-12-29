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
  makeCacheableSignalKeyStore
} from "baileys"; // ✅ version stable

const router = express.Router();
const PAIRING_DIR = "./sessions";
const COMMANDS_DIR = "./commands";

// Stocke toutes les sessions actives
const sessionsActives = {};

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

/* ================== COMMANDS ================== */
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

/* ================== GET LID ================== */
function getLid(number, sock) {
  try {
    const data = JSON.parse(fs.readFileSync(`${PAIRING_DIR}/${number}/creds.json`, "utf8"));
    return data?.me?.lid || sock.user?.lid || "";
  } catch {
    return sock.user?.lid || "";
  }
}

/* ================== START SESSION ================== */
async function startSession(number) {
  if (sessionsActives[number]) return sessionsActives[number]; // déjà actif

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
    markOnlineOnConnect: false,
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);
  let commands = await loadCommands();
  sessionsActives[number] = { sock, commands };

  /* ================== MESSAGE HANDLER ================== */
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

    if (!text.startsWith("!")) return;

    const senderClean = jidClean(participant);
    const ownerClean = jidClean(sock.user.id);
    const lidRaw = getLid(number, sock);
    const lid = lidRaw ? jidClean(lidRaw) + "@lid" : null;

    const allowed =
      msg.key.fromMe ||
      senderClean === ownerClean ||
      participant === lid ||
      remoteJid === lid;

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
        await commands.get(command).execute(sock, {
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
  });

  /* ================== CONNECTION ================== */
  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const status = lastDisconnect?.error?.output?.statusCode;
      if (status === DisconnectReason.loggedOut) {
        delete sessionsActives[number];
        await removeSession(SESSION_DIR);
      } else {
        setTimeout(() => startSession(number), 2000);
      }
    }
  });

  /* ================== PAIRING CODE ================== */
  if (!sock.authState.creds.registered) {
    await new Promise(r => setTimeout(r, 1500)); // ✅ remplace bluebird.delay
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
    const code = await startSession(num);

    if (code) return res.json({ code });
    return res.json({ status: "Déjà connecté" });
  } catch (err) {
    console.error("Pairing error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
