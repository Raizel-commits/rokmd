import { igdl } from "ruhend-scraper";

export const name = "instagram";
export const description = "Download Instagram posts, reels or videos";

export async function execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const args = msg.message?.conversation?.split(" ") || [];
    
    const text = args.slice(1).join(" ") || 
                msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || "";
    
    if (!text) {
        return await sock.sendMessage(jid, {
            text: "𝚄𝚜𝚊𝚐𝚎: .𝚒𝚗𝚜𝚝𝚊𝚐𝚛𝚊𝚖 𝚞𝚛𝚕"
        });
    }

    const instaPatterns = [
        /https?:\/\/(?:www\.)?instagram\.com\//,
        /https?:\/\/(?:www\.)?instagr\.am\//
    ];

    if (!instaPatterns.some(p => p.test(text))) {
        return await sock.sendMessage(jid, {
            text: "𝙸𝚗𝚟𝚊𝚕𝚒𝚍 𝙸𝚗𝚜𝚝𝚊𝚐𝚛𝚊𝚖 𝚕𝚒𝚗𝚔."
        });
    }

    try {
        const downloadData = await igdl(text);
        
        if (!downloadData?.data?.length) {
            return await sock.sendMessage(jid, {
                text: "𝙽𝚘 𝚖𝚎𝚍𝚒𝚊 𝚏𝚘𝚞𝚗𝚍 𝚘𝚛 𝚙𝚛𝚒𝚟𝚊𝚝𝚎 𝚙𝚘𝚜𝚝."
            });
        }

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
