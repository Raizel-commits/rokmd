
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

// ================= CONFIG =================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ⚠️ REMPLACE PAR TON DOMAINE RENDER / VPS
const BASE_URL = "https://rokmd.onrender.com";

// ================= USERS STORAGE =================
const usersFile = path.join(__dirname, "users.json");
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, JSON.stringify([]));

const loadUsers = () => {
  try { return JSON.parse(fs.readFileSync(usersFile)); }
  catch { return []; }
};
const saveUsers = (u) => fs.writeFileSync(usersFile, JSON.stringify(u, null, 2));

// ================= MIDDLEWARE =================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: "ROKXD_SECRET_SESSION",
  resave: false,
  saveUninitialized: false
}));

function requireAuth(req,res,next){
  if(!req.session.user) return res.redirect("/login");
  next();
}

// ================= AUTH =================
app.get("/login",(req,res)=>res.sendFile(path.join(__dirname,"login.html")));
app.get("/register",(req,res)=>res.sendFile(path.join(__dirname,"register.html")));

app.post("/register",(req,res)=>{
  const {username,password,ref} = req.body;
  if(!username || !password) return res.redirect("/register");

  const users = loadUsers();
  if(users.find(u=>u.username===username)) return res.redirect("/register");

  let coins = 20;
  if(ref){
    const parent = users.find(u=>u.username===ref);
    if(parent) parent.coins += 5;
  }

  users.push({ username,password,coins,botActiveUntil:0 });
  saveUsers(users);
  res.redirect("/login");
});

app.post("/login",(req,res)=>{
  const {username,password} = req.body;
  const users = loadUsers();
  const user = users.find(u=>u.username===username && u.password===password);
  if(!user) return res.redirect("/login");
  req.session.user = user;
  res.redirect("/");
});

app.get("/logout",(req,res)=>req.session.destroy(()=>res.redirect("/login")));

// ================= FRONT =================
app.get("/",requireAuth,(req,res)=>res.sendFile(path.join(__dirname,"index.html")));

// ================= COINS API =================
app.get("/coins",requireAuth,(req,res)=>{
  const users = loadUsers();
  const user = users.find(u=>u.username===req.session.user.username);
  const remaining = Math.max(0, user.botActiveUntil - Date.now());
  res.json({ coins:user.coins, botActiveRemaining: remaining });
});

// ================= MONEY FUSION =================
app.post("/deposit",requireAuth, async (req,res)=>{
  const {amount, phoneNumber, accountName} = req.body;
  if(!amount || !phoneNumber || !accountName)
    return res.json({error:"Champs manquants"});

  try {
    const payload = {
      totalPrice: String(amount),
      article: [{ name:"Depot ROK XD", price:String(amount), quantity:1 }],
      numeroSend: phoneNumber,
      nomclient: accountName.substring(0,50),
      personal_Info: [{
        userId: req.session.user.username,
        orderId: "ROK-"+Date.now()
      }],
      return_url: BASE_URL,
      webhook_url: `${BASE_URL}/webhook`
    };

    await axios.post(
      "https://www.pay.moneyfusion.net/MINETROL/4a03462391c4bc96/pay",
      payload,
      { timeout:60000 }
    );

    res.json({ status:"Paiement initié. Confirme sur ton téléphone." });

  } catch(e){
    console.error("MoneyFusion:", e.message);
    res.json({ error:"Erreur paiement" });
  }
});

// ================= WEBHOOK =================
app.post("/webhook",(req,res)=>{
  const data = req.body;
  console.log("Webhook:", data);

  if(data.status !== "success") return res.sendStatus(200);

  const info = data.personal_Info?.[0];
  if(!info) return res.sendStatus(200);

  const users = loadUsers();
  const user = users.find(u=>u.username===info.userId);
  if(!user) return res.sendStatus(200);

  const coinsMap = {
    250:20,
    500:40,
    750:60,
    1000:80,
    1500:120,
    2000:160
  };

  const coins = coinsMap[parseInt(data.totalPrice)];
  if(!coins) return res.sendStatus(200);

  user.coins += coins;
  saveUsers(users);

  console.log(`✅ ${coins} coins ajoutés à ${user.username}`);
  res.sendStatus(200);
});

// ================= BOT PURCHASE =================
app.post("/buy-bot",requireAuth,(req,res)=>{
  const prices = {24:20,48:40,72:60};
  const hours = parseInt(req.body.duration);

  const users = loadUsers();
  const user = users.find(u=>u.username===req.session.user.username);

  if(!prices[hours]) return res.json({error:"Durée invalide"});
  if(user.coins < prices[hours]) return res.json({error:"Coins insuffisants"});

  user.coins -= prices[hours];
  user.botActiveUntil = Math.max(Date.now(), user.botActiveUntil) + hours*3600000;
  saveUsers(users);

  res.json({ status:`Bot activé ${hours}h`, expires:user.botActiveUntil });
});

// ================= BOT ACCESS =================
function requireBot(req,res,next){
  const users = loadUsers();
  const user = users.find(u=>u.username===req.session.user.username);
  if(user.botActiveUntil < Date.now()) return res.redirect("/");
  next();
}

app.get("/pair",requireAuth,requireBot,(req,res)=>res.sendFile(path.join(__dirname,"pair.html")));
app.get("/qrpage",requireAuth,requireBot,(req,res)=>res.sendFile(path.join(__dirname,"qr.html")));

// ================= START =================
app.listen(PORT,()=>console.log("🚀 ROK XD Server running on port",PORT));
