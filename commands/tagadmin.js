export default {
  name: "tagadmin",
  description: "𝚃𝚊𝚐 𝚊𝚕𝚕 𝚐𝚛𝚘𝚞𝚙 𝚊𝚍𝚖𝚒𝚗𝚜",
  aliases: ["admin", "admintag", "mentionadmin"],
  
  async execute(sock, message) {
    const { from, reply } = message;
    
    try {
      // Vérifier si c'est un groupe
      if (!from.endsWith("@g.us")) {
        return await reply("❌ 𝚃𝚑𝚒𝚜 𝚌𝚘𝚖𝚖𝚊𝚗𝚍 𝚘𝚗𝚕𝚢 𝚠𝚘𝚛𝚔𝚜 𝚒𝚗 𝚐𝚛𝚘𝚞𝚙𝚜");
      }
      
      await reply("👑 𝙵𝚎𝚝𝚌𝚑𝚒𝚗𝚐 𝚊𝚍𝚖𝚒𝚗𝚜...");
      const startTime = Date.now();
      
      const groupMetadata = await sock.groupMetadata(from);
      const participants = groupMetadata.participants || [];
      const latency = Date.now() - startTime;
      
      // Filtrer les administrateurs
      const admins = participants.filter(p => p.admin);
      
      if (admins.length === 0) {
        return await reply("❌ 𝙽𝚘 𝚊𝚍𝚖𝚒𝚗𝚜 𝚏𝚘𝚞𝚗𝚍 𝚒𝚗 𝚝𝚑𝚒𝚜 𝚐𝚛𝚘𝚞𝚙");
      }
      
      // Indicateur de performance
      let indicator;
      if (latency <= 300) {
        indicator = "🟢";
      } else if (latency <= 800) {
        indicator = "🟡";
      } else {
        indicator = "🔴";
      }
      
      const mentions = admins.map(p => p.id);
      
      // Créer la liste des admins
      const adminList = admins
        .map((admin, index) => {
          const number = admin.id.split("@")[0];
          return `👑 ${index + 1}. @${number}`;
        })
        .join("\n");
      
      const text = `${indicator} *𝙰𝙳𝙼𝙸𝙽 𝙻𝙸𝚂𝚃*\n\n` +
                  `📊 𝚂𝚝𝚊𝚝𝚒𝚜𝚝𝚒𝚌𝚜:\n` +
                  `┣ 👑 𝙰𝚍𝚖𝚒𝚗𝚜: ${admins.length}\n` +
                  `┣ 👥 𝚃𝚘𝚝𝚊𝚕: ${participants.length}\n` +
                  `┗ ⚡ 𝚃𝚒𝚖𝚎: ${latency}𝚖𝚜\n\n` +
                  `👑 𝙰𝚍𝚖𝚒𝚗𝚜:\n${adminList}`;
      
      await sock.sendMessage(from, {
        text: text,
        mentions: mentions
      });
      
    } catch (error) {
      console.error("Tag admin error:", error);
      await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚏𝚎𝚝𝚌𝚑 𝚊𝚍𝚖𝚒𝚗𝚜");
    }
  }
};