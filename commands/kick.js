export const name = "kick";
export const description = "Kick user from group";

export async function execute(sock, msg) {
    const jid = msg.key.remoteJid;
    
    if (!jid.endsWith('@g.us')) {
        return await sock.sendMessage(jid, {
            text: "𝙶𝚛𝚘𝚞𝚙 𝚘𝚗𝚕𝚢 𝚌𝚘𝚖𝚖𝚊𝚗𝚍."
        });
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const targets = [...new Set([...(mentioned || []), ...(quoted ? [quoted] : [])])];

    if (targets.length === 0) {
        return await sock.sendMessage(jid, {
            text: "𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚘𝚛 𝚖𝚎𝚗𝚝𝚒𝚘𝚗 𝚊 𝚞𝚜𝚎𝚛."
        });
    }

    try {
        await sock.groupParticipantsUpdate(jid, targets, "remove");
        
        const mentionsText = targets.map(jid => `@${jid.split('@')[0]}`).join(", ");
        await sock.sendMessage(jid, {
            text: `𝙺𝚒𝚌𝚔𝚎𝚍: ${mentionsText}`,
            mentions: targets
        });
    } catch (error) {
        await sock.sendMessage(jid, {
            text: "𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚔𝚒𝚌𝚔 𝚞𝚜𝚎𝚛."
        });
    }
}
