// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import authRouter, { authMiddleware } from "./auth.js";
import { connectDB } from "./db.js";

import qrRouter from "./qr.js";
import pairRouter, { restoreFromFirebase } from "./pair.js";
import ngrokModule from "ngrok";

dotenv.config();
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(helmet());
app.use(cookieParser());

// RATE LIMIT API
app.use("/api", rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: "Trop de requêtes" } }));

// ROUTES AUTH
app.use("/auth", authRouter);

// PROTÉGER LES PAGES
app.get("/", authMiddleware, (_, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/pair", authMiddleware, (_, res) => res.sendFile(path.join(__dirname, "pair.html")));
app.get("/qrpage", authMiddleware, (_, res) => res.sendFile(path.join(__dirname, "qr.html")));

// BOT ROUTES
app.use("/qr", qrRouter);
app.use("/", pairRouter);

// START NGROK
async function startNgrok() {
  try {
    const url = await ngrokModule.connect({ proto: "http", addr: PORT, authtoken: process.env.NGROK_AUTHTOKEN, region: process.env.NGROK_REGION });
    console.log(`🌐 Tunnel Ngrok actif : ${url}`);
  } catch (err) {
    console.error("Erreur Ngrok :", err.message);
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Serveur actif sur le port ${PORT}`);
  restoreFromFirebase();
  startNgrok();
});
