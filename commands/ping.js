// commands/ping.js
export default {
  name: "ping",
  description: "Répond 'pong' avec le temps de latence",
  async execute(sock, msg, args) {
    // Réponse principale
    const start = Date.now();
    await sock.sendMessage(msg.from, { text: "Ping..." });
    const latency = Date.now() - start;
    await sock.sendMessage(msg.from, { text: `Pong ! Latence: ${latency} ms` });

    // Réaction unique configurée via /config
    const number = msg.from.includes("@g.us") ? msg.sender.split("@")[0] : msg.from.split("@")[0];
    // La réaction sera envoyée automatiquement depuis pair.js si configurée
  }
};
