export const name = "apk";
export const description = "Search for APKs on different stores";

export async function execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const args = msg.message?.conversation?.split(" ") || [];
    
    if (!args[1]) {
        return await sock.sendMessage(jid, {
            text: "𝚄𝚜𝚊𝚐𝚎: .𝚊𝚙𝚔 𝚊𝚙𝚙_𝚗𝚊𝚖𝚎"
        });
    }

    const query = args.slice(1).join(" ");
    const stores = {
        "𝙿𝚕𝚊𝚢 𝚂𝚝𝚘𝚛𝚎": `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps`,
        "𝙰𝙿𝙺𝙿𝚞𝚛𝚎": `https://apkpure.com/search?q=${encodeURIComponent(query)}`,
        "𝙰𝙿𝙺𝙼𝚒𝚛𝚛𝚘𝚛": `https://www.apkmirror.com/?s=${encodeURIComponent(query)}`,
        "𝚄𝚙𝚝𝚘𝚍𝚘𝚠𝚗": `https://en.uptodown.com/android/search/${encodeURIComponent(query)}`
    };

    let result = `🔍 *${query}*\n\n`;
    for (const [name, url] of Object.entries(stores)) {
        result += `▫️ ${name}\n${url}\n\n`;
    }

    await sock.sendMessage(jid, {
        text: result + "𝚂𝚎𝚊𝚛𝚌𝚑 𝚕𝚒𝚗𝚔𝚜 𝚐𝚎𝚗𝚎𝚛𝚊𝚝𝚎𝚍."
    });
}
