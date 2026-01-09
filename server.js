import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

/* ================= DEBUG ================= */
process.on("uncaughtException", err => console.error("UNCAUGHT EXCEPTION:", err));
process.on("unhandledRejection", err => console.error("UNHANDLED REJECTION:", err));

/* ================= PATH ================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ================= APP ================= */
const app = express();
const PORT = process.env.PORT || 3000;

/* ================= MONGODB ================= */
mongoose.connect(
  "mongodb+srv://rokxd_raizel:Sangoku77@cluster0.0g3b0yp.mongodb.net/rokxd?retryWrites=true&w=majority"
)
.then(() => console.log("✅ MongoDB connecté"))
.catch(err => console.error("❌ MongoDB error :", err.message));

/* ================= SCHEMA UTILISATEUR ================= */
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model("User", userSchema);

/* ================= MIDDLEWARE ================= */
app.set("trust proxy", 1);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: "SECRETSTORY_N_AUTH",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

/* ================= AUTH MIDDLEWARE ================= */
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

/* ================= PUBLIC ROUTES ================= */
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "register.html")));

/* ================= REGISTER ================= */
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send("Champs manquants");

  try {
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).send("Utilisateur déjà existant");

    const user = new User({ username, password });
    await user.save();
    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur serveur");
  }
});

/* ================= LOGIN ================= */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).send("Identifiants incorrects");

    req.session.user = user;
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur serveur");
  }
});

/* ================= LOGOUT ================= */
app.get("/logout", (req, res) => req.session.destroy(() => res.redirect("/login")));

/* ================= PROTECTED ROUTES ================= */
app.get("/", requireAuth, (_, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get("/pair", requireAuth, (_, res) => res.sendFile(path.join(__dirname, 'pair.html')));
app.get("/qrpage", requireAuth, (_, res) => res.sendFile(path.join(__dirname, 'qr.html')));

/* ================= ROUTERS ================= */
import qrRouter from "./qr.js";
import pairRouter from "./pair.js";

app.use('/qr', requireAuth, qrRouter);
app.use('/', requireAuth, pairRouter);

/* ================= SERVER ================= */
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
