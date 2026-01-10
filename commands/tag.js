export default {
  name: "tag",
  description: "𝙼𝚎𝚗𝚝𝚒𝚘𝚗 𝚊𝚕𝚕 𝚖𝚎𝚖𝚋𝚎𝚛𝚜",
  
  async execute(sock, message) {
    const { from, reply } = message;
    
    try {
      if (!from.endsWith("@g.us")) return;
      
      const groupMetadata = await sock.groupMetadata(from);
      const participants = groupMetadata.participants || [];
      const mentions = participants.map(p => p.id);
      
      await sock.sendMessage(from, {
        text: `📢`,
        mentions: mentions
      });
      
      await reply(`👥 ${participants.length}`);
      
    } catch {
      await reply("❌");
    }
  }
};