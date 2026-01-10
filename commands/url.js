import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import axios from "axios";
import fs from "fs";
import path from "path";

export default {
  name: "url",
  description: "𝚄𝚙𝚕𝚘𝚊𝚍 𝚖𝚎𝚍𝚒𝚊 𝚊𝚗𝚍 𝚐𝚎𝚝 𝙸𝚗𝚝𝚎𝚛𝚗𝚎𝚝 𝚄𝚁𝙻",
  aliases: ["url", "uploadurl", "geturl"],
  
  async execute(sock, message) {
    const { from, reply, quoted } = message;
    
    try {
      // Vérifier si c'est une réponse à un média
      if (!quoted) {
        return await reply("❌ 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊𝚗 𝚒𝚖𝚊𝚐𝚎, 𝚟𝚒𝚍𝚎𝚘 𝚘𝚛 𝚊𝚞𝚍𝚒𝚘");
      }
      
      const quotedMsg = quoted.message;
      
      // Déterminer le type de média
      let mediaType = null;
      let mediaData = null;
      
      if (quotedMsg.imageMessage) {
        mediaType = "image";
        mediaData = quotedMsg.imageMessage;
      } else if (quotedMsg.videoMessage) {
        mediaType = "video";
        mediaData = quotedMsg.videoMessage;
      } else if (quotedMsg.audioMessage) {
        mediaType = "audio";
        mediaData = quotedMsg.audioMessage;
      } else if (quotedMsg.documentMessage) {
        mediaType = "document";
        mediaData = quotedMsg.documentMessage;
      }
      
      if (!mediaType) {
        return await reply("❌ 𝚄𝚗𝚜𝚞𝚙𝚙𝚘𝚛𝚝𝚎𝚍 𝚖𝚎𝚍𝚒𝚊 𝚝𝚢𝚙𝚎");
      }
      
      await reply("📤 𝚄𝚙𝚕𝚘𝚊𝚍𝚒𝚗𝚐...");
      const startTime = Date.now();
      
      // Télécharger le média
      const stream = await downloadContentFromMessage(mediaData, mediaType);
      const chunks = [];
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      
      // Vérifier la taille (catbox limite à 200MB)
      if (buffer.length > 200 * 1024 * 1024) {
        return await reply("❌ 𝙵𝚒𝚕𝚎 𝚝𝚘𝚘 𝚕𝚊𝚛𝚐𝚎 (𝚖𝚊𝚡 𝟸𝟶𝟶𝙼𝙱)");
      }
      
      const uploadTime = Date.now() - startTime;
      
      // Upload vers catbox.moe
      const formData = new FormData();
      formData.append("reqtype", "fileupload");
      formData.append("fileToUpload", buffer, {
        filename: `upload_${Date.now()}.${this.getExtension(mediaType, mediaData)}`,
        contentType: mediaData.mimetype || this.getMimeType(mediaType)
      });
      
      const uploadResponse = await axios.post("https://catbox.moe/user/api.php", formData, {
        headers: formData.getHeaders(),
        timeout: 60000
      });
      
      const url = uploadResponse.data.trim();
      const totalTime = Date.now() - startTime;
      
      // Vérifier que l'URL est valide
      if (!url.startsWith("http")) {
        throw new Error("𝙸𝚗𝚟𝚊𝚕𝚒𝚍 𝚞𝚙𝚕𝚘𝚊𝚍 𝚛𝚎𝚜𝚙𝚘𝚗𝚜𝚎");
      }
      
      // Indicateur de performance
      let indicator;
      if (totalTime <= 5000) {
        indicator = "🟢";
      } else if (totalTime <= 15000) {
        indicator = "🟡";
      } else {
        indicator = "🔴";
      }
      
      const fileSize = (buffer.length / 1024 / 1024).toFixed(2);
      
      const resultText = `${indicator} *𝚄𝚁𝙻 𝙶𝙴𝙽𝙴𝚁𝙰𝚃𝙴𝙳*\n\n` +
                        `🔗 ${url}\n\n` +
                        `📊 𝚂𝚝𝚊𝚝𝚜:\n` +
                        `┣ 📁 𝚃𝚢𝚙𝚎: ${mediaType}\n` +
                        `┣ 📏 𝚂𝚒𝚣𝚎: ${fileSize}𝙼𝙱\n` +
                        `┣ ⏱️ 𝚄𝚙𝚕𝚘𝚊𝚍: ${uploadTime}𝚖𝚜\n` +
                        `┗ ⏱️ 𝚃𝚘𝚝𝚊𝚕: ${totalTime}𝚖𝚜`;
      
      await reply(resultText);
      
    } catch (error) {
      console.error("Upload error:", error);
      
      if (error.code === 'ECONNABORTED') {
        await reply("❌ 𝚄𝚙𝚕𝚘𝚊𝚍 𝚝𝚒𝚖𝚎𝚘𝚞𝚝");
      } else if (error.response?.status === 413) {
        await reply("❌ 𝙵𝚒𝚕𝚎 𝚝𝚘𝚘 𝚕𝚊𝚛𝚐𝚎 𝚏𝚘𝚛 𝚞𝚙𝚕𝚘𝚊𝚍");
      } else if (error.message.includes("FormData")) {
        await reply("❌ 𝙸𝚗𝚜𝚝𝚊𝚕𝚕 𝙵𝚘𝚛𝚖𝚍𝚊𝚝𝚊: 𝚗𝚙𝚖 𝚒𝚗𝚜𝚝𝚊𝚕𝚕 𝚏𝚘𝚛𝚖-𝚍𝚊𝚝𝚊");
      } else {
        await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚞𝚙𝚕𝚘𝚊𝚍");
      }
    }
  },
  
  getExtension(mediaType, mediaData) {
    switch (mediaType) {
      case "image":
        const imgExt = mediaData.mimetype?.split("/")[1] || "jpg";
        return ["jpeg", "jpg"].includes(imgExt) ? "jpg" : imgExt;
      case "video":
        return mediaData.mimetype?.includes("gif") ? "gif" : "mp4";
      case "audio":
        return mediaData.mimetype?.includes("ogg") ? "ogg" : "mp3";
      case "document":
        return mediaData.fileName?.split(".").pop() || "bin";
      default:
        return "bin";
    }
  },
  
  getMimeType(mediaType) {
    switch (mediaType) {
      case "image": return "image/jpeg";
      case "video": return "video/mp4";
      case "audio": return "audio/mpeg";
      default: return "application/octet-stream";
    }
  }
};