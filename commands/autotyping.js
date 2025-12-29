export const name = "autotyping";
export const description = "⌨️ 𝙰𝚞𝚝𝚘 𝚝𝚢𝚙𝚒𝚗𝚐 (simulate typing)";

export async function execute(sock, msg, args, commands, userSettings) {
    const jid = msg.key.remoteJid;
    const value = args[0]?.toLowerCase();

    if (!value || !["on","off"].includes(value)) {
        return await sock.sendMessage(jid, { text: "📝 Usage: !autotyping on/off" });
    }

    userSettings.autotyping = value === "on";
    await sock.sendMessage(jid, { text: `✍️ 𝙰𝚞𝚝𝚘 𝚝𝚢𝚙𝚒𝚗𝚐 est maintenant ${userSettings.autotyping ? "✅ activé" : "❌ désactivé"}` });
}