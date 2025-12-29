// ./commands/kick.js
export default {
  name: "kick",
  description: "Exclut un membre du groupe",
  async execute(sock, message, args) {
    const { from, raw, reply, isGroup } = message;

    if (!isGroup) {
      return reply("❌ Cette commande ne peut être utilisée que dans un groupe.");
    }

    const mentions = raw.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentions.length === 0) {
      return reply("❌ Veuillez mentionner la personne à exclure.");
    }

    try {
      // Exclut chaque membre mentionné
      for (const jid of mentions) {
        await sock.groupParticipantsUpdate(from, [jid], "remove");
      }
      reply(`✅ Membre(s) exclu(s) avec succès.`);
    } catch (err) {
      console.error("Erreur kick:", err);
      reply(`❌ Impossible d'exclure le membre : ${err.message}`);
    }
  }
};
