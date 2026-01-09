import express from "express";
import mongoose from "mongoose";
import { authMiddleware } from "./auth.js";

const router = express.Router();

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  coins: Number
});
const User = mongoose.model("User");

router.post("/buy", authMiddleware, async (req, res) => {
  const { coins } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

  user.coins += Number(coins);
  await user.save();
  res.json({ status: "ok", coins: user.coins });
});

export default router;
