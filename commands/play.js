import axios from "axios";

export const name = "play";
export const description = "Search and play music";

export async function execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const args = msg.message?.conversation?.split(" ") || [];
    
    const title = args.slice(1).join(" ");
    
    if (!title) {
        return await sock.sendMessage(jid, {
            text: "𝚄𝚜𝚊𝚐𝚎: .𝚙𝚕𝚊𝚢 𝚜𝚘𝚗𝚐_𝚗𝚊𝚖𝚎"
        });
    }

    try {
        await sock.sendMessage(jid, {
            text: `🔍 𝚂𝚎𝚊𝚛𝚌𝚑𝚒𝚗𝚐 "${title}"...`
        });

        const apiUrl = `https://apis.davidcyriltech.my.id/play?query=${encodeURIComponent(title)}`;
        const { data } = await axios.get(apiUrl);

        if (!data.status || !data.result?.download_url) {
            return await sock.sendMessage(jid, {
                text: "𝙽𝚘 𝚛𝚎𝚜𝚞𝚕𝚝𝚜 𝚏𝚘𝚞𝚗𝚍."
            });
        }

        const video = data.result;
        
        await sock.sendMessage(jid, {
            image: { url: video.thumbnail },
            caption: `🎵 ${video.title}`
        });

        await sock.sendMessage(jid, {
            audio: { url: video.download_url },
            mimetype: "audio/mp4",
            ptt: false
        });

    } catch (error) {
        await sock.sendMessage(jid, {
            text: "𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚙𝚕𝚊𝚢 𝚖𝚞𝚜𝚒𝚌."
        });
    }
}
