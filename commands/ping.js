// ./commands/ping.js
export default {
  name: "ping",
  description: "Répond pong pour tester le bot",
  async execute(sock, message, args) {
    const { from, reply, sender } = message;

    // Envoie la réponse
    await reply(`Pong 🏓!\nEnvoyé par : ${sender}`);
  }
};
