export default {
    name: 'menu',
    execute: async (sock, msg) => {
        await sock.sendMessage(msg.key.remoteJid, {
            text: `📜 *MENU*
!ping
!menu
!help`
        })
    }
}
