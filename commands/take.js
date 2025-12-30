import { Sticker, StickerTypes } from "wa-sticker-formatter";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";

export default {
  name: "take",
  description: "𝚃𝚊𝚔𝚎 𝚜𝚝𝚒𝚌𝚔𝚎𝚛 𝚏𝚛𝚘𝚖 𝚛𝚎𝚙𝚕𝚢",
  
  async execute(sock, message, args) {
    const { from, reply, quoted, sender } = message;
    
    try {
      if (!quoted?.message?.stickerMessage) {
        await reply("🤖 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊 𝚜𝚝𝚒𝚌𝚔𝚎𝚛");
        return;
      }

      await reply("🔄 𝙿𝚛𝚘𝚌𝚎𝚜𝚜𝚒𝚗𝚐...");

      const stream = await downloadContentFromMessage(quoted.message.stickerMessage, "sticker");
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const sticker = new Sticker(buffer, {
        pack: "𝚃𝚊𝚔𝚎𝚗",
        author: message.pushName || "𝚄𝚜𝚎𝚛",
        type: StickerTypes.FULL,
        quality: 80,
      });

      await sock.sendMessage(from, {
        sticker: await sticker.build()
      }, { quoted: message });

      await reply(`✅ 𝙳𝚘𝚗𝚎\n👤 @${sender.split('@')[0]}`, {
        mentions: [sender]
      });

    } catch (error) {
      console.error("𝙴𝚛𝚛𝚘𝚛:", error);
      await reply(`❌ ${error.message}`);
    }
  }
};
