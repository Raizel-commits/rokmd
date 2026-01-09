// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import authRouter, { authMiddleware } from "./auth.js";
import qrRouter from "./qr.js";
import pairRouter from "./pair.js";

import mongoose from "mongoose";

dotenv.config();

// ================= PATHS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

// ================= MONGODB CONNECTION
const MONGO_URI = "mongodb+srv://rokxd_raizel:Sangoku77@cluster0.0g3b0yp.mongodb.net/?appName=Cluster0";
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connecté"))
.catch(err => console.error("❌ Erreur MongoDB :", err.message));

// ================= EXPRESS SETUP
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(helmet());
app.use(cookieParser());

// ================= RATE LIMIT API
app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Trop de requêtes, réessaye plus tard." }
}));

// ================= ROUTES AUTH
app.use("/auth", authRouter);

// ================= PAGES PUBLIQUES
app.get("/login.html", (_, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/register.html", (_, res) => res.sendFile(path.join(__dirname, "register.html")));

// ================= PAGES PROTÉGÉES
app.get("/", authMiddleware, (_, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/pair", authMiddleware, (_, res) => res.sendFile(path.join(__dirname, "pair.html")));
app.get("/qrpage", authMiddleware, (_, res) => res.sendFile(path.join(__dirname, "qr.html")));

// ================= BOT ROUTES
app.use("/qr", authMiddleware, qrRouter);
app.use("/", authMiddleware, pairRouter);

// ================= START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Serveur actif sur le port ${PORT}`);
});
