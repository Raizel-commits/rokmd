export default {
  name: "add",
  description: "𝙰𝚍𝚍 𝚊 𝚞𝚜𝚎𝚛 𝚝𝚘 𝚝𝚑𝚎 𝚐𝚛𝚘𝚞𝚙",
  aliases: ["invite", "adduser"],
  
  async execute(sock, message) {
    const { from, reply } = message;
    
    try {
      // Check if it's a group
      if (!from.endsWith("@g.us")) {
        return await reply("❌ 𝚃𝚑𝚒𝚜 𝚌𝚘𝚖𝚖𝚊𝚗𝚍 𝚘𝚗𝚕𝚢 𝚠𝚘𝚛𝚔𝚜 𝚒𝚗 𝚐𝚛𝚘𝚞𝚙𝚜");
      }

      // Get arguments safely
      const args = message.args || [];
      const phoneNumber = args[0] || "";

      if (!phoneNumber) {
        return await reply("❌ 𝚄𝚜𝚊𝚐𝚎: .𝚊𝚍𝚍 <𝚙𝚑𝚘𝚗𝚎_𝚗𝚞𝚖𝚋𝚎𝚛>");
      }

      // Clean and format number
      let cleanNumber = phoneNumber.replace(/[^0-9]/g, "");
      
      if (!cleanNumber) {
        return await reply("❌ 𝙸𝚗𝚟𝚊𝚕𝚒𝚍 𝚙𝚑𝚘𝚗𝚎 𝚗𝚞𝚖𝚋𝚎𝚛");
      }

      if (!cleanNumber.endsWith("@s.whatsapp.net")) {
        cleanNumber = cleanNumber + "@s.whatsapp.net";
      }

      // Adding to group
      await reply("🔄 𝙰𝚍𝚍𝚒𝚗𝚐 𝚞𝚜𝚎𝚛...");
      
      await sock.groupParticipantsUpdate(from, [cleanNumber], "add");
      
      await reply(`✅ 𝚄𝚜𝚎𝚛 ${phoneNumber} 𝚊𝚍𝚍𝚎𝚍 𝚝𝚘 𝚐𝚛𝚘𝚞𝚙`);

    } catch (error) {
      console.error("Add error:", error);
      
      if (error.message.includes("401")) {
        await reply("❌ 𝙱𝚘𝚝 𝚖𝚞𝚜𝚝 𝚋𝚎 𝚊𝚍𝚖𝚒𝚗");
      } else if (error.message.includes("403")) {
        await reply("❌ 𝚄𝚜𝚎𝚛 𝚋𝚕𝚘𝚌𝚔𝚎𝚍 𝚋𝚘𝚝");
      } else if (error.message.includes("404")) {
        await reply("❌ 𝚄𝚜𝚎𝚛 𝚗𝚘𝚝 𝚏𝚘𝚞𝚗𝚍");
      } else {
        await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚊𝚍𝚍 𝚞𝚜𝚎𝚛");
      }
    }
  }
};