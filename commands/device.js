import { getDevice } from "@whiskeysockets/baileys";

export const name = "device";
export const description = "Detect device used for a message";

export async function execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    
    if (!quoted?.stanzaId) {
        return await sock.sendMessage(jid, {
            text: "𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊 𝚖𝚎𝚜𝚜𝚊𝚐𝚎 𝚝𝚘 𝚍𝚎𝚝𝚎𝚌𝚝 𝚍𝚎𝚟𝚒𝚌𝚎."
        });
    }

    try {
        const device = getDevice(quoted.stanzaId);
        await sock.sendMessage(jid, {
            text: `𝙳𝚎𝚟𝚒𝚌𝚎: ${device || "𝚄𝚗𝚔𝚗𝚘𝚠𝚗"}`
        });
    } catch (error) {
        await sock.sendMessage(jid, {
            text: "𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚍𝚎𝚝𝚎𝚌𝚝 𝚍𝚎𝚟𝚒𝚌𝚎."
        });
    }
}
