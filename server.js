// =======================
// IMPORTS
// =======================
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import qrRouter from "./qr.js";
import pairRouter from "./pair.js";

// ================= PATH FIX
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================= APP
const app = express();
app.set("trust proxy", 1);

// ================= MONGODB
mongoose.connect(
  "mongodb+srv://rokxd_raizel:Sangoku77@cluster0.0g3b0yp.mongodb.net/rokxd?retryWrites=true&w=majority"
)
.then(() => console.log("✅ MongoDB connecté"))
.catch(err => console.error("❌ MongoDB error :", err.message));

// ================= MIDDLEWARE
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());

// ================= RATE LIMIT (API)
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { error: "Trop de requêtes, réessayez plus tard" }
  })
);

// ================= JWT SECRET
const JWT_SECRET = process.env.JWT_SECRET || "SECRET_STORY_KEY";

// ================= MONGODB USER MODEL
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

// ================= JWT VERIFICATION MIDDLEWARE
function verifyToken(req, res, next) {
  const token = req.cookies.token || req.headers["authorization"]?.split(" ")[1] || req.query.token;
  if (!token) return res.redirect('/login');

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie('token');
    return res.redirect('/login');
  }
}

// =======================
// ROUTES API AUTH
// =======================

// Register
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ error: "Remplis tous les champs !" });

  try {
    const exists = await User.findOne({ username });
    if (exists) return res.json({ error: "Nom d'utilisateur déjà pris" });

    const newUser = new User({ username, password });
    await newUser.save();

    const token = jwt.sign({ username: newUser.username }, JWT_SECRET, { expiresIn: "1h" });
    res.cookie('token', token); // Pas httpOnly pour front
    res.json({ token, username: newUser.username });
  } catch (err) {
    res.json({ error: "Erreur serveur : " + err.message });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ error: "Remplis tous les champs !" });

  try {
    const user = await User.findOne({ username, password });
    if (!user) return res.json({ error: "Utilisateur ou mot de passe incorrect" });

    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: "1h" });
    res.cookie('token', token); // Pas httpOnly
    res.json({ token, username: user.username });
  } catch (err) {
    res.json({ error: "Erreur serveur : " + err.message });
  }
});

// Logout
app.get("/logout", (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// =======================
// PAGES
// =======================

// Pages QR / Pairing
app.use('/qr', qrRouter);
app.use('/', pairRouter);
app.get('/pair', (_, res) => res.sendFile(path.join(__dirname, 'pair.html')));
app.get('/qrpage', (_, res) => res.sendFile(path.join(__dirname, 'qr.html')));

// Auth pages
app.get('/login', (_, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/register', (_, res) => res.sendFile(path.join(__dirname, 'register.html')));

// Accueil bot protégé
app.get('/', verifyToken, (_, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Dashboard protégé
app.get('/dashboard', verifyToken, (req, res) => {
  res.send(`<h1>Bienvenue ${req.user.username} sur ton dashboard !</h1><a href="/logout">Se déconnecter</a>`);
});

// =======================
// LOAD COMMANDS DYNAMIQUES
// =======================
const loadCommands = async () => {
  const commands = new Map();
  const folder = path.join(__dirname, 'commands');
  if (!fs.existsSync(folder)) return commands;

  for (const file of fs.readdirSync(folder).filter(f => f.endsWith('.js'))) {
    const cmd = await import(`./commands/${file}?update=${Date.now()}`);
    if (cmd.default?.name && typeof cmd.default.execute === 'function') {
      commands.set(cmd.default.name.toLowerCase(), cmd.default);
    }
  }
  return commands;
};

let commands = new Map();
(async () => {
  commands = await loadCommands();
  console.log(`📂 Commands loaded: ${[...commands.keys()].join(', ')}`);
})();

app.get('/reload-commands', async (_, res) => {
  try {
    commands = await loadCommands();
    res.json({ status: '✅ Commands reloaded', list: [...commands.keys()] });
    console.log('📂 Commands reloaded');
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: '❌ Error reloading commands', error: err.message });
  }
});

// ================= STATIC FILES
app.use(express.static(__dirname));

// ================= START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});
