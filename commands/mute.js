export const name = "mute";
export const description = "𝙼𝚞𝚝𝚎 𝚐𝚛𝚘𝚞𝚙";

export async function execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    
    if (!jid.endsWith("@g.us")) {
        await sock.sendMessage(jid, { text: "❌ 𝙶𝚛𝚘𝚞𝚙 𝚘𝚗𝚕𝚢" });
        return;
    }
    
    try {
        if (args[0]?.toLowerCase() === "open") {
            await sock.groupSettingUpdate(jid, "not_announcement");
            await sock.sendMessage(jid, { text: "🔓 𝙶𝚛𝚘𝚞𝚙 𝚘𝚙𝚎𝚗𝚎𝚍" });
        } else {
            await sock.groupSettingUpdate(jid, "announcement");
            await sock.sendMessage(jid, { text: "🔒 𝙶𝚛𝚘𝚞𝚙 𝚌𝚕𝚘𝚜𝚎𝚍" });
        }
    } catch (error) {
        await sock.sendMessage(jid, { text: "❌ 𝙰𝚍𝚖𝚒𝚗 𝚘𝚗𝚕𝚢" });
    }
}
