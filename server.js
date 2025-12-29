import express from "express";
import fs from "fs-extra";
import path from "path";
import bcrypt from "bcrypt";

const app = express();
const PORT = process.env.PORT || 8000;

const __dirname = path.resolve();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// --- Fichiers stockage ---
const USERS_FILE = path.join(__dirname, "data", "users.json");
const SESSIONS_FILE = path.join(__dirname, "data", "sessions.json");

// Création des dossiers/fichiers si manquant
fs.ensureDirSync(path.join(__dirname, "data"));
if(!fs.existsSync(USERS_FILE)) fs.writeJsonSync(USERS_FILE, {});
if(!fs.existsSync(SESSIONS_FILE)) fs.writeJsonSync(SESSIONS_FILE, {});

// --- Utilitaires ---
function loadUsers(){ return fs.readJsonSync(USERS_FILE); }
function saveUsers(users){ fs.writeJsonSync(USERS_FILE, users); }
function loadSessions(){ return fs.readJsonSync(SESSIONS_FILE); }
function saveSessions(sessions){ fs.writeJsonSync(SESSIONS_FILE, sessions); }

function requireAuth(req,res,next){
  const sessionId = req.headers["x-session-id"];
  const sessions = loadSessions();
  if(!sessionId || !sessions[sessionId]){
    return res.status(401).json({ message:"Non autorisé" });
  }
  req.user = sessions[sessionId];
  next();
}

// --- Auth ---
app.post("/auth/register", async (req,res)=>{
  const {username,email,password} = req.body;
  if(!username || !email || !password) return res.json({message:"Tous les champs sont requis"});
  
  const users = loadUsers();
  if(users[email]) return res.json({message:"Email déjà utilisé"});
  
  const hash = await bcrypt.hash(password,10);
  users[email] = { username, email, password: hash };
  saveUsers(users);
  
  res.json({message:"Inscription succès"});
});

app.post("/auth/login", async (req,res)=>{
  const {email,password} = req.body;
  const users = loadUsers();
  if(!users[email]) return res.json({message:"Utilisateur introuvable"});
  
  const match = await bcrypt.compare(password, users[email].password);
  if(!match) return res.json({message:"Mot de passe incorrect"});
  
  // Création session
  const sessionId = Math.random().toString(36).substring(2,15);
  const sessions = loadSessions();
  sessions[sessionId] = { email, username: users[email].username, created: Date.now() };
  saveSessions(sessions);
  
  res.json({message:`Bienvenue ${users[email].username}`, sessionId});
});

// --- Pairing ---
app.get("/code", requireAuth, (req,res)=>{
  const number = req.query.number;
  if(!number) return res.json({error:"Numéro requis"});
  // Ici on simule le code
  const code = Math.floor(100000 + Math.random()*900000).toString();
  res.json({code});
});

// --- Config ---
app.post("/config", requireAuth, (req,res)=>{
  const {number,prefix} = req.body;
  if(!number) return res.json({error:"Numéro requis"});
  const configFile = path.join(__dirname,"data","config.json");
  let configs = {};
  if(fs.existsSync(configFile)) configs = fs.readJsonSync(configFile);
  configs[number] = { prefix };
  fs.writeJsonSync(configFile, configs);
  res.json({status:"Config sauvegardée"});
});

// --- QR ---
app.get("/qr", requireAuth, (req,res)=>{
  // Ici on renvoie une image QR simulée (ou tu peux générer avec qrcode)
  res.json({qr:"https://via.placeholder.com/220?text=QR+Code"});
});

// --- Pages HTML ---
app.get("/", (req,res)=>res.sendFile(path.join(__dirname,"index.html")));
app.get("/register",(req,res)=>res.sendFile(path.join(__dirname,"register.html")));
app.get("/pair",(req,res)=>res.sendFile(path.join(__dirname,"pair.html")));
app.get("/qrpage",(req,res)=>res.sendFile(path.join(__dirname,"qr.html")));

// --- Lancer serveur ---
app.listen(PORT, ()=>{
  console.log(`🚀 RAIZEL-XMD running at http://localhost:${PORT}`);
});
