export default {
  name: "invite",
  description: "✉️ Send the group invite link",
  
  async execute(sock, message, args) {
    const { from, reply, isGroup } = message;
    if (!isGroup) return await reply("❌ This command works only in groups");

    try {
      const link = await sock.groupInviteCode(from);
      await reply(`✉️ 𝙸𝚗𝚟𝚒𝚝𝚎 link:\nhttps://chat.whatsapp.com/${link}`);
    } catch (e) {
      console.error("Invite error:", e);
      await reply("❌ Cannot send invite link");
    }
  }
};