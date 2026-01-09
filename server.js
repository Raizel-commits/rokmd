// =======================
// IMPORTS
// =======================
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import chalk from "chalk";

import qrRouter from "./qr.js";
import pairRouter from "./pair.js";

// =======================
// CONFIG
// =======================
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =======================
// MIDDLEWARES
// =======================
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Fichiers statiques
app.use(express.static(__dirname));

// =======================
// RATE LIMIT (API)
– =======================
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
});
app.use("/api", limiter);

// =======================
// ROUTES HTML
// =======================
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "index.html"))
);

app.get("/login", (req, res) =>
  res.sendFile(path.join(__dirname, "login.html"))
);

app.get("/signup", (req, res) =>
  res.sendFile(path.join(__dirname, "signup.html"))
);

app.get("/accueil", (req, res) =>
  res.sendFile(path.join(__dirname, "accueil.html"))
);

app.get("/pair", (req, res) =>
  res.sendFile(path.join(__dirname, "pair.html"))
);

app.get("/qr", (req, res) =>
  res.sendFile(path.join(__dirname, "qr.html"))
);

// =======================
// ROUTERS
// =======================

// QR panel
app.use("/qr", qrRouter);

// Pairing panel
app.use("/", pairRouter);

// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
  console.log(chalk.cyanBright(`🚀 Serveur lancé sur le port ${PORT}`));
});
