import { downloadContentFromMessage } from "@whiskeysockets/baileys";

export default {
  name: "setpp",
  description: "𝚂𝚎𝚝 𝚋𝚘𝚝'𝚜 𝚙𝚛𝚘𝚏𝚒𝚕𝚎 𝚙𝚒𝚌𝚝𝚞𝚛𝚎",
  
  async execute(sock, message) {
    const { from, reply, quoted } = message;
    
    if (!quoted || !quoted.isImage) {
      await reply("🤖 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊𝚗 𝚒𝚖𝚊𝚐𝚎");
      return;
    }
    
    try {
      const quotedMsg = quoted.message.imageMessage;
      const stream = await downloadContentFromMessage(quotedMsg, "image");
      let buffer = Buffer.from([]);
      
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      
      await sock.updateProfilePicture(sock.user.id, buffer);
      
      await reply("🤖 𝙿𝚛𝚘𝚏𝚒𝚕𝚎 𝚙𝚒𝚌 𝚞𝚙𝚍𝚊𝚝𝚎𝚍");
      
    } catch (error) {
      console.error("Setpp error:", error);
      await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚞𝚙𝚍𝚊𝚝𝚎");
    }
  }
};
