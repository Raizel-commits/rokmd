export const name = "ping";

export async function execute(sock, msg, args, commands) {
    try {
        await sock.sendMessage(msg.key.remoteJid, { text: "Pong!" });
    } catch (err) {
        console.error("Erreur dans la commande ping:", err);
    }
}
