export default {
  name: "img",
  description: "𝚂𝚎𝚊𝚛𝚌𝚑 𝚏𝚘𝚛 𝚒𝚖𝚊𝚐𝚎𝚜",
  aliases: ["image", "searchimg", "pic"],
  
  async execute(sock, message, args) {
    const { from, reply } = message;
    
    if (!args[0]) {
      await reply("📝 𝚄𝚜𝚊𝚐𝚎: .𝚒𝚖𝚐 <𝚚𝚞𝚎𝚛𝚢> [𝚗𝚞𝚖𝚋𝚎𝚛]\n𝙴𝚡𝚊𝚖𝚙𝚕𝚎: .𝚒𝚖𝚐 𝚌𝚊𝚝 𝟹");
      return;
    }

    // Parse the last argument to see if it's a number (count)
    const lastArg = args[args.length - 1];
    const count = !isNaN(lastArg) ? Math.min(parseInt(lastArg), 5) : 1;
    const query = !isNaN(lastArg) ? args.slice(0, -1).join(" ") : args.join(" ");

    try {
      const processingMsg = await reply("🔍 𝚂𝚎𝚊𝚛𝚌𝚑𝚒𝚗𝚐 𝚏𝚘𝚛 𝚒𝚖𝚊𝚐𝚎𝚜...");

      const bingUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`;
      const res = await fetch(bingUrl);
      const html = await res.text();
      
      // Extract image URLs from Bing's page
      const imageUrls = [...html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)]
        .map(m => m[1])
        .filter(u => u.startsWith("http"))
        .slice(0, count);

      if (imageUrls.length === 0) {
        await reply(`❌ 𝙽𝚘 𝚒𝚖𝚊𝚐𝚎𝚜 𝚏𝚘𝚞𝚗𝚍 𝚏𝚘𝚛 "${query}"`);
        return;
      }

      let successCount = 0;
      
      for (const imgUrl of imageUrls) {
        try {
          // Fetch the image using the `fetch` API[citation:1][citation:2][citation:8]
          const response = await fetch(imgUrl);
          
          if (!response.ok) {
            console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            continue;
          }
          
          // Convert the response to a buffer for sending[citation:5][citation:9]
          // Use arrayBuffer() as per the Fetch API spec[citation:2][citation:8]
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Send the image
          await sock.sendMessage(from, {
            image: buffer,
            caption: `🖼️ ${query}`
          });
          
          successCount++;
          
          // Small delay to prevent rate limiting
          if (successCount < imageUrls.length) {
            await new Promise(r => setTimeout(r, 500));
          }
          
        } catch (mediaError) {
          console.error(`Error processing image ${imgUrl}:`, mediaError);
          continue;
        }
      }

      // Send a summary message
      if (successCount > 0) {
        await reply(`✅ 𝚂𝚎𝚗𝚝 ${successCount} 𝚒𝚖𝚊𝚐𝚎(𝚜) 𝚏𝚘𝚛 "${query}"`);
      } else {
        await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚍𝚘𝚠𝚗𝚕𝚘𝚊𝚍 𝚊𝚗𝚢 𝚒𝚖𝚊𝚐𝚎𝚜");
      }
      
    } catch (error) {
      console.error("Image search error:", error);
      await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚏𝚎𝚝𝚌𝚑 𝚒𝚖𝚊𝚐𝚎𝚜");
    }
  }
};
