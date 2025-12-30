export default {
  name: "apk",
  description: "𝚂𝚎𝚊𝚛𝚌𝚑 𝚏𝚘𝚛 𝙰𝙿𝙺𝚜 𝚘𝚗 𝚍𝚒𝚏𝚏𝚎𝚛𝚎𝚗𝚝 𝚜𝚝𝚘𝚛𝚎𝚜",
  aliases: ["app", "playstore", "download"],
  
  async execute(sock, message, args) {
    const { from, reply } = message;
    
    if (!args[0]) {
      await reply("📝 𝚄𝚜𝚊𝚐𝚎: .𝚊𝚙𝚔 <𝚊𝚙𝚙_𝚗𝚊𝚖𝚎>\n𝙴𝚡𝚊𝚖𝚙𝚕𝚎: .𝚊𝚙𝚔 𝚆𝚑𝚊𝚝𝚜𝙰𝚙𝚙");
      return;
    }

    const query = args.join(" ");
    
    // Liste des stores avec leurs URLs
    const stores = {
      "𝙿𝚕𝚊𝚢 𝚂𝚝𝚘𝚛𝚎": `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps`,
      "𝙰𝙿𝙺𝙿𝚞𝚛𝚎": `https://apkpure.com/search?q=${encodeURIComponent(query)}`,
      "𝙰𝙿𝙺𝙼𝚒𝚛𝚛𝚘𝚛": `https://www.apkmirror.com/?s=${encodeURIComponent(query)}`,
      "𝚄𝚙𝚝𝚘𝚍𝚘𝚠𝚗": `https://en.uptodown.com/android/search/${encodeURIComponent(query)}`,
      "𝚃𝚊𝚙𝚃𝚊𝚙": `https://www.taptap.io/search/${encodeURIComponent(query)}`,
      "𝙵-𝙳𝚛𝚘𝚒𝚍": `https://f-droid.org/?q=${encodeURIComponent(query)}`
    };

    // Construire le message avec les liens
    let result = `🔍 *𝚂𝚎𝚊𝚛𝚌𝚑 𝚏𝚘𝚛: ${query}*\n\n`;
    
    Object.entries(stores).forEach(([name, url], index) => {
      result += `${index + 1}. *${name}*\n\`\`\`${url}\`\`\`\n`;
    });

    result += "\n📲 *𝚂𝚎𝚕𝚎𝚌𝚝 𝚊 𝚜𝚝𝚘𝚛𝚎 𝚝𝚘 𝚍𝚘𝚠𝚗𝚕𝚘𝚊𝚍*";

    try {
      // Envoyer le message avec les liens
      await sock.sendMessage(from, { 
        text: result,
        linkPreview: false
      });

    } catch (error) {
      console.error("APK command error:", error);
      await reply("❌ 𝙴𝚛𝚛𝚘𝚛 𝚐𝚎𝚗𝚎𝚛𝚊𝚝𝚒𝚗𝚐 𝚜𝚎𝚊𝚛𝚌𝚑 𝚕𝚒𝚗𝚔𝚜");
    }
  }
};
