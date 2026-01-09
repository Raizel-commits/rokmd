// auth.js
import express from "express";
import User from "./User.js";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

const router = express.Router();

// Middleware pour protéger les pages
export function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login.html");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.clearCookie("token");
    return res.redirect("/login.html");
  }
}

// REGISTER
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 8)
    return res.status(400).json({ error: "Email et mot de passe (min 8 caractères) requis" });

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email déjà utilisé" });

    const user = new User({ email, password, coins: 20 }); // 20 coins gratuits
    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true });
    res.json({ status: "success", coins: user.coins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Email ou mot de passe incorrect" });

    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ error: "Email ou mot de passe incorrect" });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true });
    res.json({ status: "success", coins: user.coins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// LOGOUT
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login.html");
});

// AJOUTER DES COINS
router.post("/add-coins", authMiddleware, async (req, res) => {
  const { coins } = req.body;
  if (!coins) return res.status(400).json({ error: "Nombre de coins requis" });

  try {
    const user = await User.findById(req.user.id);
    user.coins += Number(coins);
    await user.save();
    res.json({ success: true, totalCoins: user.coins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// DÉPLOYER LE BOT
router.post("/deploy-bot", authMiddleware, async (req, res) => {
  const { days } = req.body;
  const coinsCostMap = {1:20,2:35,3:50,4:65,5:80,6:95,7:110};
  const cost = coinsCostMap[days];
  if (!cost) return res.status(400).json({ success: false, message: "Durée invalide" });

  try {
    const user = await User.findById(req.user.id);
    if (user.coins < cost) return res.status(400).json({ success: false, message: "Coins insuffisants" });

    user.coins -= cost;
    await user.save();
    res.json({ success: true, message: `Bot déployé pour ${days} jour(s) !`, remainingCoins: user.coins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

export default router;
