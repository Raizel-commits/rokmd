// =======================
// IMPORTS
// =======================
import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import chalk from 'chalk';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import qrRouter from './qr.js';
import pairRouter from './pair.js';

dotenv.config();

// =======================
// EXPRESS SETUP
// =======================
const app = express();
const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.API_KEY || "demo-key";

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));
app.use(helmet());

// =======================
// RATE LIMIT SUR API
// =======================
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Trop de requêtes, réessaye plus tard." }
});
app.use("/api", apiLimiter);

// =======================
// API KEY middleware (sur /api seulement)
app.use("/api", (req, res, next) => {
  const key = req.header("x-api-key");
  if (!key || key !== API_KEY) return res.status(401).json({ error: "Non autorisé" });
  next();
});

// =======================
// USERS DATA
// =======================
const USERS_FILE = path.join('.', 'users.json');
const loadUsers = () => fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE,'utf-8')) : {};
const saveUsers = (users) => fs.writeFileSync(USERS_FILE, JSON.stringify(users,null,2));

// =======================
// API ROUTES
// =======================
const router = express.Router();

// --- LOGIN / REGISTER par email
router.post('/login', async (req,res)=>{
  const { username, email, password, referral } = req.body;
  const users = loadUsers();

  // Connexion par email
  const userByEmail = Object.entries(users).find(([uName,u])=> u.email===email);
  if(userByEmail){
    const [uName, user] = userByEmail;
    const valid = await bcrypt.compare(password,user.password);
    if(!valid) return res.status(401).json({message:'Mot de passe incorrect', mode:'login'});
    return res.json({message:'Connecté', coins:user.coins, mode:'login'});
  }

  // Inscription
  if(!username) return res.status(400).json({message:'Nom d\'utilisateur requis pour inscription', mode:'register'});
  if(Object.values(users).some(u=>u.email===email)) return res.status(400).json({message:'Email déjà utilisé', mode:'register'});

  const hashed = await bcrypt.hash(password,10);
  users[username] = { email, password:hashed, coins:10, lastDeploy:null, lastCoinAd:null, referrals:[] };

  if(referral && users[referral]){
    users[referral].coins +=5;
    users[referral].referrals.push(username);
  }

  saveUsers(users);
  return res.json({message:'Compte créé ! 10 coins attribués', coins:10, mode:'register'});
});

// --- GET COINS
router.get('/coins/:email',(req,res)=>{
  const users = loadUsers();
  const user = Object.values(users).find(u=>u.email===req.params.email);
  if(!user) return res.status(404).json({message:'Utilisateur introuvable'});
  res.json({coins:user.coins, referrals:user.referrals});
});

// --- ADD COIN VIA PUB
router.post('/coins/add',(req,res)=>{
  const { email } = req.body;
  const users = loadUsers();
  const user = Object.values(users).find(u=>u.email===email);
  if(!user) return res.status(404).json({message:'Utilisateur introuvable'});

  const now = Date.now();
  if(user.lastCoinAd && now-user.lastCoinAd<5*60*1000) return res.status(400).json({message:'Attends avant de réclamer un autre coin'});

  user.coins +=1;
  user.lastCoinAd = now;
  saveUsers(users);
  res.json({message:'1 coin ajouté !', coins:user.coins});
});

// --- DEPLOY
router.post('/deploy',(req,res)=>{
  const { email } = req.body;
  const users = loadUsers();
  const user = Object.values(users).find(u=>u.email===email);
  if(!user) return res.status(404).json({message:'Utilisateur introuvable'});

  if(user.coins<3) return res.status(400).json({message:'Pas assez de coins pour déployer (3 coins requis)'});
  user.coins -=3;
  user.lastDeploy = Date.now();
  saveUsers(users);

  res.json({message:'Déploiement réussi ! 3 coins dépensés', coins:user.coins});
});

// --- PAIR LINK
router.post('/pair',(req,res)=>{
  const { email } = req.body;
  const users = loadUsers();
  const user = Object.values(users).find(u=>u.email===email);
  if(!user) return res.status(404).json({message:'Utilisateur introuvable'});

  res.json({message:'Lien de parrainage généré ! (5 coins seront ajoutés à chaque filleul)', coins:user.coins});
});

// =======================
// ROUTES
// =======================
app.use('/api', router);           // API principale
app.use('/qr', qrRouter);          // panel QR
app.use('/', pairRouter);          // panel Pairing

// Pages statiques
app.get('/', (_, res) => res.sendFile(path.join('.', 'index.html')));
app.get('/login', (_, res) => res.sendFile(path.join('.', 'login.html')));
app.get('/pair', (_, res) => res.sendFile(path.join('.', 'pair.html')));
app.get('/qrpage', (_, res) => res.sendFile(path.join('.', 'qr.html')));

// =======================
// START SERVER
// =======================
app.listen(PORT, ()=>console.log(chalk.cyanBright(`🚀 Serveur actif sur le port ${PORT}`)));
