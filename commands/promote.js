export default {
  name: "promote",
  description: "𝙿𝚛𝚘𝚖𝚘𝚝𝚎 𝚞𝚜𝚎𝚛 𝚝𝚘 𝚊𝚍𝚖𝚒𝚗",
  
  async execute(sock, message, args) {
    const { from, reply, isGroup, sender, raw } = message;

    if (!isGroup) {
      return await reply("❌ 𝙶𝚛𝚘𝚞𝚙 𝚘𝚗𝚕𝚢");
    }

    try {
      const mentioned = raw.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const quotedUser = raw.message?.extendedTextMessage?.contextInfo?.participant;

      let targets = [...mentioned];
      if (quotedUser && !targets.includes(quotedUser)) targets.push(quotedUser);

      if (targets.length === 0 && args[0]) {
        const phoneNumber = args[0].replace(/[^0-9]/g, "");
        if (phoneNumber.length < 8) {
          return await reply("❌ 𝙸𝚗𝚟𝚊𝚕𝚒𝚍 𝚙𝚑𝚘𝚗𝚎 𝚗𝚞𝚖𝚋𝚎𝚛");
        }
        targets.push(`${phoneNumber}@s.whatsapp.net`);
      }

      if (targets.length === 0) {
        return await reply("⚠️ 𝙿𝚕𝚎𝚊𝚜𝚎 𝚖𝚎𝚗𝚝𝚒𝚘𝚗 𝚘𝚛 𝚛𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊 𝚖𝚎𝚜𝚜𝚊𝚐𝚎 𝚘𝚏 𝚝𝚑𝚎 𝚞𝚜𝚎𝚛 𝚢𝚘𝚞 𝚠𝚊𝚗𝚝 𝚝𝚘 𝚙𝚛𝚘𝚖𝚘𝚝𝚎");
      }

      await sock.groupParticipantsUpdate(from, targets, "promote");
      await sock.sendMessage(from, { react: { text: "🆙", key: raw.key } });

      const teks = `✅ 𝙿𝚛𝚘𝚖𝚘𝚝𝚎𝚍 ${targets.map(t => `@${t.split("@")[0]}`).join(", ")} 𝚝𝚘 𝚊𝚍𝚖𝚒𝚗.\n𝚁𝚎𝚚𝚞𝚎𝚜𝚝𝚎𝚍 𝚋𝚢: ${sender}`;
      await sock.sendMessage(from, { text: teks, mentions: targets });

    } catch (err) {
      console.error("❌ 𝙿𝚛𝚘𝚖𝚘𝚝𝚎 error:", err);
      await reply("❌ 𝙲𝚊𝚗'𝚝 𝚙𝚛𝚘𝚖𝚘𝚝𝚎 𝚝𝚑𝚎𝚜𝚎 𝚖𝚎𝚖𝚋𝚎𝚛𝚜. 𝙲𝚑𝚎𝚌𝚔 𝚖𝚢 𝚙𝚎𝚛𝚖𝚒𝚜𝚜𝚒𝚘𝚗𝚜.");
    }
  }
};