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
import coinsRouter from "./coins.js";

dotenv.config();
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const app = express();

// MIDDLEWARES
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());
app.use(express.static(__dirname));

// RATE LIMIT
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: "Trop de requêtes, réessaye plus tard" },
  })
);

// ROUTES
app.use("/auth", authRouter);
app.use("/api", coinsRouter);
app.use("/qr", qrRouter);
app.use("/", pairRouter);

// PAGES PROTÉGÉES
app.get("/", authMiddleware, (_, res) =>
  res.sendFile(path.join(__dirname, "index.html"))
);
app.get("/pair", authMiddleware, (_, res) =>
  res.sendFile(path.join(__dirname, "pair.html"))
);
app.get("/qrpage", authMiddleware, (_, res) =>
  res.sendFile(path.join(__dirname, "qr.html"))
);

// NGROK
async function startNgrok() {
  if (!process.env.NGROK_AUTHTOKEN) return;
  try {
    const url = await ngrokModule.connect({
      proto: "http",
      addr: PORT,
      authtoken: process.env.NGROK_AUTHTOKEN,
      region: process.env.NGROK_REGION || "eu",
    });
    console.log(`🌐 Tunnel Ngrok actif : ${url}`);
  } catch (err) {
    console.error("❌ Erreur Ngrok :", err.message);
  }
}

// START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Serveur actif sur le port ${PORT}`);
  restoreFromFirebase();
  startNgrok();
});
