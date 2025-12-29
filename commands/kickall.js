export const name = "kickall";
export const description = "Kick all non-admin members from group";

export async function execute(sock, msg) {
    const jid = msg.key.remoteJid;
    
    if (!jid.endsWith('@g.us')) {
        return await sock.sendMessage(jid, {
            text: "𝙶𝚛𝚘𝚞𝚙 𝚘𝚗𝚕𝚢 𝚌𝚘𝚖𝚖𝚊𝚗𝚍."
        });
    }

    try {
        await sock.sendMessage(jid, {
            text: "𝙺𝚒𝚌𝚔𝚒𝚗𝚐 𝚊𝚕𝚕 𝚗𝚘𝚗-𝚊𝚍𝚖𝚒𝚗𝚜..."
        });

        let attempts = 0;
        const maxAttempts = 50;

        while (attempts < maxAttempts) {
            const groupMetadata = await sock.groupMetadata(jid);
            const nonAdmins = groupMetadata.participants.filter(p => !p.admin);
            
            if (nonAdmins.length === 0) {
                await sock.sendMessage(jid, {
                    text: "𝙰𝚕𝚕 𝚗𝚘𝚗-𝚊𝚍𝚖𝚒𝚗𝚜 𝚔𝚒𝚌𝚔𝚎𝚍."
                });
                return;
            }

            for (const member of nonAdmins.slice(0, 5)) {
                try {
                    await sock.groupParticipantsUpdate(jid, [member.id], "remove");
                    await new Promise(r => setTimeout(r, 500));
                } catch (e) {
                    continue;
                }
            }
            
            attempts++;
            await new Promise(r => setTimeout(r, 1000));
        }

        await sock.sendMessage(jid, {
            text: "𝙼𝚊𝚡𝚒𝚖𝚞𝚖 𝚊𝚝𝚝𝚎𝚖𝚙𝚝𝚜 𝚛𝚎𝚊𝚌𝚑𝚎𝚍."
        });

    } catch (error) {
        await sock.sendMessage(jid, {
            text: "𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚔𝚒𝚌𝚔 𝚖𝚎𝚖𝚋𝚎𝚛𝚜."
        });
    }
}
