import axios from "axios";
import fs from "fs";
import path from "path";

export default {
  name: "down-url",
  description: "𝙳𝚘𝚠𝚗𝚕𝚘𝚊𝚍 𝚏𝚒𝚕𝚎 𝚏𝚛𝚘𝚖 𝚄𝚁𝙻",
  
  async execute(sock, message, args) {
    const { from, reply } = message;
    
    if (!args[0]) {
      await reply("📝 𝚄𝚜𝚊𝚐𝚎: .𝚍𝚘𝚠𝚗-𝚞𝚛𝚕 <𝚞𝚛𝚕>");
      return;
    }
    
    const url = args[0];
    
    try {
      await reply("📥 𝙳𝚘𝚠𝚗𝚕𝚘𝚊𝚍𝚒𝚗𝚐...");
      
      const response = await axios.get(url, { responseType: "arraybuffer" });
      const buffer = Buffer.from(response.data, "binary");
      
      const fileName = `download_${Date.now()}.${url.split('.').pop() || 'bin'}`;
      const filePath = path.join("./", fileName);
      
      fs.writeFileSync(filePath, buffer);
      
      // Détecter le type de fichier basé sur l'extension
      const ext = path.extname(url).toLowerCase();
      
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        await sock.sendMessage(from, { 
          image: fs.readFileSync(filePath),
          caption: `🖼️ ${url}` 
        });
      } else if (['.mp4', '.gif', '.mov', '.avi'].includes(ext)) {
        await sock.sendMessage(from, { 
          video: fs.readFileSync(filePath),
          caption: `🎥 ${url}` 
        });
      } else if (['.mp3', '.ogg', '.wav', '.m4a'].includes(ext)) {
        await sock.sendMessage(from, { 
          audio: fs.readFileSync(filePath) 
        });
      } else {
        await sock.sendMessage(from, { 
          document: fs.readFileSync(filePath),
          fileName: fileName 
        });
      }
      
      fs.unlinkSync(filePath);
      await reply("✅ 𝙵𝚒𝚕𝚎 𝚜𝚎𝚗𝚝");
      
    } catch (error) {
      console.error("Download error:", error);
      await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚍𝚘𝚠𝚗𝚕𝚘𝚊𝚍 𝚏𝚒𝚕𝚎");
    }
  }
};
