export default {
  name: "invite",
  description: "𝙶𝚎𝚝 𝚜𝚎𝚌𝚞𝚛𝚎 𝚐𝚛𝚘𝚞𝚙 𝚒𝚗𝚟𝚒𝚝𝚎 𝚕𝚒𝚗𝚔",
  
  async execute(sock, message, args) {
    const { from, reply, isGroup } = message;
    
    if (!isGroup) {
      await reply("❌ 𝙶𝚛𝚘𝚞𝚙 𝚘𝚗𝚕𝚢 𝚌𝚘𝚖𝚖𝚊𝚗𝚍");
      return;
    }
    
    try {
      const inviteCode = await sock.groupInviteCode(from);
      const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
      const metadata = await sock.groupMetadata(from);
      
      const securityMessage = `🔐 *𝚂𝙴𝙲𝚄𝚁𝙴 𝙸𝙽𝚅𝙸𝚃𝙴 𝙻𝙸𝙽𝙺*\n\n` +
                             `👥 *𝙶𝚛𝚘𝚞𝚙:* ${metadata.subject}\n` +
                             `👤 *𝙼𝚎𝚖𝚋𝚎𝚛𝚜:* ${metadata.participants.length}\n` +
                             `📅 *𝙲𝚛𝚎𝚊𝚝𝚎𝚍:* ${new Date(metadata.creation * 1000).toLocaleDateString()}\n\n` +
                             `🔗 *𝙻𝚒𝚗𝚔:*\n\`\`\`${inviteLink}\`\`\`\n\n` +
                             `⚠️ *𝚂𝙴𝙲𝚄𝚁𝙸𝚃𝚈 𝙽𝙾𝚃𝙴𝚂:*\n` +
                             `• 𝙳𝚘 𝚗𝚘𝚝 𝚜𝚑𝚊𝚛𝚎 𝚙𝚞𝚋𝚕𝚒𝚌𝚕𝚢\n` +
                             `• 𝙾𝚗𝚕𝚢 𝚜𝚑𝚊𝚛𝚎 𝚠𝚒𝚝𝚑 𝚝𝚛𝚞𝚜𝚝𝚎𝚍 𝚙𝚎𝚘𝚙𝚕𝚎\n` +
                             `• 𝚁𝚎𝚜𝚎𝚝 𝚕𝚒𝚗𝚔 𝚒𝚏 𝚌𝚘𝚖𝚙𝚛𝚘𝚖𝚒𝚜𝚎𝚍\n` +
                             `• 𝙻𝚒𝚗𝚔 𝚍𝚘𝚎𝚜 𝚗𝚘𝚝 𝚎𝚡𝚙𝚒𝚛𝚎`;
      
      await sock.sendMessage(from, { text: securityMessage });
      
    } catch (error) {
      console.error("Invite security error:", error);
      await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚐𝚎𝚗𝚎𝚛𝚊𝚝𝚎 𝚜𝚎𝚌𝚞𝚛𝚎 𝚕𝚒𝚗𝚔");
    }
  }
};
