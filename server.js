// =======================
// IMPORTS
// =======================
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pairRouter from './pair.js'; // <--- import de pair.js

dotenv.config();

// =======================
// PATH & PORT
// =======================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

// =======================
// EXPRESS SETUP
// =======================
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// =======================
// USERS DATA
// =======================
const USERS_FILE = path.join(__dirname, 'users.json');
const loadUsers = () => fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8')) : {};
const saveUsers = (users) => fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

// =======================
// API ROUTES LOGIN / DASHBOARD
// =======================
const router = express.Router();

// --- LOGIN / REGISTER
router.post('/login', async (req, res) => {
  const { email, password, referral } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Champs manquants' });

  const users = loadUsers();
  let user = Object.values(users).find(u => u.email === email);

  if (user) {
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Mot de passe incorrect' });
    return res.json({ message: 'Connecté', email: user.email, coins: user.coins });
  }

  // Création compte si inexistant
  const hashed = await bcrypt.hash(password, 10);
  const username = email.split('@')[0];
  users[username] = {
    email,
    password: hashed,
    coins: 10,
    lastDeploy: null,
    lastCoinAd: null,
    referrals: []
  };

  if (referral && users[referral]) {
    users[referral].coins += 5;
    users[referral].referrals.push(username);
  }

  saveUsers(users);
  return res.json({ message: 'Compte créé ! 10 coins attribués', email, coins: 10 });
});

// --- GET COINS
router.get('/coins/:email', (req,res)=>{
  const users = loadUsers();
  const user = Object.values(users).find(u => u.email === req.params.email);
  if(!user) return res.status(404).json({message:'Utilisateur introuvable'});
  res.json({coins: user.coins, referrals: user.referrals, deploys: user.deploys || 0});
});

// --- ADD COIN VIA PUB
router.post('/coins/add', (req,res)=>{
  const { email } = req.body;
  const users = loadUsers();
  const user = Object.values(users).find(u => u.email === email);
  if(!user) return res.status(404).json({message:'Utilisateur introuvable'});

  const now = Date.now();
  if(user.lastCoinAd && now - user.lastCoinAd < 5*60*1000){
    return res.status(400).json({message:'Attends avant de réclamer un autre coin'});
  }

  user.coins += 1;
  user.lastCoinAd = now;
  saveUsers(users);

  res.json({message:'1 coin ajouté !', coins: user.coins});
});

// --- DEPLOY
router.post('/deploy', (req,res)=>{
  const { email } = req.body;
  const users = loadUsers();
  const user = Object.values(users).find(u => u.email === email);
  if(!user) return res.status(404).json({message:'Utilisateur introuvable'});

  if(user.coins < 3) return res.status(400).json({message:'Pas assez de coins pour déployer (3 coins requis)'});
  user.coins -= 3;
  user.lastDeploy = Date.now();
  saveUsers(users);

  res.json({message:'Déploiement réussi ! 3 coins dépensés', coins: user.coins});
});

// --- PAIR LINK
router.post('/pair', (req,res)=>{
  const { email } = req.body;
  const users = loadUsers();
  const user = Object.values(users).find(u => u.email === email);
  if(!user) return res.status(404).json({message:'Utilisateur introuvable'});

  res.json({message:'Lien de parrainage généré !', coins: user.coins});
});

app.use('/api', router);

// =======================
// PAIR.JS ROUTES
// =======================
app.use('/', pairRouter); // pair.js gère /code et /config

// =======================
// PAGES HTML
// =======================
app.get('/', (req,res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req,res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/pair', (req,res) => res.sendFile(path.join(__dirname, 'pair.html')));

// =======================
// START SERVER
// =======================
app.listen(PORT, () => console.log(`🚀 Serveur actif sur le port ${PORT}`));
