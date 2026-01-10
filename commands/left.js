export default {
  name: "left",
  description: "🚪 Make the bot leave the group",
  
  async execute(sock, message, args) {
    const { from, reply, isGroup } = message;
    
    if (!isGroup) return await reply("❌ This command works only in groups");

    try {
      await sock.groupLeave(from);
      console.log(`🚪 Left group: ${from}`);
      // No need to reply in the group because the bot leaves
    } catch (e) {
      console.error("Left error:", e);
      await reply("❌ Cannot leave the group");
    }
  }
};