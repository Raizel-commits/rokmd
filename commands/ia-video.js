import axios from "axios";

export default {
  name: "ia-video",
  description: "𝙶𝚎𝚗𝚎𝚛𝚊𝚝𝚎 𝚟𝚒𝚍𝚎𝚘 𝚏𝚛𝚘𝚖 𝚝𝚎𝚡𝚝 𝚞𝚜𝚒𝚗𝚐 𝙰𝙸",
  
  async execute(sock, message, args) {
    const { from, reply, quoted } = message;
    
    let prompt = args.join(" ").trim();
    
    if (!prompt && quoted) {
      prompt = quoted.text;
    }
    
    if (!prompt) {
      await reply("𝚄𝚜𝚊𝚐𝚎: .𝚒𝚊-𝚟𝚒𝚍𝚎𝚘 𝚙𝚛𝚘𝚖𝚙𝚝");
      return;
    }
    
    try {
      await reply("𝙶𝚎𝚗𝚎𝚛𝚊𝚝𝚒𝚗𝚐 𝚟𝚒𝚍𝚎𝚘...");
      
      const apiUrl = `https://okatsu-rolezapiiz.vercel.app/ai/txt2video?text=${encodeURIComponent(prompt)}`;
      const { data } = await axios.get(apiUrl, { timeout: 120000 });
      
      const videoUrl = data?.videoUrl || data?.result;
      
      if (!videoUrl) {
        throw new Error("No video URL");
      }
      
      await sock.sendMessage(from, {
        video: { url: videoUrl },
        caption: `𝙶𝚎𝚗𝚎𝚛𝚊𝚝𝚎𝚍: ${prompt}`
      });
      
    } catch (error) {
      await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚐𝚎𝚗𝚎𝚛𝚊𝚝𝚎 𝚟𝚒𝚍𝚎𝚘");
    }
  }
};        });

    } catch (error) {
        await sock.sendMessage(jid, {
            text: "𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚐𝚎𝚗𝚎𝚛𝚊𝚝𝚎 𝚟𝚒𝚍𝚎𝚘."
        });
    }
}
