import axios from "axios";

export default {
  name: "play",
  description: "𝙳𝚘𝚠𝚗𝚕𝚘𝚊𝚍 𝚊𝚗𝚍 𝚜𝚎𝚗𝚍 𝚖𝚞𝚜𝚒𝚌/𝚊𝚞𝚍𝚒𝚘",
  aliases: ["song", "music", "mp3"],
  
  async execute(sock, message) {
    const { from, reply, args } = message;
    
    try {
      const query = args.join(" ") || "";
      
      if (!query) {
        return await reply("❌ 𝙿𝚛𝚘𝚟𝚒𝚍𝚎 𝚊 𝚜𝚘𝚗𝚐 𝚗𝚊𝚖𝚎\n𝚎𝚡: .𝚙𝚕𝚊𝚢 𝚍𝚎𝚖𝚘𝚗 𝚜𝚕𝚊𝚢𝚎𝚛");
      }
      
      const startTime = Date.now();
      const searchMsg = await reply(`🔍 𝚂𝚎𝚊𝚛𝚌𝚑𝚒𝚗𝚐: *${query}*`);
      
      // API call
      const apiUrl = `https://apis.davidcyriltech.my.id/play?query=${encodeURIComponent(query)}`;
      const { data } = await axios.get(apiUrl, { timeout: 30000 });
      
      const searchTime = Date.now() - startTime;
      
      if (!data?.status || !data?.result?.download_url) {
        return await reply("❌ 𝙽𝚘 𝚛𝚎𝚜𝚞𝚕𝚝𝚜 𝚏𝚘𝚞𝚗𝚍");
      }
      
      const video = data.result;
      
      // Send thumbnail with info
      await sock.sendMessage(from, {
        image: { url: video.thumbnail || "" },
        caption: `🎵 *𝚂𝙾𝙽𝙶 𝙸𝙽𝙵𝙾*\n\n` +
                `📌 𝚃𝚒𝚝𝚕𝚎: ${video.title || "Unknown"}\n` +
                `⏱️ 𝙳𝚞𝚛𝚊𝚝𝚒𝚘𝚗: ${video.duration || "Unknown"}\n` +
                `⚡ 𝚂𝚎𝚊𝚛𝚌𝚑 𝚝𝚒𝚖𝚎: ${searchTime}𝚖𝚜\n\n` +
                `📥 𝙳𝚘𝚠𝚗𝚕𝚘𝚊𝚍𝚒𝚗𝚐 𝚊𝚞𝚍𝚒𝚘...`
      });
      
      // Send audio
      await sock.sendMessage(from, {
        audio: { url: video.download_url },
        mimetype: "audio/mp4",
        ptt: false
      });
      
    } catch (error) {
      console.error("Play error:", error);
      
      if (error.code === 'ECONNABORTED') {
        await reply("❌ 𝚃𝚒𝚖𝚎𝚘𝚞𝚝: 𝚃𝚘𝚘 𝚕𝚘𝚗𝚐 𝚝𝚘 𝚍𝚘𝚠𝚗𝚕𝚘𝚊𝚍");
      } else if (error.response?.status === 404) {
        await reply("❌ 𝚂𝚘𝚗𝚐 𝚗𝚘𝚝 𝚏𝚘𝚞𝚗𝚍");
      } else {
        await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚍𝚘𝚠𝚗𝚕𝚘𝚊𝚍 𝚊𝚞𝚍𝚒𝚘");
      }
    }
  }
};