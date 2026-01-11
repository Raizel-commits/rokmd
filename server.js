import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

/* =================== ROUTERS =================== */
import qrRouter from "./qr.js";
import pairRouter from "./pair.js"; // routes pour pairing & config

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/* ================== MONEY FUSION CONFIG ================== */
const MERCHANT_ID = "69620e03013a0771970d2b80";
const MF_API_KEY = "moneyfusion_v1_6950f6d898fe6dbde00af590_4A53FFA3DD9F78644E53269883CEB2C5CBD11FF72932C76BE5C8EC504D0DA82";

/* ================== FILES ================== */
const usersFile = path.join(__dirname, "users.json");
const paymentsFile = path.join(__dirname, "payments.json");

if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, "[]");
if (!fs.existsSync(paymentsFile)) fs.writeFileSync(paymentsFile, "[]");

/* ================== HELPERS ================== */
const loadUsers = () => {
  try { return JSON.parse(fs.readFileSync(usersFile, "utf-8")) || []; } 
  catch { return []; }
};
const saveUsers = (d) => fs.writeFileSync(usersFile, JSON.stringify(d, null, 2));

const loadPayments = () => {
  try { return JSON.parse(fs.readFileSync(paymentsFile, "utf-8")) || []; } 
  catch { return []; }
};
const savePayments = (d) => fs.writeFileSync(paymentsFile, JSON.stringify(d, null, 2));

/* ================== MIDDLEWARE ================== */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: "ROK_XD_SECRET",
  resave: false,
  saveUninitialized: false,
}));

// Vérifie que l’utilisateur est connecté
const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: "Non connecté" });
  next();
};

// Vérifie que le bot est actif
const requireActiveBot = (req, res, next) => {
  const users = loadUsers();
  const user = users.find(u => u.username === req.session.user.username);
  if(!user) return res.status(401).send("Utilisateur introuvable");
  if(user.botActiveUntil <= Date.now()){
    return res.status(403).send("Bot inactif. Veuillez acheter une activation pour accéder à cette page.");
  }
  next();
};

/* =================== ROUTERS =================== */
// Les routes de pair.js seront préfixées par /pair-api
app.use("/qr", requireAuth, qrRouter);
app.use("/pair-api", requireAuth, pairRouter);

/* ================== ROUTES HTML ================== */
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "register.html")));
app.get("/", requireAuth, (req, res) => res.sendFile(path.join(__dirname, "index.html")));

// 🚨 Ajout de requireActiveBot pour protéger les pages
app.get("/pair", requireAuth, requireActiveBot, (req, res) => res.sendFile(path.join(__dirname, "pair.html")));
app.get("/qrpage", requireAuth, requireActiveBot, (req, res) => res.sendFile(path.join(__dirname, "qr.html")));

/* ================== AUTH API ================== */
// Register
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ error: "Champs manquants" });

  const users = loadUsers();
  if (users.find(u => u.username === username)) return res.json({ error: "Nom d'utilisateur déjà utilisé" });

  users.push({
    username,
    password,
    coins: 20,
    botActiveUntil: 0,
    botNumber: null
  });

  saveUsers(users);
  res.json({ status: "Compte créé ! Vous avez 20 coins" });
});

// Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.json({ error: "Identifiants incorrects" });
  req.session.user = { username: user.username };
  res.json({ status: "Connecté avec succès" });
});

// Logout
app.get("/logout", requireAuth, (req, res) => {
  req.session.destroy(() => res.json({ status: "Déconnecté" }));
});

/* ================== COINS & BOT ================== */
app.get("/coins", requireAuth, (req, res) => {
  const users = loadUsers();
  const user = users.find(u => u.username === req.session.user.username);
  if (!user) return res.json({ error: "Utilisateur introuvable" });
  res.json({
    coins: user.coins,
    botActiveRemaining: Math.max(0, user.botActiveUntil - Date.now()),
    username: user.username
  });
});

app.post("/buy-bot", requireAuth, (req, res) => {
  const duration = parseInt(req.body.duration);
  const prices = { 24: 20, 48: 40, 72: 60 };
  const users = loadUsers();
  const user = users.find(u => u.username === req.session.user.username);
  if (!user) return res.json({ error: "Utilisateur introuvable" });
  if (!prices[duration]) return res.json({ error: "Durée invalide" });
  if ((user.coins || 0) < prices[duration]) return res.json({ error: `Coins insuffisants (${prices[duration]} requis)` });

  user.coins -= prices[duration];
  const now = Date.now();
  const prev = user.botActiveUntil > now ? user.botActiveUntil : now;
  user.botActiveUntil = prev + duration * 3600 * 1000;
  saveUsers(users);

  res.json({
    status: `Bot activé pour ${duration}h`,
    coins: user.coins,
    botActiveRemaining: user.botActiveUntil - now
  });
});

/* ================== MONEY FUSION PAY ================== */
app.post("/pay-bot", requireAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    const users = loadUsers();
    const user = users.find(u => u.username === req.session.user.username);
    if (!user) return res.json({ error: "Utilisateur introuvable" });

    const paymentId = "MF_" + Date.now();
    const response = await fetch("https://api.moneyfusion.net/v1/payin", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${MF_API_KEY}` },
      body: JSON.stringify({
        merchant_id: MERCHANT_ID,
        amount: Number(amount),
        currency: "XAF",
        payment_id: paymentId,
        redirect_url: `${req.protocol}://${req.get("host")}/payment-success`,
        webhook_url: `${req.protocol}://${req.get("host")}/webhook`
      })
    });
    const data = await response.json();
    if (!data.data || !data.data.url) return res.json({ error: "Erreur paiement MoneyFusion" });

    const payments = loadPayments();
    payments.push({ id: paymentId, user: user.username, amount: Number(amount), status: "pending" });
    savePayments(payments);

    res.json({ url: data.data.url });
  } catch (e) {
    console.error(e);
    res.json({ error: "Erreur serveur" });
  }
});

// Webhook MoneyFusion
app.post("/webhook", (req, res) => {
  const data = req.body;
  if (!data || data.status !== "success") return res.send("IGNORED");

  const payments = loadPayments();
  const pay = payments.find(p => p.id === data.payment_id);
  if (!pay) return res.send("NOT FOUND");
  if (pay.status === "success") return res.send("ALREADY PAID");

  pay.status = "success";
  const users = loadUsers();
  const user = users.find(u => u.username === pay.user);
  if (!user) return res.send("USER NOT FOUND");

  const duration = 24; // chaque paiement = 24h
  const now = Date.now();
  const prev = user.botActiveUntil > now ? user.botActiveUntil : now;
  user.botActiveUntil = prev + duration * 3600 * 1000;

  saveUsers(users);
  savePayments(payments);
  res.send("OK");
});

/* ================== START SERVER ================== */
app.listen(PORT, () => console.log(`✅ Server lancé sur le port ${PORT}`));
