import axios from "axios";

export default {
  name: "gpt",
  description: "𝙰𝙸 𝚌𝚑𝚊𝚝𝚋𝚘𝚝 𝚠𝚒𝚝𝚑 𝚖𝚞𝚕𝚝𝚒𝚙𝚕𝚎 𝚊𝚙𝚒𝚜",
  
  async execute(sock, message, args) {
    const { from, reply, sender } = message;
    const query = args.join(" ").trim();
    
    if (!query) {
      await reply("📝 𝚄𝚜𝚊𝚐𝚎: .𝚐𝚙𝚝 <𝚚𝚞𝚎𝚜𝚝𝚒𝚘𝚗>");
      return;
    }

    try {
      await reply("🤖 𝚂𝚎𝚊𝚛𝚌𝚑𝚒𝚗𝚐 𝚏𝚘𝚛 𝚊𝚗𝚜𝚠𝚎𝚛...");
      
      // Liste des APIs disponibles (priorité)
      const apis = [
        {
          name: "𝙳𝚊𝚟𝚒𝚍𝙲𝚢𝚛𝚒𝚕",
          url: `https://apis.davidcyriltech.my.id/ai/chatbot?query=${encodeURIComponent(query)}`,
          parser: (data) => data?.result
        },
        {
          name: "𝙰𝙸-𝙰𝙿𝙸",
          url: `https://api.azz.biz.id/api/ai/gpt?q=${encodeURIComponent(query)}`,
          parser: (data) => data?.result
        },
        {
          name: "𝙱𝚕𝚊𝚌𝚔𝚋𝚘𝚡",
          url: `https://api.blackbox.ru/api/ai/gpt?q=${encodeURIComponent(query)}`,
          parser: (data) => data?.response
        }
      ];
      
      let response = null;
      let usedApi = "𝚄𝚗𝚔𝚗𝚘𝚠𝚗";
      
      // Essayer chaque API jusqu'à ce qu'une fonctionne
      for (const api of apis) {
        try {
          const { data } = await axios.get(api.url, { timeout: 10000 });
          response = api.parser(data);
          
          if (response) {
            usedApi = api.name;
            break;
          }
        } catch (apiError) {
          console.log(`API ${api.name} failed:`, apiError.message);
          continue;
        }
      }
      
      if (!response) {
        await reply("❌ 𝙰𝚕𝚕 𝙰𝙸 𝚊𝚙𝚒𝚜 𝚊𝚛𝚎 𝚞𝚗𝚊𝚟𝚊𝚒𝚕𝚊𝚋𝚕𝚎");
        return;
      }
      
      // Formater la réponse
      const formattedResponse = `🤖 *${usedApi} 𝙰𝙸:*\n\n${response}\n\n👤 *𝙰𝚜𝚔𝚎𝚍 𝚋𝚢:* ${sender}`;
      
      await sock.sendMessage(from, { text: formattedResponse });
      
    } catch (error) {
      console.error("GPT multi-api error:", error);
      await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚐𝚎𝚝 𝚛𝚎𝚜𝚙𝚘𝚗𝚜𝚎");
    }
  }
};
