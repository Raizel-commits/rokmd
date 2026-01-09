// =======================
// IMPORTS
// =======================
import express from "express";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";

import qrRouter from "./qr.js";
import pairRouter from "./pair.js";

// =======================
// CONFIG
// =======================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "SECRET_STORY_KEY";

// =======================
// FILES
// =======================
const USERS_FILE = path.join(__dirname, "users.json");

// Init users file if missing
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]", "utf-8");

// =======================
// MIDDLEWARE
// =======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(__dirname));

// =======================
// HELPERS
// =======================
function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

// =======================
// AUTH MIDDLEWARE
// =======================
function auth(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.redirect("/login.html");

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie("token");
    res.redirect("/login.html");
  }
}

// =======================
// ROUTES HTML
// =======================

// Pages publiques
app.get("/", (_, res) => res.redirect("/login.html"));
app.get("/login.html", (_, res) => res.sendFile("login.html", { root: __dirname }));
app.get("/signup.html", (_, res) => res.sendFile("signup.html", { root: __dirname }));

// Pages protégées
app.get("/accueil", auth, (_, res) => res.sendFile("accueil.html", { root: __dirname }));
app.get("/pair", auth, (_, res) => res.sendFile("pair.html", { root: __dirname }));
app.get("/qr", auth, (_, res) => res.sendFile("qr.html", { root: __dirname }));

// =======================
// API AUTH
// =======================

// REGISTER
app.post("/api/register", (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: "Champs manquants" });

  const users = readUsers();
  if (users.find(u => u.username === username)) return res.status(400).json({ error: "Username déjà pris" });
  if (users.find(u => u.email === email)) return res.status(400).json({ error: "Email déjà utilisé" });

  const hash = bcrypt.hashSync(password, 10);
  users.push({ username, email, password: hash, createdAt: new Date() });
  writeUsers(users);

  res.json({ success: true });
});

// LOGIN
app.post("/api/login", (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: "Champs manquants" });

  const users = readUsers();
  const user = users.find(u => u.username === identifier || u.email === identifier);
  if (!user) return res.status(401).json({ error: "Utilisateur introuvable" });

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(401).json({ error: "Mot de passe incorrect" });

  const token = jwt.sign({ username: user.username, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, { httpOnly: true, sameSite: "lax", maxAge: 7*24*60*60*1000 });

  res.json({ success: true });
});

// LOGOUT
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login.html");
});

// =======================
// ROUTERS
// =======================
app.use("/qr", qrRouter);
app.use("/", pairRouter);

// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
