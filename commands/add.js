export const name = "add";
export const description = "𝙰𝚍𝚍 𝚞𝚜𝚎𝚛 𝚝𝚘 𝚐𝚛𝚘𝚞𝚙";

export async function execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    
    if (!jid.endsWith("@g.us")) {
        await sock.sendMessage(jid, { text: "❌ 𝙶𝚛𝚘𝚞𝚙 𝚘𝚗𝚕𝚢" });
        return;
    }
    
    if (!args[0]) {
        await sock.sendMessage(jid, { text: "📝 𝚄𝚜𝚊𝚐𝚎: 𝚊𝚍𝚍 <𝚙𝚑𝚘𝚗𝚎>" });
        return;
    }
    
    try {
        const number = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        await sock.groupParticipantsUpdate(jid, [number], "add");
        await sock.sendMessage(jid, { text: `✅ 𝙰𝚍𝚍𝚎𝚍 ${args[0]}` });
    } catch (error) {
        await sock.sendMessage(jid, { text: "❌ 𝙲𝚊𝚗'𝚝 𝚊𝚍𝚍 𝚞𝚜𝚎𝚛" });
    }
}
