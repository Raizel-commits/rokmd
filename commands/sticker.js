import fs from "fs";
import path from "path";
import { exec } from "child_process";
import crypto from "crypto";
import webp from "node-webpmux";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

export const name = "sticker";

export async function execute(sock, m, args) {
  try {
    const jid = m.key.remoteJid;
    const username = m.pushName || "User";

    let targetMessage = m;
    if (m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      const quoted = m.message.extendedTextMessage.contextInfo;
      targetMessage = {
        key: {
          remoteJid: jid,
          id: quoted.stanzaId,
          participant: quoted.participant,
        },
        message: quoted.quotedMessage,
      };
    }

    const mediaMsg =
      targetMessage.message?.imageMessage ||
      targetMessage.message?.videoMessage ||
      targetMessage.message?.documentMessage;

    if (!mediaMsg) {
      return await sock.sendMessage(
        jid,
        { text: "🤖 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚖𝚎𝚍𝚒𝚊." },
        { quoted: m }
      );
    }

    const mediaBuffer = await downloadMediaMessage(
      targetMessage,
      "buffer",
      {},
      { reuploadRequest: sock.updateMediaMessage }
    );

    if (!mediaBuffer) {
      return await sock.sendMessage(
        jid,
        { text: "🤖 𝙳𝚘𝚠𝚗𝚕𝚘𝚊𝚍 𝚏𝚊𝚒𝚕𝚎𝚍." },
        { quoted: m }
      );
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

    const cmd = isAnimated
      ? `ffmpeg -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -loop 0 -c:v libwebp -preset default -an -vsync 0 -pix_fmt yuva420p -quality 70 -compression_level 6 "${outputPath}"`
      : `ffmpeg -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -loop 0 -c:v libwebp -preset default -an -vsync 0 -pix_fmt yuva420p -quality 80 -compression_level 6 "${outputPath}"`;

    await new Promise((resolve, reject) => {
      exec(cmd, (err) => (err ? reject(err) : resolve()));
    });

    if (!fs.existsSync(outputPath)) throw new Error("WebP conversion failed.");

    const webpBuffer = fs.readFileSync(outputPath);
    const img = new webp.Image();
    await img.load(webpBuffer);

    const metadata = {
      "sticker-pack-id": crypto.randomBytes(16).toString("hex"),
      "sticker-pack-name": "Made by",
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

    await sock.sendMessage(jid, { sticker: finalBuffer }, { quoted: m });

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
  } catch (e) {
    console.error("Sticker error:", e);
    await sock.sendMessage(
      m.key.remoteJid,
      { text: `🤖 𝙴𝚛𝚛𝚘𝚛: ${e.message}` },
      { quoted: m }
    );
  }
}
