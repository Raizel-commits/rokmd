import axios from "axios";

export const name = "gpt";
export const description = "AI chatbot";

export async function execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const args = msg.message?.conversation?.split(" ") || [];
    
    const query = args.slice(1).join(" ");
    
    if (!query) {
        return await sock.sendMessage(jid, {
            text: "𝚄𝚜𝚊𝚐𝚎: .𝚐𝚙𝚝 𝚚𝚞𝚎𝚜𝚝𝚒𝚘𝚗"
        });
    }

    try {
        const apiUrl = `https://apis.davidcyriltech.my.id/ai/chatbot?query=${encodeURIComponent(query)}`;
        const { data } = await axios.get(apiUrl);
        
        const response = data?.result || "𝙽𝚘 𝚛𝚎𝚜𝚙𝚘𝚗𝚜𝚎.";
        
        await sock.sendMessage(jid, {
            text: `🤖 ${response}`
        });
        
    } catch (error) {
        await sock.sendMessage(jid, {
            text: "𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚐𝚎𝚝 𝚛𝚎𝚜𝚙𝚘𝚗𝚜𝚎."
        });
    }
}
