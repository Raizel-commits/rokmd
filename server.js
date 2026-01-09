// =======================
// IMPORTS
// =======================
import mongoose from "mongoose";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import chalk from "chalk";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

import qrRouter from "./qr.js";
import pairRouter from "./pair.js";

// =======================
// SECRETS (DEV)
// =======================
const MONGO_URI =
  "mongodb+srv://rokxd_raizel:Sangoku77@cluster0.0g3b0yp.mongodb.net/rokxd";

const JWT_SECRET = "Sangoku";

// =======================
// INIT
// =======================
const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =======================
// MONGODB
// =======================
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connecté"))
  .catch(err =>
    console.error("❌ MongoDB error:", err.message)
  );

// =======================
// USER MODEL
// =======================
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

// =======================
// MIDDLEWARES
// =======================
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(__dirname));

// =======================
// RATE LIMIT
// =======================
app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  max: 30
}));

// =======================
// AUTH MIDDLEWARE (JWT)
// =======================
function auth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login");

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie("token");
    res.redirect("/login");
  }
}

// =======================
// ROUTES HTML
// =======================
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "index.html"))
);

app.get("/login", (req, res) =>
  res.sendFile(path.join(__dirname, "login.html"))
);

app.get("/signup", (req, res) =>
  res.sendFile(path.join(__dirname, "signup.html"))
);

// Pages protégées
app.get("/accueil", auth, (req, res) =>
  res.sendFile(path.join(__dirname, "accueil.html"))
);

app.get("/pair", auth, (req, res) =>
  res.sendFile(path.join(__dirname, "pair.html"))
);

app.get("/qr", auth, (req, res) =>
  res.sendFile(path.join(__dirname, "qr.html"))
);

// =======================
// AUTH API
// =======================
app.post("/api/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: "Champs manquants" });

    const exists = await User.findOne({
      $or: [{ username }, email ? { email } : null]
    });

    if (exists)
      return res.status(409).json({ error: "Utilisateur déjà existant" });

    const hash = await bcrypt.hash(password, 10);

    await User.create({
      username,
      email,
      password: hash
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user)
      return res.status(401).json({ error: "Utilisateur introuvable" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(401).json({ error: "Mot de passe incorrect" });

    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax"
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// =======================
// LOGOUT
// =======================
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

// =======================
// BOT ROUTERS
// =======================
app.use("/qr", qrRouter);
app.use("/", pairRouter);

// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
  console.log(
    chalk.cyanBright(`🚀 Serveur ROK-XD lancé sur http://localhost:${PORT}`)
  );
});
