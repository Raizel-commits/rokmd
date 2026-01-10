
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// =================== USERS FILE ===================
const usersFile = path.join(__dirname, "users.json");
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, JSON.stringify([]));

// =================== MERCHANT ID ===================
const MERCHANT_ID = "moneyfusion_v1_6950f6d898fe6dbde00af590_4A53FFA3DD9F78644E53269883CEB2C5CBD11FF72932C76BE5C8EC504D0DA82E";

// =================== HELPERS ===================
function loadUsers() {
  try {
    const data = fs.readFileSync(usersFile, "utf-8");
    return Array.isArray(JSON.parse(data)) ? JSON.parse(data) : [];
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

// =================== MIDDLEWARE ===================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: "SECRETSTORY_N_AUTH",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

function requireAuth(req,res,next){
  if(!req.session.user) return res.redirect("/login");
  next();
}

// =================== ROUTES PUBLIC ===================
app.get("/login",(req,res)=>res.sendFile(path.join(__dirname,"login.html")));
app.get("/register",(req,res)=>res.sendFile(path.join(__dirname,"register.html")));

// =================== REGISTER ===================
app.post("/register",(req,res)=>{
  const {username,password,ref} = req.body;
  const users = loadUsers();
  if(!username || !password) return res.send(renderError("Champs manquants","/register"));
  if(users.some(u=>u.username===username)) return res.send(renderError("Utilisateur déjà existant","/register"));

  let coins = 20;
  if(ref){
    const parent = users.find(u=>u.username===ref);
    if(parent) parent.coins = (parent.coins||0)+5;
  }

  users.push({ username,password,coins,botActiveUntil:0 });
  saveUsers(users);
  res.redirect("/login");
});

// =================== LOGIN ===================
app.post("/login",(req,res)=>{
  const {username,password} = req.body;
  const users = loadUsers();
  const user = users.find(u=>u.username===username && u.password===password);
  if(!user) return res.send(renderError("Identifiants incorrects","/login"));
  req.session.user = user;
  res.redirect("/");
});

// =================== LOGOUT ===================
app.get("/logout",(req,res)=>req.session.destroy(()=>res.redirect("/login")));

// =================== FRONT PAGE ===================
app.get("/",requireAuth,(req,res)=>res.sendFile(path.join(__dirname,"index.html")));

// =================== API COINS ===================
app.get("/coins",requireAuth,(req,res)=>{
  const users = loadUsers();
  const user = users.find(u=>u.username===req.session.user.username);
  if(!user) return res.status(401).json({error:"Non autorisé"});
  const remainingTime = Math.max(0,user.botActiveUntil-Date.now());
  res.json({coins:user.coins||0,botActiveRemaining:remainingTime});
});

// =================== ADD COINS (Money Fusion) ===================
app.post("/deposit",requireAuth,async (req,res)=>{
  const {amount, operator, phoneNumber, accountName} = req.body;
  if(!amount || !operator || !phoneNumber || !accountName)
    return res.json({error:"Champs manquants"});

  const users = loadUsers();
  const user = users.find(u=>u.username===req.session.user.username);

  try {
    // URL de paiement Money Fusion
    const paymentUrl = `https://payin.moneyfusion.net/payment/${MERCHANT_ID}/${amount}/Achat-coins`;

    // Ici tu pourrais faire un POST sur l'API Money Fusion si nécessaire
    // Pour l'instant, on renvoie l'URL pour rediriger l'utilisateur
    res.json({
      status: "ok",
      paymentUrl,
      instructions: `Suivez ce lien pour payer : ${paymentUrl}`
    });

  } catch(err){
    console.error('Money Fusion error:', err.message);
    res.json({error:"Erreur lors de l'initiation du paiement"});
  }
});

// =================== MONEY FUSION WEBHOOK ===================
app.post("/webhook", (req,res)=>{
  const data = req.body;
  console.log("Webhook reçu :", data);

  try {
    if(data.status !== "success") return res.status(200).send("Paiement non réussi");

    const users = loadUsers();
    const userId = data.personal_Info[0].userId;
    const user = users.find(u => u.username === userId);
    if(!user) return res.status(404).send("Utilisateur introuvable");

    // Déterminer coins selon montant payé
    const coinsMap = {50:4,100:8,250:20,500:40,750:60,1000:80,1500:120,2000:160};
    const amount = parseInt(data.totalPrice);
    const coinsToAdd = coinsMap[amount] || 0;
    if(coinsToAdd === 0) return res.status(400).send("Montant invalide");

    user.coins = (user.coins || 0) + coinsToAdd;
    saveUsers(users);
    console.log(`✅ ${coinsToAdd} coins ajoutés à ${user.username}`);

    res.status(200).send("Coins ajoutés avec succès");
  } catch(err){
    console.error("Erreur webhook:", err.message);
    res.status(500).send("Erreur serveur");
  }
});

// =================== PURCHASE BOT ===================
app.post("/buy-bot",requireAuth,(req,res)=>{
  const duration = parseInt(req.body.duration);
  const prices = {24:20,48:40,72:60};
  const users = loadUsers();
  const user = users.find(u=>u.username===req.session.user.username);
  if(!prices[duration]) return res.json({error:"Durée invalide"});
  if((user.coins||0)<prices[duration]) return res.json({error:`Coins insuffisants (${prices[duration]} requis)`});

  user.coins -= prices[duration];
  const now = Date.now();
  const previous = user.botActiveUntil>now?user.botActiveUntil:now;
  user.botActiveUntil = previous + duration*3600*1000;
  saveUsers(users);
  req.session.user = user;
  res.json({status:`Bot activé pour ${duration}h`,expires:user.botActiveUntil});
});

// =================== PAIR & QR (require bot actif) ===================
function requireBotActive(req,res,next){
  const users = loadUsers();
  const user = users.find(u=>u.username===req.session.user.username);
  if(!user) return res.redirect("/login");
  if(!user.botActiveUntil || user.botActiveUntil<Date.now()){
    return res.send(renderError("Bot inactif, veuillez acheter du temps pour le déployer","/"));
  }
  next();
}

app.get("/pair",requireAuth,requireBotActive,(req,res)=>res.sendFile(path.join(__dirname,"pair.html")));
app.get("/qrpage",requireAuth,requireBotActive,(req,res)=>res.sendFile(path.join(__dirname,"qr.html")));

// =================== ROUTERS EXISTANTS ===================
import qrRouter from "./qr.js";
import pairRouter from "./pair.js";
app.use("/qr",requireAuth,qrRouter);
app.use("/",requireAuth,pairRouter);

// =================== 404 ===================
app.use((req,res)=>res.status(404).send(renderError("Erreur 404: Page non trouvée","/")));

app.listen(PORT,()=>console.log(`✅ Server running on port ${PORT}`));
