export default {
  name: "demote",
  description: "𝙳𝚎𝚖𝚘𝚝𝚎 𝚐𝚛𝚘𝚞𝚙 𝚊𝚍𝚖𝚒𝚗𝚜",
  
  async execute(sock, message, args) {
    const { from, reply, isGroup, mentionedJids, quoted } = message;
    
    if (!isGroup) {
      await reply("❌ 𝙶𝚛𝚘𝚞𝚙 𝚘𝚗𝚕𝚢");
      return;
    }
    
    // Collecter toutes les cibles
    let targets = [];
    
    if (mentionedJids && mentionedJids.length > 0) {
      targets = mentionedJids;
    } else if (quoted) {
      targets = [quoted.sender];
    }
    
    if (targets.length === 0) {
      await reply("📝 𝚄𝚜𝚊𝚐𝚎: .𝚍𝚎𝚖𝚘𝚝𝚎 @𝚞𝚜𝚎𝚛1 @𝚞𝚜𝚎𝚛2 ...");
      return;
    }
    
    try {
      await sock.groupParticipantsUpdate(from, targets, "demote");
      
      const targetNumbers = targets.map(t => t.split('@')[0]);
      await reply(`✅ 𝙳𝚎𝚖𝚘𝚝𝚎𝚍 ${targets.length} 𝚞𝚜𝚎𝚛(s): ${targetNumbers.map(n => `@${n}`).join(' ')}`, {
        mentions: targets
      });
      
    } catch (error) {
      console.error("Demote error:", error);
      await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚍𝚎𝚖𝚘𝚝𝚎");
    }
  }
};
