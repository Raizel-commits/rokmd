import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* ================= DEBUG ================= */
process.on("uncaughtException", err => console.error("UNCAUGHT EXCEPTION:", err));
process.on("unhandledRejection", err => console.error("UNHANDLED REJECTION:", err));

/* ================= PATH ================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ================= APP ================= */
const app = express();
const PORT = process.env.PORT || 3000;

/* ================= USERS FILE ================= */
const usersFile = path.join(__dirname, "users.json");
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, JSON.stringify([]));

/* ================= HELPERS ================= */
function loadUsers() {
  try {
    const data = fs.readFileSync(usersFile, "utf-8");
    return Array.isArray(JSON.parse(data)) ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/* ================= MIDDLEWARE ================= */
app.set("trust proxy", 1);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: "SECRETSTORY_N_AUTH",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

/* ================= AUTH MIDDLEWARE ================= */
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

/* ================= PUBLIC ROUTES ================= */
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "register.html")));

/* ================= REGISTER ================= */
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();

  if (!username || !password) {
    return res.send(`<h2>Erreur: Champs manquants</h2><a href="/register">Retour</a>`);
  }

  if (users.some(u => u.username === username)) {
    return res.send(`<h2>Erreur: Utilisateur déjà existant</h2><a href="/register">Retour</a>`);
  }

  users.push({ username, password });
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  res.redirect("/login");
});

/* ================= LOGIN ================= */
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.send(`<h2>Erreur: Identifiants incorrects</h2><a href="/login">Retour</a>`);
  }

  req.session.user = user;
  res.redirect("/");
});

/* ================= LOGOUT ================= */
app.get("/logout", (req, res) => req.session.destroy(() => res.redirect("/login")));

/* ================= PROTECTED ROUTES ================= */
app.get("/", requireAuth, (_, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get("/pair", requireAuth, (_, res) => res.sendFile(path.join(__dirname, 'pair.html')));
app.get("/qrpage", requireAuth, (_, res) => res.sendFile(path.join(__dirname, 'qr.html')));

/* ================= ROUTERS ================= */
import qrRouter from "./qr.js";
import pairRouter from "./pair.js";

// Routes supplémentaires si nécessaires
app.use('/qr', requireAuth, qrRouter);
app.use('/', requireAuth, pairRouter);

/* ================= 404 ================= */
app.use((req, res) => {
  res.status(404).send(`<h2>Erreur 404: Page non trouvée</h2><a href="/">Retour à l'accueil</a>`);
});

/* ================= SERVER ================= */
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
