export const name = "autoread";
export const description = "📖 𝙰𝚞𝚝𝚘 𝚛𝚎𝚊𝚍 𝚖𝚎𝚜𝚜𝚊𝚐𝚎𝚜";

export async function execute(sock, msg, args, commands, userSettings) {
    const jid = msg.key.remoteJid;
    const value = args[0]?.toLowerCase();

    if (!value || !["on","off"].includes(value)) {
        return await sock.sendMessage(jid, { text: "📝 Usage: !autoread on/off" });
    }

    userSettings.autoread = value === "on";
    await sock.sendMessage(jid, { text: `📚 𝙰𝚞𝚝𝚘 𝚛𝚎𝚊𝚍 est maintenant ${userSettings.autoread ? "✅ activé" : "❌ désactivé"}` });
}