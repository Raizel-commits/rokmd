// add.js
export default {
  name: "add",
  description: "𝙰𝚍𝚍 𝚞𝚜𝚎𝚛 𝚝𝚘 𝚐𝚛𝚘𝚞𝚙",

  async execute(sock, message, args) {
    const { from, reply, isGroup, sender } = message;

    if (!isGroup) {
      await reply("❌ 𝙶𝚛𝚘𝚞𝚙 𝚘𝚗𝚕𝚢");
      return;
    }

    if (!args[0]) {
      await reply(
        "📝 𝚄𝚜𝚊𝚐𝚎: add <𝚙𝚑𝚘𝚗𝚎>\nExemple: add 628123456789"
      );
      return;
    }

    try {
      // Nettoyer le numéro
      const phoneNumber = args[0].replace(/[^0-9]/g, "");

      if (phoneNumber.length < 8) {
        await reply("❌ 𝙸𝚗𝚟𝚊𝚕𝚒𝚍 𝚙𝚑𝚘𝚗𝚎 𝚗𝚞𝚖𝚋𝚎𝚛");
        return;
      }

      const userJid = `${phoneNumber}@s.whatsapp.net`;

      // Ajouter l'utilisateur au groupe
      await sock.groupParticipantsUpdate(from, [userJid], "add");

      await reply(`✅ 𝙰𝚍𝚍𝚎𝚍 ${phoneNumber}\nRequested by: ${sender}`);

    } catch (error) {
      console.error("Add error:", error);
      await reply("❌ 𝙲𝚊𝚗'𝚝 add user");
    }
  }
};
