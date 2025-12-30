export default {
  name: "principal",
  description: "𝚂𝚑𝚘𝚠 𝚐𝚛𝚘𝚞𝚙 𝚘𝚠𝚗𝚎𝚛 𝚊𝚗𝚍 𝚊𝚍𝚖𝚒𝚗𝚜",
  
  async execute(sock, message, args) {
    const { from, reply, isGroup } = message;
    
    if (!isGroup) {
      await reply("🤖 𝙶𝚛𝚘𝚞𝚙 𝚌𝚘𝚖𝚖𝚊𝚗𝚍 𝚘𝚗𝚕𝚢");
      return;
    }
    
    try {
      await reply("👑 𝙵𝚎𝚝𝚌𝚑𝚒𝚗𝚐 𝚐𝚛𝚘𝚞𝚙 𝚊𝚍𝚖𝚒𝚗𝚒𝚜𝚝𝚛𝚊𝚝𝚘𝚛𝚜...");
      
      const metadata = await sock.groupMetadata(from);
      const ownerId = metadata.owner;
      const participants = metadata.participants;
      
      if (!ownerId) {
        await reply("❌ 𝙶𝚛𝚘𝚞𝚙 𝚘𝚠𝚗𝚎𝚛 𝚗𝚘𝚝 𝚏𝚘𝚞𝚗𝚍");
        return;
      }
      
      // Filtrer les admins
      const admins = participants.filter(p => p.admin);
      const superAdmins = admins.filter(p => p.admin === "superadmin");
      const regularAdmins = admins.filter(p => p.admin === "admin");
      
      // Construire la réponse
      let response = `👑 *𝙶𝚁𝙾𝚄𝙿 𝙰𝙳𝙼𝙸𝙽𝚂*\n\n`;
      
      response += `📝 *𝙶𝚛𝚘𝚞𝚙:* ${metadata.subject}\n`;
      response += `👥 *𝙼𝚎𝚖𝚋𝚎𝚛𝚜:* ${participants.length}\n\n`;
      
      response += `👑 *𝙾𝚠𝚗𝚎𝚛/𝚂𝚞𝚙𝚎𝚛𝙰𝚍𝚖𝚒𝚗𝚜* (${superAdmins.length})\n`;
      superAdmins.forEach((admin, index) => {
        const number = admin.id.split('@')[0];
        const isOwner = admin.id === ownerId;
        response += `${index + 1}. @${number} ${isOwner ? "(👑 𝙾𝚠𝚗𝚎𝚛)" : ""}\n`;
      });
      
      if (regularAdmins.length > 0) {
        response += `\n🛡️ *𝙰𝚍𝚖𝚒𝚗𝚜* (${regularAdmins.length})\n`;
        regularAdmins.forEach((admin, index) => {
          const number = admin.id.split('@')[0];
          response += `${index + 1}. @${number}\n`;
        });
      }
      
      // Mentions
      const mentions = admins.map(a => a.id);
      
      await sock.sendMessage(from, {
        text: response,
        mentions: mentions
      });
      
    } catch (error) {
      console.error("Admins list error:", error);
      await reply("❌ 𝙴𝚛𝚛𝚘𝚛 𝚏𝚎𝚝𝚌𝚑𝚒𝚗𝚐 𝚊𝚍𝚖𝚒𝚗𝚜");
    }
  }
};
