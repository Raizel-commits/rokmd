import axios from "axios";

export default {
  name: "imagine",
  description: "𝙶𝚎𝚗𝚎𝚛𝚊𝚝𝚎 𝚒𝚖𝚊𝚐𝚎 𝚠𝚒𝚝𝚑 𝙰𝙸",
  
  async execute(sock, message, args) {
    const { from, reply } = message;
    let prompt = args.join(" ").trim();
    
    if (!prompt) {
      await reply("🎨 *𝙸𝚖𝚊𝚐𝚎 𝙶𝚎𝚗𝚎𝚛𝚊𝚝𝚘𝚛*\n\n📝 𝚄𝚜𝚊𝚐𝚎: .𝚒𝚖𝚊𝚐𝚒𝚗𝚎 <𝚙𝚛𝚘𝚖𝚙𝚝>\n\n🎭 *𝚂𝚝𝚢𝚕𝚎𝚜:*\n• .𝚒𝚖𝚊𝚐𝚒𝚗𝚎 𝚊𝚗𝚒𝚖𝚎 <𝚙𝚛𝚘𝚖𝚙𝚝>\n• .𝚒𝚖𝚊𝚐𝚒𝚗𝚎 𝚛𝚎𝚊𝚕𝚒𝚜𝚝𝚒𝚌 <𝚙𝚛𝚘𝚖𝚙𝚝>\n• .𝚒𝚖𝚊𝚐𝚒𝚗𝚎 𝚏𝚊𝚗𝚝𝚊𝚜𝚢 <𝚙𝚛𝚘𝚖𝚙𝚝>\n• .𝚒𝚖𝚊𝚐𝚒𝚗𝚎 𝚌𝚢𝚋𝚎𝚛𝚙𝚞𝚗𝚔 <𝚙𝚛𝚘𝚖𝚙𝚝>");
      return;
    }
    
    // Vérifier les styles prédéfinis
    let style = "";
    if (prompt.toLowerCase().startsWith("anime ")) {
      style = "anime style, Japanese animation, vibrant colors, ";
      prompt = prompt.substring(6);
    } else if (prompt.toLowerCase().startsWith("realistic ")) {
      style = "photorealistic, realistic, detailed, ";
      prompt = prompt.substring(10);
    } else if (prompt.toLowerCase().startsWith("fantasy ")) {
      style = "fantasy, magical, mystical, epic, ";
      prompt = prompt.substring(8);
    } else if (prompt.toLowerCase().startsWith("cyberpunk ")) {
      style = "cyberpunk, neon, futuristic, dystopian, ";
      prompt = prompt.substring(10);
    }
    
    try {
      await reply(`🎨 𝙶𝚎𝚗𝚎𝚛𝚊𝚝𝚒𝚗𝚐 ${style ? style.split(',')[0] : ''} 𝚒𝚖𝚊𝚐𝚎...`);
      
      const enhancedPrompt = `${style}${prompt}, high quality, detailed, 4k, masterpiece`;
      
      const response = await axios.get(
        `https://shizoapi.onrender.com/api/ai/imagine?apikey=shizo&query=${encodeURIComponent(enhancedPrompt)}`,
        { 
          responseType: "arraybuffer",
          timeout: 45000
        }
      );
      
      const imageBuffer = Buffer.from(response.data);
      
      let caption = `🎨 *𝙰𝙸 𝙶𝚎𝚗𝚎𝚛𝚊𝚝𝚎𝚍 𝙸𝚖𝚊𝚐𝚎*\n\n📝 *𝙿𝚛𝚘𝚖𝚙𝚝:* ${prompt}`;
      if (style) {
        caption += `\n🎭 *𝚂𝚝𝚢𝚕𝚎:* ${style.split(',')[0]}`;
      }
      
      await sock.sendMessage(from, {
        image: imageBuffer,
        caption: caption
      });
      
      await reply("✅ 𝙸𝚖𝚊𝚐𝚎 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢 𝚐𝚎𝚗𝚎𝚛𝚊𝚝𝚎𝚍");
      
    } catch (error) {
      console.error("Imagine error:", error);
      await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚐𝚎𝚗𝚎𝚛𝚊𝚝𝚎 𝚒𝚖𝚊𝚐𝚎");
    }
  }
};        await sock.sendMessage(jid, {
            text: "𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚐𝚎𝚗𝚎𝚛𝚊𝚝𝚎 𝚒𝚖𝚊𝚐𝚎."
        });
    }
}
