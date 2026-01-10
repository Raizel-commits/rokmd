export default {
  name: "save",
  description: "𝚂𝚊𝚟𝚎 𝚚𝚞𝚘𝚝𝚎𝚍 𝚖𝚎𝚜𝚜𝚊𝚐𝚎 𝚝𝚘 𝚢𝚘𝚞𝚛 𝚒𝚗𝚋𝚘𝚡",
  aliases: ["keep", "backup"],
  
  async execute(sock, message) {
    const { from, reply } = message;
    
    try {
      // Vérifier si c'est une réponse
      if (!message.quoted) {
        return await reply("❌ 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊 𝚖𝚎𝚜𝚜𝚊𝚐𝚎");
      }
      
      await reply("💾 𝚂𝚊𝚟𝚒𝚗𝚐...");
      
      const quoted = message.quoted;
      const selfJid = sock.user.id;
      
      // Texte messages
      if (quoted.text) {
        await sock.sendMessage(selfJid, {
          text: `📝 *𝚂𝙰𝚅𝙴𝙳 𝚃𝙴𝚇𝚃*\n\n${quoted.text}`
        });
        return await reply("✅ 𝚃𝚎𝚡𝚝 𝚜𝚊𝚟𝚎𝚍");
      }
      
      // Media messages
      let mediaType;
      
      if (quoted.type === "image") {
        mediaType = "image";
      } else if (quoted.type === "video") {
        mediaType = "video";
      } else if (quoted.type === "audio") {
        mediaType = "audio";
      } else if (quoted.type === "document") {
        mediaType = "document";
      } else {
        return await reply("❌ 𝚄𝚗𝚜𝚞𝚙𝚙𝚘𝚛𝚝𝚎𝚍 𝚖𝚎𝚍𝚒𝚊 𝚝𝚢𝚙𝚎");
      }
      
      // Download media
      const buffer = await quoted.download();
      
      if (!buffer) {
        return await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚍𝚘𝚠𝚗𝚕𝚘𝚊𝚍");
      }
      
      // Send to self
      const sendOptions = {};
      
      switch (mediaType) {
        case "image":
          sendOptions.image = buffer;
          sendOptions.caption = "📸 𝚂𝚊𝚟𝚎𝚍";
          break;
        case "video":
          sendOptions.video = buffer;
          sendOptions.caption = "🎬 𝚂𝚊𝚟𝚎𝚍";
          break;
        case "audio":
          sendOptions.audio = buffer;
          sendOptions.mimetype = "audio/mp4";
          break;
        case "document":
          sendOptions.document = buffer;
          sendOptions.fileName = quoted.filename || `file_${Date.now()}`;
          break;
      }
      
      await sock.sendMessage(selfJid, sendOptions);
      await reply("✅ 𝙼𝚎𝚍𝚒𝚊 𝚜𝚊𝚟𝚎𝚍");
      
    } catch (error) {
      console.error("Save error:", error);
      await reply("❌ 𝙴𝚛𝚛𝚘𝚛 𝚜𝚊𝚟𝚒𝚗𝚐 𝚖𝚎𝚜𝚜𝚊𝚐𝚎");
    }
  }
};