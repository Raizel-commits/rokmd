// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

import authRouter, { authMiddleware } from "./auth.js";
import qrRouter from "./qr.js";
import pairRouter from "./pair.js";

import mongoose from "mongoose";

const app = express();

// ===================== PATH =====================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===================== MONGODB =====================
const MONGO_URI = "mongodb+srv://rokxd_raizel:Sangoku77@cluster0.0g3b0yp.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI, { dbName: "RAKXD_DB" })
  .then(() => console.log("✅ MongoDB connecté"))
  .catch(err => console.error("❌ Erreur MongoDB :", err.message));

// ===================== MIDDLEWARE =====================
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // fichiers HTML/CSS/JS à la racine
app.use(helmet());
app.use(cookieParser());

// RATE LIMIT API
app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Trop de requêtes" }
}));

// ===================== ROUTES =====================
// Auth routes (login/register)
app.use("/auth", authRouter);

// Pages publiques login/register
app.get("/login.html", (_, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/register.html", (_, res) => res.sendFile(path.join(__dirname, "register.html")));

// Pages privées protégées
app.get("/", authMiddleware, (_, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/pair", authMiddleware, (_, res) => res.sendFile(path.join(__dirname, "pair.html")));
app.get("/qrpage", authMiddleware, (_, res) => res.sendFile(path.join(__dirname, "qr.html")));

// Bot routes
app.use("/qr", qrRouter);
app.use("/", pairRouter);

// ===================== SERVER START =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur actif sur le port ${PORT}`);
});
