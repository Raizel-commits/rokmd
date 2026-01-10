export default {
  name: "link",
  description: "🔗 Get the group invite link",
  
  async execute(sock, message, args) {
    const { from, reply, isGroup } = message;
    if (!isGroup) return await reply("❌ This command works only in groups");

    try {
      const group = await sock.groupMetadata(from);
      if (!group.id) return await reply("❌ Cannot fetch group link");

      const link = await sock.groupInviteCode(from);
      await reply(`🔗 𝙶𝚛𝚘𝚞𝚙 invite link:\nhttps://chat.whatsapp.com/${link}`);
    } catch (e) {
      console.error("Link error:", e);
      await reply("❌ Cannot get group link");
    }
  }
};