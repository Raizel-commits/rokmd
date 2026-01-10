import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

/* ================== CONFIG ================== */
const MERCHANT_ID = "69620e03013a0771970d2b80";
const MF_API_KEY = "moneyfusion_v1_6950f6d898fe6dbde00af590_4A53FFA3DD9F78644E53269883CEB2C5CBD11FF72932C76BE5C8EC504D0DA82E";
const BASE_PAY_URL = "https://payin.moneyfusion.net/payment";

const usersFile = "./users.json";
const paymentsFile = "./payments.json";

if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, "[]");
if (!fs.existsSync(paymentsFile)) fs.writeFileSync(paymentsFile, "[]");

const loadUsers = () => { try { return JSON.parse(fs.readFileSync(usersFile, "utf-8")) || []; } catch { return []; } };
const saveUsers = d => fs.writeFileSync(usersFile, JSON.stringify(d, null, 2));
const loadPayments = () => { try { return JSON.parse(fs.readFileSync(paymentsFile, "utf-8")) || []; } catch { return []; } };
const savePayments = d => fs.writeFileSync(paymentsFile, JSON.stringify(d, null, 2));

/* ================== MIDDLEWARE ================== */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: "ROK_XD_SECRET", resave: false, saveUninitialized: false }));

const requireAuth = (req,res,next) => { if(!req.session.user) return res.redirect("/login"); next(); };

/* ================== ROUTES HTML ================== */
app.get("/", requireAuth, (req,res) => res.sendFile(path.resolve("index.html")));
app.get("/login", (req,res) => res.sendFile(path.resolve("login.html")));
app.get("/register", (req,res) => res.sendFile(path.resolve("register.html")));

/* ================== REGISTER ================== */
app.post("/register", (req,res)=>{
  const {username,password}=req.body;
  if(!username || !password) return res.send("Champs manquants");
  const users = loadUsers();
  if(users.find(u=>u.username===username)) return res.send("Utilisateur déjà existant");
  users.push({username,password,coins:0,botActiveUntil:0});
  saveUsers(users);
  res.redirect("/login");
});

/* ================== LOGIN ================== */
app.post("/login", (req,res)=>{
  const {username,password} = req.body;
  const users = loadUsers();
  const user = users.find(u=>u.username===username && u.password===password);
  if(!user) return res.send("Identifiants incorrects");
  req.session.user = { username: user.username };
  res.redirect("/");
});

/* ================== LOGOUT ================== */
app.get("/logout", (req,res)=>req.session.destroy(()=>res.redirect("/login")));

/* ================== COINS ================== */
app.get("/coins", requireAuth, (req,res)=>{
  const users = loadUsers();
  const user = users.find(u=>u.username===req.session.user.username);
  if(!user) return res.json({coins:0,botActiveRemaining:0});
  res.json({coins:user.coins, botActiveRemaining:Math.max(0,user.botActiveUntil-Date.now())});
});

/* ================== DEPOSIT ================== */
app.post("/deposit", requireAuth, async (req,res)=>{
  try{
    const {amount, operator, phone, name} = req.body;
    if(!amount||!operator||!phone||!name) return res.status(400).json({error:"Tous les champs sont requis"});
    const users = loadUsers();
    const user = users.find(u=>u.username===req.session.user.username);
    if(!user) return res.status(400).json({error:"Utilisateur introuvable"});

    const paymentId = `moneyfusion_${Date.now()}`;
    const response = await fetch("https://api.moneyfusion.net/v1/payments",{
      method:"POST",
      headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${MF_API_KEY}` },
      body:JSON.stringify({
        merchant_id:MERCHANT_ID,
        amount:parseInt(amount),
        currency:"XAF",
        payment_id:paymentId,
        operator,
        phone_number:phone,
        customer_name:name,
        redirect_url:`${req.protocol}://${req.get("host")}/payment-success`,
        webhook_url:`${req.protocol}://${req.get("host")}/webhook`
      })
    });

    const data = await response.json();
    if(!data.payment_url) return res.status(500).json({error:"Erreur création paiement"});

    const payments = loadPayments();
    payments.push({id:paymentId,user:user.username,amount:parseInt(amount),status:"pending"});
    savePayments(payments);

    res.json({paymentUrl:data.payment_url});
  }catch(err){console.error(err);res.status(500).json({error:"Erreur serveur"});}
});

/* ================== WEBHOOK ================== */
app.post("/webhook",(req,res)=>{
  const data=req.body;
  if(!data||data.status!=="success") return res.send("IGNORED");
  const payments = loadPayments();
  const pay = payments.find(p=>p.id===data.description);
  if(!pay) return res.send("NOT FOUND");
  if(pay.status==="success") return res.send("ALREADY PAID");
  pay.status="success";
  const users = loadUsers();
  const user = users.find(u=>u.username===pay.user);
  if(!user) return res.send("USER NOT FOUND");
  const coinsMap = {50:4,100:8,250:20,500:40,750:60,1000:80,1500:120,2000:160};
  user.coins += coinsMap[pay.amount]||0;
  savePayments(payments);
  saveUsers(users);
  res.send("OK");
});

/* ================== BUY BOT ================== */
app.post("/buy-bot",requireAuth,(req,res)=>{
  const {duration}=req.body;
  const prices={24:20,48:40,72:60};
  const users = loadUsers();
  const user = users.find(u=>u.username===req.session.user.username);
  if(!user) return res.json({error:"Utilisateur introuvable"});
  if(user.coins<prices[duration]) return res.json({error:"Coins insuffisants"});
  user.coins-=prices[duration];
  user.botActiveUntil=Math.max(user.botActiveUntil,Date.now())+duration*3600000;
  saveUsers(users);
  res.json({status:`Bot activé ${duration}h`,expires:user.botActiveUntil});
});

/* ================== PAIR & QR ================== */
function requireBotActive(req,res,next){
  const users=loadUsers();
  const user=users.find(u=>u.username===req.session.user.username);
  if(!user) return res.redirect("/login");
  if(!user.botActiveUntil||user.botActiveUntil<Date.now()) return res.send("Bot inactif, veuillez acheter du temps pour le déployer");
  next();
}
app.get("/pair",requireAuth,requireBotActive,(req,res)=>res.sendFile(path.join(__dirname,"pair.html")));
app.get("/qrpage",requireAuth,requireBotActive,(req,res)=>res.sendFile(path.join(__dirname,"qr.html")));

/* ================== 404 ================== */
app.use((req,res)=>res.status(404).send("Erreur 404 : Page non trouvée"));

/* ================== START SERVER ================== */
app.listen(PORT,()=>console.log(`✅ Server running on port ${PORT}`));
