// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

import authRouter, { authMiddleware } from "./auth.js";
import qrRouter from "./qr.js";
import pairRouter from "./pair.js";

const app = express();

// ================= PATH
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================= TRUST PROXY (RENDER)
app.set("trust proxy", 1);

// ================= MONGODB
mongoose.connect(
  "mongodb+srv://rokxd_raizel:Sangoku77@cluster0.0g3b0yp.mongodb.net/rokxd?retryWrites=true&w=majority"
)
.then(() => console.log("✅ MongoDB connecté"))
.catch(err => console.error("❌ MongoDB :", err.message));

// ================= MIDDLEWARE
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());

// ================= RATE LIMIT (AUTH UNIQUEMENT)
app.use("/auth", rateLimit({
  windowMs: 60 * 1000,
  max: 20
}));

// ================= ROUTES AUTH
app.use("/auth", authRouter);

// ================= PAGES PUBLIQUES
app.get("/login", (_, res) =>
  res.sendFile(path.join(__dirname, "login.html"))
);

app.get("/register", (_, res) =>
  res.sendFile(path.join(__dirname, "register.html"))
);

// ================= RACINE → LOGIN
app.get("/", (_, res) => res.redirect("/login"));

// ================= PAGES PROTÉGÉES
app.get("/panel", authMiddleware, (_, res) =>
  res.sendFile(path.join(__dirname, "index.html"))
);

app.get("/pair-page", authMiddleware, (_, res) =>
  res.sendFile(path.join(__dirname, "pair.html"))
);

app.get("/qr-page", authMiddleware, (_, res) =>
  res.sendFile(path.join(__dirname, "qr.html"))
);

// ================= ROUTES BOT (COMME TU VEUX)
app.use("/qr", authMiddleware, qrRouter);   // ✅ inchangé
app.use("/", authMiddleware, pairRouter);   // ✅ inchangé MAIS protégé

// ================= START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur actif sur le port ${PORT}`);
});
