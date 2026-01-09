// =======================
// IMPORTS
// =======================
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

import authRouter from "./auth.js";
import qrRouter from "./qr.js";
import pairRouter from "./pair.js";

// ================= PATH FIX
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================= APP
const app = express();
app.set("trust proxy", 1);

// ================= MONGODB
mongoose
  .connect(process.env.MONGO_URI || 
    "mongodb+srv://rokxd_raizel:Sangoku77@cluster0.0g3b0yp.mongodb.net/rokxd"
  )
  .then(() => console.log("✅ MongoDB connecté"))
  .catch(err => console.error("❌ MongoDB error:", err.message));

// ================= MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());

// ================= RATE LIMIT (AUTH)
app.use(
  "/auth",
  rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { error: "Trop de requêtes, réessayez plus tard" }
  })
);

// ================= AUTH ROUTES (SIMPLE)
app.use("/", authRouter);

// ================= PAGES
app.get("/", (_, res) => res.redirect("/login"));

app.get("/login", (_, res) =>
  res.sendFile(path.join(__dirname, "login.html"))
);

app.get("/register", (_, res) =>
  res.sendFile(path.join(__dirname, "register.html"))
);

app.get("/panel", (_, res) =>
  res.sendFile(path.join(__dirname, "index.html"))
);

app.get("/pair-page", (_, res) =>
  res.sendFile(path.join(__dirname, "pair.html"))
);

app.get("/qr-page", (_, res) =>
  res.sendFile(path.join(__dirname, "qr.html"))
);

// ================= ROUTES BOT (NON PROTÉGÉES)
app.use("/qr", qrRouter);
app.use("/pair", pairRouter);

// ================= STATIC FILES
app.use(express.static(__dirname));

// ================= START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});
