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

const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: "Non connectÃ©" });
  next();
};

const requireActiveBot = (req, res, next) => {
  const users = loadUsers();
  const user = users.find(u => u.username === req.session.user.username);
  if(!user) return res.status(401).send("Utilisateur introuvable");
  if(user.botActiveUntil <= Date.now()){
    return res.status(403).send("Bot inactif. Veuillez acheter une activation pour accÃ©der Ã  cette page.");
  }
  next();
};

/* =================== ROUTERS =================== */
app.use("/qr", requireAuth, qrRouter);
app.use("/pair-api", requireAuth, pairRouter);

/* ================== ROUTES HTML ================== */
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "register.html")));
app.get("/", requireAuth, (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/pair", requireAuth, requireActiveBot, (req, res) => res.sendFile(path.join(__dirname, "pair.html")));
app.get("/qrpage", requireAuth, requireActiveBot, (req, res) => res.sendFile(path.join(__dirname, "qr.html")));
app.get("/referral", requireAuth, (req, res) => res.sendFile(path.join(__dirname, "referral.html")));

/* ================== AUTH API ================== */
app.post("/register", (req, res) => {
  const { username, password, email, ref } = req.body;
  if (!username || !password || !email) return res.json({ error: "Champs manquants" });

  const users = loadUsers();
  if (users.find(u => u.username === username)) return res.json({ error: "Nom d'utilisateur dÃ©jÃ  utilisÃ©" });
  if (users.find(u => u.email === email)) return res.json({ error: "Email dÃ©jÃ  utilisÃ©" });

  const newUser = {
    username,
    password,
    email,
    coins: 20,
    botActiveUntil: 0,
    botNumber: null,
    adCount: 0,
    adLastDate: 0,
    referrals: []
  };

  users.push(newUser);

  // Attribution des 5 coins au parrain si prÃ©sent
  if(ref){
    const parrain = users.find(u => u.username === ref);
    if(parrain){
      parrain.coins += 5;
      parrain.referrals.push(username);
    }
  }

  saveUsers(users);
  res.json({ status: "Compte crÃ©Ã© ! Vous avez 20 coins" });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.json({ error: "Identifiants incorrects" });
  req.session.user = { username: user.username };
  res.json({ status: "ConnectÃ© avec succÃ¨s" });
});

app.get("/logout", requireAuth, (req, res) => {
  req.session.destroy(() => res.json({ status: "DÃ©connectÃ©" }));
});

/* ================== COINS & BOT ================== */
app.get("/coins", requireAuth, (req, res) => {
  const users = loadUsers();
  const user = users.find(u => u.username === req.session.user.username);
  if (!user) return res.json({ error: "Utilisateur introuvable" });
  res.json({
    coins: user.coins,
    botActiveRemaining: Math.max(0, user.botActiveUntil - Date.now()),
    username: user.username,
    referrals: user.referrals || []
  });
});

// Pour referral.html
app.get("/users-list", requireAuth, (req, res) => {
  const users = loadUsers();
  res.json(users);
});

/* ================== ACHAT BOT ================== */
app.post("/buy-bot", requireAuth, (req, res) => {
  const duration = parseInt(req.body.duration);
  const prices = { 24: 20, 48: 40, 72: 60 };
  const users = loadUsers();
  const user = users.find(u => u.username === req.session.user.username);
  if (!user) return res.json({ error: "Utilisateur introuvable" });
  if (!prices[duration]) return res.json({ error: "DurÃ©e invalide" });
  if ((user.coins || 0) < prices[duration]) return res.json({ error: `Coins insuffisants (${prices[duration]} requis)` });

  user.coins -= prices[duration];
  const now = Date.now();
  const prev = user.botActiveUntil > now ? user.botActiveUntil : now;
  user.botActiveUntil = prev + duration * 3600 * 1000;
  saveUsers(users);

  res.json({
    status: `Bot activÃ© pour ${duration}h`,
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

  const duration = 24; 
  const now = Date.now();
  const prev = user.botActiveUntil > now ? user.botActiveUntil : now;
  user.botActiveUntil = prev + duration * 3600 * 1000;

  saveUsers(users);
  savePayments(payments);
  res.send("OK");
});

/* ================== WATCH AD ================== */
app.get("/watch-ad", requireAuth, (req, res) => {
  const users = loadUsers();
  const user = users.find(u => u.username === req.session.user.username);
  if(!user) return res.json({ error: "Utilisateur introuvable" });

  const today = new Date().toDateString();
  if(user.adLastDate !== today) user.adCount = 0;

  if(user.adCount >= 2) return res.json({ allowed: false });
  
  res.json({ allowed: true });
});

app.post("/watch-ad/complete", requireAuth, (req, res) => {
  const users = loadUsers();
  const user = users.find(u => u.username === req.session.user.username);
  if(!user) return res.json({ error: "Utilisateur introuvable" });

  const today = new Date().toDateString();
  if(user.adLastDate !== today) user.adCount = 0;

  if(user.adCount >= 2) return res.json({ error: "Limite quotidienne atteinte" });

  user.coins = (user.coins || 0) + 1;
  user.adCount += 1;
  user.adLastDate = today;

  saveUsers(users);
  res.json({ success: true, coins: user.coins });
});

/* ================== START SERVER ================== */
app.listen(PORT, () => console.log(`â Server lancÃ© sur le port ${PORT}`));


Mets un package qui va sauvergader les donnes utilisateurs mm après le redémarrager sur render ou autres
