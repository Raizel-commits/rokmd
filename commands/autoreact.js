export const name = "autoreact";
export const description = "🔄 𝙰𝚞𝚝𝚘 𝚛𝚎𝚊𝚌𝚝 𝚝𝚘 𝚖𝚎𝚜𝚜𝚊𝚐𝚎𝚜";

export async function execute(sock, msg, args, commands, userSettings) {
    const jid = msg.key.remoteJid;
    const value = args[0]?.toLowerCase();

    if (!value || !["on","off"].includes(value)) {
        return await sock.sendMessage(jid, { text: "📝 Usage: !autoreact on/off" });
    }

    userSettings.autoreact = value === "on";
    await sock.sendMessage(jid, { text: `🔔 𝙰𝚞𝚝𝚘 𝚛𝚎𝚊𝚌𝚝 est maintenant ${userSettings.autoreact ? "✅ activé" : "❌ désactivé"}` });
}