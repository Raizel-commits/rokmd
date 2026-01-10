import fs from "fs";
import path from "path";
import { execSync } from "child_process";

let gTTS;

// Auto-install gtts.js si absent
try {
  gTTS = await import("gtts.js");
  gTTS = gTTS.default || gTTS; // corrige import selon version
} catch (err) {
  console.log("📦 gtts.js not found, installing...");
  execSync("npm install gtts.js", { stdio: "inherit" });
  gTTS = await import("gtts.js");
  gTTS = gTTS.default || gTTS;
}

export default {
  name: "tts",
  description: "𝚂𝚎𝚗𝚍 𝚝𝚎𝚡𝚝 𝚊𝚜 𝚊𝚞𝚍𝚒𝚘",

  async execute(sock, message, args) {
    const { from, reply, raw } = message;

    try {
      let text = "";

      // Si reply à un message
      const quoted = raw.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (quoted) {
        text = quoted?.conversation || quoted?.extendedTextMessage?.text || "";
      } else if (args && args.length > 0) {
        text = args.join(" ");
      }

      if (!text) {
        return await reply(
          "❌ 𝙿𝚕𝚎𝚊𝚜𝚎 𝚙𝚛𝚘𝚟𝚒𝚍𝚎 𝚝𝚎𝚡𝚝 𝚝𝚘 𝚜𝚙𝚎𝚊𝚔, 𝚘𝚛 𝚛𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊 𝚖𝚎𝚜𝚜𝚊𝚐𝚎."
        );
      }

      // Création dossier temporaire
      const tmpDir = path.join("./tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const tts = new gTTS(text, "en"); // CORRECTION ici
      const filePath = path.join(tmpDir, `tts_${Date.now()}.mp3`);

      // Génération du fichier audio
      await new Promise((resolve, reject) => {
        tts.save(filePath, (err) => (err ? reject(err) : resolve()));
      });

      // Envoi de l'audio
      await sock.sendMessage(from, {
        audio: fs.readFileSync(filePath),
        mimetype: "audio/mpeg",
        ptt: false,
      });

      // Suppression fichier temporaire
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("❌ TTS error:", err);
      await reply(
        "❌ 𝙰𝚗 𝚎𝚛𝚛𝚘𝚛 𝚘𝚌𝚌𝚞𝚛𝚛𝚎𝚍 𝚍𝚞𝚛𝚒𝚗𝚐 𝚊𝚞𝚍𝚒𝚘 𝚐𝚎𝚗𝚎𝚛𝚊𝚝𝚒𝚘𝚗."
      );
    }
  },
};