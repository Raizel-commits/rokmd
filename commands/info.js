export default {
  name: "info",
  description: "Affiche quelques infos sur le bot",
  async execute(sock, ctx, args) {
    const isGroup = ctx.isGroup ? "Oui" : "Non";
    await ctx.reply(`Numéro du bot: ${ctx.from}\nEst un groupe? ${isGroup}`);
  }
};
