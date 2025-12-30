import { downloadMediaMessage } from "@whiskeysockets/baileys";

export default {
  name: "save",
  description: "𝚂𝚊𝚟𝚎 𝚖𝚎𝚜𝚜𝚊𝚐𝚎 𝚝𝚘 𝚋𝚘𝚝'𝚜 𝚙𝚛𝚒𝚟𝚊𝚝𝚎 𝚌𝚑𝚊𝚝",
  
  async execute(sock, message) {
    const { from, reply, quoted } = message;
    const selfJid = sock.user.id;
    
    try {
      if (!quoted) {
        await reply("🤖 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚜𝚊𝚟𝚎");
        return;
      }
      
      const msg = quoted.message;
      const type = Object.keys(msg)[0];
      
      if (type === "conversation" || type === "extendedTextMessage") {
        const text = msg.conversation || msg.extendedTextMessage?.text || "🤖 𝙴𝚖𝚙𝚝𝚢";
        await sock.sendMessage(selfJid, { text: `🤖 𝚂𝚊𝚟𝚎𝚍:\n\n${text}` });
        await reply("🤖 𝚃𝚎𝚡𝚝 𝚜𝚊𝚟𝚎𝚍");
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
        await reply("❌ 𝚄𝚗𝚜𝚞𝚙𝚙𝚘𝚛𝚝𝚎𝚍");
        return;
      }
      
      await sock.sendMessage(selfJid, sendContent);
      await reply("✅ 𝙼𝚎𝚍𝚒𝚊 𝚜𝚊𝚟𝚎𝚍");
      
    } catch (error) {
      console.error("Save error:", error);
      await reply("❌ 𝙴𝚛𝚛𝚘𝚛: " + error.message);
    }
  }
};
