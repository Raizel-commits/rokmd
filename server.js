// =======================
// IMPORTS
// =======================
import express from "express";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";

// ROUTERS (RESTENT INTACTS)
import pairRouter from "./pair.js";
import qrRouter from "./qr.js";

// =======================
// CONFIG
// =======================
const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =======================
// MIDDLEWARES
// =======================
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// =======================
// FRONTEND
// =======================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// =======================
// API ROUTES
// =======================

// Pairing Code
app.use("/", pairRouter);

// QR Code
app.use("/", qrRouter);

// =======================
// CONFIG SAVE (simple)
// =======================
const configs = {};

app.post("/config", (req, res) => {
  const { number, prefix } = req.body;
  if (!number) return res.json({ error: "Numéro requis" });

  configs[number] = { prefix: prefix || "!" };

  res.json({
    status: "Configuration sauvegardée",
    number,
    prefix: configs[number].prefix
  });
});

// =======================
// 404
// =======================
app.use((req, res) => {
  res.status(404).json({ error: "Route introuvable" });
});

// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
  console.log(`🚀 ROK XD server running on port ${PORT}`);
});
