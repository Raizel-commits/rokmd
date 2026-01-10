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

function renderError(message, back = "/") {
  // Affiche l'erreur directement dans une page stylée
  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Erreur</title>
    <style>
      body {
        font-family: "Inter", sans-serif;
        background: radial-gradient(1200px 600px at 10% 10%, rgba(56,189,248,0.03), transparent),
                    radial-gradient(900px 500px at 90% 85%, rgba(56,189,248,0.02), transparent),
                    linear-gradient(180deg,#020617,#0f172a);
        color: #dfffe6;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 0;
      }
      .glass-card {
        background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
        padding: 24px 36px;
        border-radius: 18px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.7), 0 0 40px rgba(56,189,248,0.05) inset;
        border: 1px solid rgba(56,189,248,0.22);
        text-align: center;
        max-width: 400px;
      }
      h2 { color: #ef4444; margin-bottom: 16px; }
      a {
        display: inline-block;
        padding: 10px 20px;
        background: #38bdf8;
        color: #020617;
        text-decoration: none;
        border-radius: 6px;
        font-weight: bold;
        margin-top: 10px;
      }
      a:hover { opacity: 0.9; }
    </style>
  </head>
  <body>
    <section class="glass-card">
      <h2>${message}</h2>
      <a href="${back}">Retour</a>
    </section>
  </body>
  </html>
  `;
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
    return res.send(renderError("Champs manquants", "/register"));
  }

  if (users.some(u => u.username === username)) {
    return res.send(renderError("Utilisateur déjà existant", "/register"));
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
    return res.send(renderError("Identifiants incorrects", "/login"));
  }

  req.session.user = user;
  res.redirect("/");
});

/* ================= LOGOUT ================= */
app.get("/logout", (req, res) => req.session.destroy(() => res.redirect("/login")));

/* ================= PROTECTED ROUTES ================= */
app.get("/", requireAuth, (_, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/pair", requireAuth, (_, res) => res.sendFile(path.join(__dirname, "pair.html")));
app.get("/qrpage", requireAuth, (_, res) => res.sendFile(path.join(__dirname, "qr.html")));

/* ================= ROUTERS ================= */
import qrRouter from "./qr.js";
import pairRouter from "./pair.js";

app.use("/qr", requireAuth, qrRouter);
app.use("/", requireAuth, pairRouter);

/* ================= 404 ================= */
app.use((req, res) => res.status(404).send(renderError("Erreur 404: Page non trouvée", "/")));

/* ================= SERVER ================= */
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
