export const name = "left";
export const description = "Leave the group";

export async function execute(sock, msg) {
    const jid = msg.key.remoteJid;
    
    if (!jid.endsWith('@g.us')) {
        return await sock.sendMessage(jid, {
            text: "𝙶𝚛𝚘𝚞𝚙 𝚘𝚗𝚕𝚢 𝚌𝚘𝚖𝚖𝚊𝚗𝚍."
        });
    }

    try {
        await sock.sendMessage(jid, {
            text: "𝙻𝚎𝚊𝚟𝚒𝚗𝚐 𝚐𝚛𝚘𝚞𝚙..."
        });
        await sock.groupLeave(jid);
    } catch (error) {
        // Silent fail
    }
}
