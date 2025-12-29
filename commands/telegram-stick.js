import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { exec } from "child_process";
import webp from "node-webpmux";

const delay = ms => new Promise(res => setTimeout(res, ms));

export const name = "telegram-stick";

export async function execute(sock, msg, args) {
  const from = msg.key.remoteJid;

  try {
    if (!args[0]) {
      await sock.sendMessage(from, {
        text: "🤖 𝙿𝚛𝚘𝚟𝚒𝚍𝚎 𝚃𝚎𝚕𝚎𝚐𝚛𝚊𝚖 𝚙𝚊𝚌𝚔 𝚞𝚛𝚕."
      }, { quoted: msg });
      return;
    }

    const url = args[0].trim();
    if (!url.match(/^https:\/\/t\.me\/addstickers\//)) {
      await sock.sendMessage(from, {
        text: "🤖 𝙸𝚗𝚟𝚊𝚕𝚒𝚍 𝚞𝚛𝚕."
      }, { quoted: msg });
      return;
    }

    const packName = url.replace("https://t.me/addstickers/", "");
    const botToken = "7801479976:AAGuPL0a7kXXBYz6XUSR_ll2SR5V_W6oHl4";

    const res = await fetch(`https://api.telegram.org/bot${botToken}/getStickerSet?name=${encodeURIComponent(packName)}`);
    const data = await res.json();

    if (!data.ok || !data.result) throw new Error("Pack not found.");

    const stickers = data.result.stickers;
    await sock.sendMessage(from, {
      text: `🤖 𝙿𝚊𝚌𝚔: ${data.result.title}\n🤖 𝚃𝚘𝚝𝚊𝚕: ${stickers.length}\n🤖 𝙲𝚘𝚗𝚟𝚎𝚛𝚝𝚒𝚗𝚐...`
    }, { quoted: msg });

    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    let success = 0;
    for (let i = 0; i < stickers.length; i++) {
      try {
        const sticker = stickers[i];
        const fileId = sticker.file_id;

        const info = await (await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`)).json();
        if (!info.ok) continue;

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
          "sticker-pack-name": "By",
          "sticker-pack-publisher": "User",
          "emojis": sticker.emoji ? [sticker.emoji] : ["🤖"]
        };

        const exifAttr = Buffer.from([0x49,0x49,0x2A,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00]);
        const jsonBuffer = Buffer.from(JSON.stringify(metadata), "utf8");
        const exif = Buffer.concat([exifAttr, jsonBuffer]);
        exif.writeUIntLE(jsonBuffer.length, 14, 4);
        img.exif = exif;

        const finalBuf = await img.save(null);

        await sock.sendMessage(from, { sticker: finalBuf });
        success++;

        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
        await delay(800);

      } catch (err) {
        console.error(`Sticker ${i} error:`, err);
      }
    }

    await sock.sendMessage(from, {
      text: `🤖 𝙲𝚘𝚗𝚟𝚎𝚛𝚝𝚎𝚍: ${success}/${stickers.length}`
    }, { quoted: msg });

  } catch (err) {
    console.error("Telegram sticker error:", err);
    await sock.sendMessage(from, {
      text: "🤖 𝙳𝚘𝚠𝚗𝚕𝚘𝚊𝚍 𝚏𝚊𝚒𝚕𝚎𝚍."
    }, { quoted: msg });
  }
      }
