import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

// USER SCHEMA
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  coins: { type: Number, default: 20 } // coins initiaux
});
const User = mongoose.model("User", userSchema);

// REGISTER
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 8)
    return res.status(400).json({ error: "Email et mot de passe ≥ 8 caractères requis" });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.cookie("token", token, { httpOnly: true });
    res.json({ status: "ok", coins: user.coins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Email déjà utilisé" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "Utilisateur non trouvé" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Mot de passe incorrect" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.cookie("token", token, { httpOnly: true });
  res.json({ status: "ok", coins: user.coins });
});

// AUTH MIDDLEWARE
export const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login.html");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.redirect("/login.html");
  }
};

export default router;
