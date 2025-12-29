import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import fetch from "node-fetch";
import bcrypt from "bcrypt";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

/* =======================
   CONFIG reCAPTCHA
======================= */
const RECAPTCHA_SECRET = "6Ld6ojosAAAAAJoEMRkJoY4KVkfTBdYbboPNH31M";

/* =======================
   MIDDLEWARE
======================= */
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

/* =======================
   USERS STORAGE (RACINE)
======================= */
const USERS_FILE = path.join(__dirname, "users.json");
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}

/* =======================
   CAPTCHA CHECK
======================= */
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

/* =======================
   AUTH ROUTES
======================= */

// REGISTER
app.post("/auth/register", async (req, res) => {
  const { username, email, password, recaptcha } = req.body;

  if (!await verifyCaptcha(recaptcha))
    return res.status(403).json({ message: "Robot détecté" });

  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  if (users.find(u => u.email === email))
    return res.json({ message: "Email déjà utilisé" });

  const hash = await bcrypt.hash(password, 10);
  users.push({ username, email, password: hash });

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.json({ message: "Compte créé avec succès" });
});

// LOGIN
app.post("/auth/login", async (req, res) => {
  const { email, password, recaptcha } = req.body;

  if (!await verifyCaptcha(recaptcha))
    return res.status(403).json({ message: "Robot détecté" });

  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  const user = users.find(u => u.email === email);

  if (!user) return res.json({ message: "Utilisateur introuvable" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.json({ message: "Mot de passe incorrect" });

  res.json({ message: `Bienvenue ${user.username}` });
});

/* =======================
   PAIRING CODE (RACINE)
======================= */
app.post("/code", async (req, res) => {
  const { number } = req.body;
  if (!number) return res.json({ message: "Numéro requis" });

  // Code simulé (exemple)
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  res.json({ code });
});

/* =======================
   QR CODE (RACINE)
======================= */
app.get("/qr", (req, res) => {
  // QR simulé (exemple)
  res.json({
    qr: "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=ROK-XD"
  });
});

/* =======================
   HTML ROUTES (RACINE)
======================= */
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "index.html"))
);

app.get("/register", (req, res) =>
  res.sendFile(path.join(__dirname, "register.html"))
);

app.get("/pair", (req, res) =>
  res.sendFile(path.join(__dirname, "pair.html"))
);

app.get("/qrpage", (req, res) =>
  res.sendFile(path.join(__dirname, "qr.html"))
);

/* =======================
   START SERVER
======================= */
app.listen(PORT, () => {
  console.log("🚀 ROK XD SERVER (ROOT MODE)");
  console.log(`🌐 http://localhost:${PORT}`);
  console.log("📁 Tout à la racine");
});
