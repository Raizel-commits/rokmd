export default {
  name: "promote",
  description: "𝙿𝚛𝚘𝚖𝚘𝚝𝚎 𝚞𝚜𝚎𝚛 𝚝𝚘 𝚊𝚍𝚖𝚒𝚗",
  
  async execute(sock, message) {
    const { from, reply, mentionedJids, quoted } = message;
    
    try {
      const target = mentionedJids?.[0] || (quoted ? quoted.sender : null);
      
      if (!target) {
        await reply("🤖 𝙼𝚎𝚗𝚝𝚒𝚘𝚗 𝚘𝚛 𝚛𝚎𝚙𝚕𝚢 𝚝𝚘 𝚞𝚜𝚎𝚛");
        return;
      }
      
      await sock.groupParticipantsUpdate(from, [target], "promote");
      
      await sock.sendMessage(from, {
        text: `🤖 𝙰𝚍𝚖𝚒𝚗: @${target.split("@")[0]}`,
        mentions: [target]
      });
      
    } catch (error) {
      console.error("Promote error:", error);
      await reply("❌ 𝙲𝚘𝚖𝚖𝚊𝚗𝚍 𝚎𝚛𝚛𝚘𝚛");
    }
  }
};
