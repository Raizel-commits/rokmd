export const name = "welcomeBye";
export const description = "👋 𝚆𝚎𝚕𝚌𝚘𝚖𝚎 + 𝙱𝚢𝚎 automatique avec photo et infos";

// Ce module est automatique, pas de commande à taper
export async function execute() {}

// Fonction à appeler dans startPairingSession
export async function setupWelcomeBye(sock) {
    sock.ev.on("group-participants.update", async (update) => {
        const { id, participants, action } = update;

        for (const user of participants) {
            try {
                // Nom du contact
                const contactName = (await sock.onWhatsApp(user))[0]?.notify || user.split("@")[0];
                // Photo du contact
                const profilePic = await sock.profilePictureUrl(user).catch(() => null);

                const text =
                    action === "add"
                        ? `🎉 𝙱𝚒𝚎𝚗𝚟𝚎𝚗𝚞 ${contactName} !\n📱 ${user}`
                        : `👋 𝙰𝚞 𝚛𝚎𝚟𝚘𝚒𝚛 ${contactName} !\n📱 ${user}`;

                const message = profilePic
                    ? { image: { url: profilePic }, caption: text }
                    : { text };

                await sock.sendMessage(id, message);
            } catch (err) {
                console.error("Erreur welcome/bye :", err);
            }
        }
    });
}