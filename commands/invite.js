export const name = "invite";
export const description = "Get group invite link";

export async function execute(sock, msg) {
    const jid = msg.key.remoteJid;
    
    if (!jid.endsWith('@g.us')) {
        return await sock.sendMessage(jid, {
            text: "𝙶𝚛𝚘𝚞𝚙 𝚘𝚗𝚕𝚢 𝚌𝚘𝚖𝚖𝚊𝚗𝚍."
        });
    }

    try {
        const inviteCode = await sock.groupInviteCode(jid);
        const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
        
        await sock.sendMessage(jid, {
            text: `𝙶𝚛𝚘𝚞𝚙 𝚕𝚒𝚗𝚔:\n${inviteLink}`
        });
    } catch (error) {
        await sock.sendMessage(jid, {
            text: "𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚐𝚎𝚗𝚎𝚛𝚊𝚝𝚎 𝚒𝚗𝚟𝚒𝚝𝚎 𝚕𝚒𝚗𝚔."
        });
    }
}
