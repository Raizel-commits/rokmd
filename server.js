// server.js
import express from "express";
import path from "path";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import qrRouter from "./qr.js";
import pairRouter from "./pair.js";

const app = express();
const PORT = process.env.PORT || 3000;

// ====== MONGO ======
mongoose.connect(
  "mongodb+srv://rokxd_raizel:Sangoku77@cluster0.0g3b0yp.mongodb.net/?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
)
.then(() => console.log("✅ MongoDB connectée"))
.catch(err => console.error("❌ Erreur MongoDB :", err.message));

// ====== USER MODEL ======
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  coins: { type: Number, default: 20 }
});

// Hash du mot de passe
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Comparer mot de passe
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

// ====== MIDDLEWARE ======
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet());
app.use(cookieParser());

// Trust proxy pour Render / Heroku
app.set("trust proxy", 1);

// ====== RATE LIMIT ======
app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Trop de requêtes" }
}));

// ====== AUTH MIDDLEWARE ======
function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login.html");

  try {
    const decoded = jwt.verify(token, "secret_jwt_123");
    req.user = decoded;
    next();
  } catch {
    res.clearCookie("token");
    return res.redirect("/login.html");
  }
}

// ====== STATIC ======
app.use(express.static(path.resolve("./")));

// ====== ROUTES AUTH ======
app.post("/auth/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 8)
    return res.status(400).json({ error: "Email et mot de passe (min 8 caractères) requis" });

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email déjà utilisé" });

    const user = new User({ email, password, coins: 20 });
    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email }, "secret_jwt_123", { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true });
    res.json({ status: "success", coins: user.coins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Email ou mot de passe incorrect" });

    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ error: "Email ou mot de passe incorrect" });

    const token = jwt.sign({ id: user._id, email: user.email }, "secret_jwt_123", { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true });
    res.json({ status: "success", coins: user.coins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login.html");
});

// ====== PAGES ======
app.get("/", authMiddleware, (req, res) => res.sendFile(path.resolve("index.html")));
app.get("/pair", authMiddleware, (req, res) => res.sendFile(path.resolve("pair.html")));
app.get("/qrpage", authMiddleware, (req, res) => res.sendFile(path.resolve("qr.html")));

// ====== QR & PAIR ROUTES ======
app.use("/qr", qrRouter);
app.use("/", pairRouter);

// ====== START SERVER ======
app.listen(PORT, () => {
  console.log(`🚀 Serveur actif sur le port ${PORT}`);
});
