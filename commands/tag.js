export default {
  name: "tag",
  description: "𝚃𝚊𝚐 𝚊𝚕𝚕 𝚘𝚛 𝚜𝚎𝚕𝚎𝚌𝚝𝚎𝚍 𝚐𝚛𝚘𝚞𝚙 𝚖𝚎𝚖𝚋𝚎𝚛𝚜",
  
  async execute(sock, message, args) {
    const { from, reply, quoted, sender } = message;
    
    // 𝚅𝚎𝚛𝚒𝚏𝚒𝚎𝚛 𝚜𝚒 𝚌'𝚎𝚜𝚝 𝚞𝚗 𝚐𝚛𝚘𝚞𝚙𝚎
    if (!from.endsWith("@g.us")) {
      await reply("📍 𝚃𝚑𝚒𝚜 𝚌𝚘𝚖𝚖𝚊𝚗𝚍 𝚘𝚗𝚕𝚢 𝚠𝚘𝚛𝚔𝚜 𝚒𝚗 𝚐𝚛𝚘𝚞𝚙𝚜");
      return;
    }

    try {
      const groupMetadata = await sock.groupMetadata(from);
      const participants = groupMetadata.participants;

      // 𝚂𝚎𝚕𝚎𝚌𝚝𝚒𝚘𝚗𝚗𝚎𝚛 𝚜𝚙𝚎𝚌𝚒𝚏𝚒𝚚𝚞𝚎𝚖𝚎𝚗𝚝 𝚍𝚎𝚜 𝚖𝚎𝚖𝚋𝚛𝚎𝚜
      let targetParticipants = participants;
      let tagType = "𝚊𝚕𝚕";
      
      if (args[0] === "admin" || args[0] === "admins") {
        targetParticipants = participants.filter(p => p.admin === "admin" || p.admin === "superadmin");
        tagType = "𝚊𝚍𝚖𝚒𝚗𝚜";
      } else if (args[0] === "bot") {
        targetParticipants = participants.filter(p => p.id.includes(":"));
        tagType = "𝚋𝚘𝚝𝚜";
      }

      if (targetParticipants.length === 0) {
        await reply(`⚠️ 𝙽𝚘 ${tagType} 𝚖𝚎𝚖𝚋𝚎𝚛𝚜 𝚏𝚘𝚞𝚗𝚍 𝚝𝚘 𝚝𝚊𝚐`);
        return;
      }

      await reply(`🔍 𝙶𝚊𝚝𝚑𝚎𝚛𝚒𝚗𝚐 ${targetParticipants.length} ${tagType} 𝚖𝚎𝚖𝚋𝚎𝚛𝚜...`);

      let messageText;
      
      // 𝙳𝚎𝚝𝚎𝚛𝚖𝚒𝚗𝚎𝚛 𝚕𝚎 𝚖𝚎𝚜𝚜𝚊𝚐𝚎
      if (quoted && quoted.message) {
        messageText =
          quoted.message.conversation ||
          quoted.message.extendedTextMessage?.text ||
          quoted.message.imageMessage?.caption ||
          quoted.message.videoMessage?.caption ||
          "📢 𝙰𝚝𝚝𝚎𝚗𝚝𝚒𝚘𝚗";
      } else if (args.length > (args[0] === "admin" || args[0] === "bot" ? 1 : 0)) {
        // 𝙴𝚗𝚕𝚎𝚟𝚎𝚛 𝚕𝚎 𝚙𝚛𝚎𝚖𝚒𝚎𝚛 𝚊𝚛𝚐𝚞𝚖𝚎𝚗𝚝 𝚜𝚒 𝚌'𝚎𝚜𝚝 𝚞𝚗 𝚝𝚢𝚙𝚎 𝚍𝚎 𝚝𝚊𝚐
        const startIdx = ["admin", "admins", "bot"].includes(args[0]) ? 1 : 0;
        messageText = args.slice(startIdx).join(" ");
      } else {
        messageText = "📢 𝙰𝚝𝚝𝚎𝚗𝚝𝚒𝚘𝚗 𝚙𝚕𝚎𝚊𝚜𝚎";
      }

      const finalMessage = `${messageText}\n\n🏷️ 𝚃𝚊𝚐𝚐𝚒𝚗𝚐 ${tagType} (${targetParticipants.length})`;

      await sock.sendMessage(
        from,
        {
          text: finalMessage,
          mentions: targetParticipants.map(p => p.id)
        },
        { quoted: message }
      );

      // 𝙲𝚘𝚗𝚏𝚒𝚛𝚖𝚊𝚝𝚒𝚘𝚗
      await reply(`✅ 𝚂𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢 𝚝𝚊𝚐𝚐𝚎𝚍 ${targetParticipants.length} ${tagType}\n👤 𝙸𝚗𝚒𝚝𝚒𝚊𝚝𝚎𝚍 𝚋𝚢: @${sender.split('@')[0]}`, {
        mentions: [sender]
      });

    } catch (error) {
      console.error("𝚃𝚊𝚐 𝚎𝚛𝚛𝚘𝚛:", error);
      await reply(`❌ 𝙴𝚛𝚛𝚘𝚛: ${error.message}`);
    }
  }
};
