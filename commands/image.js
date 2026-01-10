import fetch from "node-fetch";

export default {
  name: "image",
  description: "𝚂𝚎𝚊𝚛𝚌𝚑 𝚊𝚗𝚍 𝚜𝚎𝚗𝚍 𝚒𝚖𝚊𝚐𝚎𝚜 𝚏𝚛𝚘𝚖 𝙱𝚒𝚗𝚐",
  aliases: ["img", "searchimg", "pic"],
  
  async execute(sock, message) {
    const { from, reply, args } = message;
    
    try {
      const query = args.join(" ").trim();
      
      if (!query) {
        return await reply("❌ 𝙿𝚛𝚘𝚟𝚒𝚍𝚎 𝚊 𝚜𝚎𝚊𝚛𝚌𝚑 𝚚𝚞𝚎𝚛𝚢\n𝚎𝚡: .𝚒𝚖𝚊𝚐𝚎 𝚌𝚊𝚝𝚜");
      }
      
      await reply("🔍 𝚂𝚎𝚊𝚛𝚌𝚑𝚒𝚗𝚐 𝚒𝚖𝚊𝚐𝚎𝚜...");
      const startTime = Date.now();
      
      // Analyser les arguments pour le nombre
      const words = query.split(" ");
      const lastWord = words[words.length - 1];
      const count = parseInt(lastWord) || 5;
      const searchQuery = parseInt(lastWord) ? words.slice(0, -1).join(" ") : query;
      
      // Limiter à 10 images max
      const imageCount = Math.min(Math.max(count, 1), 10);
      
      const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(searchQuery)}&form=HDRSC2`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const html = await response.text();
      const searchTime = Date.now() - startTime;
      
      // Extraire les URLs d'images
      const urlPattern = /murl&quot;:&quot;(.*?)&quot;/g;
      const matches = [];
      let match;
      
      while ((match = urlPattern.exec(html)) !== null) {
        matches.push(match[1]);
      }
      
      const imageUrls = matches
        .filter(url => url.startsWith('http'))
        .slice(0, imageCount);
      
      if (imageUrls.length === 0) {
        return await reply("❌ 𝙽𝚘 𝚒𝚖𝚊𝚐𝚎𝚜 𝚏𝚘𝚞𝚗𝚍\n𝚃𝚛𝚢 𝚊 𝚍𝚒𝚏𝚏𝚎𝚛𝚎𝚗𝚝 𝚜𝚎𝚊𝚛𝚌𝚑 𝚝𝚎𝚛𝚖");
      }
      
      // Indicateur de performance
      let indicator;
      if (searchTime <= 3000) {
        indicator = "🟢";
      } else if (searchTime <= 7000) {
        indicator = "🟡";
      } else {
        indicator = "🔴";
      }
      
      await reply(`${indicator} 𝙵𝚘𝚞𝚗𝚍 ${imageUrls.length} 𝚒𝚖𝚊𝚐𝚎(𝚜)\n⚡ ${searchTime}𝚖𝚜\n\n⏳ 𝙳𝚘𝚠𝚗𝚕𝚘𝚊𝚍𝚒𝚗𝚐...`);
      
      let sentCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < imageUrls.length; i++) {
        try {
          const imgUrl = imageUrls[i];
          
          // Télécharger l'image avec timeout
          const imgResponse = await fetch(imgUrl, { timeout: 10000 });
          const buffer = await imgResponse.buffer();
          
          // Vérifier la taille minimale
          if (buffer.length < 1024) { // < 1KB
            failCount++;
            continue;
          }
          
          await sock.sendMessage(from, {
            image: buffer,
            caption: `📸 ${searchQuery}\n(${sentCount + 1}/${imageUrls.length})`
          });
          
          sentCount++;
          
          // Petit délai entre les images
          if (i < imageUrls.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (imgError) {
          console.error(`Image ${i} error:`, imgError.message);
          failCount++;
        }
      }
      
      const totalTime = Date.now() - startTime;
      
      const resultText = `📊 *𝚂𝙴𝙰𝚁𝙲𝙷 𝚁𝙴𝚂𝚄𝙻𝚃𝚂*\n\n` +
                        `🔍 𝚀𝚞𝚎𝚛𝚢: ${searchQuery}\n` +
                        `✅ 𝚂𝚎𝚗𝚝: ${sentCount}\n` +
                        `❌ 𝙵𝚊𝚒𝚕𝚎𝚍: ${failCount}\n` +
                        `🎯 𝚃𝚊𝚛𝚐𝚎𝚝: ${imageCount}\n` +
                        `⏱️ 𝚃𝚘𝚝𝚊𝚕 𝚝𝚒𝚖𝚎: ${totalTime}𝚖𝚜`;
      
      await reply(resultText);
      
    } catch (error) {
      console.error("Image search error:", error);
      
      if (error.code === 'ENOTFOUND') {
        await reply("❌ 𝙽𝚘 𝚒𝚗𝚝𝚎𝚛𝚗𝚎𝚝 𝚌𝚘𝚗𝚗𝚎𝚌𝚝𝚒𝚘𝚗");
      } else if (error.message.includes('timeout')) {
        await reply("❌ 𝚂𝚎𝚊𝚛𝚌𝚑 𝚝𝚒𝚖𝚎𝚘𝚞𝚝");
      } else {
        await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚜𝚎𝚊𝚛𝚌𝚑 𝚏𝚘𝚛 𝚒𝚖𝚊𝚐𝚎𝚜");
      }
    }
  }
};