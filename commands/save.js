import fs from "fs";
import path from "path";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

export const name = "save";
export async function execute(sock, m, args) {
  try {
    const selfJid = sock.user.id;
    const msg = m.message?.extendedTextMessage
      ? m.message?.extendedTextMessage?.contextInfo?.quotedMessage
      : m.message;

    if (!msg) {
      await sock.sendMessage(m.key.remoteJid, {
        text: "🤖 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚜𝚊𝚟𝚎."
      }, { quoted: m });
      return;
    }

    const type = Object.keys(msg)[0];

    if (type === "conversation" || type === "extendedTextMessage") {
      const text =
        msg.conversation || msg.extendedTextMessage?.text || "🤖 𝙴𝚖𝚙𝚝𝚢";
      await sock.sendMessage(selfJid, { text: `🤖 𝚂𝚊𝚟𝚎𝚍:\n\n${text}` });
      await sock.sendMessage(m.key.remoteJid, {
        text: "🤖 𝚃𝚎𝚡𝚝 𝚜𝚊𝚟𝚎𝚍."
      }, { quoted: m });
      return;
    }

    const buffer = await downloadMediaMessage(
      { message: msg },
      "buffer",
      {},
      { logger: console }
    );

    let fileName = Date.now().toString();
    let sendContent = {};

    if (type === "imageMessage") {
      fileName += ".jpg";
      sendContent = { image: buffer };
    } else if (type === "videoMessage") {
      fileName += ".mp4";
      sendContent = { video: buffer };
    } else if (type === "audioMessage") {
      fileName += ".mp3";
      sendContent = { audio: buffer, mimetype: "audio/mpeg", fileName };
    } else if (type === "documentMessage") {
      const ext = msg.documentMessage.fileName || "doc";
      fileName += `_${ext}`;
      sendContent = { document: buffer, fileName };
    } else if (type === "stickerMessage") {
      fileName += ".webp";
      sendContent = { sticker: buffer };
    } else {
      await sock.sendMessage(m.key.remoteJid, {
        text: "🤖 𝚄𝚗𝚜𝚞𝚙𝚙𝚘𝚛𝚝𝚎𝚍."
      }, { quoted: m });
      return;
    }

    await sock.sendMessage(selfJid, sendContent);
    await sock.sendMessage(m.key.remoteJid, {
      text: "🤖 𝙼𝚎𝚍𝚒𝚊 𝚜𝚊𝚟𝚎𝚍."
    }, { quoted: m });
  } catch (e) {
    await sock.sendMessage(m.key.remoteJid, {
      text: "🤖 𝙴𝚛𝚛𝚘𝚛: " + e.message
    }, { quoted: m });
  }
}
