import express from "express";
import path from "path";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import authRouter, { authMiddleware } from "./auth.js";
import { connectDB } from "./db.js";

import qrRouter from "./qr.js";
import pairRouter from "./pair.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("")); // fichiers HTML à la racine
app.use(helmet());
app.use(cookieParser());

// ROUTES AUTH
app.use("/auth", authRouter);

// ROUTES PUBLIQUES (login et register)
app.get("/login.html", (req, res) => res.sendFile(path.join(process.cwd(), "login.html")));
app.get("/register.html", (req, res) => res.sendFile(path.join(process.cwd(), "register.html")));

// ROUTES PRIVÉES
app.get("/", authMiddleware, (req, res) => res.sendFile(path.join(process.cwd(), "index.html")));
app.get("/pair", authMiddleware, (req, res) => res.sendFile(path.join(process.cwd(), "pair.html")));
app.get("/qrpage", authMiddleware, (req, res) => res.sendFile(path.join(process.cwd(), "qr.html")));

// BOT ROUTES
app.use("/qr", qrRouter);
app.use("/", pairRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur actif sur le port ${PORT}`));
