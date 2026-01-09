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

// ================= PATH
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================= APP
const app = express();

// ================= RENDER PROXY FIX
app.set("trust proxy", 1);

// ================= MONGODB (INTÉGRÉ DIRECT)
mongoose.connect(
  "mongodb+srv://rokxd_raizel:Sangoku77@cluster0.0g3b0yp.mongodb.net/rokxd?retryWrites=true&w=majority"
)
.then(() => console.log("✅ MongoDB connecté"))
.catch(err => console.error("❌ MongoDB error :", err.message));

// ================= MIDDLEWARE
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());

// ================= RATE LIMIT (AUTH UNIQUEMENT)
app.use(
  "/auth",
  rateLimit({
    windowMs: 60 * 1000,
    max: 20,
  })
);

// ================= AUTH ROUTES
app.use("/auth", authRouter);

// ================= PAGES PUBLIQUES
app.get("/", (_, res) => res.redirect("/login"));

// LOGIN
app.get("/login", (_, res) =>
  res.sendFile(path.join(__dirname, "login.html"))
);
app.get("/login.html", (_, res) =>
  res.sendFile(path.join(__dirname, "login.html"))
);

// REGISTER
app.get("/register", (_, res) =>
  res.sendFile(path.join(__dirname, "register.html"))
);
app.get("/register.html", (_, res) =>
  res.sendFile(path.join(__dirname, "register.html"))
);

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

// ================= ROUTES BOT (COMME TU AS DEMANDÉ)
app.use("/qr", authMiddleware, qrRouter);
app.use("/", authMiddleware, pairRouter);

// ================= START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});
