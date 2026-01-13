import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import path from "path";
import fetch from "node-fetch";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";

/* =================== CONFIG =================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const MERCHANT_ID = "69620e03013a0771970d2b80";
const MF_API_KEY = "moneyfusion_v1_6950f6d898fe6dbde00af590_4A53FFA3DD9F78644E53269883CEB2C5CBD11FF72932C76BE5C8EC504D0DA82";

/* =================== MYSQL =================== */
const pool = mysql.createPool({
  host: "sql308.infinityfree.com",
  user: "if0_40882410",
  password: "7SZGWP2YuyNme",
  database: "if0_40882410_XXX",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 5
});

/* =================== MIDDLEWARE =================== */
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
  const [rows] = await pool.query("SELECT * FROM users WHERE username=?", [req.session.user.username]);
  const user = rows[0];
  if (!user) return res.status(401).send("Utilisateur introuvable");
  if (user.botActiveUntil <= Date.now()) return res.status(403).send("Bot inactif");
  next();
};

/* =================== ROUTES HTML =================== */
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "register.html")));
app.get("/", requireAuth, (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/pair", requireAuth, requireActiveBot, (req, res) => res.sendFile(path.join(__dirname, "pair.html")));
app.get("/qrpage", requireAuth, requireActiveBot, (req, res) => res.sendFile(path.join(__dirname, "qr.html")));
app.get("/referral", requireAuth, (req, res) => res.sendFile(path.join(__dirname, "referral.html")));

/* =================== AUTH =================== */
app.post("/register", async (req, res) => {
  try {
    const { username, email, password, ref } = req.body;
    if (!username || !email || !password) return res.json({ error: "Champs manquants" });

    const [exists] = await pool.query("SELECT * FROM users WHERE username=? OR email=?", [username, email]);
    if (exists.length) return res.json({ error: "Nom ou email déjà utilisé" });

    const hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query("INSERT INTO users (username,email,password,coins,botActiveUntil,adCount,referrals) VALUES (?,?,?,?,0,0,'[]')", [username,email,hash,20]);

    if (ref) {
      const [[parrain]] = await pool.query("SELECT * FROM users WHERE username=?", [ref]);
      if (parrain) {
        const referrals = parrain.referrals ? JSON.parse(parrain.referrals) : [];
        referrals.push(username);
        await pool.query("UPDATE users SET coins=coins+5, referrals=? WHERE id=?", [JSON.stringify(referrals), parrain.id]);
      }
    }

    res.json({ status: "Compte créé ! Vous avez 20 coins" });
  } catch(e) { console.error(e); res.json({ error: "Erreur serveur" }); }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query("SELECT * FROM users WHERE username=?", [username]);
    const user = rows[0];
    if (!user) return res.json({ error: "Identifiants incorrects" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ error: "Identifiants incorrects" });

    req.session.user = { username: user.username };
    res.json({ status: "Connecté avec succès" });
  } catch(e) { console.error(e); res.json({ error: "Erreur serveur" }); }
});

app.get("/logout", requireAuth, async (req,res) => {
  req.session.destroy(()=>res.json({status:"Déconnecté"}));
});

/* =================== COINS & BOT =================== */
app.get("/coins", requireAuth, async (req,res)=>{
  const [rows] = await pool.query("SELECT * FROM users WHERE username=?", [req.session.user.username]);
  const user = rows[0];
  if(!user) return res.json({error:"Utilisateur introuvable"});
  res.json({
    coins: user.coins,
    botActiveRemaining: Math.max(0,user.botActiveUntil - Date.now()),
    username: user.username,
    referrals: JSON.parse(user.referrals)
  });
});

app.get("/users-list", requireAuth, async (req,res)=>{
  const [rows] = await pool.query("SELECT * FROM users");
  res.json(rows.map(u=>({...u,referrals:JSON.parse(u.referrals)})));
});

app.post("/buy-bot", requireAuth, async (req,res)=>{
  const duration = parseInt(req.body.duration);
  const prices = {24:20,48:40,72:60};
  const [rows] = await pool.query("SELECT * FROM users WHERE username=?", [req.session.user.username]);
  const user = rows[0];
  if(!user) return res.json({error:"Utilisateur introuvable"});
  if(!prices[duration]) return res.json({error:"Durée invalide"});
  if(user.coins<prices[duration]) return res.json({error:`Coins insuffisants (${prices[duration]} requis)`});

  const now = Date.now();
  const prev = user.botActiveUntil>now?user.botActiveUntil:now;
  await pool.query("UPDATE users SET coins=coins-?, botActiveUntil=? WHERE id=?", [prices[duration], prev+duration*3600*1000, user.id]);

  res.json({status:`Bot activé pour ${duration}h`, coins:user.coins-prices[duration], botActiveRemaining: prev+duration*3600*1000 - now});
});

/* =================== MONEY FUSION =================== */
app.post("/pay-bot", requireAuth, async (req,res)=>{
  try{
    const {amount} = req.body;
    const [rows] = await pool.query("SELECT * FROM users WHERE username=?", [req.session.user.username]);
    const user = rows[0];
    if(!user) return res.json({error:"Utilisateur introuvable"});

    const paymentId = "MF_" + Date.now();
    const response = await fetch("https://api.moneyfusion.net/v1/payin", {
      method:"POST",
      headers:{ "Content-Type":"application/json","Authorization":`Bearer ${MF_API_KEY}` },
      body:JSON.stringify({
        merchant_id:MERCHANT_ID,
        amount:Number(amount),
        currency:"XAF",
        payment_id:paymentId,
        redirect_url:`${req.protocol}://${req.get("host")}/payment-success`,
        webhook_url:`${req.protocol}://${req.get("host")}/webhook`
      })
    });
    const data = await response.json();
    if(!data.data || !data.data.url) return res.json({error:"Erreur paiement"});

    await pool.query("INSERT INTO payments (payment_id,user_id,amount,status) VALUES (?,?,?,?)",[paymentId,user.id,amount,'pending']);
    res.json({url:data.data.url});
  }catch(e){console.error(e);res.json({error:"Erreur serveur"});}
});

app.post("/webhook", async (req,res)=>{
  const data = req.body;
  if(!data || data.status!=="success") return res.send("IGNORED");

  const [[pay]] = await pool.query("SELECT * FROM payments WHERE payment_id=?", [data.payment_id]);
  if(!pay) return res.send("NOT FOUND");
  if(pay.status==="success") return res.send("ALREADY PAID");

  await pool.query("UPDATE payments SET status='success' WHERE id=?", [pay.id]);

  const [[user]] = await pool.query("SELECT * FROM users WHERE id=?", [pay.user_id]);
  if(!user) return res.send("USER NOT FOUND");

  const now = Date.now();
  const prev = user.botActiveUntil>now?user.botActiveUntil:now;
  await pool.query("UPDATE users SET botActiveUntil=? WHERE id=?", [prev+24*3600*1000,user.id]);
  res.send("OK");
});

/* =================== WATCH ADS =================== */
app.get("/watch-ad", requireAuth, async (req,res)=>{
  const [[user]] = await pool.query("SELECT * FROM users WHERE username=?", [req.session.user.username]);
  if(!user) return res.json({error:"Utilisateur introuvable"});
  const today = new Date().toDateString();
  const lastDate = user.adLastDate ? new Date(user.adLastDate).toDateString() : null;
  const adCount = lastDate!==today ? 0 : user.adCount;
  res.json({allowed: adCount<2});
});

app.post("/watch-ad/complete", requireAuth, async (req,res)=>{
  const [[user]] = await pool.query("SELECT * FROM users WHERE username=?", [req.session.user.username]);
  if(!user) return res.json({error:"Utilisateur introuvable"});
  const today = new Date().toDateString();
  let adCount = user.adLastDate!==today?0:user.adCount;
  if(adCount>=2) return res.json({error:"Limite quotidienne atteinte"});
  adCount++;
  const coins = user.coins+1;
  await pool.query("UPDATE users SET coins=?, adCount=?, adLastDate=? WHERE id=?", [coins, adCount, new Date(), user.id]);
  res.json({success:true, coins});
});

/* =================== START SERVER =================== */
app.listen(PORT, ()=>console.log(`🚀 Server lancé sur le port ${PORT}`));
