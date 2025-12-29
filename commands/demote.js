export const name = "demote";
export const description = "Demote a group admin";

export async function execute(sock, msg) {
    const jid = msg.key.remoteJid;
    
    // Check if in group
    if (!jid.endsWith('@g.us')) {
        return await sock.sendMessage(jid, {
            text: "𝙶𝚛𝚘𝚞𝚙 𝚘𝚗𝚕𝚢 𝚌𝚘𝚖𝚖𝚊𝚗𝚍."
        });
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const target = mentioned?.[0] || quoted;

    if (!target) {
        return await sock.sendMessage(jid, {
            text: "𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚘𝚛 𝚖𝚎𝚗𝚝𝚒𝚘𝚗 𝚊 𝚞𝚜𝚎𝚛."
        });
    }

    try {
        await sock.groupParticipantsUpdate(jid, [target], "demote");
        await sock.sendMessage(jid, {
            text: `𝙳𝚎𝚖𝚘𝚝𝚎𝚍 @${target.split('@')[0]}`,
            mentions: [target]
        });
    } catch (error) {
        await sock.sendMessage(jid, {
            text: "𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚍𝚎𝚖𝚘𝚝𝚎."
        });
    }
}
