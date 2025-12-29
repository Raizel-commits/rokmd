import fetch from "node-fetch";

export const name = "img";
export const description = "Search for images";

export async function execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const args = msg.message?.conversation?.split(" ") || [];
    
    if (!args[1]) {
        return await sock.sendMessage(jid, {
            text: "𝚄𝚜𝚊𝚐𝚎: .𝚒𝚖𝚐 𝚚𝚞𝚎𝚛𝚢 [𝚗𝚞𝚖𝚋𝚎𝚛]"
        });
    }

    const lastArg = args[args.length - 1];
    const count = !isNaN(lastArg) ? Math.min(parseInt(lastArg), 5) : 1;
    const query = !isNaN(lastArg) ? args.slice(1, -1).join(" ") : args.slice(1).join(" ");

    try {
        const bingUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`;
        const res = await fetch(bingUrl);
        const html = await res.text();
        
        const imageUrls = [...html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)]
            .map(m => m[1])
            .filter(u => u.startsWith("http"))
            .slice(0, count);

        if (imageUrls.length === 0) {
            return await sock.sendMessage(jid, {
                text: `𝙽𝚘 𝚒𝚖𝚊𝚐𝚎𝚜 𝚏𝚘𝚞𝚗𝚍 𝚏𝚘𝚛 "${query}"`
            });
        }

        for (const img of imageUrls) {
            try {
                const response = await fetch(img);
                const buffer = Buffer.from(await response.arrayBuffer());
                
                await sock.sendMessage(jid, {
                    image: buffer,
                    caption: `𝚂𝚎𝚊𝚛𝚌𝚑: ${query}`
                });
                
                await new Promise(r => setTimeout(r, 500));
            } catch (e) {
                continue;
            }
        }

    } catch (error) {
        await sock.sendMessage(jid, {
            text: "𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚏𝚎𝚝𝚌𝚑 𝚒𝚖𝚊𝚐𝚎𝚜."
        });
    }
}
