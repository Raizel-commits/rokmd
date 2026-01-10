export default {
  name: "block",
  description: "𝙱𝚕𝚘𝚌𝚔 𝚊 𝚆𝚑𝚊𝚝𝚜𝙰𝚙𝚙 𝚞𝚜𝚎𝚛",
  aliases: ["ban", "blockuser"],
  category: "𝙰𝚍𝚖𝚒𝚗",
  
  async execute(sock, message) {
    const { from, reply, args, quoted } = message;
    
    try {
      let targetUser = null;
      
      // Méthode 1: Mention (@user)
      if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        targetUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
      }
      // Méthode 2: Message cité (réponse)
      else if (quoted?.sender) {
        targetUser = quoted.sender;
      }
      // Méthode 3: Numéro en argument
      else if (args[0]) {
        const num = args[0].replace(/\D/g, '');
        if (num.length >= 10) {
          targetUser = num + '@s.whatsapp.net';
        }
      }
      
      if (!targetUser) {
        return await reply("❌ 𝙽𝚘 𝚞𝚜𝚎𝚛 𝚜𝚙𝚎𝚌𝚒𝚏𝚒𝚎𝚍\n\n" +
                          "𝚄𝚜𝚊𝚐𝚎:\n" +
                          "• .𝚋𝚕𝚘𝚌𝚔 @𝚞𝚜𝚎𝚛\n" +
                          "• .𝚋𝚕𝚘𝚌𝚔 (𝚛𝚎𝚙𝚕𝚢 𝚝𝚘 𝚖𝚎𝚜𝚜𝚊𝚐𝚎)\n" +
                          "• .𝚋𝚕𝚘𝚌𝚔 𝟼𝟷𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾");
      }
      
      await reply("🚫 𝙱𝚕𝚘𝚌𝚔𝚒𝚗𝚐 𝚞𝚜𝚎𝚛...");
      
      // Bloquer l'utilisateur
      await sock.updateBlockStatus(targetUser, 'block');
      
      const userId = targetUser.split('@')[0];
      await reply(`✅ 𝚄𝚜𝚎𝚛 𝚋𝚕𝚘𝚌𝚔𝚎𝚍\n📱 ${userId}`);
      
    } catch (error) {
      console.error("Block error:", error);
      
      if (error.message.includes("401")) {
        await reply("❌ 𝙿𝚎𝚛𝚖𝚒𝚜𝚜𝚒𝚘𝚗 𝚍𝚎𝚗𝚒𝚎𝚍");
      } else if (error.message.includes("404")) {
        await reply("❌ 𝚄𝚜𝚎𝚛 𝚗𝚘𝚝 𝚏𝚘𝚞𝚗𝚍");
      } else {
        await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚋𝚕𝚘𝚌𝚔 𝚞𝚜𝚎𝚛");
      }
    }
  }
};