import express from "express";
import session from "express-session";
import FileStore from "session-file-store";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// =================== PATHS ===================
const PERSISTENT_DIR = "/mnt/data"; // Volume persistant sur Render
const USERS_FILE = path.join(PERSISTENT_DIR, "users.enc.json");
const SESSIONS_DIR = path.join(PERSISTENT_DIR, "sessions"); // doit exister sur le volume

// =================== CRYPTO ===================
const SECRET = process.env.USER_SECRET || "ULTRA_SECRET_KEY_256_BITS";
const ALGORITHM = "aes-256-ctr";
const KEY = crypto.createHash("sha256").update(SECRET).digest();

// =================== HELPERS ===================
function encrypt(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(data) {
  if (!data) return [];
  const [ivHex, contentHex] = data.split(":");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(contentHex, "hex")), decipher.final()]);
  return JSON.parse(decrypted.toString());
}

function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    return decrypt(fs.readFileSync(USERS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  const tmp = USERS_FILE + ".tmp";
  fs.writeFileSync(tmp, encrypt(users));
  fs.renameSync(tmp, USERS_FILE);
}

function getUser(req) {
  return loadUsers().find(u => u.username === req.session.user?.username);
}

function renderError(message, back = "/") {
  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erreur</title>
  <style>
    body { font-family: "Inter", sans-serif; background: linear-gradient(180deg,#020617,#0f172a); color: #dfffe6; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; }
    .glass-card { background: rgba(255,255,255,0.02); padding:24px 36px; border-radius:18px; box-shadow:0 10px 40px rgba(0,0,0,0.7); border:1px solid rgba(56,189,248,0.22); text-align:center; max-width:400px; }
    h2 { color: #ef4444; margin-bottom:16px; }
    a { display:inline-block; padding:10px 20px; background:#38bdf8; color:#020617; text-decoration:none; border-radius:6px; font-weight:bold; margin-top:10px; }
  </style>
  </head>
  <body>
    <section class="glass-card">
      <h2>${message}</h2>
      <a href="${back}">Retour</a>
    </section>
  </body>
  </html>
  `;
}

// =================== MIDDLEWARE ===================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const FileSessionStore = FileStore(session);
app.use(session({
  store: new FileSessionStore({ path: SESSIONS_DIR, retries: 0 }),
  secret: "SECRETSTORY_N_AUTH",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

function requireBotActive(req, res, next) {
  const user = getUser(req);
  if (!user) return res.redirect("/login");
  if (!user.botActiveUntil || user.botActiveUntil < Date.now()) {
    return res.send(renderError("Bot inactif, veuillez acheter du temps pour le déployer", "/"));
  }
  next();
}

// =================== ROUTES ===================
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "register.html")));
app.get("/", requireAuth, (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/logout", (req, res) => req.session.destroy(() => res.redirect("/login")));

// =================== REGISTER ===================
app.post("/register", async (req, res) => {
  const { username, password, ref } = req.body;
  if (!username || !password) return res.send(renderError("Champs manquants", "/register"));

  const users = loadUsers();
  if (users.some(u => u.username === username)) return res.send(renderError("Utilisateur déjà existant", "/register"));

  let coins = 20;
  if (ref) {
    const parent = users.find(u => u.username === ref);
    if (parent) parent.coins += 5;
  }

  const hash = await bcrypt.hash(password, 10);
  users.push({ username, password: hash, coins, botActiveUntil: 0 });
  saveUsers(users);
  res.redirect("/login");
});

// =================== LOGIN ===================
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.send(renderError("Identifiants incorrects", "/login"));

  req.session.user = { username: user.username };
  res.redirect("/");
});

// =================== API COINS ===================
app.get("/coins", requireAuth, (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Non autorisé" });
  const remainingTime = Math.max(0, user.botActiveUntil - Date.now());
  res.json({ coins: user.coins || 0, botActiveRemaining: remainingTime });
});

// =================== DEPOSIT ===================
app.post("/deposit", requireAuth, async (req, res) => {
  const { amount, operator, phoneNumber, accountName } = req.body;
  if (!amount || !operator || !phoneNumber || !accountName)
    return res.json({ error: "Champs manquants" });

  const user = getUser(req);
  try {
    const payload = {
      totalPrice: String(amount),
      article: [{ name: 'Dépôt Minetrol', price: String(amount), quantity: 1 }],
      numeroSend: phoneNumber,
      nomclient: accountName.substring(0, 50),
      personal_Info: [{ userId: user.username, orderId: `${Date.now()}` }],
      return_url: `https://ton-site.com/return`,
      webhook_url: `https://ton-site.com/webhook`
    };
    const response = await axios.post(
      "https://www.pay.moneyfusion.net/MINETROL/4a03462391c4bc96/pay",
      payload,
      { timeout: 60000 }
    );

    let instructions = "";
    switch (operator) {
      case "MTN Money": instructions = "Composez *126# puis confirmez le paiement avec votre code MTN."; break;
      case "Orange Money": instructions = "Composez *150*6# puis confirmez le paiement avec votre code Orange."; break;
      case "Moov Money": instructions = "Composez *555# puis confirmez le paiement avec votre PIN Moov."; break;
      case "Wave": instructions = "Ouvrez l'application Wave et confirmez le paiement avec votre PIN."; break;
      default: instructions = "Suivez les instructions de votre opérateur."; break;
    }

    res.json({ status: "Paiement initié, suivez les instructions sur votre téléphone", instructions, data: response.data });
  } catch (err) {
    console.error(err);
    res.json({ error: "Erreur lors de l'initiation du paiement" });
  }
});

// =================== WEBHOOK ===================
app.post("/webhook", (req, res) => {
  const data = req.body;
  console.log("Webhook reçu:", data);
  try {
    if (data.status !== "success") return res.status(200).send("Paiement non réussi");

    const users = loadUsers();
    const userId = data.personal_Info[0].userId;
    const user = users.find(u => u.username === userId);
    if (!user) return res.status(404).send("Utilisateur introuvable");

    const coinsMap = { 250: 20, 500: 40, 750: 60, 1000: 80, 1500: 120, 2000: 160 };
    const amount = parseInt(data.totalPrice);
    const coinsToAdd = coinsMap[amount] || 0;
    if (coinsToAdd === 0) return res.status(400).send("Montant invalide");

    user.coins = (user.coins || 0) + coinsToAdd;
    saveUsers(users);
    console.log(`✓ ${coinsToAdd} coins ajoutés à ${user.username}`);
    res.status(200).send("Coins ajoutés avec succès");
  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur serveur");
  }
});

// =================== BUY BOT ===================
app.post("/buy-bot", requireAuth, (req, res) => {
  const duration = parseInt(req.body.duration);
  const prices = { 24: 20, 48: 40, 72: 60 };
  const user = getUser(req);
  if (!prices[duration]) return res.json({ error: "Durée invalide" });
  if ((user.coins || 0) < prices[duration]) return res.json({ error: `Coins insuffisants (${prices[duration]} requis)` });

  user.coins -= prices[duration];
  const now = Date.now();
  const previous = user.botActiveUntil > now ? user.botActiveUntil : now;
  user.botActiveUntil = previous + duration * 3600 * 1000;
  saveUsers(loadUsers().map(u => u.username === user.username ? user : u));

  res.json({ status: `Bot activé pour ${duration}h`, expires: user.botActiveUntil });
});

// =================== PAIR / QR ===================
app.get("/pair", requireAuth, requireBotActive, (req, res) => res.sendFile(path.join(__dirname, "pair.html")));
app.get("/qrpage", requireAuth, requireBotActive, (req, res) => res.sendFile(path.join(__dirname, "qr.html")));

// =================== 404 ===================
app.use((req, res) => res.status(404).send(renderError("Erreur 404: Page non trouvée", "/")));

// =================== SERVER ===================
app.listen(PORT, () => console.log(`✓ Server running on port ${PORT}`));
