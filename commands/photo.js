import { downloadContentFromMessage } from "@whiskeysockets/baileys";

export const name = "photo";
export const description = "Convert sticker to image";

export async function execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
    
    if (!quoted) {
        return await sock.sendMessage(jid, {
            text: "𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊 𝚜𝚝𝚒𝚌𝚔𝚎𝚛."
        });
    }

    try {
        const stream = await downloadContentFromMessage(quoted, "sticker");
        let buffer = Buffer.from([]);
        
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        await sock.sendMessage(jid, {
            image: buffer,
            caption: "𝚂𝚝𝚒𝚌𝚔𝚎𝚛 𝚝𝚘 𝚒𝚖𝚊𝚐𝚎"
        });
        
    } catch (error) {
        await sock.sendMessage(jid, {
            text: "𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚌𝚘𝚗𝚟𝚎𝚛𝚝."
        });
    }
}
