import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import fetch from "node-fetch";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// =====================
// CONFIG reCAPTCHA
// =====================
const RECAPTCHA_SECRET = "6Lf3pzosAAAAALxob2jVTiaomg0xIpREfXBvGONB";

// =====================
// MIDDLEWARE
// =====================
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// =====================
// USERS & SESSIONS
// =====================
const USERS_FILE = path.join(__dirname, "users.json");
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));

const SESSIONS_FILE = path.join(__dirname, "sessions.json");
if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}));

function saveSessions(sessions) { fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2)); }
function loadSessions() { return JSON.parse(fs.readFileSync(SESSIONS_FILE)); }

// =====================
// CAPTCHA CHECK
// =====================
async function verifyCaptcha(token) {
  try {
    const res = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${RECAPTCHA_SECRET}&response=${token}`
      }
    );
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

// =====================
// AUTH ROUTES
// =====================

// REGISTER
app.post("/auth/register", async (req, res) => {
  const { username, email, password, recaptcha } = req.body;

  if (!await verifyCaptcha(recaptcha)) return res.status(403).json({ message: "Robot détecté" });

  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  if (users.find(u => u.email === email)) return res.json({ message: "Email déjà utilisé" });

  const hash = await bcrypt.hash(password, 10);
  users.push({ username, email, password: hash });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  res.json({ message: "Compte créé avec succès" });
});

// LOGIN
app.post("/auth/login", async (req, res) => {
  const { email, password, recaptcha } = req.body;

  if (!await verifyCaptcha(recaptcha)) return res.status(403).json({ message: "Robot détecté" });

  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  const user = users.find(u => u.email === email);
  if (!user) return res.json({ message: "Utilisateur introuvable" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.json({ message: "Mot de passe incorrect" });

  // Création session simple
  const sessions = loadSessions();
  const sessionId = Math.random().toString(36).substring(2, 15);
  sessions[sessionId] = { email, username: user.username, expires: Date.now() + 86400000 };
  saveSessions(sessions);

  res.json({ message: `Bienvenue ${user.username}`, sessionId });
});

// Middleware protection
function requireAuth(req, res, next) {
  const sessionId = req.headers["x-session-id"];
  const sessions = loadSessions();
  if (!sessionId || !sessions[sessionId] || sessions[sessionId].expires < Date.now()) {
    return res.status(401).json({ message: "Non autorisé" });
  }
  req.user = sessions[sessionId];
  next();
}

// =====================
// PAIRING & CONFIG
// =====================
app.get("/code", requireAuth, async (req, res) => {
  const { number } = req.query;
  if (!number) return res.json({ error: "Numéro requis" });

  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  res.json({ code });
});

app.post("/config", requireAuth, (req, res) => {
  const { number, prefix } = req.body;
  if (!number) return res.json({ error: "Numéro requis" });
  res.json({ status: `Config sauvegardée: préfixe = ${prefix || "!"}` });
});

// =====================
// QR CODE
// =====================
app.get("/qr", requireAuth, (req, res) => {
  res.json({ qr: "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=ROK-XD" });
});

// =====================
// HTML PAGES
// =====================
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "register.html")));
app.get("/pair", (req, res) => res.sendFile(path.join(__dirname, "pair.html")));
app.get("/qrpage", (req, res) => res.sendFile(path.join(__dirname, "qr.html")));

// =====================
// START SERVER
// =====================
app.listen(PORT, () => {
  console.log("🚀 ROK XD SERVER (Render Ready)");
  console.log(`🌐 http://localhost:${PORT}`);
});
