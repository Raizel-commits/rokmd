// ======================= IMPORTS =======================
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import path from "path";
import fetch from "node-fetch";
import bcrypt from "bcryptjs";
import pkg from "pg";
import { fileURLToPath } from "url";

import qrRouter from "./qr.js";
import pairRouter, { bots } from "./pair.js"; // IMPORT BOTS MAP

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================= CONFIG =======================
const app = express();
const PORT = process.env.PORT || 3000;

/* ================== MONEY FUSION CONFIG ================== */
const MERCHANT_ID = "69620e03013a0771970d2b80";
const MF_API_KEY = "moneyfusion_v1_6950f6d898fe6dbde00af590_4A53FFA3DD9F78644E53269883CE5C8EC504D0DA82";

/* ================== POSTGRESQL ================== */
const pool = new Pool({
  connectionString: "postgresql://rokxd_db_user:THyZaovujnRMAnSxpuwpdcrCl6RZmhES@dpg-d5j882ur433s738vqqd0-a.virginia-postgres.render.com/rokxd_db",
  ssl: { rejectUnauthorized: false }
});

// ======================= INIT DB =======================
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      coins INT DEFAULT 20,
      botActiveUntil BIGINT DEFAULT 0,
      adCount INT DEFAULT 0,
      adLastDate DATE,
      referrals TEXT DEFAULT '[]'
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      payment_id VARCHAR(50) UNIQUE NOT NULL,
      user_id INT REFERENCES users(id),
      amount NUMERIC NOT NULL,
      status VARCHAR(20) DEFAULT 'pending'
    );
  `);

  console.log("✅ Tables initialisées !");
}
initDB().catch(console.error);

// ======================= MIDDLEWARE =======================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: "ROK_XD_SECRET",
  resave: false,
  saveUninitialized: false,
}));

const requireAuth = async (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: "Non connecté" });
  next();
};

const requireActiveBot = async (req, res, next) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE username=$1", [req.session.user.username]);
  const user = rows[0];
  if (!user) return res.status(401).send("Utilisateur introuvable");
  if (Number(user.botActiveUntil || 0) <= Date.now()) {
    logoutWhatsAppByUsername(user.username);
    return res.status(403).send("Bot inactif");
  }
  next();
};

// ======================= LOGOUT WHATSAPP FUNCTION =======================
function logoutWhatsAppByUsername(username) {
  for (const [number, bot] of bots.entries()) {
    if (number === username) {
      try {
        bot.sock.logout();
        bots.delete(number);
        console.log(`🛑 Session WhatsApp de ${username} terminée`);
      } catch (e) {
        console.error("Erreur logout WhatsApp:", e);
      }
    }
  }
}

// ======================= ROUTES EXTERNES =======================
app.use("/qr", qrRouter);
app.use("/pair-api", pairRouter);

// ======================= ROUTES HTML =======================
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "register.html")));
app.get("/", requireAuth, (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/pair", requireAuth, requireActiveBot, (req, res) => res.sendFile(path.join(__dirname, "pair.html")));
app.get("/qrpage", requireAuth, requireActiveBot, (req, res) => res.sendFile(path.join(__dirname, "qr.html")));
app.get("/referral", requireAuth, (req, res) => res.sendFile(path.join(__dirname, "referral.html")));

// ======================= AUTH =======================
app.post("/register", async (req, res) => {
  try {
    const { username, email, password, ref } = req.body;
    if (!username || !email || !password) return res.json({ error: "Champs manquants" });

    const { rows: exists } = await pool.query("SELECT * FROM users WHERE username=$1 OR email=$2", [username, email]);
    if (exists.length) return res.json({ error: "Nom ou email déjà utilisé" });

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
      [username, email, hash]
    );

    // Gestion parrainage
    if (ref) {
      const { rows: parrainRows } = await pool.query("SELECT * FROM users WHERE username=$1", [ref]);
      const parrain = parrainRows[0];
      if (parrain) {
        const referrals = parrain.referrals ? JSON.parse(parrain.referrals) : [];
        referrals.push(username);
        await pool.query("UPDATE users SET coins=coins+5, referrals=$1 WHERE id=$2", [JSON.stringify(referrals), parrain.id]);
      }
    }

    res.json({ status: "Compte créé ! Vous avez 20 coins" });
  } catch(e) { console.error(e); res.json({ error: "Erreur serveur" }); }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const { rows } = await pool.query("SELECT * FROM users WHERE username=$1", [username]);
    const user = rows[0];
    if (!user) return res.json({ error: "Identifiants incorrects" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ error: "Identifiants incorrects" });

    req.session.user = { username: user.username };
    res.json({ status: "Connecté avec succès" });
  } catch(e) { console.error(e); res.json({ error: "Erreur serveur" }); }
});

app.get("/logout", requireAuth, async (req, res) => {
  req.session.destroy(() => res.json({ status: "Déconnecté" }));
});

// ======================= COINS & BOT =======================
app.get("/coins", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE username=$1", [req.session.user.username]);
  const user = rows[0];
  if (!user) return res.json({ error: "Utilisateur introuvable" });
  res.json({
    coins: user.coins,
    botActiveRemaining: Math.max(0, Number(user.botActiveUntil || 0) - Date.now()),
    username: user.username,
    referrals: JSON.parse(user.referrals)
  });
});

// ======================= ACHAT BOT =======================
app.post("/buy-bot", requireAuth, async (req, res) => {
  try {
    const duration = parseInt(req.body.duration);
    const prices = {24:20,48:40,72:60};

    const { rows } = await pool.query("SELECT * FROM users WHERE username=$1", [req.session.user.username]);
    const user = rows[0];
    if(!user) return res.json({ error: "Utilisateur introuvable" });
    if(!prices[duration]) return res.json({ error: "Durée invalide" });
    if(user.coins < prices[duration]) return res.json({ error: `Coins insuffisants (${prices[duration]} requis)` });

    const now = Date.now();
    const prev = user.botActiveUntil && Number(user.botActiveUntil) > now ? Number(user.botActiveUntil) : now;
    const newBotUntil = prev + duration*3600*1000;
    const newCoins = user.coins - prices[duration];

    await pool.query("UPDATE users SET coins=$1, botActiveUntil=$2 WHERE id=$3", [newCoins, newBotUntil, user.id]);

    setTimeout(() => logoutWhatsAppByUsername(user.username), newBotUntil - now);

    res.json({ status: `Bot activé pour ${duration}h`, coins: newCoins, botActiveRemaining: newBotUntil - now });
  } catch(e){ console.error(e); res.json({ error: "Erreur serveur" }); }
});

// ======================= MONEY FUSION PAY =======================
app.post("/pay-bot", requireAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    const { rows } = await pool.query("SELECT * FROM users WHERE username=$1", [req.session.user.username]);
    const user = rows[0];
    if(!user) return res.json({ error: "Utilisateur introuvable" });

    const paymentId = "MF_" + Date.now();
    const response = await fetch("https://api.moneyfusion.net/v1/payin", {
      method:"POST",
      headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${MF_API_KEY}` },
      body:JSON.stringify({
        merchant_id: MERCHANT_ID,
        amount:Number(amount),
        currency:"XAF",
        payment_id:paymentId,
        redirect_url:`${req.protocol}://${req.get("host")}/payment-success`,
        webhook_url:`${req.protocol}://${req.get("host")}/webhook`
      })
    });
    const data = await response.json();
    if(!data.data || !data.data.url) return res.json({ error: "Erreur paiement MoneyFusion" });

    await pool.query("INSERT INTO payments (payment_id,user_id,amount,status) VALUES ($1,$2,$3,'pending')", [paymentId, user.id, amount]);
    res.json({ url:data.data.url });
  } catch(e){ console.error(e); res.json({ error: "Erreur serveur" }); }
});

app.post("/webhook", async (req, res) => {
  const data = req.body;
  if(!data || data.status!=="success") return res.send("IGNORED");

  const { rows: payRows } = await pool.query("SELECT * FROM payments WHERE payment_id=$1", [data.payment_id]);
  const pay = payRows[0];
  if(!pay) return res.send("NOT FOUND");
  if(pay.status==="success") return res.send("ALREADY PAID");

  await pool.query("UPDATE payments SET status='success' WHERE id=$1", [pay.id]);

  const { rows: userRows } = await pool.query("SELECT * FROM users WHERE id=$1", [pay.user_id]);
  const user = userRows[0];
  if(!user) return res.send("USER NOT FOUND");

  const now = Date.now();
  const prev = user.botActiveUntil && Number(user.botActiveUntil) > now ? Number(user.botActiveUntil) : now;
  const newBotUntil = prev + 24*3600*1000;

  await pool.query("UPDATE users SET botActiveUntil=$1 WHERE id=$2", [newBotUntil, user.id]);

  setTimeout(() => logoutWhatsAppByUsername(user.username), newBotUntil - now);

  res.send("OK");
});

// ======================= WATCH ADS =======================
app.get("/watch-ad", requireAuth, async (req,res) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE username=$1", [req.session.user.username]);
  const user = rows[0];
  if(!user) return res.json({ error: "Utilisateur introuvable" });

  const today = new Date().toDateString();
  let adCount = user.adCount || 0;

  if(!user.adLastDate || user.adLastDate.toDateString() !== today){
    adCount = 0;
    await pool.query("UPDATE users SET adCount=$1, adLastDate=$2 WHERE id=$3", [0, today, user.id]);
  }

  res.json({ allowed: adCount < 2 });
});

app.post("/watch-ad/complete", requireAuth, async (req,res) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE username=$1", [req.session.user.username]);
  const user = rows[0];
  if(!user) return res.json({ error: "Utilisateur introuvable" });

  const today = new Date().toDateString();
  let adCount = user.adCount || 0;

  if(!user.adLastDate || user.adLastDate.toDateString() !== today){
    adCount = 0;
  }

  if(adCount >= 2) return res.json({ error: "Limite quotidienne atteinte" });

  adCount += 1;
  const newCoins = user.coins + 1;

  await pool.query("UPDATE users SET coins=$1, adCount=$2, adLastDate=$3 WHERE id=$4", [newCoins, adCount, today, user.id]);

  res.json({ success:true, coins: newCoins });
});

// ======================= START SERVER =======================
app.listen(PORT, ()=>console.log(`🚀 Server lancé sur le port ${PORT}`));
