export default {
  name: "tagall",
  description: "𝚃𝚊𝚐 𝚊𝚕𝚕 𝚖𝚎𝚖𝚋𝚎𝚛𝚜 𝚠𝚒𝚝𝚑 𝚏𝚘𝚛𝚖𝚊𝚝𝚝𝚎𝚍 𝚕𝚒𝚜𝚝",
  
  async execute(sock, message, args) {
    const { from, reply, sender } = message;
    
    try {
      // 𝚅𝚎𝚛𝚒𝚏𝚒𝚎𝚛 𝚜𝚒 𝚌'𝚎𝚜𝚝 𝚞𝚗 𝚐𝚛𝚘𝚞𝚙𝚎
      if (!from.endsWith("@g.us")) {
        await reply("📍 𝚃𝚑𝚒𝚜 𝚌𝚘𝚖𝚖𝚊𝚗𝚍 𝚘𝚗𝚕𝚢 𝚠𝚘𝚛𝚔𝚜 𝚒𝚗 𝚐𝚛𝚘𝚞𝚙𝚜");
        return;
      }

      await reply("🔍 𝙵𝚎𝚝𝚌𝚑𝚒𝚗𝚐 𝚐𝚛𝚘𝚞𝚙 𝚖𝚎𝚖𝚋𝚎𝚛𝚜...");

      const groupMetadata = await sock.groupMetadata(from);
      const participants = groupMetadata.participants || [];
      const mentions = participants.map(p => p.id);

      if (participants.length === 0) {
        await reply("⚠️ 𝙽𝚘 𝚖𝚎𝚖𝚋𝚎𝚛𝚜 𝚏𝚘𝚞𝚗𝚍 𝚒𝚗 𝚝𝚑𝚒𝚜 𝚐𝚛𝚘𝚞𝚙");
        return;
      }

      // 𝙲𝚛𝚎𝚊𝚝𝚎 𝚏𝚘𝚛𝚖𝚊𝚝𝚝𝚎𝚍 𝚕𝚒𝚜𝚝
      let formattedList = "";
      let memberCount = 0;
      
      participants.forEach((participant, index) => {
        const number = participant.id.split("@")[0];
        const isAdmin = participant.admin === "admin" || participant.admin === "superadmin";
        const prefix = isAdmin ? "👑" : "👤";
        
        formattedList += `${prefix} @${number}\n`;
        memberCount++;
      });

      // 𝙲𝚛𝚎𝚊𝚝𝚎 𝚏𝚒𝚗𝚊𝚕 𝚖𝚎𝚜𝚜𝚊𝚐𝚎
      const header = `📢 *𝚃𝙰𝙶 𝙰𝙻𝙻 𝙼𝙴𝙼𝙱𝙴𝚁𝚂*\n👥 𝚃𝚘𝚝𝚊𝚕: ${memberCount} 𝙼𝚎𝚖𝚋𝚎𝚛𝚜\n━━━━━━━━━━━━━━━━━━━━`;
      const footer = `━━━━━━━━━━━━━━━━━━━━\n⚡ 𝙸𝚗𝚒𝚝𝚒𝚊𝚝𝚎𝚍 𝚋𝚢: @${sender.split('@')[0]}`;

      const finalText = `${header}\n\n${formattedList}\n${footer}`;

      // 𝚂𝚎𝚗𝚍 𝚝𝚑𝚎 𝚝𝚊𝚐 𝚖𝚎𝚜𝚜𝚊𝚐𝚎
      await sock.sendMessage(from, {
        text: finalText,
        mentions
      }, { quoted: message });

      // 𝙲𝚘𝚗𝚏𝚒𝚛𝚖𝚊𝚝𝚒𝚘𝚗
      await reply(`✅ 𝚂𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢 𝚝𝚊𝚐𝚐𝚎𝚍 ${memberCount} 𝚖𝚎𝚖𝚋𝚎𝚛𝚜\n👤 𝙸𝚗𝚒𝚝𝚒𝚊𝚝𝚎𝚍 𝚋𝚢: @${sender.split('@')[0]}`, {
        mentions: [sender]
      });

    } catch (error) {
      console.error("𝚃𝚊𝚐𝚊𝚕𝚕 𝚎𝚛𝚛𝚘𝚛:", error);
      await reply(`❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚝𝚊𝚐 𝚖𝚎𝚖𝚋𝚎𝚛𝚜\n💬 ${error.message}`);
    }
  }
};
