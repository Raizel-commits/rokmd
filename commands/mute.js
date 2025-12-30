export default {
  name: "mute",
  description: "𝙼𝚞𝚝𝚎 𝚐𝚛𝚘𝚞𝚙",
  
  async execute(sock, message, args) {
    const { from, reply, isGroup } = message;
    
    if (!isGroup) {
      await reply("❌ 𝙶𝚛𝚘𝚞𝚙 𝚘𝚗𝚕𝚢");
      return;
    }
    
    try {
      if (args[0]?.toLowerCase() === "open") {
        await sock.groupSettingUpdate(from, "not_announcement");
        await reply("🔓 𝙶𝚛𝚘𝚞𝚙 𝚘𝚙𝚎𝚗𝚎𝚍");
      } else {
        await sock.groupSettingUpdate(from, "announcement");
        await reply("🔒 𝙶𝚛𝚘𝚞𝚙 𝚌𝚕𝚘𝚜𝚎𝚍");
      }
    } catch (error) {
      await reply("❌ 𝙰𝚍𝚖𝚒𝚗 𝚘𝚗𝚕𝚢");
    }
  }
};
