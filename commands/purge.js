export default {
  name: "purge",
  description: "𝚁𝚎𝚖𝚘𝚟𝚎 𝚗𝚘𝚗-𝚊𝚍𝚖𝚒𝚗𝚜",
  
  async execute(sock, message) {
    const { from, reply } = message;
    
    try {
      if (!from.endsWith("@g.us")) return;
      
      const groupData = await sock.groupMetadata(from);
      const participants = groupData.participants || [];
      
      const toRemove = participants
        .filter(p => !p.admin)
        .map(p => p.id);
      
      if (toRemove.length === 0) {
        return await reply("❌ 𝙽𝚘 𝚗𝚘𝚗-𝚊𝚍𝚖𝚒𝚗𝚜");
      }
      
      await reply(`🚫 ${toRemove.length}...`);
      
      // Remove in small batches
      for (let i = 0; i < toRemove.length; i += 3) {
        const batch = toRemove.slice(i, i + 3);
        await sock.groupParticipantsUpdate(from, batch, "remove");
        if (i + 3 < toRemove.length) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      
      await reply("✅");
      
    } catch {
      await reply("❌");
    }
  }
};