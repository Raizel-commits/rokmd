export default {
    name: "ping",
    description: "Répond pong",
    async execute(sock, msg, args) {
        await msg.reply("🏓 Pong !");
    }
};
