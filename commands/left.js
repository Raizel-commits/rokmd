export default {
  name: "left",
  description: "𝙻𝚎𝚊𝚟𝚎 𝚝𝚑𝚎 𝚐𝚛𝚘𝚞𝚙",
  
  async execute(sock, message) {
    const { from, reply, isGroup } = message;
    
    if (!isGroup) {
      await reply("❌ 𝙶𝚛𝚘𝚞𝚙 𝚘𝚗𝚕𝚢 𝚌𝚘𝚖𝚖𝚊𝚗𝚍");
      return;
    }
    
    try {
      await reply("👋 𝙻𝚎𝚊𝚟𝚒𝚗𝚐 𝚐𝚛𝚘𝚞𝚙...");
      await sock.groupLeave(from);
      
    } catch (error) {
      // Échec silencieux comme demandé
    }
  }
};
