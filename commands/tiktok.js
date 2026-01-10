export default {
  name: "tiktok",
  description: "𝚃𝚎𝚕𝚎𝚌𝚑𝚊𝚛𝚐𝚎 𝚊 𝚃𝚒𝚔𝚃𝚘𝚔 𝚟𝚒𝚍𝚎𝚘",
  aliases: ["tt", "tiktokdl"],
  
  async execute(sock, message) {
    const { from, reply } = message;
    
    try {
      // Safe argument extraction
      const args = message.args || [];
      const tiktokUrl = (args.join(" ") || message.text?.replace(/^\.\w+\s*/, "") || "").trim();

      // Validations
      if (!tiktokUrl) {
        return await reply("❌ 𝙿𝚛𝚘𝚟𝚒𝚍𝚎 𝚊 𝚃𝚒𝚔𝚃𝚘𝚔 𝚕𝚒𝚗𝚔\n𝚎𝚡: .𝚝𝚒𝚔𝚝𝚘𝚔 𝚑𝚝𝚝𝚙𝚜://𝚝𝚒𝚔𝚝𝚘𝚔.𝚌𝚘𝚖/...");
      }

      if (!tiktokUrl.includes("tiktok.com")) {
        return await reply("❌ 𝙸𝚗𝚟𝚊𝚕𝚒𝚍 𝚃𝚒𝚔𝚃𝚘𝚔 𝚕𝚒𝚗𝚔");
      }

      await reply("⏳ 𝙳𝚘𝚠𝚗𝚕𝚘𝚊𝚍𝚒𝚗𝚐...");

      // API call
      const apiUrl = `https://delirius-apiofc.vercel.app/download/tiktok?url=${encodeURIComponent(tiktokUrl)}`;
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!data?.status || !data?.data) {
        return await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚍𝚘𝚠𝚗𝚕𝚘𝚊𝚍");
      }

      const { like, comment, share, author, meta } = data.data;
      const videoObj = meta.media.find(v => v.type === "video");
      const videoUrl = videoObj?.org;

      if (!videoUrl) {
        return await reply("❌ 𝚅𝚒𝚍𝚎𝚘 𝚗𝚘𝚝 𝚊𝚟𝚊𝚒𝚕𝚊𝚋𝚕𝚎");
      }

      // Caption in English
      const caption = `📱 *𝚃𝙸𝙺𝚃𝙾𝙺 𝙳𝙾𝚆𝙽𝙻𝙾𝙰𝙳*\n\n` +
                     `👤 𝙰𝚞𝚝𝚑𝚘𝚛: ${author.nickname}\n` +
                     `❤️ 𝙻𝚒𝚔𝚎𝚜: ${like}\n` +
                     `💬 𝙲𝚘𝚖𝚖𝚎𝚗𝚝𝚜: ${comment}\n` +
                     `🔄 𝚂𝚑𝚊𝚛𝚎𝚜: ${share}\n\n` +
                     `✅ 𝙳𝚘𝚠𝚗𝚕𝚘𝚊𝚍 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕`;

      await sock.sendMessage(from, {
        video: { url: videoUrl },
        caption: caption
      });

    } catch (error) {
      console.error("TikTok error:", error);
      await reply("❌ 𝙳𝚘𝚠𝚗𝚕𝚘𝚊𝚍 𝚎𝚛𝚛𝚘𝚛");
    }
  }
};