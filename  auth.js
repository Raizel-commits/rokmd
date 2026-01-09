import express from "express";
import jwt from "jsonwebtoken";
import User from "./User.js";

const router = express.Router();
const JWT_SECRET = "rokxd_secret_2025";

// Middleware pour protéger les pages
export function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.redirect("/login");

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.clearCookie("token");
    return res.redirect("/login");
  }
}

// REGISTER
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password || password.length < 8)
    return res.status(400).json({ error: "Mot de passe min 8 caractères" });

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "Email déjà utilisé" });

    const user = new User({ email, password }); // coins = 20 par défaut
    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true });
    res.json({ success: true, coins: user.coins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Identifiants invalides" });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(400).json({ error: "Identifiants invalides" });

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true });
    res.json({ success: true, coins: user.coins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// LOGOUT
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

export default router;