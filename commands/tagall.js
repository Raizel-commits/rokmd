export default {
  name: "tagall",
  description: "𝙰𝚏𝚏𝚒𝚌𝚑𝚎 𝚎𝚝 𝚖𝚎𝚗𝚝𝚒𝚘𝚗𝚗𝚎 𝚝𝚘𝚞𝚜 𝚕𝚎𝚜 𝚖𝚎𝚖𝚋𝚛𝚎𝚜",
  
  async execute(sock, message) {
    const { from, reply } = message;
    
    try {
      if (!from.endsWith('@g.us')) {
        return await reply("🟡 𝚁𝚎́𝚜𝚎𝚛𝚟𝚎́ 𝚊𝚞𝚡 𝚐𝚛𝚘𝚞𝚙𝚎𝚜");
      }
      
      await reply("⏳ 𝚁𝚎𝚌𝚎𝚗𝚜𝚎𝚖𝚎𝚗𝚝 𝚎𝚗 𝚌𝚘𝚞𝚛𝚜...");
      
      const start = Date.now();
      const groupMetadata = await sock.groupMetadata(from);
      const participants = groupMetadata.participants || [];
      const mentions = participants.map(p => p.id);
      const latency = Date.now() - start;
      
      // Formatage liste des membres (tronquée si trop longue)
      let membersList = "";
      const maxDisplay = 15;
      
      if (participants.length <= maxDisplay) {
        membersList = participants
          .map((p, i) => `➤ ${i + 1}. @${p.id.split("@")[0]}`)
          .join("\n");
      } else {
        membersList = participants
          .slice(0, maxDisplay)
          .map((p, i) => `➤ ${i + 1}. @${p.id.split("@")[0]}`)
          .join("\n");
        membersList += `\n... 𝚎𝚝 ${participants.length - maxDisplay} 𝚊𝚞𝚝𝚛𝚎𝚜`;
      }
      
      const text = `🔊 *𝙰𝙿𝙿𝙴𝙻 𝙶𝙴𝙽𝙴𝚁𝙰𝙻*\n\n` +
                  `📊 𝚂𝚝𝚊𝚝𝚒𝚜𝚝𝚒𝚚𝚞𝚎𝚜 :\n` +
                  `┣ 👥 𝙼𝚎𝚖𝚋𝚛𝚎𝚜 : ${participants.length}\n` +
                  `┣ ⚡ 𝚃𝚎𝚖𝚙𝚜 : ${latency}𝚖𝚜\n` +
                  `┗ 📅 ${new Date().toLocaleDateString()}\n\n` +
                  `👤 𝙻𝚒𝚜𝚝𝚎 𝚍𝚎𝚜 𝚖𝚎𝚖𝚋𝚛𝚎𝚜 :\n${membersList}`;
      
      await sock.sendMessage(from, {
        text: text,
        mentions
      });
      
    } catch (error) {
      await reply("❌ 𝙴𝚛𝚛𝚎𝚞𝚛 𝚍𝚎 𝚛𝚎𝚌𝚎𝚗𝚜𝚎𝚖𝚎𝚗𝚝");
    }
  }
};