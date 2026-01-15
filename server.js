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
import pairRouter from "./pair.js";

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================= APP CONFIG =======================
const app = express();
const PORT = process.env.PORT || 3000;

// ======================= MONEY FUSION =======================
const MERCHANT_ID = "69620e03013a0771970d2b80";
const MF_API_KEY = "moneyfusion_v1_6950f6d898fe6dbde00af590_4A53FFA3DD9F78644E53269883CE5C8EC504D0DA82";

// ======================= POSTGRES =======================
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
      payment_id VARCHAR(60) UNIQUE NOT NULL,
      user_id INT REFERENCES users(id),
      amount NUMERIC NOT NULL,
      status VARCHAR(20) DEFAULT 'pending'
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS coin_history (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      change INT,
      reason VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("✅ DB prête (ROK XD MiniBot)");
}
initDB().catch(console.error);

// ======================= MIDDLEWARE =======================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: "ROK_XD_MINIBOT_SECRET",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(__dirname));

// ======================= AUTH MIDDLEWARE =======================
const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.redirect("/login");
  next();
};

// ======================= ROUTERS =======================
app.use("/qr", qrRouter);
app.use("/pair-api", pairRouter);

// ======================= HTML ROUTES =======================
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "register.html")));
app.get("/", requireAuth, (req, res) => res.sendFile(path.join(__dirname, "index.html")));

// ======================= REGISTER =======================
app.post("/register", async (req, res) => {
  try {
    const { username, email, password, ref } = req.body;
    if (!username || !email || !password) return res.json({ error: "Champs manquants" });

    const { rows: exist } = await pool.query(
      "SELECT id FROM users WHERE username=$1 OR email=$2",
      [username, email]
    );
    if (exist.length) return res.json({ error: "Nom ou email déjà utilisé" });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      "INSERT INTO users (username,email,password,coins) VALUES ($1,$2,$3,20) RETURNING *",
      [username, email, hash]
    );

    // Parrainage (+5 coins pour le parrain)
    if (ref) {
      const { rows: par } = await pool.query("SELECT * FROM users WHERE username=$1", [ref]);
      if (par[0]) {
        const refs = JSON.parse(par[0].referrals || "[]");
        refs.push(username);
        await pool.query(
          "UPDATE users SET coins=coins+5, referrals=$1 WHERE id=$2",
          [JSON.stringify(refs), par[0].id]
        );
      }
    }

    res.json({ status: "Compte créé – 20 coins offerts 🎉" });
  } catch (e) {
    console.error(e);
    res.json({ error: "Erreur serveur" });
  }
});

// ======================= LOGIN =======================
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const { rows } = await pool.query("SELECT * FROM users WHERE username=$1", [username]);
    const user = rows[0];
    if (!user) return res.json({ error: "Identifiants incorrects" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.json({ error: "Identifiants incorrects" });

    req.session.user = { username: user.username };
    res.json({ status: "Connexion réussie" });
  } catch (e) {
    console.error(e);
    res.json({ error: "Erreur serveur" });
  }
});

// ======================= LOGOUT =======================
app.get("/logout", requireAuth, (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// ======================= USER DATA =======================
app.get("/coins", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE username=$1",
    [req.session.user.username]
  );
  const u = rows[0];

  res.json({
    username: u.username,
    coins: u.coins,
    botActiveRemaining: Math.max(0, parseInt(u.botActiveUntil || 0) - Date.now()),
    referrals: JSON.parse(u.referrals || "[]")
  });
});

// ======================= WATCH ADS =======================
app.get("/watch-ad", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE username=$1", [req.session.user.username]);
  const u = rows[0];

  const today = new Date().toISOString().split("T")[0];
  let count = u.adCount || 0;

  const lastDate = u.adLastDate ? u.adLastDate.toISOString().split("T")[0] : null;

  if (lastDate !== today) {
    count = 0;
    await pool.query(
      "UPDATE users SET adCount=0, adLastDate=$1 WHERE id=$2",
      [today, u.id]
    );
  }

  res.json({ allowed: count < 2 });
});

app.post("/watch-ad/complete", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE username=$1", [req.session.user.username]);
  const u = rows[0];

  const today = new Date().toISOString().split("T")[0];
  let count = u.adCount || 0;

  const lastDate = u.adLastDate ? u.adLastDate.toISOString().split("T")[0] : null;

  if (lastDate !== today) count = 0;
  if (count >= 2) return res.json({ error: "Limite atteinte" });

  const newCoins = u.coins + 1;
  await pool.query(
    "UPDATE users SET coins=$1, adCount=$2, adLastDate=$3 WHERE id=$4",
    [newCoins, count + 1, today, u.id]
  );

  await pool.query(
    "INSERT INTO coin_history (user_id, change, reason) VALUES ($1, 1, 'ad')",
    [u.id]
  );

  res.json({ success: true, coins: newCoins });
});

// ======================= PAY BOT AVEC COINS =======================
app.post("/pay-coins", requireAuth, async (req, res) => {
  const { hours } = req.body;
  const coinsNeeded = { 24: 20, 48: 40, 72: 60 }[hours];

  const { rows } = await pool.query("SELECT * FROM users WHERE username=$1", [req.session.user.username]);
  const user = rows[0];
  if (user.coins < coinsNeeded) return res.json({ error: "Coins insuffisants" });

  const now = Date.now();
  const base = user.botActiveUntil > now ? user.botActiveUntil : now;
  const newBotUntil = base + hours * 3600 * 1000;
  const newCoins = user.coins - coinsNeeded;

  await pool.query(
    "UPDATE users SET coins=$1, botActiveUntil=$2 WHERE id=$3",
    [newCoins, newBotUntil, user.id]
  );
  await pool.query(
    "INSERT INTO coin_history (user_id, change, reason) VALUES ($1, $2, 'bot')",
    [user.id, -coinsNeeded]
  );

  res.json({ success: true, newCoins, newBotUntil });
});

// ======================= PAY BOT AVEC MONEYFUSION =======================
app.post("/pay-bot", requireAuth, async (req, res) => {
  const { amount } = req.body;
  const { rows } = await pool.query("SELECT * FROM users WHERE username=$1", [req.session.user.username]);
  const u = rows[0];

  const paymentId = "moneyfusion_" + Date.now();
  const url = `https://payin.moneyfusion.net/payment/${MERCHANT_ID}/${amount}/${paymentId}`;

  await pool.query(
    "INSERT INTO payments (payment_id, user_id, amount) VALUES ($1, $2, $3)",
    [paymentId, u.id, amount]
  );

  res.json({ url });
});

// ======================= WEBHOOK =======================
app.post("/webhook", async (req, res) => {
  if (req.body.status !== "success") return res.send("IGNORED");

  const { rows } = await pool.query(
    "SELECT * FROM payments WHERE payment_id=$1",
    [req.body.payment_id]
  );
  const pay = rows[0];
  if (!pay) return res.send("NOT FOUND");

  await pool.query("UPDATE payments SET status='success' WHERE id=$1", [pay.id]);

  const { rows: u } = await pool.query("SELECT * FROM users WHERE id=$1", [pay.user_id]);
  const now = Date.now();
  const base = Number(u[0].botActiveUntil) > now ? Number(u[0].botActiveUntil) : now;

  await pool.query(
    "UPDATE users SET botActiveUntil=$1 WHERE id=$2",
    [base + 24 * 3600 * 1000, u[0].id]
  );

  res.send("OK");
});

// ======================= START =======================
app.listen(PORT, () => console.log(`🚀 ROK XD MiniBot lancé sur :${PORT}`));
