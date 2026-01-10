export default {
  name: "promoteall",
  description: "📈 Promote all group members to admin",
  
  async execute(sock, message, args) {
    const { from, reply, isGroup } = message;
    if (!isGroup) return await reply("❌ This command works only in groups");

    try {
      const group = await sock.groupMetadata(from);
      const botId = sock.user?.id.split(":")[0] + "@s.whatsapp.net";
      const ownerId = group.owner || "";

      // Filter all members except bot and owner
      const membersToPromote = group.participants
        .map(p => p.id)
        .filter(id => id !== botId && id !== ownerId);

      if (!membersToPromote.length) return await reply("ℹ️ No members to promote");

      for (const member of membersToPromote) {
        await sock.groupParticipantsUpdate(from, [member], "promote");
      }

      await reply(
        `✅ 𝙰𝚕𝚕 members promoted to admin\n👤 Excluded: bot and owner`,
        { mentions: membersToPromote }
      );
    } catch (e) {
      console.error("PromoteAll error:", e);
      await reply("❌ Cannot promote all members");
    }
  }
};