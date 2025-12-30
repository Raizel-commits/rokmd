export default {
  name: "delete",
  description: "𝙳𝚎𝚕𝚎𝚝𝚎 𝚢𝚘𝚞𝚛 𝚕𝚊𝚜𝚝 𝚘𝚛 𝚛𝚎𝚙𝚕𝚒𝚎𝚍 𝚖𝚎𝚜𝚜𝚊𝚐𝚎",
  
  async execute(sock, message, args) {
    const { from, reply, quoted, sender } = message;
    
    try {
      if (args[0] === "last" && !quoted) {
        // Supprimer le dernier message de l'utilisateur
        // Note: Cela nécessiterait de garder un historique des messages
        await reply("⚠️ 𝙵𝚎𝚊𝚝𝚞𝚛𝚎 𝚗𝚘𝚝 𝚒𝚖𝚙𝚕𝚎𝚖𝚎𝚗𝚝𝚎𝚍 𝚢𝚎𝚝");
        return;
      }
      
      if (!quoted) {
        await reply("🗑️ 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊 𝚖𝚎𝚜𝚜𝚊𝚐𝚎 𝚘𝚛 𝚞𝚜𝚎: .𝚍𝚎𝚕𝚎𝚝𝚎 𝚕𝚊𝚜𝚝");
        return;
      }
      
      // Vérifier si l'utilisateur peut supprimer ce message
      if (!quoted.fromMe && quoted.sender !== sender) {
        await reply("❌ 𝚈𝚘𝚞 𝚌𝚊𝚗 𝚘𝚗𝚕𝚢 𝚍𝚎𝚕𝚎𝚝𝚎 𝚢𝚘𝚞𝚛 𝚘𝚠𝚗 𝚖𝚎𝚜𝚜𝚊𝚐𝚎𝚜");
        return;
      }
      
      await sock.sendMessage(from, {
        delete: {
          remoteJid: from,
          fromMe: quoted.fromMe,
          id: quoted.id,
          participant: quoted.participant
        }
      });
      
    } catch (error) {
      await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚍𝚎𝚕𝚎𝚝𝚎 𝚖𝚎𝚜𝚜𝚊𝚐𝚎");
    }
  }
};
