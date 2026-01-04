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
  makeCacheableSignalKeyStore,
  delay
} from "@whiskeysockets/baileys";

const router = express.Router();
const PAIRING_DIR = "./sessions";
const CONFIG_FILE = "./config.json";
const USERS_FILE = "./users.json";

// =======================
// UTILITIES
function formatNumber(num) {
  const phone = pn("+" + num.replace(/\D/g, ""));
  if (!phone.isValid()) throw new Error("Numéro invalide");
  return phone.getNumber("e164").replace("+", "");
}

// =======================
// USERS STORAGE
let users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : {};
function saveUsers() { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); }

// =======================
// CONFIG STORAGE
let CONFIG = fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")) : {};
function saveConfig() { fs.writeFileSync(CONFIG_FILE, JSON.stringify(CONFIG, null, 2)); }

// =======================
// BOTS MAP
const bots = new Map(); // number => { sock, commands, config }

// =======================
// START PAIRING SESSION
async function startPairingSession(number) {
  const SESSION_DIR = path.join(PAIRING_DIR, number);
  await fs.ensureDir(SESSION_DIR);

  // Créer l'utilisateur si nouveau
  if (!users[number]) {
    users[number] = { coins: 10, referrals: [], deploys: 0 };
    saveUsers();
    console.log(`🟢 Nouveau utilisateur ${number} créé avec 10 coins`);
  }

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })) },
    logger: pino({ level: "silent" }),
    browser: Browsers.windows("Chrome"),
    printQRInTerminal: false,
    markOnlineOnConnect: false
  });

  sock.ev.on("creds.update", async () => {
    await saveCreds();
    await fs.writeFile(`${SESSION_DIR}/creds.json`, JSON.stringify(sock.authState.creds, null, 2));
  });

  const commands = new Map(); // Placeholder si besoin
  bots.set(number, { sock, commands, config: CONFIG[number] || { prefix: "!" } });

  // =======================
  // CONNECTION HANDLER
  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const status = lastDisconnect?.error?.output?.statusCode;
      if (status === DisconnectReason.loggedOut) {
        await fs.remove(SESSION_DIR);
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
// API ROUTES COINS & PARRAINAGE
router.post("/api/register", (req, res) => {
  const { username, ref } = req.body;
  if (!username) return res.status(400).json({ error: "Username requis" });

  if (!users[username]) {
    users[username] = { coins: 10, referrals: [], deploys: 0 };

    // Ajouter coins au parrain si existe
    if (ref && users[ref]) {
      users[ref].coins += 5;
      users[ref].referrals.push(username);
    }

    saveUsers();
    return res.json({ status: "ok", coins: users[username].coins });
  }

  res.json({ status: "existe", coins: users[username].coins });
});

router.post("/api/deploy", (req, res) => {
  const { username } = req.body;
  if (!users[username]) return res.status(400).json({ error: "Utilisateur inconnu" });
  if (users[username].coins < 3) return res.json({ message: "Pas assez de coins pour déployer" });

  users[username].coins -= 3;
  users[username].deploys += 1;
  saveUsers();
  res.json({ message: "Déploiement effectué !", coins: users[username].coins });
});

router.post("/api/coins/add", (req, res) => {
  const { username } = req.body;
  if (!users[username]) return res.status(400).json({ error: "Utilisateur inconnu" });

  users[username].coins += 1;
  saveUsers();
  res.json({ message: "+1 coin ajouté", coins: users[username].coins });
});

router.get("/api/coins/:username", (req, res) => {
  const { username } = req.params;
  if (!users[username]) return res.json({ coins: 0, referrals: [] });
  res.json({ coins: users[username].coins, referrals: users[username].referrals, deploys: users[username].deploys });
});

// =======================
// ROUTES PAIRING / CONFIG
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
    saveConfig();

    if (bots.has(number)) bots.get(number).config = { prefix };

    res.json({ status: "✅ Configuration sauvegardée pour ce bot", prefix });
  } catch (err) {
    console.error("Config error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;