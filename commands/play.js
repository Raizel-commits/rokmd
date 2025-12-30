import axios from "axios";

export default {
  name: "play",
  description: "𝚂𝚎𝚊𝚛𝚌𝚑 𝚊𝚗𝚍 𝚙𝚕𝚊𝚢 𝚖𝚞𝚜𝚒𝚌 𝚏𝚛𝚘𝚖 𝚖𝚞𝚕𝚝𝚒𝚙𝚕𝚎 𝚜𝚘𝚞𝚛𝚌𝚎𝚜",
  
  async execute(sock, message, args) {
    const { from, reply } = message;
    const title = args.join(" ").trim();
    
    if (!title) {
      await reply("🎵 𝚄𝚜𝚊𝚐𝚎: .𝚙𝚕𝚊𝚢 <𝚜𝚘𝚗𝚐 𝚗𝚊𝚖𝚎>");
      return;
    }
    
    try {
      await reply(`🔍 𝚂𝚎𝚊𝚛𝚌𝚑𝚒𝚗𝚐 "${title}"...`);
      
      // Plusieurs APIs de secours
      const apis = [
        {
          name: "𝙳𝚊𝚟𝚒𝚍𝙲𝚢𝚛𝚒𝚕",
          url: `https://apis.davidcyriltech.my.id/play?query=${encodeURIComponent(title)}`
        },
        {
          name: "𝚈𝚃𝙼𝚙𝟹",
          url: `https://api.akuari.my.id/downloader/ytmp3?link=${encodeURIComponent(title)}`
        },
        {
          name: "𝙼𝚞𝚜𝚒𝚌𝙰𝙿𝙸",
          url: `https://api.lolhuman.xyz/api/ytaudio2?apikey=YOUR_API_KEY&query=${encodeURIComponent(title)}`
        }
      ];
      
      let audioData = null;
      let usedApi = null;
      
      // Essayer chaque API
      for (const api of apis) {
        try {
          console.log(`Trying API: ${api.name}`);
          const { data } = await axios.get(api.url, { timeout: 15000 });
          
          if (api.name === "𝙳𝚊𝚟𝚒𝚍𝙲𝚢𝚛𝚒𝚕" && data?.status && data.result?.download_url) {
            audioData = data.result;
            usedApi = api.name;
            break;
          } else if (api.name === "𝚈𝚃𝙼𝚙𝟹" && data?.respon?.link) {
            audioData = {
              download_url: data.respon.link,
              title: data.respon.title || title,
              thumbnail: data.respon.thumb
            };
            usedApi = api.name;
            break;
          } else if (api.name === "𝙼𝚞𝚜𝚒𝚌𝙰𝙿𝙸" && data?.result) {
            audioData = Array.isArray(data.result) ? data.result[0] : data.result;
            usedApi = api.name;
            break;
          }
        } catch (apiError) {
          console.log(`API ${api.name} failed:`, apiError.message);
          continue;
        }
      }
      
      if (!audioData || !audioData.download_url) {
        await reply(`❌ 𝙽𝚘 𝚖𝚞𝚜𝚒𝚌 𝚏𝚘𝚞𝚗𝚍 𝚏𝚘𝚛 "${title}"`);
        return;
      }
      
      // Envoyer les informations
      if (audioData.thumbnail) {
        await sock.sendMessage(from, {
          image: { url: audioData.thumbnail },
          caption: `🎵 ${audioData.title}\n🔗 𝚟𝚒𝚊 ${usedApi}`
        });
      }
      
      // Envoyer l'audio
      await sock.sendMessage(from, {
        audio: { url: audioData.download_url },
        mimetype: "audio/mpeg",
        ptt: false
      });
      
      await reply(`✅ 𝙼𝚞𝚜𝚒𝚌 𝚜𝚎𝚗𝚝 (𝚟𝚒𝚊 ${usedApi})`);
      
    } catch (error) {
      console.error("Music play error:", error);
      await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚙𝚕𝚊𝚢 𝚖𝚞𝚜𝚒𝚌");
    }
  }
};
