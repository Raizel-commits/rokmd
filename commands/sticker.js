import fs from "fs";
import path from "path";
import { exec } from "child_process";
import crypto from "crypto";
import webp from "node-webpmux";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

export default {
  name: "sticker",
  description: "𝙲𝚛𝚎𝚊𝚝𝚎 𝚜𝚝𝚒𝚌𝚔𝚎𝚛 𝚏𝚛𝚘𝚖 𝚒𝚖𝚊𝚐𝚎/𝚟𝚒𝚍𝚎𝚘",
  
  async execute(sock, message, args) {
    const { from, reply, quoted, sender } = message;
    const username = message.pushName || "𝚄𝚜𝚎𝚛";
    
    try {
      // 𝚅𝚎𝚛𝚒𝚏𝚒𝚎𝚛 𝚕𝚎 𝚖𝚎𝚍𝚒𝚊
      let targetMessage = message;
      if (quoted) {
        targetMessage = quoted;
      }
      
      const mediaMsg =
        targetMessage.message?.imageMessage ||
        targetMessage.message?.videoMessage ||
        targetMessage.message?.documentMessage;

      if (!mediaMsg) {
        await reply("🖼️ 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊𝚗 𝚒𝚖𝚊𝚐𝚎 𝚘𝚛 𝚟𝚒𝚍𝚎𝚘 𝚝𝚘 𝚖𝚊𝚔𝚎 𝚊 𝚜𝚝𝚒𝚌𝚔𝚎𝚛");
        return;
      }

      await reply("🔄 𝙳𝚘𝚠𝚗𝚕𝚘𝚊𝚍𝚒𝚗𝚐 𝚖𝚎𝚍𝚒𝚊...");

      const mediaBuffer = await downloadMediaMessage(
        targetMessage,
        "buffer",
        {},
        { reuploadRequest: sock.updateMediaMessage }
      );

      if (!mediaBuffer) {
        await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚍𝚘𝚠𝚗𝚕𝚘𝚊𝚍 𝚖𝚎𝚍𝚒𝚊");
        return;
      }

      const tempDir = "./temp";
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

      const inputPath = path.join(tempDir, `input_${Date.now()}.mp4`);
      const outputPath = path.join(tempDir, `sticker_${Date.now()}.webp`);
      fs.writeFileSync(inputPath, mediaBuffer);

      const isAnimated =
        mediaMsg.mimetype?.includes("video") ||
        mediaMsg.mimetype?.includes("gif") ||
        mediaMsg.seconds > 0;

      await reply(`🎞️ 𝙲𝚘𝚗𝚟𝚎𝚛𝚝𝚒𝚗𝚐 𝚝𝚘 ${isAnimated ? "𝚊𝚗𝚒𝚖𝚊𝚝𝚎𝚍" : "𝚜𝚝𝚊𝚝𝚒𝚌"} 𝚜𝚝𝚒𝚌𝚔𝚎𝚛...`);

      const cmd = isAnimated
        ? `ffmpeg -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -loop 0 -c:v libwebp -preset default -an -vsync 0 -pix_fmt yuva420p -quality 70 -compression_level 6 "${outputPath}"`
        : `ffmpeg -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -loop 0 -c:v libwebp -preset default -an -vsync 0 -pix_fmt yuva420p -quality 80 -compression_level 6 "${outputPath}"`;

      await new Promise((resolve, reject) => {
        exec(cmd, (err) => (err ? reject(err) : resolve()));
      });

      if (!fs.existsSync(outputPath)) {
        throw new Error("𝚆𝚎𝚋𝙿 𝚌𝚘𝚗𝚟𝚎𝚛𝚜𝚒𝚘𝚗 𝚏𝚊𝚒𝚕𝚎𝚍");
      }

      const webpBuffer = fs.readFileSync(outputPath);
      const img = new webp.Image();
      await img.load(webpBuffer);

      const metadata = {
        "sticker-pack-id": crypto.randomBytes(16).toString("hex"),
        "sticker-pack-name": "𝙲𝚛𝚎𝚊𝚝𝚎𝚍 𝚋𝚢 𝙱𝚘𝚝",
        "sticker-pack-publisher": username,
        emojis: ["⚡"],
      };

      const exifAttr = Buffer.from([
        0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
        0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
      ]);
      const jsonBuffer = Buffer.from(JSON.stringify(metadata), "utf8");
      const exif = Buffer.concat([exifAttr, jsonBuffer]);
      exif.writeUIntLE(jsonBuffer.length, 14, 4);

      img.exif = exif;
      const finalBuffer = await img.save(null);

      // 𝙴𝚗𝚟𝚘𝚢𝚎𝚛 𝚕𝚎 𝚜𝚝𝚒𝚌𝚔𝚎𝚛
      await sock.sendMessage(from, { sticker: finalBuffer }, { quoted: message });

      // 𝙼𝚎𝚜𝚜𝚊𝚐𝚎 𝚍𝚎 𝚌𝚘𝚗𝚏𝚒𝚛𝚖𝚊𝚝𝚒𝚘𝚗
      await reply(`✅ 𝚂𝚝𝚒𝚌𝚔𝚎𝚛 𝚌𝚛𝚎𝚊𝚝𝚎𝚍 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢\n📦 𝚃𝚢𝚙𝚎: ${isAnimated ? "𝙰𝚗𝚒𝚖𝚊𝚝𝚎𝚍" : "𝚂𝚝𝚊𝚝𝚒𝚌"}\n👤 𝙱𝚢: @${sender.split('@')[0]}`, {
        mentions: [sender]
      });

      // 𝙽𝚎𝚝𝚝𝚘𝚢𝚎𝚛 𝚕𝚎𝚜 𝚏𝚒𝚌𝚑𝚒𝚎𝚛𝚜 𝚝𝚎𝚖𝚙𝚘𝚛𝚊𝚒𝚛𝚎𝚜
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);

    } catch (error) {
      console.error("𝚂𝚝𝚒𝚌𝚔𝚎𝚛 𝚎𝚛𝚛𝚘𝚛:", error);
      await reply(`❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚌𝚛𝚎𝚊𝚝𝚎 𝚜𝚝𝚒𝚌𝚔𝚎𝚛\n💬 ${error.message}`);
    }
  }
};
