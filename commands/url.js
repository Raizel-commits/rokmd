import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import axios from "axios";
import fs from "fs";
import { join } from "path";
import FormData from "form-data";

export const name = "url";
export async function execute(sock, m, args) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage || m.message;

    let type = null;
    if (quoted.imageMessage) type = "image";
    else if (quoted.videoMessage) type = "video";
    else if (quoted.audioMessage) type = "audio";

    if (!type) {
      await sock.sendMessage(
        m.key.remoteJid,
        { text: "🤖 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚖𝚎𝚍𝚒𝚊." },
        { quoted: m }
      );
      return;
    }

    const stream = await downloadContentFromMessage(quoted[`${type}Message`], type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

    const tempDir = "./temp";
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const ext = type === "image" ? "jpg" : type === "video" ? "mp4" : "mp3";
    const filePath = join(tempDir, `media_${Date.now()}.${ext}`);
    fs.writeFileSync(filePath, buffer);

    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", fs.createReadStream(filePath));

    const upload = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders(),
    });

    fs.unlinkSync(filePath);

    const url = upload.data;
    await sock.sendMessage(
      m.key.remoteJid,
      { text: `🤖 𝚄𝚁𝙻: ${url}` },
      { quoted: m }
    );
  } catch (e) {
    await sock.sendMessage(
      m.key.remoteJid,
      { text: `🤖 𝙴𝚛𝚛𝚘𝚛: ${e.message}` },
      { quoted: m }
    );
  }
}
