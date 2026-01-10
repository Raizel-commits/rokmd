import axios from "axios";

export default {
  name: "down-url",
  description: "𝙳𝚘𝚠𝚗𝚕𝚘𝚊𝚍 𝚏𝚛𝚘𝚖 𝚄𝚁𝙻",
  
  async execute(sock, message) {
    const { from, reply, args } = message;
    
    try {
      const url = args[0] || "";
      
      if (!url) {
        return await reply("❌ 𝙿𝚛𝚘𝚟𝚒𝚍𝚎 𝚄𝚁𝙻");
      }
      
      await reply("📥...");
      
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      
      // Deviner le type
      const contentType = response.headers['content-type'] || '';
      
      if (contentType.startsWith('image/')) {
        await sock.sendMessage(from, { image: buffer });
      } else if (contentType.startsWith('video/')) {
        await sock.sendMessage(from, { video: buffer });
      } else {
        const fileName = url.split('/').pop() || 'file.bin';
        await sock.sendMessage(from, { 
          document: buffer, 
          fileName: fileName 
        });
      }
      
      await reply("✅");
      
    } catch {
      await reply("❌");
    }
  }
};