export const name = "autorecording";
export const description = "🎙️ 𝙰𝚞𝚝𝚘 𝚛𝚎𝚌𝚘𝚛𝚍𝚒𝚗𝚐 (simulate recording)";

export async function execute(sock, msg, args, commands, userSettings) {
    const jid = msg.key.remoteJid;
    const value = args[0]?.toLowerCase();

    if (!value || !["on","off"].includes(value)) {
        return await sock.sendMessage(jid, { text: "📝 Usage: !autorecording on/off" });
    }

    userSettings.autorecording = value === "on";
    await sock.sendMessage(jid, { text: `🎤 𝙰𝚞𝚝𝚘 𝚛𝚎𝚌𝚘𝚛𝚍𝚒𝚗𝚐 est maintenant ${userSettings.autorecording ? "✅ activé" : "❌ désactivé"}` });
}