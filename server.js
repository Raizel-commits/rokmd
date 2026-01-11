// ======================== IMPORTS ========================
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

// ======================== ES MODULE __dirname ========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================== CONFIG ========================
const PORT = process.env.PORT || 3000;
const MERCHANT_ID = "69620e03013a0771970d2b80";
const MF_API_KEY = "moneyfusion_v1_6950f6d898fe6dbde00af590_4A53FFA3DD9F78644E53269883CEB2C5CBD11FF72932C76BE5C8EC504D0DA82";

// ======================== FILES ========================
const usersFile = path.join(__dirname,"users.json");
const paymentsFile = path.join(__dirname,"payments.json");

if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, "[]");
if (!fs.existsSync(paymentsFile)) fs.writeFileSync(paymentsFile, "[]");

// ======================== HELPERS ========================
const loadUsers = () => {
  try { return JSON.parse(fs.readFileSync(usersFile,"utf-8")) || []; } 
  catch { return []; }
};
const saveUsers = (data) => fs.writeFileSync(usersFile, JSON.stringify(data,null,2));

const loadPayments = () => {
  try { return JSON.parse(fs.readFileSync(paymentsFile,"utf-8")) || []; } 
  catch { return []; }
};
const savePayments = (data) => fs.writeFileSync(paymentsFile, JSON.stringify(data,null,2));

// ======================== APP & MIDDLEWARE ========================
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: "ROK_XD_SECRET",
  resave: false,
  saveUninitialized: false
}));

const requireAuth = (req,res,next) => {
  if(!req.session.user) return res.redirect("/login");
  next();
};

const requireBotActive = (req,res,next) => {
  const users = loadUsers();
  const user = users.find(u=>u.username===req.session.user.username);
  if(!user) return res.redirect("/login");
  if(!user.botActiveUntil || user.botActiveUntil < Date.now()){
    return res.send(renderError("Bot inactif, veuillez acheter du temps pour le déployer","/"));
  }
  next();
};

function renderError(message,back="/"){
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

// ======================== ROUTES ========================

// Pages statiques
app.get("/", requireAuth, (req,res)=>res.sendFile(path.join(__dirname,"index.html")));
app.get("/login", (req,res)=>res.sendFile(path.join(__dirname,"login.html")));
app.get("/register", (req,res)=>res.sendFile(path.join(__dirname,"register.html")));
app.get("/pair", requireAuth, requireBotActive, (req,res)=>res.sendFile(path.join(__dirname,"pair.html")));
app.get("/qrpage", requireAuth, requireBotActive, (req,res)=>res.sendFile(path.join(__dirname,"qr.html")));

// Auth
app.post("/register",(req,res)=>{
  const { username,password } = req.body;
  if(!username || !password) return res.send("Champs manquants");
  const users = loadUsers();
  if(users.find(u=>u.username===username)) return res.send("Nom d'utilisateur déjà utilisé");
  users.push({ username,password,coins:0,botActiveUntil:0 });
  saveUsers(users);
  res.redirect("/login");
});

app.post("/login",(req,res)=>{
  const { username,password } = req.body;
  const users = loadUsers();
  const user = users.find(u=>u.username===username && u.password===password);
  if(!user) return res.send("Identifiants incorrects");
  req.session.user = { username:user.username };
  res.redirect("/");
});

app.get("/logout",(req,res)=>{
  req.session.destroy(()=>res.redirect("/login"));
});

// Coins API
app.get("/coins", requireAuth, (req,res)=>{
  const users = loadUsers();
  const user = users.find(u=>u.username===req.session.user.username);
  if(!user) return res.status(401).json({error:"Non autorisé"});
  const remainingTime = Math.max(0,user.botActiveUntil-Date.now());
  res.json({coins:user.coins||0,botActiveRemaining:remainingTime});
});

// Activation bot avec coins
app.post("/buy-bot", requireAuth, (req,res)=>{
  const duration = parseInt(req.body.duration);
  const prices = {24:20,48:40,72:60};
  if(!prices[duration]) return res.json({error:"Durée invalide"});
  const users = loadUsers();
  const user = users.find(u=>u.username===req.session.user.username);
  if((user.coins||0) < prices[duration]) return res.json({error:`Coins insuffisants (${prices[duration]} requis)`});
  user.coins -= prices[duration];
  const now = Date.now();
  const prev = user.botActiveUntil>now?user.botActiveUntil:now;
  user.botActiveUntil = prev + duration*3600*1000;
  saveUsers(users);
  res.json({status:`Bot activé pour ${duration}h`,expires:user.botActiveUntil});
});

// Paiement activation via MoneyFusion (FCFA)
app.post("/pay-activation", requireAuth, async (req,res)=>{
  try{
    const { amount,duration } = req.body; // duration = heures à activer
    const users = loadUsers();
    const user = users.find(u=>u.username===req.session.user.username);
    if(!user) return res.status(400).json({error:"Utilisateur introuvable"});
    
    const paymentId = "MF_"+Date.now();
    const response = await fetch("https://api.moneyfusion.net/v1/payin",{
      method:"POST",
      headers: {"Content-Type":"application/json","Authorization":`Bearer ${MF_API_KEY}`},
      body: JSON.stringify({
        merchant_id: MERCHANT_ID,
        amount: Number(amount),
        currency: "XAF",
        payment_id: paymentId,
        redirect_url: `${req.protocol}://${req.get("host")}/payment-success?user=${user.username}&duration=${duration}&paymentId=${paymentId}`,
        webhook_url: `${req.protocol}://${req.get("host")}/webhook`
      })
    });
    const data = await response.json();
    res.json({paymentUrl:data.data?.url});
  }catch(e){console.error(e);res.status(500).json({error:"Erreur serveur"});}
});

// MoneyFusion Webhook
app.post("/webhook",(req,res)=>{
  const data = req.body;
  if(!data || data.status!=="success") return res.send("IGNORED");
  const payments = loadPayments();
  const pay = payments.find(p=>p.id===data.payment_id);
  if(!pay) return res.send("NOT FOUND");
  if(pay.status==="success") return res.send("ALREADY PAID");
  pay.status="success";
  const users = loadUsers();
  const user = users.find(u=>u.username===pay.user);
  if(!user) return res.send("USER NOT FOUND");
  const coinsMap = {50:4,100:8,250:20,500:40,750:60,1000:80,1500:120,2000:160};
  user.coins += coinsMap[pay.amount]||0;
  saveUsers(users);
  savePayments(payments);
  res.send("OK");
});

// Payment success redirect (active bot after FCFA payment)
app.get("/payment-success", requireAuth, (req,res)=>{
  const { user:username,duration,paymentId } = req.query;
  const users = loadUsers();
  const user = users.find(u=>u.username===username);
  if(!user) return res.send("Utilisateur non trouvé");
  const dur = parseInt(duration);
  const now = Date.now();
  const prev = user.botActiveUntil>now?user.botActiveUntil:now;
  user.botActiveUntil = prev + dur*3600*1000;
  saveUsers(users);
  res.send(renderError(`Bot activé pour ${dur}h !`,"/"));
});

// ======================== START SERVER ========================
app.listen(PORT,()=>console.log(`✅ Server lancé sur le port ${PORT}`));
