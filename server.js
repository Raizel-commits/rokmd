
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

/* ================== CONFIG MONEY FUSION ================== */
const MERCHANT_ID = "69620e03013a0771970d2b80"; // ton Merchant ID
const BASE_PAY_URL = "https://payin.moneyfusion.net/payment";

/* ================== FILES ================== */
const usersFile = "./users.json";
const paymentsFile = "./payments.json";
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, "[]");
if (!fs.existsSync(paymentsFile)) fs.writeFileSync(paymentsFile, "[]");

const loadUsers = () => JSON.parse(fs.readFileSync(usersFile));
const saveUsers = (d) => fs.writeFileSync(usersFile, JSON.stringify(d, null, 2));
const loadPayments = () => JSON.parse(fs.readFileSync(paymentsFile));
const savePayments = (d) => fs.writeFileSync(paymentsFile, JSON.stringify(d, null, 2));

/* ================== MIDDLEWARE ================== */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: "ROK_XD_SECRET",
  resave: false,
  saveUninitialized: false
}));

const requireAuth = (req,res,next)=>{
  if(!req.session.user) return res.redirect("/login");
  next();
};

/* ================== HTML ================== */
app.get("/", requireAuth, (req,res)=>res.sendFile(path.resolve("index.html")));
app.get("/login", (req,res)=>res.sendFile(path.resolve("login.html")));
app.get("/register", (req,res)=>res.sendFile(path.resolve("register.html")));

/* ================== REGISTER ================== */
app.post("/register",(req,res)=>{
  const { username,password } = req.body;
  const users = loadUsers();
  if(!username || !password) return res.send("Champs manquants");
  if(users.find(u=>u.username===username)) return res.send("Utilisateur déjà existant");

  users.push({ username,password,coins:0,botActiveUntil:0 });
  saveUsers(users);
  res.redirect("/login");
});

/* ================== LOGIN ================== */
app.post("/login",(req,res)=>{
  const { username,password } = req.body;
  const users = loadUsers();
  const user = users.find(u=>u.username===username && u.password===password);
  if(!user) return res.send("Identifiants incorrects");
  req.session.user = user;
  res.redirect("/");
});

/* ================== LOGOUT ================== */
app.get("/logout",(req,res)=>{
  req.session.destroy(()=>res.redirect("/login"));
});

/* ================== COINS ================== */
app.get("/coins", requireAuth, (req,res)=>{
  const users = loadUsers();
  const user = users.find(u=>u.username===req.session.user.username);
  res.json({
    coins: user.coins,
    botActiveRemaining: Math.max(0, user.botActiveUntil - Date.now())
  });
});

/* ================== DEPOSIT ================== */
app.post("/deposit", requireAuth, (req,res)=>{
  try {
    const { amount } = req.body;
    const users = loadUsers();
    const user = users.find(u=>u.username===req.session.user.username);
    if(!user) return res.status(400).json({error:"Utilisateur introuvable"});

    const paymentId = `moneyfusion_${Date.now()}`;
    const payments = loadPayments();
    payments.push({
      id: paymentId,
      user: user.username,
      amount: parseInt(amount),
      status: "pending"
    });
    savePayments(payments);

    const payUrl = `${BASE_PAY_URL}/${MERCHANT_ID}/${amount}/${paymentId}`;
    res.json({ paymentUrl: payUrl }); // ⚡ clé paymentUrl pour le HTML
  } catch(err){
    console.error(err);
    res.status(500).json({ error:"Erreur serveur lors de la création du paiement" });
  }
});

/* ================== WEBHOOK ================== */
app.post("/webhook", (req,res)=>{
  const data = req.body;
  if(data.status !== "success") return res.send("IGNORED");

  const payments = loadPayments();
  const pay = payments.find(p=>p.id === data.description);
  if(!pay) return res.send("NOT FOUND");
  if(pay.status === "success") return res.send("ALREADY PAID");

  pay.status = "success";

  const users = loadUsers();
  const user = users.find(u=>u.username===pay.user);
  if(!user) return res.send("USER NOT FOUND");

  const coinsMap = {50:4,100:8,250:20,500:40,750:60,1000:80,1500:120,2000:160};
  user.coins += coinsMap[pay.amount] || 0;

  savePayments(payments);
  saveUsers(users);

  res.send("OK");
});

/* ================== BUY BOT ================== */
app.post("/buy-bot", requireAuth, (req,res)=>{
  const { duration } = req.body;
  const prices = {24:20,48:40,72:60};
  const users = loadUsers();
  const user = users.find(u=>u.username===req.session.user.username);
  if(user.coins < prices[duration]) return res.json({error:"Coins insuffisants"});

  user.coins -= prices[duration];
  user.botActiveUntil = Math.max(user.botActiveUntil, Date.now()) + duration*3600000;

  saveUsers(users);
  res.json({status:`Bot activé ${duration}h`, expires:user.botActiveUntil});
});

/* ================== PAIR & QR ================== */
function requireBotActive(req,res,next){
  const users = loadUsers();
  const user = users.find(u => u.username === req.session.user.username);
  if(!user) return res.redirect("/login");
  if(!user.botActiveUntil || user.botActiveUntil < Date.now()){
    return res.send("Bot inactif, veuillez acheter du temps pour le déployer");
  }
  next();
}
app.get("/pair", requireAuth, requireBotActive, (req,res)=>res.sendFile(path.join(__dirname,"pair.html")));
app.get("/qrpage", requireAuth, requireBotActive, (req,res)=>res.sendFile(path.join(__dirname,"qr.html")));

/* ================== 404 ================== */
app.use((req,res)=>res.status(404).send("Erreur 404 : Page non trouvée"));

/* ================== START SERVER ================== */
app.listen(PORT,()=>console.log(`✅ Server running on port ${PORT}`));
