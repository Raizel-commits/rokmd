// commands/ping.js
export default {
  name: "ping",
  description: "Répond pong",
  async execute(sock, ctx, args) {
    await ctx.reply("pong");
  }
};
