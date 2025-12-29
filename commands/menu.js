// commands/menu.js
export default {
  name: "menu",
  description: "Affiche le menu des commandes disponibles",
  async execute(sock, msg, args) {
    const commandsList = [
      { cmd: "ping", desc: "Test de latence" },
      { cmd: "menu", desc: "Affiche ce menu" },
      // Ajoute ici toutes tes commandes disponibles
    ];

    let menuText = "*ROK XD • Menu des commandes*\n\n";
    commandsList.forEach(c => {
      menuText += `• ${c.cmd} → ${c.desc}\n`;
    });

    await sock.sendMessage(msg.from, { text: menuText });
  }
};
