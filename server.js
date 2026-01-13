import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

/* =================== ROUTERS =================== */
import qrRouter from "./qr.js";
import pairRouter from "./pair.js";

/* =================== PATH =================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =================== APP =================== */
const app = express();
const PORT = 3000;

/* ================== MONEY FUSION ================== */
const MERCHANT_ID = "69620e03013a0771970d2b80";
const MF_API_KEY = "moneyfusion_v1_XXXXXXXXXXXXXXXXXXXXXXXX";

/* ================== FILES ================== */
const usersFile = path.join(__dirname, "users.json");
const paymentsFile = path.join(__dirname, "payments.json");

if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, "[]");
if (!fs.existsSync(paymentsFile)) fs.writeFileSync(paymentsFile, "[]");

/* ================== HELPERS ================== */
const loadUsers = () => {
  try { return JSON.parse(fs.readFileSync(usersFile, "utf8")); }
  catch { return []; }
};
const saveUsers = d => fs.writeFileSync(usersFile, JSON.stringify(d, null, 2));

const loadPayments = () => {
  try { return JSON.parse(fs.readFileSync(paymentsFile, "utf8")); }
  catch { return []; }
};
const savePayments = d => fs.writeFileSync(paymentsFile, JSON.stringify(d, null, 2));

/* ================== MIDDLEWARE ================== */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  name: "rokxd.sid",
  secret: "ROK_XD_SECRET_2025",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,      // true uniquement si HTTPS
    sameSite: "lax",    // IMPORTANT mobile/panel
    maxAge: 24 * 60 * 60 * 1000
  }
}));

/* ================== AUTH MIDDLEWARE ================== */
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Non connecté" });
  }
  next();
};

const requireActiveBot = (req, res, next) => {
  const users = loadUsers();
  const user = users.find(u => u.username === req.session.user.username);
  if (!user) return res.status(401).send("Utilisateur introuvable");
  if (user.botActiveUntil <= Date.now()) {
    return res.status(403).send("Bot inactif");
  }
  next();
};

/* ================== ROUTERS ================== */
app.use("/qr", requireAuth, qrRouter);
app.use("/pair-api", requireAuth, pairRouter);

/* ================== HTML ================== */
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "register.html")));
app.get("/", requireAuth, (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/pair", requireAuth, requireActiveBot, (req, res) => res.sendFile(path.join(__dirname, "pair.html")));
app.get("/qrpage", requireAuth, requireActiveBot, (req, res) => res.sendFile(path.join(__dirname, "qr.html")));
app.get("/referral", requireAuth, (req, res) => res.sendFile(path.join(__dirname, "referral.html")));

/* ================== AUTH ================== */
app.post("/register", (req, res) => {
  const { username, password, email, ref } = req.body;
  if (!username || !password || !email) {
    return res.json({ error: "Champs manquants" });
  }

  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    return res.json({ error: "Nom déjà utilisé" });
  }
  if (users.find(u => u.email === email)) {
    return res.json({ error: "Email déjà utilisé" });
  }

  const user = {
    username,
    password,
    email,
    coins: 20,
    botActiveUntil: 0,
    adCount: 0,
    adLastDate: "",
    referrals: []
  };

  users.push(user);

  if (ref) {
    const parrain = users.find(u => u.username === ref);
    if (parrain) {
      parrain.coins += 5;
      parrain.referrals.push(username);
    }
  }

  saveUsers(users);
  res.json({ status: "Compte créé (20 coins)" });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.json({ error: "Identifiants incorrects" });

  req.session.user = { username };
  res.json({ status: "Connecté" });
});

app.get("/logout", requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.json({ status: "Déconnecté" });
  });
});

/* ================== USER INFO ================== */
app.get("/coins", requireAuth, (req, res) => {
  const user = loadUsers().find(u => u.username === req.session.user.username);
  if (!user) return res.json({ error: "Utilisateur introuvable" });

  res.json({
    username: user.username,
    coins: user.coins,
    botActiveRemaining: Math.max(0, user.botActiveUntil - Date.now()),
    referrals: user.referrals
  });
});

/* ================== BUY BOT ================== */
app.post("/buy-bot", requireAuth, (req, res) => {
  const { duration } = req.body;
  const prices = { 24: 20, 48: 40, 72: 60 };

  const users = loadUsers();
  const user = users.find(u => u.username === req.session.user.username);
  if (!user) return res.json({ error: "Utilisateur introuvable" });

  if (!prices[duration]) return res.json({ error: "Durée invalide" });
  if (user.coins < prices[duration]) return res.json({ error: "Coins insuffisants" });

  user.coins -= prices[duration];
  const base = user.botActiveUntil > Date.now() ? user.botActiveUntil : Date.now();
  user.botActiveUntil = base + duration * 3600000;

  saveUsers(users);
  res.json({ status: "Bot activé", coins: user.coins });
});

/* ================== MONEYFUSION ================== */
app.post("/pay-bot", requireAuth, async (req, res) => {
  const { amount } = req.body;
  const user = loadUsers().find(u => u.username === req.session.user.username);
  if (!user) return res.json({ error: "Utilisateur introuvable" });

  const payment_id = "MF_" + Date.now();

  const r = await fetch("https://api.moneyfusion.net/v1/payin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MF_API_KEY}`
    },
    body: JSON.stringify({
      merchant_id: MERCHANT_ID,
      amount: Number(amount),
      currency: "XAF",
      payment_id,
      redirect_url: `${req.protocol}://${req.get("host")}`,
      webhook_url: `${req.protocol}://${req.get("host")}/webhook`
    })
  });

  const data = await r.json();
  if (!data?.data?.url) return res.json({ error: "Paiement échoué" });

  const payments = loadPayments();
  payments.push({ id: payment_id, user: user.username, status: "pending" });
  savePayments(payments);

  res.json({ url: data.data.url });
});

/* ================== WEBHOOK ================== */
app.post("/webhook", (req, res) => {
  const data = req.body;
  if (data.status !== "success") return res.send("IGNORED");

  const payments = loadPayments();
  const pay = payments.find(p => p.id === data.payment_id);
  if (!pay || pay.status === "success") return res.send("DONE");

  pay.status = "success";

  const users = loadUsers();
  const user = users.find(u => u.username === pay.user);
  if (user) {
    const base = user.botActiveUntil > Date.now() ? user.botActiveUntil : Date.now();
    user.botActiveUntil = base + 24 * 3600000;
    saveUsers(users);
  }

  savePayments(payments);
  res.send("OK");
});

/* ================== DEBUG ================== */
app.get("/debug-session", (req, res) => {
  res.json(req.session);
});

/* ================== START ================== */
app.listen(PORT, () => {
  console.log("✅ ROK XD server lancé sur le port " + PORT);
});
