export default {
  name: "kickall",
  description: "🦵 𝙺𝚒𝚌𝚔 𝚊𝚕𝚕 𝚖𝚎𝚖𝚋𝚎𝚛𝚜 𝚎𝚡𝚌𝚎𝚙𝚝 𝚋𝚘𝚝 & 𝚘𝚠𝚗𝚎𝚛",

  async execute(sock, message, args) {
    const { from, reply, isGroup } = message;
    if (!isGroup) return await reply("❌ 𝙶𝚛𝚘𝚞𝚙 𝚘𝚗𝚕𝚢");

    const groupMetadata = await sock.groupMetadata(from);
    const botJid = sock.user.id;
    const ownerJid = groupMetadata.owner;

    const targets = groupMetadata.participants
      .map(p => p.id)
      .filter(jid => jid !== botJid && jid !== ownerJid);

    if (!targets.length) return await reply("ℹ️ 𝙽𝚘 𝚘𝚗𝚎 𝚝𝚘 𝚔𝚒𝚌𝚔");

    for (const jid of targets) {
      try {
        await sock.groupParticipantsUpdate(from, [jid], "remove");
      } catch {}
      await delay(3000); // 3s between kicks
    }

    await reply(`✅ 𝙺𝚒𝚌𝚔𝚎𝚍 ${targets.length} 𝚖𝚎𝚖𝚋𝚎𝚛𝚜`);
  }
};