
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// ================== FILE USERS ==================
const usersFile = path.join(__dirname, "users.json");
if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(usersFile, "[]");
}

// ================== HELPERS ==================
function loadUsers() {
  try {
    const data = fs.readFileSync(usersFile, "utf-8");
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function renderError(message, back = "/") {
  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <title>Erreur</title>
    <style>
      body{background:#020617;color:white;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh}
      .box{background:#0f172a;padding:30px;border-radius:12px;text-align:center}
      a{color:#38bdf8;text-decoration:none;font-weight:bold}
    </style>
  </head>
  <body>
    <div class="box">
      <h2>${message}</h2>
      <br/>
      <a href="${back}">Retour</a>
    </div>
  </body>
  </html>
  `;
}

// ================== MIDDLEWARE ==================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: "ROKXD_SECRET",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

// ================== PUBLIC ==================
app.get("/login", (_, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/register", (_, res) => res.sendFile(path.join(__dirname, "register.html")));

// ================== REGISTER ==================
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.send(renderError("Champs manquants", "/register"));

  const users = loadUsers();
  if (users.find(u => u.username === username))
    return res.send(renderError("Utilisateur déjà existant", "/register"));

  users.push({
    username,
    password,
    coins: 0,
    botActiveUntil: 0
  });

  saveUsers(users);
  res.redirect("/login");
});

// ================== LOGIN ==================
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();

  const user = users.find(
    u => u.username === username && u.password === password
  );

  if (!user)
    return res.send(renderError("Identifiants incorrects", "/login"));

  req.session.user = { username: user.username };
  res.redirect("/");
});

// ================== LOGOUT ==================
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// ================== HOME ==================
app.get("/", requireAuth, (_, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ================== COINS API ==================
app.get("/coins", requireAuth, (req, res) => {
  const users = loadUsers();
  const user = users.find(u => u.username === req.session.user.username);
  if (!user) return res.json({ coins: 0, botActiveRemaining: 0 });

  const remaining = Math.max(0, user.botActiveUntil - Date.now());
  res.json({ coins: user.coins || 0, botActiveRemaining: remaining });
});

// ================== MONEY FUSION ==================
app.post("/deposit", requireAuth, async (req, res) => {
  const { amount, operator, phoneNumber, accountName } = req.body;
  if (!amount || !operator || !phoneNumber || !accountName)
    return res.json({ error: "Champs manquants" });

  const payload = {
    totalPrice: String(amount),
    article: [{ name: "Depot ROK XD", price: String(amount), quantity: 1 }],
    numeroSend: phoneNumber,
    nomclient: accountName.substring(0, 50),
    personal_Info: [{
      userId: req.session.user.username,
      orderId: `ROK-${Date.now()}`
    }],
    return_url: "https://rokmd.onrender.com/",
    webhook_url: "https://rokmd.onrender.com/webhook"
  };

  try {
    const mf = await axios.post(
      "https://www.pay.moneyfusion.net/MINETROL/4a03462391c4bc96/pay",
      payload,
      { timeout: 60000 }
    );

    res.json({ status: "Paiement initié", data: mf.data });
  } catch (e) {
    console.error(e.message);
    res.json({ error: "Erreur Money Fusion" });
  }
});

// ================== WEBHOOK ==================
app.post("/webhook", (req, res) => {
  try {
    const data = req.body;
    if (data.status !== "success") return res.sendStatus(200);

    const users = loadUsers();
    const info = data.personal_Info?.[0];
    if (!info) return res.sendStatus(200);

    const user = users.find(u => u.username === info.userId);
    if (!user) return res.sendStatus(200);

    const coinsMap = {
      250: 20,
      500: 40,
      750: 60,
      1000: 80,
      1500: 120,
      2000: 160
    };

    const coins = coinsMap[parseInt(data.totalPrice)];
    if (!coins) return res.sendStatus(200);

    user.coins += coins;
    saveUsers(users);

    console.log(`✅ ${coins} coins ajoutés à ${user.username}`);
    res.sendStatus(200);
  } catch {
    res.sendStatus(500);
  }
});

// ================== BOT ==================
app.post("/buy-bot", requireAuth, (req, res) => {
  const prices = { 24: 20, 48: 40, 72: 60 };
  const duration = parseInt(req.body.duration);

  const users = loadUsers();
  const user = users.find(u => u.username === req.session.user.username);

  if (!prices[duration])
    return res.json({ error: "Durée invalide" });

  if (user.coins < prices[duration])
    return res.json({ error: "Coins insuffisants" });

  user.coins -= prices[duration];
  const now = Date.now();
  user.botActiveUntil = Math.max(user.botActiveUntil, now) + duration * 3600000;
  saveUsers(users);

  res.json({ status: "Bot activé" });
});

// ================== PAGES ==================
app.get("/pair", requireAuth, (_, res) =>
  res.sendFile(path.join(__dirname, "pair.html"))
);

app.get("/qrpage", requireAuth, (_, res) =>
  res.sendFile(path.join(__dirname, "qr.html"))
);

// ================== 404 ==================
app.use((_, res) =>
  res.status(404).send(renderError("Page introuvable", "/"))
);

// ================== START ==================
app.listen(PORT, () =>
  console.log(`🚀 ROK XD Server running on port ${PORT}`)
);
