import axios from "axios";

export const name = "imagine";
export const description = "Generate image from prompt using AI";

export async function execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const args = msg.message?.conversation?.split(" ") || [];
    
    const prompt = args.slice(1).join(" ");
    
    if (!prompt) {
        return await sock.sendMessage(jid, {
            text: "𝚄𝚜𝚊𝚐𝚎: .𝚒𝚖𝚊𝚐𝚒𝚗𝚎 𝚙𝚛𝚘𝚖𝚙𝚝"
        });
    }

    try {
        await sock.sendMessage(jid, {
            text: "𝙶𝚎𝚗𝚎𝚛𝚊𝚝𝚒𝚗𝚐 𝚒𝚖𝚊𝚐𝚎..."
        });

        const enhancedPrompt = `${prompt}, high quality, detailed, masterpiece, 4k`;
        const response = await axios.get(
            `https://shizoapi.onrender.com/api/ai/imagine?apikey=shizo&query=${encodeURIComponent(enhancedPrompt)}`,
            { responseType: "arraybuffer" }
        );

        const imageBuffer = Buffer.from(response.data);
        
        await sock.sendMessage(jid, {
            image: imageBuffer,
            caption: `𝙸𝚖𝚊𝚐𝚒𝚗𝚎: ${prompt}`
        });

    } catch (error) {
        await sock.sendMessage(jid, {
            text: "𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚐𝚎𝚗𝚎𝚛𝚊𝚝𝚎 𝚒𝚖𝚊𝚐𝚎."
        });
    }
}
