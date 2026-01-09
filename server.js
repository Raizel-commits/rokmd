import express from "express";
import path from "path";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import authRouter, { authMiddleware } from "./auth.js";
import { connectDB } from "./db.js";
import qrRouter from "./qr.js";
import pairRouter from "./pair.js";

connectDB();

const __filename = path.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet());
app.use(cookieParser());

// Servir les fichiers statiques mais **exclure index.html** pour contrôle auth
app.use("/static", express.static(path.join(__dirname, "static")));

// ROUTES AUTH
app.use("/auth", authRouter);

// Pages accessibles sans connexion
app.get("/login.html", (_, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/register.html", (_, res) => res.sendFile(path.join(__dirname, "register.html")));

// Pages protégées
app.get("/", authMiddleware, (_, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/pair", authMiddleware, (_, res) => res.sendFile(path.join(__dirname, "pair.html")));
app.get("/qrpage", authMiddleware, (_, res) => res.sendFile(path.join(__dirname, "qr.html")));

// BOT ROUTES
app.use("/qr", qrRouter);
app.use("/", pairRouter);

app.listen(PORT, () => console.log(`🚀 Serveur actif sur le port ${PORT}`));
