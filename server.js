import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import ngrok from "ngrok";

import qrRouter from "./qr.js";
import pairRouter from "./pair.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));
app.use(helmet());

// Pages
app.get("/",(_,res)=>res.sendFile(path.join(__dirname,"login.html")));
app.get("/dashboard",(_,res)=>res.sendFile(path.join(__dirname,"dashboard.html")));
app.get("/pair",(_,res)=>res.sendFile(path.join(__dirname,"pair.html")));
app.get("/qrpage",(_,res)=>res.sendFile(path.join(__dirname,"qr.html")));

// MoneyFusion callback
app.post("/api/payment/callback",(req,res)=>{
 console.log("💰 MoneyFusion:",req.body);
 res.status(200).json({ok:true});
});

// Routers bot
app.use("/qr",qrRouter);
app.use("/",pairRouter);

app.listen(PORT,async()=>{
 console.log("🚀 ROK XD actif sur",PORT);
 const url=await ngrok.connect({addr:PORT,authtoken:process.env.NGROK_TOKEN});
 console.log("🌍 Public:",url);
});
