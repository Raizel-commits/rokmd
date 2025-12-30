import express from "express";
import path from "path";
import fs from "fs-extra";
import bcrypt from "bcryptjs";
import qrRouter from "./qr.js";
import pairRouter from "./pair.js";

const app = express();
const PORT = process.env.PORT || 8000;
const __dirname = path.resolve();

// Middleware pour parser JSON et URL
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (CSS, JS)
app.use(express.static(__dirname));

// --- Dossiers et fichiers pour persistance ---
fs.ensureDirSync(path.join(__dirname, "data"));
const USERS_FILE = path.join(__dirname, "data", "users.json");
const SESSIONS_FILE = path.join(__dirname, "data", "sessions.json");
if (!fs.existsSync(USERS_FILE)) fs.writeJsonSync(USERS_FILE, {});
if (!fs.existsSync(SESSIONS_FILE)) fs.writeJsonSync(SESSIONS_FILE, {});

// --- Utils pour utilisateurs et sessions ---
const loadUsers = () => fs.readJsonSync(USERS_FILE);
const saveUsers = (users) => fs.writeJsonSync(USERS_FILE, users);
const loadSessions = () => fs.readJsonSync(SESSIONS_FILE);
const saveSessions = (sessions) => fs.writeJsonSync(SESSIONS_FILE, sessions);

// --- Middleware Auth ---
function requireAuth(req, res, next) {
  const sessionId = req.headers["x-session-id"] || req.query.sessionId;
  const sessions = loadSessions();
  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ message: "Non autorisé" });
  }
  req.user = sessions[sessionId];
  next();
}

// --- Routes Auth ---
app.post("/auth/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.json({ message: "Tous les champs sont requis" });

  const users = loadUsers();
  if (users[email]) return res.json({ message: "Email déjà utilisé" });

  const hash = await bcrypt.hash(password, 10);
  users[email] = { username, email, password: hash };
  saveUsers(users);
  res.json({ message: "Inscription réussie" });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();
  if (!users[email]) return res.json({ message: "Utilisateur introuvable" });

  const match = await bcrypt.compare(password, users[email].password);
  if (!match) return res.json({ message: "Mot de passe incorrect" });

  const sessionId = Math.random().toString(36).substring(2, 15);
  const sessions = loadSessions();
  sessions[sessionId] = {
    email,
    username: users[email].username,
    created: Date.now(),
  };
  saveSessions(sessions);

  res.json({ message: `Bienvenue ${users[email].username}`, sessionId });
});

// --- Pages HTML ---
// Accessible sans login
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/register", (req, res) =>
  res.sendFile(path.join(__dirname, "register.html"))
);

// Accessible uniquement après login
app.get("/home", requireAuth, (req, res) =>
  res.sendFile(path.join(__dirname, "home.html"))
);
app.get("/pair", requireAuth, (req, res) =>
  res.sendFile(path.join(__dirname, "pair.html"))
);
app.get("/qrpage", requireAuth, (req, res) =>
  res.sendFile(path.join(__dirname, "qr.html"))
);

// --- Routes Bot (pairing + QR) ---
app.use("/qr", requireAuth, qrRouter);
app.use("/", requireAuth, pairRouter); // pair.js gère /code et /config

// --- Lancer serveur ---
app.listen(PORT, () => {
  console.log(`🚀 RAIZEL-XMD running at http://localhost:${PORT}`);
  console.log(`🌐 Frontend Login: http://localhost:${PORT}/`);
  console.log(`🌐 Frontend Register: http://localhost:${PORT}/register`);
  console.log(`🌐 Frontend Home: http://localhost:${PORT}/home`);
  console.log(`🌐 Frontend Pairing: http://localhost:${PORT}/pair`);
  console.log(`🌐 Frontend QR: http://localhost:${PORT}/qrpage`);
});
