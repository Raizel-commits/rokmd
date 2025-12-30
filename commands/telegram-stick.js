import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { exec } from "child_process";
import webp from "node-webpmux";

const delay = ms => new Promise(res => setTimeout(res, ms));

export default {
  name: "telegram-stick",
  description: "𝙲𝚘𝚗𝚟𝚎𝚛𝚝 𝚃𝚎𝚕𝚎𝚐𝚛𝚊𝚖 𝚜𝚝𝚒𝚌𝚔𝚎𝚛 𝚙𝚊𝚌𝚔 𝚝𝚘 𝚆𝚑𝚊𝚝𝚜𝙰𝚙𝚙",
  
  async execute(sock, message, args) {
    const { from, reply, sender } = message;
    
    try {
      if (!args[0]) {
        await reply("🔗 𝚄𝚜𝚊𝚐𝚎: .𝚝𝚎𝚕𝚎𝚐𝚛𝚊𝚖-𝚜𝚝𝚒𝚌𝚔 <𝚝𝚎𝚕𝚎𝚐𝚛𝚊𝚖_𝚙𝚊𝚌𝚔_𝚞𝚛𝚕>\n\n𝙴𝚡𝚊𝚖𝚙𝚕𝚎: .𝚝𝚎𝚕𝚎𝚐𝚛𝚊𝚖-𝚜𝚝𝚒𝚌𝚔 https://t.me/addstickers/𝙿𝚊𝚌𝚔𝙽𝚊𝚖𝚎");
        return;
      }

      const url = args[0].trim();
      if (!url.match(/^https:\/\/t\.me\/addstickers\//)) {
        await reply("❌ 𝙸𝚗𝚟𝚊𝚕𝚒𝚍 𝚃𝚎𝚕𝚎𝚐𝚛𝚊𝚖 𝚜𝚝𝚒𝚌𝚔𝚎𝚛 𝚙𝚊𝚌𝚔 𝚞𝚛𝚕\n𝙴𝚡𝚙𝚎𝚌𝚝𝚎𝚍 𝚏𝚘𝚛𝚖𝚊𝚝: https://t.me/addstickers/𝙿𝚊𝚌𝚔𝙽𝚊𝚖𝚎");
        return;
      }

      const packName = url.replace("https://t.me/addstickers/", "");
      const botToken = "7801479976:AAGuPL0a7kXXBYz6XUSR_ll2SR5V_W6oHl4";

      await reply("📡 𝙲𝚘𝚗𝚗𝚎𝚌𝚝𝚒𝚗𝚐 𝚝𝚘 𝚃𝚎𝚕𝚎𝚐𝚛𝚊𝚖 𝙰𝙿𝙸...");

      const res = await fetch(`https://api.telegram.org/bot${botToken}/getStickerSet?name=${encodeURIComponent(packName)}`);
      const data = await res.json();

      if (!data.ok || !data.result) {
        throw new Error("𝚂𝚝𝚒𝚌𝚔𝚎𝚛 𝚙𝚊𝚌𝚔 𝚗𝚘𝚝 𝚏𝚘𝚞𝚗𝚍");
      }

      const stickers = data.result.stickers;
      const packTitle = data.result.title || packName;
      
      await reply(`📦 𝙿𝚊𝚌𝚔: ${packTitle}\n👥 𝚂𝚝𝚒𝚌𝚔𝚎𝚛𝚜: ${stickers.length}\n🔄 𝚂𝚝𝚊𝚛𝚝𝚒𝚗𝚐 𝚌𝚘𝚗𝚟𝚎𝚛𝚜𝚒𝚘𝚗...\n👤 𝙸𝚗𝚒𝚝𝚒𝚊𝚝𝚎𝚍 𝚋𝚢: @${sender.split('@')[0]}`, {
        mentions: [sender]
      });

      const tmpDir = path.join(process.cwd(), "temp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      let success = 0;
      let failed = 0;
      let sent = 0;

      for (let i = 0; i < stickers.length; i++) {
        try {
          const sticker = stickers[i];
          const stickerNumber = i + 1;
          
          // 𝚂𝚎𝚗𝚍 𝚙𝚛𝚘𝚐𝚛𝚎𝚜𝚜 𝚞𝚙𝚍𝚊𝚝𝚎 𝚎𝚟𝚎𝚛𝚢 5 𝚜𝚝𝚒𝚌𝚔𝚎𝚛𝚜
          if (sent % 5 === 0 && sent > 0) {
            await reply(`📊 𝙿𝚛𝚘𝚐𝚛𝚎𝚜𝚜: ${success}/${stickers.length}\n✅ 𝚂𝚞𝚌𝚌𝚎𝚜𝚜: ${success}\n❌ 𝙵𝚊𝚒𝚕𝚎𝚍: ${failed}\n🔄 𝙲𝚘𝚗𝚝𝚒𝚗𝚞𝚒𝚗𝚐...`);
          }

          await reply(`🔄 𝙿𝚛𝚘𝚌𝚎𝚜𝚜𝚒𝚗𝚐 ${stickerNumber}/${stickers.length}...`);

          const fileId = sticker.file_id;
          const info = await (await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`)).json();
          
          if (!info.ok) {
            failed++;
            continue;
          }

          const filePath = info.result.file_path;
          const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
          const fileBuffer = await (await fetch(fileUrl)).buffer();

          const inputPath = path.join(tmpDir, `tg_${i}_${Date.now()}`);
          const outputPath = path.join(tmpDir, `tg_${i}_${Date.now()}.webp`);
          fs.writeFileSync(inputPath, fileBuffer);

          const isAnimated = sticker.is_animated || sticker.is_video;
          const ffmpegCmd = isAnimated
            ? `ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -loop 0 -vsync 0 -pix_fmt yuva420p -compression_level 6 -qscale 75 "${outputPath}"`
            : `ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -loop 0 -vsync 0 -pix_fmt yuva420p -compression_level 6 -qscale 75 "${outputPath}"`;

          await new Promise((resolve, reject) => {
            exec(ffmpegCmd, (err) => (err ? reject(err) : resolve()));
          });

          const webpBuffer = fs.readFileSync(outputPath);
          const img = new webp.Image();
          await img.load(webpBuffer);

          const metadata = {
            "sticker-pack-id": crypto.randomBytes(32).toString("hex"),
            "sticker-pack-name": packTitle.substring(0, 30),
            "sticker-pack-publisher": "𝚃𝚎𝚕𝚎𝚐𝚛𝚊𝚖 𝙸𝚖𝚙𝚘𝚛𝚝",
            "emojis": sticker.emoji ? [sticker.emoji] : ["🎭"]
          };

          const exifAttr = Buffer.from([0x49,0x49,0x2A,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00]);
          const jsonBuffer = Buffer.from(JSON.stringify(metadata), "utf8");
          const exif = Buffer.concat([exifAttr, jsonBuffer]);
          exif.writeUIntLE(jsonBuffer.length, 14, 4);
          img.exif = exif;

          const finalBuf = await img.save(null);

          await sock.sendMessage(from, { sticker: finalBuf });
          success++;
          sent++;

          // 𝙲𝚕𝚎𝚊𝚗𝚞𝚙 𝚝𝚎𝚖𝚙 𝚏𝚒𝚕𝚎𝚜
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
          
          await delay(1000); // 𝙰𝚝𝚝𝚎𝚗𝚝𝚎 1𝚜 𝚙𝚘𝚞𝚛 𝚎́𝚟𝚒𝚝𝚎𝚛 𝚕𝚎 𝚛𝚊𝚝𝚎 𝚕𝚒𝚖𝚒𝚝

        } catch (err) {
          console.error(`𝚂𝚝𝚒𝚌𝚔𝚎𝚛 ${i + 1} 𝚎𝚛𝚛𝚘𝚛:`, err.message);
          failed++;
        }
      }

      // 𝙵𝚒𝚗𝚊𝚕 𝚛𝚎𝚙𝚘𝚛𝚝
      const finalMessage = `📊 𝙲𝙾𝙽𝚅𝙴𝚁𝚂𝙸𝙾𝙽 𝙲𝙾𝙼𝙿𝙻𝙴𝚃𝙴𝙳\n━━━━━━━━━━━━━━━━━━━━\n✅ 𝚂𝚞𝚌𝚌𝚎𝚜𝚜: ${success}\n❌ 𝙵𝚊𝚒𝚕𝚎𝚍: ${failed}\n📦 𝚃𝚘𝚝𝚊𝚕: ${stickers.length}\n🎯 𝚂𝚞𝚌𝚌𝚎𝚜𝚜 𝚁𝚊𝚝𝚎: ${Math.round((success / stickers.length) * 100)}%\n👤 𝙸𝚗𝚒𝚝𝚒𝚊𝚝𝚎𝚍 𝚋𝚢: @${sender.split('@')[0]}\n━━━━━━━━━━━━━━━━━━━━`;
      
      await reply(finalMessage, {
        mentions: [sender]
      });

      // 𝙲𝚕𝚎𝚊𝚗 𝚞𝚙 𝚝𝚎𝚖𝚙 𝚍𝚒𝚛𝚎𝚌𝚝𝚘𝚛𝚢
      try {
        if (fs.existsSync(tmpDir)) {
          fs.readdirSync(tmpDir).forEach(file => {
            fs.unlinkSync(path.join(tmpDir, file));
          });
        }
      } catch (cleanupErr) {
        console.error("𝙲𝚕𝚎𝚊𝚗𝚞𝚙 𝚎𝚛𝚛𝚘𝚛:", cleanupErr);
      }

    } catch (error) {
      console.error("𝚃𝚎𝚕𝚎𝚐𝚛𝚊𝚖 𝚜𝚝𝚒𝚌𝚔𝚎𝚛 𝚎𝚛𝚛𝚘𝚛:", error);
      await reply(`❌ 𝙲𝚘𝚗𝚟𝚎𝚛𝚜𝚒𝚘𝚗 𝚏𝚊𝚒𝚕𝚎𝚍\n💬 ${error.message}`);
    }
  }
};
