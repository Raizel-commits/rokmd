import { Sticker, StickerTypes } from "wa-sticker-formatter";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";

export const name = "take";
export async function execute(sock, m, args) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
    if (!quoted) {
      await sock.sendMessage(m.key.remoteJid, {
        text: "🤖 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊 𝚜𝚝𝚒𝚌𝚔𝚎𝚛."
      }, { quoted: m });
      return;
    }

    const stream = await downloadContentFromMessage(quoted, "sticker");
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    const sticker = new Sticker(buffer, {
      pack: "By",
      author: m.pushName || "User",
      type: StickerTypes.FULL,
      quality: 70,
    });

    await sock.sendMessage(m.key.remoteJid, {
      sticker: await sticker.build()
    }, { quoted: m });

  } catch (e) {
    await sock.sendMessage(m.key.remoteJid, {
      text: `🤖 𝙴𝚛𝚛𝚘𝚛: ${e.message}`
    }, { quoted: m });
  }
}
