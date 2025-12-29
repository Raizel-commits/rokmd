export const name = "ai";
export const description = "𝙰𝙸 𝚌𝚑𝚊𝚝";

export async function execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const query = args.join(" ").trim();
    
    if (!query) {
        return await sock.sendMessage(jid, { text: "🤖 𝙰𝚜𝚔 𝚖𝚎 𝚊𝚗𝚢𝚝𝚑𝚒𝚗𝚐" });
    }
    
    try {
        await sock.sendMessage(jid, { text: "🤖 𝚃𝚑𝚒𝚗𝚔𝚒𝚗𝚐..." });
        
        const apiUrl = `https://lance-frank-asta.onrender.com/api/gpt?q=${encodeURIComponent(query)}`;
        const res = await fetch(apiUrl);
        const data = await res.json();
        
        if (!data?.message) {
            throw new Error("No response");
        }
        
        await sock.sendMessage(jid, { text: `🤖 ${data.message}` });
        
    } catch (error) {
        await sock.sendMessage(jid, { text: "❌ 𝙰𝙸 𝚎𝚛𝚛𝚘𝚛" });
    }
}
