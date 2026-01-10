import { downloadContentFromMessage } from "@whiskeysockets/baileys";

export default {
  name: "setpp",
  description: "𝙲𝚑𝚊𝚗𝚐𝚎 𝚋𝚘𝚝'𝚜 𝚙𝚛𝚘𝚏𝚒𝚕𝚎 𝚙𝚒𝚌𝚝𝚞𝚛𝚎",
  
  async execute(sock, message) {
    const { from, reply } = message;
    
    try {
      // Vérifier si le message a une citation
      const quoted = message.quoted;
      
      if (!quoted) {
        return await reply("❌ 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊𝚗 𝚒𝚖𝚊𝚐𝚎");
      }
      
      // Vérifier si le message cité contient une image
      const quotedMsg = quoted.message;
      
      if (!quotedMsg?.imageMessage) {
        return await reply("❌ 𝚀𝚞𝚘𝚝𝚎𝚍 𝚖𝚎𝚜𝚜𝚊𝚐𝚎 𝚒𝚜 𝚗𝚘𝚝 𝚊𝚗 𝚒𝚖𝚊𝚐𝚎");
      }
      
      await reply("🔄 𝙲𝚑𝚊𝚗𝚐𝚒𝚗𝚐 𝚙𝚛𝚘𝚏𝚒𝚕𝚎 𝚙𝚒𝚌𝚝𝚞𝚛𝚎...");
      
      // Télécharger l'image
      const stream = await downloadContentFromMessage(quotedMsg.imageMessage, "image");
      let buffer = Buffer.from([]);
      
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      
      // Mettre à jour la photo de profil
      await sock.updateProfilePicture(sock.user.id, buffer);
      
      await reply("✅ 𝙿𝚛𝚘𝚏𝚒𝚕𝚎 𝚙𝚒𝚌𝚝𝚞𝚛𝚎 𝚞𝚙𝚍𝚊𝚝𝚎𝚍");
      
    } catch (error) {
      console.error("SetPP error:", error);
      await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍: " + error.message);
    }
  }
};