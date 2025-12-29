export const name = "delete";
export const description = "Delete a replied message";

export async function execute(sock, msg) {
    const jid = msg.key.remoteJid;
    
    if (!msg.message?.extendedTextMessage?.contextInfo?.stanzaId) {
        return await sock.sendMessage(jid, {
            text: "𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊 𝚖𝚎𝚜𝚜𝚊𝚐𝚎 𝚝𝚘 𝚍𝚎𝚕𝚎𝚝𝚎 𝚒𝚝."
        });
    }

    try {
        await sock.sendMessage(jid, {
            delete: {
                remoteJid: jid,
                fromMe: false,
                id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                participant: msg.message.extendedTextMessage.contextInfo.participant
            }
        });
    } catch (error) {
        await sock.sendMessage(jid, {
            text: "𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚍𝚎𝚕𝚎𝚝𝚎 𝚖𝚎𝚜𝚜𝚊𝚐𝚎."
        });
    }
}
