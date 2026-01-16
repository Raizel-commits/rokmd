// ======================= IMPORTS =======================
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import path from "path";
import bcrypt from "bcryptjs";
import pkg from "pg";
import { fileURLToPath } from "url";

import qrRouter from "./qr.js";
import pairRouter from "./pair.js";

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================= APP =======================
const app = express();
const PORT = process.env.PORT || 3000;

// ======================= MONEYFUSION =======================
const MF_WEBHOOK_SECRET = "ROK_XD_MF_SECRET";

const MF_LINKS = {
  200: { url: "https://my.moneyfusion.net/6969ea01480b1dc6a588beac", hours: 24 },
  350: { url: "https://my.moneyfusion.net/6969ee6b480b1dc6a588d392", hours: 48 },
  500: { url: "https://my.moneyfusion.net/6969eedb480b1dc6a588d578", hours: 72 }
};

// ======================= POSTGRES =======================
const pool = new Pool({
  connectionString: "postgresql://rokxdminibot_user:07mTE6tpwXyv9HgWFnpsvvkU9EZ5oANE@dpg-d5kpsiumcj7s73a4tjk0-a.virginia-postgres.render.com/rokxdminibot",
  ssl: { rejectUnauthorized: false }
});

// ======================= INIT DB =======================
async function initDB() {
  try {
    await pool.query("SELECT NOW()");
    console.log("✔ PostgreSQL connecté");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE,
        email VARCHAR(100) UNIQUE,
        password TEXT,
        coins INT DEFAULT 20,
        botactiveuntil BIGINT DEFAULT 0,
        adcount INT DEFAULT 0,
        adlastdate DATE,
        referrals TEXT DEFAULT '[]',
        isadmin BOOLEAN DEFAULT false,
        device_id VARCHAR(100) UNIQUE
      )
    `);

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS isadmin BOOLEAN DEFAULT false`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        payment_id VARCHAR(80) UNIQUE,
        user_id INT,
        amount INT,
        hours INT,
        status VARCHAR(20) DEFAULT 'pending'
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS coin_history (
        id SERIAL PRIMARY KEY,
        user_id INT,
        change INT,
        reason VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const admins = [
      { username: "raizel", password: "raizel123", email: "raizel@example.com" },
      { username: "knut", password: "knut123", email: "knut@example.com" }
    ];

    for (const a of admins) {
      const ex = await pool.query("SELECT id FROM users WHERE username=$1", [a.username]);
      if (!ex.rows.length) {
        const hash = await bcrypt.hash(a.password, 10);
        await pool.query(
          "INSERT INTO users (username,email,password,coins,isadmin,device_id) VALUES ($1,$2,$3,100,true,$4)",
          [a.username, a.email, hash, "admin_default_" + Date.now()]
        );
      }
    }

    console.log("✔ DB OK et admins créés");
  } catch (e) {
    console.error("❌ DB ERROR:", e.message);
    process.exit(1);
  }
}
initDB();

// ======================= MIDDLEWARE =======================
app.set("trust proxy", 1);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  name: "rokxd.sid",
  secret: "ROK_XD_SECRET",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: "lax"
  }
}));

app.use(express.static(__dirname));

// ======================= AUTH =======================
const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.redirect("/login");
  next();
};

const requireBotActive = async (req, res, next) => {
  const { rows } = await pool.query(
    "SELECT botactiveuntil FROM users WHERE username=$1",
    [req.session.user.username]
  );
  if (!rows[0] || rows[0].botactiveuntil <= Date.now()) {
    return res.status(403).json({ error: "BOT_EXPIRED" });
  }
  next();
};

const requireAdmin = async (req, res, next) => {
  if (!req.session.user) return res.redirect("/admin-login");
  const { rows } = await pool.query(
    "SELECT isadmin FROM users WHERE username=$1",
    [req.session.user.username]
  );
  if (!rows[0] || !rows[0].isadmin) return res.status(403).send("Accès refusé");
  next();
};

// ======================= ROUTERS =======================
app.use("/qr", requireAuth, requireBotActive, qrRouter);
app.use("/pair-api", requireAuth, requireBotActive, pairRouter);

// ======================= HTML =======================
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "register.html")));
app.get("/logout", (req, res) => req.session.destroy(() => res.redirect("/login")));
app.get("/", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "index.html"));
});
app.get("/admin", requireAuth, requireAdmin, (req, res) => res.sendFile(path.join(__dirname, "admin.html")));
app.get("/admin-login", (req, res) => res.sendFile(path.join(__dirname, "admin-login.html")));

// ======================= LOGIN =======================
app.post("/login", async (req,res)=>{
  const { username,password } = req.body;
  const u = await pool.query("SELECT * FROM users WHERE username=$1",[username]);
  if(!u.rows[0]) return res.json({error:"Identifiants incorrects"});
  const ok = await bcrypt.compare(password,u.rows[0].password);
  if(!ok) return res.json({error:"Identifiants incorrects"});
  req.session.user={ username };
  res.json({status:"Connexion réussie"});
});

app.post("/admin-login", async (req,res)=>{
  const { username,password } = req.body;
  const u = await pool.query("SELECT * FROM users WHERE username=$1",[username]);
  if(!u.rows[0]) return res.json({error:"Identifiants incorrects"});
  if(!u.rows[0].isadmin) return res.json({error:"Accès refusé: non-admin"});
  const ok = await bcrypt.compare(password,u.rows[0].password);
  if(!ok) return res.json({error:"Identifiants incorrects"});
  req.session.user={ username, isAdmin:true };
  res.json({status:"Connexion admin réussie"});
});

// ======================= REGISTER =======================
app.post("/register", async (req, res) => {
  try {
    let { username, email, password, ref, device_id } = req.body;

    // Nettoyage et vérification des champs
    username = String(username || '').trim();
    email = String(email || '').trim();
    password = String(password || '').trim();
    device_id = String(device_id || '').trim();

    if (!username || !email || !password || !device_id) {
      return res.json({ error: "Champs manquants" });
    }

    // Vérifier si un compte existe déjà sur cet appareil
    const dev = await pool.query("SELECT id FROM users WHERE device_id=$1", [device_id]);
    if (dev.rows.length) return res.json({ error: "Un compte existe déjà sur cet appareil" });

    // Vérifier si username ou email existe déjà
    const exist = await pool.query("SELECT id FROM users WHERE username=$1 OR email=$2", [username, email]);
    if (exist.rows.length) return res.json({ error: "Compte déjà existant" });

    // Hash du mot de passe
    const hash = await bcrypt.hash(password, 10);

    // Création du compte
    const user = (await pool.query(
      "INSERT INTO users (username,email,password,device_id,coins) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [username, email, hash, device_id, 20] // 20 coins offerts à la création
    )).rows[0];

    // Gestion du parrainage
    if (ref && ref !== username) {
      const par = (await pool.query("SELECT * FROM users WHERE username=$1", [ref])).rows[0];
      if (par) {
        const refs = JSON.parse(par.referrals || "[]");
        if (!refs.includes(username)) {
          refs.push(username);
          await pool.query(
            "UPDATE users SET coins=coins+5, referrals=$1 WHERE id=$2",
            [JSON.stringify(refs), par.id]
          );
        }
      }
    }

    // Réponse
    res.json({ success: true, message: "Compte créé – 20 coins offerts !" });

  } catch (err) {
    console.error(err);
    res.json({ error: "Erreur serveur" });
  }
});

// ======================= USER DATA =======================
app.get("/coins",requireAuth, async (req,res)=>{
  const u = await pool.query("SELECT * FROM users WHERE username=$1",[req.session.user.username]);
  const user=u.rows[0];
  res.json({
    username:user.username,
    coins:user.coins,
    botActiveRemaining:Math.max(0,user.botactiveuntil-Date.now()),
    referrals:JSON.parse(user.referrals||"[]")
  });
});

// ======================= ADS =======================
app.get("/watch-ad",requireAuth, async (req,res)=>{
  const u = (await pool.query("SELECT * FROM users WHERE username=$1",[req.session.user.username])).rows[0];
  const today = new Date().toISOString().slice(0,10);
  if(!u.adlastdate || u.adlastdate.toISOString().slice(0,10) !== today){
    await pool.query("UPDATE users SET adcount=0, adlastdate=$1 WHERE id=$2",[today,u.id]);
    u.adcount=0;
  }
  res.json({allowed:u.adcount<2});
});
app.post("/watch-ad/complete",requireAuth, async (req,res)=>{
  const u=(await pool.query("SELECT * FROM users WHERE username=$1",[req.session.user.username])).rows[0];
  if(u.adcount>=2) return res.json({error:"Limite atteinte"});
  await pool.query("BEGIN");
  await pool.query("UPDATE users SET coins=coins+1, adcount=adcount+1, adlastdate=CURRENT_DATE WHERE id=$1",[u.id]);
  await pool.query("INSERT INTO coin_history (user_id,change,reason) VALUES ($1,1,'ad')",[u.id]);
  await pool.query("COMMIT");
  res.json({success:true,coins:u.coins+1});
});

// ======================= PAY COINS =======================
app.post("/pay-coins",requireAuth, async (req,res)=>{
  const { hours } = req.body;
  const prices={24:20,48:40,72:60};
  if(!prices[hours]) return res.json({error:"Offre invalide"});
  const u=(await pool.query("SELECT * FROM users WHERE username=$1",[req.session.user.username])).rows[0];
  if(u.coins<prices[hours]) return res.json({error:"Coins insuffisants"});
  const base=Math.max(Date.now(),u.botactiveuntil);
  const until=base+hours*3600000;
  await pool.query("BEGIN");
  await pool.query("UPDATE users SET coins=coins-$1, botactiveuntil=$2 WHERE id=$3",[prices[hours],until,u.id]);
  await pool.query("INSERT INTO coin_history (user_id,change,reason) VALUES ($1,$2,'bot')",[u.id,-prices[hours]]);
  await pool.query("COMMIT");
  res.json({success:true,newCoins:u.coins-prices[hours],newBotUntil:until});
});

// ======================= PAY FCFA / MONEYFUSION =======================
app.post("/pay-bot",requireAuth, async (req,res)=>{
  const { amount } = req.body;
  if (!MF_LINKS[amount]) return res.json({error:"Montant invalide"});

  const u=(await pool.query("SELECT * FROM users WHERE username=$1",[req.session.user.username])).rows[0];
  const paymentId="mf_"+Date.now();

  // Enregistrer paiement pending
  await pool.query("INSERT INTO payments (payment_id,user_id,amount,hours,status) VALUES ($1,$2,$3,$4,'pending')",
    [paymentId,u.id,amount,MF_LINKS[amount].hours]);

  // Pré-remplir nom/email pour MoneyFusion
  const userName = encodeURIComponent(u.username);
  const userEmail = encodeURIComponent(u.email);

  const payUrl = `${MF_LINKS[amount].url}?name=${userName}&email=${userEmail}`;
  res.json({url: payUrl});
});

// ======================= WEBHOOK =======================
app.post("/webhook", async (req,res)=>{
  if(req.headers["x-mf-secret"]!==MF_WEBHOOK_SECRET) return res.send("FORBIDDEN");
  if(req.body.status!=="success") return res.send("IGNORED");

  const p=(await pool.query("SELECT * FROM payments WHERE payment_id=$1",[req.body.payment_id])).rows[0];
  if(!p || p.status==="success") return res.send("OK");

  const u=(await pool.query("SELECT * FROM users WHERE id=$1",[p.user_id])).rows[0];
  const base=Math.max(Date.now(),u.botactiveuntil);
  const until=base+p.hours*3600000;

  await pool.query("BEGIN");
  await pool.query("UPDATE payments SET status='success' WHERE id=$1",[p.id]);
  await pool.query("UPDATE users SET botactiveuntil=$1 WHERE id=$2",[until,u.id]);
  await pool.query("COMMIT");

  console.log(`✅ Paiement réussi: ${u.username} activé jusqu'à ${new Date(until)}`);
  res.send("OK");
});

// ======================= ADMIN ROUTES =======================
app.get("/admin/users", requireAuth, requireAdmin, async (req,res)=>{
  const users = (await pool.query("SELECT * FROM users")).rows;
  res.json(users);
});
app.get("/admin/payments", requireAuth, requireAdmin, async (req,res)=>{
  const payments = (await pool.query("SELECT * FROM payments ORDER BY id DESC")).rows;
  res.json(payments);
});
app.post("/admin/toggle-admin", requireAuth, requireAdmin, async (req,res)=>{
  const { id } = req.body;
  const u = (await pool.query("SELECT * FROM users WHERE id=$1",[id])).rows[0];
  if(!u) return res.json({error:"Utilisateur introuvable"});
  await pool.query("UPDATE users SET isadmin=$1 WHERE id=$2",[!u.isadmin,id]);
  res.json({status:`Admin ${!u.isadmin ? "activé" : "retiré"}`});
});
app.post("/admin/reset-bot", requireAuth, requireAdmin, async (req,res)=>{
  const { id } = req.body;
  await pool.query("UPDATE users SET botactiveuntil=0 WHERE id=$1",[id]);
  res.json({status:"Bot réinitialisé"});
});
app.post("/admin/delete-user", requireAuth, requireAdmin, async (req,res)=>{
  const { id } = req.body;
  const u = (await pool.query("SELECT * FROM users WHERE id=$1", [id])).rows[0];
  if(!u) return res.json({error: "Utilisateur introuvable"});
  if(u.isadmin) return res.json({error: "Impossible de supprimer un admin"});
  await pool.query("DELETE FROM users WHERE id=$1", [id]);
  await pool.query("DELETE FROM coin_history WHERE user_id=$1", [id]);
  await pool.query("DELETE FROM payments WHERE user_id=$1", [id]);
  res.json({status: `Utilisateur ${u.username} supprimé avec succès`});
});
app.post("/admin/modify-coins", requireAuth, requireAdmin, async (req,res)=>{
  const { id, change } = req.body;
  if(typeof change!=="number") return res.json({error:"Montant invalide"});
  const user = (await pool.query("SELECT * FROM users WHERE id=$1",[id])).rows[0];
  if(!user) return res.json({error:"Utilisateur introuvable"});
  const newCoins = Math.max(0,user.coins+change);
  await pool.query("BEGIN");
  await pool.query("UPDATE users SET coins=$1 WHERE id=$2",[newCoins,id]);
  await pool.query("INSERT INTO coin_history (user_id,change,reason) VALUES ($1,$2,'admin')",[id,change]);
  await pool.query("COMMIT");
  res.json({status:`Coins mis à jour: ${user.coins} → ${newCoins}`});
});

// ======================= ADMIN GIVE BOT TIME =======================
app.post("/admin/give-bot-time", requireAuth, requireAdmin, async (req,res)=>{
  try {
    const { id, hours } = req.body;

    // Validation
    if (![24,48,72].includes(hours)) return res.json({error:"Durée invalide"});

    const user = (await pool.query("SELECT * FROM users WHERE id=$1",[id])).rows[0];
    if(!user) return res.json({error:"Utilisateur introuvable"});

    const base = Math.max(Date.now(), user.botactiveuntil);
    const newUntil = base + hours * 3600000;

    await pool.query("UPDATE users SET botactiveuntil=$1 WHERE id=$2", [newUntil, id]);

    res.json({
      success: true,
      status: `Activation donnée: ${hours}h`,
      newBotUntil: newUntil
    });

    console.log(`✅ Admin a donné ${hours}h de bot à ${user.username}, actif jusqu'à ${new Date(newUntil)}`);
  } catch (err) {
    console.error(err);
    res.json({error:"Erreur serveur"});
  }
});

// ======================= START =======================
app.listen(PORT, () => {
  console.log("🚀 ROK XD lancé sur le port", PORT);
});
