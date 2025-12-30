export default {
  name: "pp",
  description: "𝙶𝚎𝚝 𝚞𝚜𝚎𝚛'𝚜 𝚙𝚛𝚘𝚏𝚒𝚕𝚎 𝚙𝚒𝚌𝚝𝚞𝚛𝚎 𝚊𝚗𝚍 𝚒𝚗𝚏𝚘",
  
  async execute(sock, message, args) {
    const { from, reply, mentionedJids, quoted, sender, isGroup } = message;
    
    try {
      let targetJid;
      
      // Déterminer la cible
      if (mentionedJids && mentionedJids.length > 0) {
        targetJid = mentionedJids[0];
      } else if (quoted) {
        targetJid = quoted.sender;
      } else if (args[0]) {
        targetJid = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
      } else {
        targetJid = sender; // Soi-même par défaut
      }
      
      // Vérifier l'existence
      const contactInfo = await sock.onWhatsApp(targetJid);
      if (!contactInfo || !contactInfo[0]?.exists) {
        await reply(`❌ 𝚄𝚜𝚎𝚛 +${targetJid.split('@')[0]} 𝚒𝚜 𝚗𝚘𝚝 𝚘𝚗 𝚆𝚑𝚊𝚝𝚜𝙰𝚙𝚙`);
        return;
      }
      
      // Obtenir les informations
      const [contact] = contactInfo;
      const profileUrl = await sock.profilePictureUrl(targetJid, "image").catch(() => null);
      const userNumber = targetJid.split("@")[0];
      
      // Construire le message d'information
      let infoText = `📱 *𝙿𝚛𝚘𝚏𝚒𝚕𝚎 𝙳𝚎𝚝𝚊𝚒𝚕𝚜*\n\n`;
      infoText += `• 👤 𝙽𝚞𝚖𝚋𝚎𝚛: +${userNumber}\n`;
      infoText += `• ✅ 𝚂𝚝𝚊𝚝𝚞𝚜: ${contact.exists ? "𝙰𝚌𝚝𝚒𝚟𝚎" : "𝙸𝚗𝚊𝚌𝚝𝚒𝚟𝚎"}\n`;
      infoText += `• 📸 𝙰𝚟𝚊𝚝𝚊𝚛: ${profileUrl ? "✅ 𝚈𝚎𝚜" : "❌ 𝙽𝚘"}\n`;
      
      if (isGroup) {
        infoText += `• 👥 𝙲𝚘𝚗𝚝𝚎𝚡𝚝: 𝙶𝚛𝚘𝚞𝚙\n`;
      } else {
        infoText += `• 👤 𝙲𝚘𝚗𝚝𝚎𝚡𝚝: 𝙿𝚛𝚒𝚟𝚊𝚝𝚎\n`;
      }
      
      infoText += `• 📥 𝚁𝚎𝚚𝚞𝚎𝚜𝚝𝚎𝚍 𝚋𝚢: ${sender.split('@')[0]}\n`;
      infoText += `\n🕒 𝚃𝚒𝚖𝚎: ${new Date().toLocaleTimeString()}`;
      
      // Si pas de photo, envoyer juste le texte
      if (!profileUrl) {
        await reply(infoText);
        return;
      }
      
      // Envoyer la photo avec les informations
      await sock.sendMessage(from, {
        image: { url: profileUrl },
        caption: infoText,
        jpegThumbnail: Buffer.from("") // Optional thumbnail
      });
      
    } catch (error) {
      console.error("Profile picture command error:", error);
      
      if (error.message.includes("404")) {
        await reply("❌ 𝙿𝚛𝚘𝚏𝚒𝚕𝚎 𝚙𝚒𝚌𝚝𝚞𝚛𝚎 𝚗𝚘𝚝 𝚏𝚘𝚞𝚗𝚍");
      } else if (error.message.includes("401")) {
        await reply("❌ 𝙽𝚘 𝚙𝚎𝚛𝚖𝚒𝚜𝚜𝚒𝚘𝚗 𝚝𝚘 𝚟𝚒𝚎𝚠 𝚙𝚛𝚘𝚏𝚒𝚕𝚎");
      } else {
        await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚐𝚎𝚝 𝚙𝚛𝚘𝚏𝚒𝚕𝚎 𝚙𝚒𝚌𝚝𝚞𝚛𝚎");
      }
    }
  }
};
