import { igdl } from "ruhend-scraper";

export default {
  name: "instagram",
  description: "𝙳𝚘𝚠𝚗𝚕𝚘𝚊𝚍 𝙸𝚗𝚜𝚝𝚊𝚐𝚛𝚊𝚖 𝚙𝚘𝚜𝚝𝚜, 𝚛𝚎𝚎𝚕𝚜 𝚘𝚛 𝚟𝚒𝚍𝚎𝚘𝚜",
  aliases: ["ig", "insta", "igdl"],
  
  async execute(sock, message, args) {
    const { from, reply, quoted } = message;
    
    // Obtenir l'URL depuis les arguments ou le message cité
    let url = args.join(" ").trim();
    
    if (!url && quoted && quoted.text) {
      url = quoted.text;
    }
    
    if (!url) {
      await reply("📝 𝚄𝚜𝚊𝚐𝚎: .𝚒𝚗𝚜𝚝𝚊𝚐𝚛𝚊𝚖 <𝚞𝚛𝚕>\n𝙾𝚛 𝚛𝚎𝚙𝚕𝚢 .𝚒𝚗𝚜𝚝𝚊𝚐𝚛𝚊𝚖 𝚝𝚘 𝚊 𝚖𝚎𝚜𝚜𝚊𝚐𝚎 𝚠𝚒𝚝𝚑 𝚕𝚒𝚗𝚔");
      return;
    }
    
    // Vérifier que c'est une URL Instagram valide
    const instaPatterns = [
      /https?:\/\/(?:www\.)?instagram\.com\//,
      /https?:\/\/(?:www\.)?instagr\.am\//
    ];
    
    if (!instaPatterns.some(pattern => pattern.test(url))) {
      await reply("❌ 𝙸𝚗𝚟𝚊𝚕𝚒𝚍 𝙸𝚗𝚜𝚝𝚊𝚐𝚛𝚊𝚖 𝚕𝚒𝚗𝚔\n\n𝚄𝚛𝚕 𝚖𝚞𝚜𝚝 𝚋𝚎 𝚏𝚛𝚘𝚖:\n• 𝚑𝚝𝚝𝚙𝚜://𝚠𝚠𝚠.𝚒𝚗𝚜𝚝𝚊𝚐𝚛𝚊𝚖.𝚌𝚘𝚖/\n• 𝚑𝚝𝚝𝚙𝚜://𝚒𝚗𝚜𝚝𝚊𝚐𝚛𝚊𝚖.𝚌𝚘𝚖/\n• 𝚑𝚝𝚝𝚙𝚜://𝚒𝚗𝚜𝚝𝚊𝚐𝚛.𝚊𝚖/");
      return;
    }
    
    try {
      // Envoyer un message de traitement
      const processingMsg = await reply("🔄 𝙳𝚘𝚠𝚗𝚕𝚘𝚊𝚍𝚒𝚗𝚐 𝚏𝚛𝚘𝚖 𝙸𝚗𝚜𝚝𝚊𝚐𝚛𝚊𝚖...");
      
      // Télécharger depuis Instagram
      const downloadData = await igdl(url);
      
      if (!downloadData?.data?.length) {
        await reply("❌ 𝙽𝚘 𝚖𝚎𝚍𝚒𝚊 𝚏𝚘𝚞𝚗𝚍\n\n𝙿𝚘𝚜𝚜𝚒𝚋𝚕𝚎 𝚌𝚊𝚞𝚜𝚎𝚜:\n• 𝙿𝚛𝚒𝚟𝚊𝚝𝚎 𝚊𝚌𝚌𝚘𝚞𝚗𝚝\n• 𝙿𝚘𝚜𝚝 𝚍𝚎𝚕𝚎𝚝𝚎𝚍\n• 𝙸𝚗𝚟𝚊𝚕𝚒𝚍 𝚙𝚘𝚜𝚝\n• 𝚁𝚊𝚝𝚎 𝚕𝚒𝚖𝚒𝚝 𝚎𝚡𝚌𝚎𝚎𝚍𝚎𝚍");
        return;
      }
      
      // Filtrer les doublons et limiter à 5 médias
      const seenUrls = new Set();
      const mediaToSend = [];
      
      for (const media of downloadData.data) {
        if (media.url && !seenUrls.has(media.url)) {
          seenUrls.add(media.url);
          mediaToSend.push(media);
          if (mediaToSend.length >= 5) break;
        }
      }
      
      // Supprimer le message de traitement
      try {
        await sock.sendMessage(from, { delete: processingMsg.key });
      } catch (deleteError) {
        // Ignorer si on ne peut pas supprimer
      }
      
      // Envoyer chaque média
      let sentCount = 0;
      for (const media of mediaToSend) {
        try {
          const isVideo = /\.(mp4|mov|avi|mkv|webm|3gp)$/i.test(media.url) || 
                         media.type === "video" || 
                         media.url.includes('.mp4');
          
          const caption = `📸 *𝙸𝚗𝚜𝚝𝚊𝚐𝚛𝚊𝚖 𝙳𝚘𝚠𝚗𝚕𝚘𝚊𝚍*\n\n` +
                         `• 📊 𝚀𝚞𝚊𝚕𝚒𝚝𝚢: ${media.quality || 'Standard'}\n` +
                         `• 🎥 𝚃𝚢𝚙𝚎: ${isVideo ? '𝚅𝚒𝚍𝚎𝚘' : '𝙸𝚖𝚊𝚐𝚎'}\n` +
                         `• 🔢 𝙸𝚝𝚎𝚖: ${sentCount + 1}/${mediaToSend.length}`;
          
          if (isVideo) {
            await sock.sendMessage(from, {
              video: { url: media.url },
              caption: caption
            });
          } else {
            await sock.sendMessage(from, {
              image: { url: media.url },
              caption: caption
            });
          }
          
          sentCount++;
          
          // Petit délai entre les envois
          if (sentCount < mediaToSend.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (mediaError) {
          console.error("Failed to send media:", mediaError);
          // Continuer avec le prochain média
        }
      }
      
      // Message de confirmation final
      if (sentCount > 0) {
        await reply(`✅ 𝚂𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢 𝚍𝚘𝚠𝚗𝚕𝚘𝚊𝚍𝚎𝚍 ${sentCount} 𝚖𝚎𝚍𝚒𝚊 𝚏𝚛𝚘𝚖 𝙸𝚗𝚜𝚝𝚊𝚐𝚛𝚊𝚖`);
      } else {
        await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚍𝚘𝚠𝚗𝚕𝚘𝚊𝚍 𝚊𝚗𝚢 𝚖𝚎𝚍𝚒𝚊");
      }
      
    } catch (error) {
      console.error("Instagram download error:", error);
      
      let errorMessage = "❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚍𝚘𝚠𝚗𝚕𝚘𝚊𝚍 𝙸𝚗𝚜𝚝𝚊𝚐𝚛𝚊𝚖 𝚖𝚎𝚍𝚒𝚊";
      
      if (error.message.includes('timeout')) {
        errorMessage += "\n𝚃𝚒𝚖𝚎𝚘𝚞𝚝 𝚎𝚡𝚌𝚎𝚎𝚍𝚎𝚍";
      } else if (error.message.includes('private')) {
        errorMessage += "\n𝙰𝚌𝚌𝚘𝚞𝚗𝚝 𝚒𝚜 𝚙𝚛𝚒𝚟𝚊𝚝𝚎";
      } else if (error.message.includes('404')) {
        errorMessage += "\�𝚘𝚜𝚝 𝚗𝚘𝚝 𝚏𝚘𝚞𝚗𝚍";
      } else if (error.message.includes('rate limit')) {
        errorMessage += "\n𝚁𝚊𝚝𝚎 𝚕𝚒𝚖𝚒𝚝 𝚎𝚡𝚌𝚎𝚎𝚍𝚎𝚍";
      }
      
      await reply(errorMessage);
    }
  }
};        }

        // Remove duplicates and limit to 3 media items
        const seenUrls = new Set();
        const mediaToDownload = [];
        for (const media of downloadData.data) {
            if (media.url && !seenUrls.has(media.url)) {
                seenUrls.add(media.url);
                mediaToDownload.push(media);
                if (mediaToDownload.length >= 3) break;
            }
        }

        for (const media of mediaToDownload) {
            const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(media.url) || media.type === "video";
            
            if (isVideo) {
                await sock.sendMessage(jid, {
                    video: { url: media.url },
                    caption: "𝙸𝚗𝚜𝚝𝚊𝚐𝚛𝚊𝚖 𝚍𝚘𝚠𝚗𝚕𝚘𝚊𝚍"
                });
            } else {
                await sock.sendMessage(jid, {
                    image: { url: media.url },
                    caption: "𝙸𝚗𝚜𝚝𝚊𝚐𝚛𝚊𝚖 𝚍𝚘𝚠𝚗𝚕𝚘𝚊𝚍"
                });
            }
            
            // Small delay between sends
            await new Promise(r => setTimeout(r, 500));
        }

    } catch (error) {
        await sock.sendMessage(jid, {
            text: "𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚍𝚘𝚠𝚗𝚕𝚘𝚊𝚍 𝙸𝚗𝚜𝚝𝚊𝚐𝚛𝚊𝚖 𝚖𝚎𝚍𝚒𝚊."
        });
    }
}
