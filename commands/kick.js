export default {
  name: "kick",
  description: "𝙺𝚒𝚌𝚔 𝚞𝚜𝚎𝚛 𝚏𝚛𝚘𝚖 𝚐𝚛𝚘𝚞𝚙",
  
  async execute(sock, message, args) {
    const { from, reply, isGroup, sender, raw } = message;

    if (!isGroup) {
      return await reply("❌ 𝙶𝚛𝚘𝚞𝚙 𝚘𝚗𝚕𝚢");
    }

    try {
      // Get mentioned users
      const mentioned = raw.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      // Get replied-to user
      const quotedUser = raw.message?.extendedTextMessage?.contextInfo?.participant;

      // Prepare target list
      let targets = [...mentioned];
      if (quotedUser && !targets.includes(quotedUser)) targets.push(quotedUser);

      // If no mentions/reply, check for phone number argument
      if (targets.length === 0 && args[0]) {
        const phoneNumber = args[0].replace(/[^0-9]/g, "");
        if (phoneNumber.length < 8) {
          return await reply("❌ 𝙸𝚗𝚟𝚊𝚕𝚒𝚍 𝚙𝚑𝚘𝚗𝚎 𝚗𝚞𝚖𝚋𝚎𝚛");
        }
        targets.push(`${phoneNumber}@s.whatsapp.net`);
      }

      if (targets.length === 0) {
        return await reply("⚠️ 𝙿𝚕𝚎𝚊𝚜𝚎 𝚖𝚎𝚗𝚝𝚒𝚘𝚗 𝚘𝚛 𝚛𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊 𝚖𝚎𝚜𝚜𝚊𝚐𝚎 𝚘𝚏 𝚝𝚑𝚎 𝚞𝚜𝚎𝚛 𝚢𝚘𝚞 𝚠𝚊𝚗𝚝 𝚝𝚘 𝚔𝚒𝚌𝚔");
      }

      // Kick targets
      await sock.groupParticipantsUpdate(from, targets, "remove");

      // Quick reaction
      await sock.sendMessage(from, { react: { text: "👋", key: raw.key } });

      // Send styled success message with mentions
      const teks = `✅ 𝙺𝚒𝚌𝚔𝚎𝚍 ${targets.map(t => `@${t.split("@")[0]}`).join(", ")} 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢.\n𝚁𝚎𝚚𝚞𝚎𝚜𝚝𝚎𝚍 𝚋𝚢: ${sender}`;
      await sock.sendMessage(from, { text: teks, mentions: targets });

    } catch (err) {
      console.error("❌ 𝙺𝚒𝚌𝚔 error:", err);
      await reply("❌ 𝙸𝚖𝚙𝚘𝚜𝚜𝚒𝚋𝚕𝚎 𝚝𝚘 𝚔𝚒𝚌𝚔 𝚝𝚑𝚎𝚜𝚎 𝚖𝚎𝚖𝚋𝚎𝚛𝚜. 𝙲𝚑𝚎𝚌𝚔 𝚖𝚢 𝚙𝚎𝚛𝚖𝚒𝚜𝚜𝚒𝚘𝚗𝚜.");
    }
  }
};