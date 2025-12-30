export default {
  name: "kickall",
  description: "𝙺𝚒𝚌𝚔 𝚊𝚕𝚕 𝚗𝚘𝚗-𝚊𝚍𝚖𝚒𝚗 𝚖𝚎𝚖𝚋𝚎𝚛𝚜",
  
  async execute(sock, message, args) {
    const { from, reply, isGroup } = message;
    
    if (!isGroup) {
      await reply("❌ 𝙶𝚛𝚘𝚞𝚙 𝚘𝚗𝚕𝚢 𝚌𝚘𝚖𝚖𝚊𝚗𝚍");
      return;
    }
    
    try {
      await reply("🚫 𝙺𝚒𝚌𝚔𝚒𝚗𝚐 𝚊𝚕𝚕 𝚗𝚘𝚗-𝚊𝚍𝚖𝚒𝚗𝚜...");
      
      let attempts = 0;
      const maxAttempts = 50;
      let totalKicked = 0;
      
      while (attempts < maxAttempts) {
        const groupMetadata = await sock.groupMetadata(from);
        const nonAdmins = groupMetadata.participants.filter(p => !p.admin);
        
        if (nonAdmins.length === 0) {
          await reply(`✅ 𝙰𝚕𝚕 𝚗𝚘𝚗-𝚊𝚍𝚖𝚒𝚗𝚜 𝚔𝚒𝚌𝚔𝚎𝚍\n𝚃𝚘𝚝𝚊𝚕: ${totalKicked} 𝚖𝚎𝚖𝚋𝚎𝚛𝚜`);
          return;
        }
        
        // Kick par lots de 5
        for (const member of nonAdmins.slice(0, 5)) {
          try {
            await sock.groupParticipantsUpdate(from, [member.id], "remove");
            totalKicked++;
            await new Promise(r => setTimeout(r, 500));
          } catch (e) {
            continue;
          }
        }
        
        attempts++;
        await new Promise(r => setTimeout(r, 1000));
      }
      
      await reply(`⚠️ 𝙼𝚊𝚡𝚒𝚖𝚞𝚖 𝚊𝚝𝚝𝚎𝚖𝚙𝚝𝚜 𝚛𝚎𝚊𝚌𝚑𝚎𝚍\n𝙺𝚒𝚌𝚔𝚎𝚍: ${totalKicked} 𝚖𝚎𝚖𝚋𝚎𝚛𝚜`);
      
    } catch (error) {
      console.error("Kickall error:", error);
      await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚔𝚒𝚌𝚔 𝚖𝚎𝚖𝚋𝚎𝚛𝚜");
    }
  }
};
