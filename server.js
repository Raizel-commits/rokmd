// =======================
// IMPORTS
// =======================
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import cors from "cors";
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
const MF_API_KEY  = "moneyfusion_v1_6950f6d898fe6dbde00af590_4A53FFA3DD9F78644E53269883CEB2C5CBD11FF72932C76BE5C8EC504D0DA82";

/* ================== SESSION ================== */
const SESSION_SECRET = "ROK_XD_SECRET";

/* ================== FILES ================== */
const usersFile    = path.join(__dirname, "users.json");
const paymentsFile = path.join(__dirname, "payments.json");

if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, "[]");
if (!fs.existsSync(paymentsFile)) fs.writeFileSync(paymentsFile, "[]");

/* ================== HELPERS ================== */
const loadJSON = (file) => {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")) || []; }
  catch { return []; }
};
const saveJSON = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

/* ================== MIDDLEWARE ================== */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 🔥 CORS pour InfinityFree → Render
app.use(cors({
  origin: "https://rok-xd.gt.tc",
  credentials: true
}));

app.use(session({
  name: "rokxd.sid",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "none",
    secure: true
  }
}));

/* ================== AUTH GUARDS ================== */
const requireAuth = (req, res, next) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Non connecté" });
  next();
};

const requireActiveBot = (req, res, next) => {
  const users = loadJSON(usersFile);
  const user = users.find(u => u.username === req.session.user.username);
  if (!user) return res.status(401).json({ error: "Utilisateur introuvable" });
  if (user.botActiveUntil <= Date.now())
    return res.status(403).json({ error: "Bot inactif" });
  next();
};

/* ================== AUTH ================== */
app.post("/register", (req, res) => {
  const { username, password, email, ref } = req.body;
  if (!username || !password || !email)
    return res.json({ error: "Champs manquants" });

  const users = loadJSON(usersFile);
  if (users.find(u => u.username === username))
    return res.json({ error: "Nom d'utilisateur déjà utilisé" });
  if (users.find(u => u.email === email))
    return res.json({ error: "Email déjà utilisé" });

  const newUser = {
    username,
    password,
    email,
    coins: 20,
    botActiveUntil: 0,
    botNumber: null,
    adCount: 0,
    adLastDate: "",
    referrals: []
  };

  users.push(newUser);

  if (ref) {
    const sponsor = users.find(u => u.username === ref);
    if (sponsor) {
      sponsor.coins += 5;
      sponsor.referrals.push(username);
    }
  }

  saveJSON(usersFile, users);
  res.json({ status: "Compte créé (20 coins offerts)" });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = loadJSON(usersFile);
  const user = users.find(
    u => u.username === username && u.password === password
  );
  if (!user) return res.json({ error: "Identifiants incorrects" });

  req.session.user = { username: user.username };
  res.json({ status: "Connecté" });
});

app.get("/logout", requireAuth, (req, res) => {
  req.session.destroy(() => res.json({ status: "Déconnecté" }));
});

/* ================== USER INFO ================== */
app.get("/coins", requireAuth, (req, res) => {
  const users = loadJSON(usersFile);
  const user = users.find(u => u.username === req.session.user.username);
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
  const duration = Number(req.body.duration);
  const prices = { 24: 20, 48: 40, 72: 60 };

  if (!prices[duration])
    return res.json({ error: "Durée invalide" });

  const users = loadJSON(usersFile);
  const user = users.find(u => u.username === req.session.user.username);
  if (!user) return res.json({ error: "Utilisateur introuvable" });

  if (user.coins < prices[duration])
    return res.json({ error: "Coins insuffisants" });

  user.coins -= prices[duration];
  const now = Date.now();
  user.botActiveUntil =
    (user.botActiveUntil > now ? user.botActiveUntil : now) +
    duration * 3600 * 1000;

  saveJSON(usersFile, users);

  res.json({
    status: `Bot activé ${duration}h`,
    coins: user.coins,
    botActiveRemaining: user.botActiveUntil - now
  });
});

/* ================== ADS ================== */
app.get("/watch-ad", requireAuth, (req, res) => {
  const users = loadJSON(usersFile);
  const user = users.find(u => u.username === req.session.user.username);
  if (!user) return res.json({ error: "Utilisateur introuvable" });

  const today = new Date().toDateString();
  if (user.adLastDate !== today) user.adCount = 0;

  res.json({ allowed: user.adCount < 2 });
});

app.post("/watch-ad/complete", requireAuth, (req, res) => {
  const users = loadJSON(usersFile);
  const user = users.find(u => u.username === req.session.user.username);
  if (!user) return res.json({ error: "Utilisateur introuvable" });

  const today = new Date().toDateString();
  if (user.adLastDate !== today) user.adCount = 0;
  if (user.adCount >= 2)
    return res.json({ error: "Limite atteinte" });

  user.coins += 1;
  user.adCount += 1;
  user.adLastDate = today;

  saveJSON(usersFile, users);
  res.json({ success: true, coins: user.coins });
});

/* ================== MONEY FUSION ================== */
app.post("/pay-bot", requireAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    const paymentId = "MF_" + Date.now();

    const response = await fetch("https://api.moneyfusion.net/v1/payin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MF_API_KEY}`
      },
      body: JSON.stringify({
        merchant_id: MERCHANT_ID,
        amount: Number(amount),
        currency: "XAF",
        payment_id: paymentId,
        redirect_url: "https://rok-xd.gt.tc",
        webhook_url: "https://rokmd.onrender.com/webhook"
      })
    });

    const data = await response.json();
    if (!data?.data?.url)
      return res.json({ error: "Erreur paiement" });

    const payments = loadJSON(paymentsFile);
    payments.push({
      id: paymentId,
      user: req.session.user.username,
      amount: Number(amount),
      status: "pending"
    });
    saveJSON(paymentsFile, payments);

    res.json({ url: data.data.url });
  } catch (e) {
    res.json({ error: "Erreur serveur" });
  }
});

app.post("/webhook", (req, res) => {
  const data = req.body;
  if (!data || data.status !== "success") return res.send("IGNORED");

  const payments = loadJSON(paymentsFile);
  const pay = payments.find(p => p.id === data.payment_id);
  if (!pay || pay.status === "success") return res.send("IGNORED");

  pay.status = "success";

  const users = loadJSON(usersFile);
  const user = users.find(u => u.username === pay.user);
  if (user) {
    const now = Date.now();
    user.botActiveUntil =
      (user.botActiveUntil > now ? user.botActiveUntil : now) +
      24 * 3600 * 1000;
  }

  saveJSON(usersFile, users);
  saveJSON(paymentsFile, payments);
  res.send("OK");
});

/* ================== QR & PAIR ================== */
app.use("/qr", requireAuth, requireActiveBot, qrRouter);
app.use("/pair-api", requireAuth, requireActiveBot, pairRouter);

/* ================== START ================== */
app.listen(PORT, () => {
  console.log(`✅ API lancée sur http://localhost:${PORT}`);
});
