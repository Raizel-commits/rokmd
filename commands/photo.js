import { downloadContentFromMessage } from "@whiskeysockets/baileys";

export default {
  name: "photo",
  description: "𝙲𝚘𝚗𝚟𝚎𝚛𝚝 𝚜𝚝𝚒𝚌𝚔𝚎𝚛 𝚝𝚘 𝚒𝚖𝚊𝚐𝚎 𝚘𝚛 𝚒𝚖𝚊𝚐𝚎 𝚝𝚘 𝚜𝚝𝚒𝚌𝚔𝚎𝚛",
  
  async execute(sock, message, args) {
    const { from, reply, quoted } = message;
    
    if (!quoted) {
      await reply("📷 𝚄𝚜𝚊𝚐𝚎:\n• .𝚙𝚑𝚘𝚝𝚘 - 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚜𝚝𝚒𝚌𝚔𝚎𝚛 (𝚌𝚘𝚗𝚟𝚎𝚛𝚝 𝚝𝚘 𝚒𝚖𝚊𝚐𝚎)\n• .𝚙𝚑𝚘𝚝𝚘 𝚜𝚝𝚒𝚌𝚔𝚎𝚛 - 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚒𝚖𝚊𝚐𝚎 (𝚌𝚘𝚗𝚟𝚎𝚛𝚝 𝚝𝚘 𝚜𝚝𝚒𝚌𝚔𝚎𝚛)");
      return;
    }
    
    try {
      // Convertir sticker en image
      if (quoted.isSticker) {
        await reply("🔄 𝙲𝚘𝚗𝚟𝚎𝚛𝚝𝚒𝚗𝚐 𝚜𝚝𝚒𝚌𝚔𝚎𝚛 𝚝𝚘 𝚒𝚖𝚊𝚐𝚎...");
        
        const stream = await downloadContentFromMessage(quoted.message.stickerMessage, "sticker");
        let buffer = Buffer.from([]);
        
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        
        await sock.sendMessage(from, {
          image: buffer,
          caption: "🖼️ 𝚂𝚝𝚒𝚌𝚔𝚎𝚛 𝚝𝚘 𝙸𝚖𝚊𝚐𝚎"
        });
        
      } 
      // Convertir image en sticker
      else if (quoted.isImage && args[0] === "sticker") {
        await reply("🎨 𝙲𝚘𝚗𝚟𝚎𝚛𝚝𝚒𝚗𝚐 𝚒𝚖𝚊𝚐𝚎 𝚝𝚘 𝚜𝚝𝚒𝚌𝚔𝚎𝚛...");
        
        const stream = await downloadContentFromMessage(quoted.message.imageMessage, "image");
        let buffer = Buffer.from([]);
        
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        
        await sock.sendMessage(from, {
          sticker: buffer,
          caption: "✅ 𝙸𝚖𝚊𝚐𝚎 𝚝𝚘 𝚂𝚝𝚒𝚌𝚔𝚎𝚛"
        });
        
      } else {
        await reply("❌ 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊 𝚜𝚝𝚒𝚌𝚔𝚎𝚛 𝚘𝚛 𝚞𝚜𝚎 .𝚙𝚑𝚘𝚝𝚘 𝚜𝚝𝚒𝚌𝚔𝚎𝚛 𝚠𝚒𝚝𝚑 𝚊𝚗 𝚒𝚖𝚊𝚐𝚎");
      }
      
    } catch (error) {
      console.error("Conversion error:", error);
      await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚌𝚘𝚗𝚟𝚎𝚛𝚝");
    }
  }
};
