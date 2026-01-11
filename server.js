// server.js
import express from "express";
import session from "express-session";
import FileStore from "session-file-store";
import bodyParser from "body-parser";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import chalk from "chalk";

import pairRouter from "./pair.js"; // le routeur pair-api corrigé

/* ========== PATHS ========== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

/* ========== FILES ========== */
const usersFile = path.join(__dirname, "users.json");
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, "[]");

/* ========== HELPERS ========== */
const loadUsers = () => {
  try { return JSON.parse(fs.readFileSync(usersFile, "utf-8")) || []; } 
  catch (err) {
    console.error(chalk.red("[ERROR] Impossible de charger users.json"), err);
    return [];
  }
};
const saveUsers = (d) => {
  try { fs.writeFileSync(usersFile, JSON.stringify(d, null, 2)); }
  catch (err) { console.error(chalk.red("[ERROR] Impossible de sauvegarder users.json"), err); }
};

/* ========== EXPRESS ========== */
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/* ========== SESSION ========== */
const FileStoreSession = FileStore(session);
app.use(session({
  store: new FileStoreSession({ path: "./session_store", retries: 1, ttl: 24*60*60 }),
  secret: "SECRET_KEY",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24*60*60*1000 }
}));

/* ========== AUTH MIDDLEWARE ========== */
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    console.warn(chalk.yellow("[WARN] Tentative d'accès non autorisée à", req.originalUrl));
    return res.status(401).json({ error: "Non connecté" });
  }
  next();
};

/* ========== ROUTES HTML ========== */
app.get("/", requireAuth, (req,res) => res.sendFile(path.join(__dirname,"index.html")));
app.get("/pair", requireAuth, (req,res) => res.sendFile(path.join(__dirname,"pair.html")));
app.get("/qrpage", requireAuth, (req,res) => res.sendFile(path.join(__dirname,"qr.html")));
app.get("/login", (req,res) => res.sendFile(path.join(__dirname,"login.html")));
app.get("/register", (req,res) => res.sendFile(path.join(__dirname,"register.html")));

/* ========== AUTH API ========== */
app.post("/register", (req,res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ error: "Champs manquants" });

    const users = loadUsers();
    if (users.find(u=>u.username===username)) return res.json({ error: "Utilisateur déjà utilisé" });

    users.push({ username, password, coins: 20, botActiveUntil: 0, botNumber: null });
    saveUsers(users);

    console.log(chalk.green(`[INFO] Nouveau compte créé : ${username}`));
    res.json({ status: "Compte créé ! Vous avez 20 coins" });
  } catch (err) {
    console.error(chalk.red("[ERROR] /register"), err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/login", (req,res) => {
  try {
    const { username, password } = req.body;
    const users = loadUsers();
    const user = users.find(u=>u.username===username && u.password===password);
    if (!user) {
      console.warn(chalk.yellow(`[WARN] Échec login pour : ${username}`));
      return res.json({ error: "Identifiants incorrects" });
    }

    req.session.user = { username: user.username };
    console.log(chalk.green(`[INFO] Utilisateur connecté : ${username}`));
    res.json({ status: "Connecté avec succès" });
  } catch (err) {
    console.error(chalk.red("[ERROR] /login"), err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/logout", requireAuth, (req,res) => {
  const username = req.session.user.username;
  req.session.destroy(err=>{
    if(err) console.error(chalk.red("[ERROR] /logout"), err);
    else console.log(chalk.green(`[INFO] Utilisateur déconnecté : ${username}`));
    res.json({ status:"Déconnecté" });
  });
});

/* ========== COINS API ========== */
app.get("/coins", requireAuth, (req,res) => {
  try {
    const users = loadUsers();
    const user = users.find(u=>u.username===req.session.user.username);
    if (!user) return res.json({ error: "Utilisateur introuvable" });
    res.json({ coins: user.coins, botActiveRemaining: Math.max(0, user.botActiveUntil-Date.now()) });
  } catch (err) {
    console.error(chalk.red("[ERROR] /coins"), err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ========== PAIR-API ROUTER ========== */
app.use("/pair-api", requireAuth, pairRouter);

/* ========== GLOBAL ERROR HANDLER ========== */
app.use((err, req, res, next) => {
  console.error(chalk.red("[ERROR GLOBAL]"), err);
  res.status(500).json({ error: "Erreur serveur" });
});

/* ========== START SERVER ========== */
app.listen(PORT, () => console.log(chalk.cyanBright(`🚀 Server actif sur le port ${PORT}`)));
