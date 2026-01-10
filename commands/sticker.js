import { downloadContentFromMessage } from "@whiskeysockets/baileys";

export default {
  name: "sticker",
  description: "𝙲𝚘𝚗𝚟𝚎𝚛𝚝 𝚒𝚖𝚊𝚐𝚎 𝚝𝚘 𝚜𝚝𝚒𝚌𝚔𝚎𝚛",
  
  async execute(sock, message) {
    const { from, reply } = message;
    
    try {
      // Vérifier la citation
      const quoted = message.quoted;
      
      if (!quoted) {
        return await reply("❌ 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊𝚗 𝚒𝚖𝚊𝚐𝚎");
      }
      
      const quotedMsg = quoted.message;
      
      if (!quotedMsg?.imageMessage) {
        return await reply("❌ 𝚀𝚞𝚘𝚝𝚎𝚍 𝚖𝚎𝚜𝚜𝚊𝚐𝚎 𝚖𝚞𝚜𝚝 𝚋𝚎 𝚊𝚗 𝚒𝚖𝚊𝚐𝚎");
      }
      
      await reply("🎨 𝙲𝚛𝚎𝚊𝚝𝚒𝚗𝚐 𝚜𝚝𝚒𝚌𝚔𝚎𝚛...");
      
      // Télécharger l'image
      const stream = await downloadContentFromMessage(quotedMsg.imageMessage, "image");
      let buffer = Buffer.from([]);
      
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      
      // Envoyer comme sticker
      await sock.sendMessage(from, { sticker: buffer });
      
      // Pas besoin de reply, le sticker est envoyé
      
    } catch (error) {
      console.error("Sticker error:", error);
      await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍: " + error.message);
    }
  }
};