// commands/ping.js
export default {
  name: "ping",
  async execute(sock, msg) {
    await msg.reply("Pong !");
  },
};
