import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import axios from "axios";
import fs from "fs";
import { join } from "path";
import FormData from "form-data";

export default {
  name: "url",
  description: "𝚄𝚙𝚕𝚘𝚊𝚍 𝚖𝚎𝚍𝚒𝚊 𝚝𝚘 𝚌𝚕𝚘𝚞𝚍 𝚊𝚗𝚍 𝚐𝚎𝚝 𝚜𝚑𝚊𝚛𝚊𝚋𝚕𝚎 𝚞𝚛𝚕",
  
  async execute(sock, message, args) {
    const { from, reply, quoted, sender } = message;
    
    try {
      // 𝙳𝚎́𝚝𝚎𝚛𝚖𝚒𝚗𝚎𝚛 𝚕𝚎 𝚝𝚢𝚙𝚎 𝚍𝚎 𝚖𝚎́𝚍𝚒𝚊
      let type = null;
      let mediaMsg = null;
      
      if (quoted && quoted.message) {
        if (quoted.message.imageMessage) {
          type = "𝚒𝚖𝚊𝚐𝚎";
          mediaMsg = quoted.message.imageMessage;
        } else if (quoted.message.videoMessage) {
          type = "𝚟𝚒𝚍𝚎𝚘";
          mediaMsg = quoted.message.videoMessage;
        } else if (quoted.message.audioMessage) {
          type = "𝚊𝚞𝚍𝚒𝚘";
          mediaMsg = quoted.message.audioMessage;
        } else if (quoted.message.documentMessage) {
          const mime = quoted.message.documentMessage.mimetype || "";
          if (mime.startsWith("image/")) {
            type = "𝚒𝚖𝚊𝚐𝚎";
            mediaMsg = quoted.message.documentMessage;
          } else if (mime.startsWith("video/")) {
            type = "𝚟𝚒𝚍𝚎𝚘";
            mediaMsg = quoted.message.documentMessage;
          } else if (mime.startsWith("audio/")) {
            type = "𝚊𝚞𝚍𝚒𝚘";
            mediaMsg = quoted.message.documentMessage;
          }
        }
      }

      if (!type || !mediaMsg) {
        await reply("🖼️ 𝚄𝚜𝚊𝚐𝚎: 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊𝚗 𝚒𝚖𝚊𝚐𝚎, 𝚟𝚒𝚍𝚎𝚘 𝚘𝚛 𝚊𝚞𝚍𝚒𝚘 𝚏𝚒𝚕𝚎");
        return;
      }

      await reply(`🔄 𝙳𝚘𝚠𝚗𝚕𝚘𝚊𝚍𝚒𝚗𝚐 ${type}...`);

      // 𝚃𝚎́𝚕𝚎́𝚌𝚑𝚊𝚛𝚐𝚎𝚛 𝚕𝚎 𝚏𝚒𝚌𝚑𝚒𝚎𝚛
      const stream = await downloadContentFromMessage(mediaMsg, type === "𝚊𝚞𝚍𝚒𝚘" ? "audio" : type === "𝚟𝚒𝚍𝚎𝚘" ? "video" : "image");
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // 𝙲𝚛𝚎́𝚎𝚛 𝚞𝚗 𝚏𝚒𝚌𝚑𝚒𝚎𝚛 𝚝𝚎𝚖𝚙𝚘𝚛𝚊𝚒𝚛𝚎
      const tempDir = "./temp";
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      
      let extension = "jpg";
      if (type === "𝚟𝚒𝚍𝚎𝚘") extension = "mp4";
      if (type === "𝚊𝚞𝚍𝚒𝚘") extension = "mp3";
      
      const filePath = join(tempDir, `upload_${Date.now()}.${extension}`);
      fs.writeFileSync(filePath, buffer);

      await reply(`☁️ 𝚄𝚙𝚕𝚘𝚊𝚍𝚒𝚗𝚐 ${type} 𝚝𝚘 𝚌𝚕𝚘𝚞𝚍...`);

      // 𝚄𝚙𝚕𝚘𝚊𝚍 𝚟𝚎𝚛𝚜 𝙲𝚊𝚝𝚋𝚘𝚡
      const form = new FormData();
      form.append("reqtype", "fileupload");
      form.append("fileToUpload", fs.createReadStream(filePath));

      const upload = await axios.post("https://catbox.moe/user/api.php", form, {
        headers: form.getHeaders(),
      });

      const fileUrl = upload.data;
      
      // 𝙽𝚎𝚝𝚝𝚘𝚢𝚎𝚛 𝚕𝚎 𝚏𝚒𝚌𝚑𝚒𝚎𝚛 𝚝𝚎𝚖𝚙𝚘𝚛𝚊𝚒𝚛𝚎
      fs.unlinkSync(filePath);

      // 𝙰𝚏𝚏𝚒𝚌𝚑𝚎𝚛 𝚕𝚎 𝚛𝚎́𝚜𝚞𝚕𝚝𝚊𝚝
      const resultMessage = `✅ 𝙼𝙴𝙳𝙸𝙰 𝚄𝙿𝙻𝙾𝙰𝙳𝙴𝙳\n━━━━━━━━━━━━━━━━━━━━\n🔗 𝚄𝚁𝙻: ${fileUrl}\n📁 𝚃𝚢𝚙𝚎: ${type.toUpperCase()}\n👤 𝚄𝚙𝚕𝚘𝚊𝚍𝚎𝚍 𝚋𝚢: @${sender.split('@')[0]}\n━━━━━━━━━━━━━━━━━━━━`;
      
      await sock.sendMessage(from, {
        text: resultMessage,
        mentions: [sender]
      }, { quoted: message });

    } catch (error) {
      console.error("𝚄𝚁𝙻 𝚎𝚛𝚛𝚘𝚛:", error);
      await reply(`❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚞𝚙𝚕𝚘𝚊𝚍 𝚖𝚎𝚍𝚒𝚊\n💬 ${error.message}`);
    }
  }
};
