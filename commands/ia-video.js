import axios from "axios";

export const name = "ia-video";
export const description = "Generate video from text using AI";

export async function execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const args = msg.message?.conversation?.split(" ") || [];
    
    // Get prompt from command or quoted message
    const prompt = args.slice(1).join(" ") || 
                  msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || "";
    
    if (!prompt) {
        return await sock.sendMessage(jid, {
            text: "𝚄𝚜𝚊𝚐𝚎: .𝚔-𝚟𝚒𝚍𝚎𝚘 𝚙𝚛𝚘𝚖𝚙𝚝"
        });
    }

    try {
        await sock.sendMessage(jid, {
            text: "𝙶𝚎𝚗𝚎𝚛𝚊𝚝𝚒𝚗𝚐 𝚟𝚒𝚍𝚎𝚘..."
        });

        const apiUrl = `https://okatsu-rolezapiiz.vercel.app/ai/txt2video?text=${encodeURIComponent(prompt)}`;
        const { data } = await axios.get(apiUrl, { timeout: 120000 });
        
        const videoUrl = data?.videoUrl || data?.result || data?.data?.videoUrl;
        
        if (!videoUrl) {
            throw new Error("No video URL in response");
        }

        await sock.sendMessage(jid, {
            video: { url: videoUrl },
            caption: `𝙶𝚎𝚗𝚎𝚛𝚊𝚝𝚎𝚍: ${prompt}`
        });

    } catch (error) {
        await sock.sendMessage(jid, {
            text: "𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚐𝚎𝚗𝚎𝚛𝚊𝚝𝚎 𝚟𝚒𝚍𝚎𝚘."
        });
    }
}
