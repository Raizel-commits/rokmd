export default {
  name: "ping",
  description: "Répond pong",
  async execute(sock, msg, args) {
    const replyText = "Pong 🏓";
    await msg.reply(replyText);
  }
};
