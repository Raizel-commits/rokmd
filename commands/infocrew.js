export default {
  name: "infocrew",
  description: "𝙳𝚒𝚜𝚙𝚕𝚊𝚢 𝚆𝚑𝚊𝚝𝚜𝙰𝚙𝚙 𝚐𝚛𝚘𝚞𝚙 𝚒𝚗𝚏𝚘𝚛𝚖𝚊𝚝𝚒𝚘𝚗",
  aliases: ["groupinfo", "ginfo", "crew"],
  
  async execute(sock, message, args) {
    const { from, reply, isGroup, chat } = message;
    
    // Vérifier si c'est un groupe
    if (!isGroup) {
      await reply("❌ 𝙶𝚛𝚘𝚞𝚙 𝚘𝚗𝚕𝚢 𝚌𝚘𝚖𝚖𝚊𝚗𝚍");
      return;
    }
    
    try {
      // Message de chargement
      const loadingMsg = await reply("📊 𝙵𝚎𝚝𝚌𝚑𝚒𝚗𝚐 𝚐𝚛𝚘𝚞𝚙 𝚒𝚗𝚏𝚘𝚛𝚖𝚊𝚝𝚒𝚘𝚗...");
      
      // Obtenir les métadonnées du groupe
      const metadata = await sock.groupMetadata(from);
      const participants = metadata.participants;
      
      // Calculer les statistiques
      const admins = participants.filter(p => p.admin === "admin" || p.admin === "superadmin");
      const superAdmins = participants.filter(p => p.admin === "superadmin");
      const regularMembers = participants.filter(p => !p.admin);
      
      // Préparer les mentions
      const adminMentions = admins.map(a => a.id);
      const superAdminMentions = superAdmins.map(a => a.id);
      
      // Date de création formatée
      const creationDate = metadata.creation ? new Date(metadata.creation * 1000) : new Date();
      const formattedDate = creationDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Photo de profil du groupe
      const groupPp = await sock.profilePictureUrl(from, "image").catch(() => null);
      
      // Construire le texte d'information
      let infoText = `👥 *𝙶𝚁𝙾𝚄𝙿 𝙸𝙽𝙵𝙾𝚁𝙼𝙰𝚃𝙸𝙾𝙽*\n\n`;
      
      infoText += `📝 *𝙽𝚘𝚖:* ${metadata.subject || "𝚄𝚗𝚔𝚗𝚘𝚠𝚗"}\n`;
      infoText += `🆔 *𝙶𝙸𝙳:* ${metadata.id}\n`;
      
      if (metadata.desc) {
        infoText += `📋 *𝙳𝚎𝚜𝚌𝚛𝚒𝚙𝚝𝚒𝚘𝚗:*\n${metadata.desc}\n\n`;
      } else {
        infoText += `📋 *𝙳𝚎𝚜𝚌𝚛𝚒𝚙𝚝𝚒𝚘𝚗:* 𝙽𝚘𝚗𝚎\n\n`;
      }
      
      infoText += `📊 *𝚂𝚃𝙰𝚃𝙸𝚂𝚃𝙸𝚀𝚄𝙴𝚂*\n`;
      infoText += `• 👥 𝚃𝚘𝚝𝚊𝚕: ${participants.length} 𝚖𝚎𝚖𝚋𝚛𝚎𝚜\n`;
      infoText += `• 👑 𝚂𝚞𝚙𝚎𝚛𝙰𝚍𝚖𝚒𝚗𝚜: ${superAdmins.length}\n`;
      infoText += `• 🛡️ 𝙰𝚍𝚖𝚒𝚗𝚜: ${admins.length - superAdmins.length}\n`;
      infoText += `• 👤 𝙼𝚎𝚖𝚋𝚛𝚎𝚜: ${regularMembers.length}\n\n`;
      
      infoText += `📅 *𝙳𝙴𝚃𝙰𝙸𝙻𝚂*\n`;
      infoText += `• 🕒 𝙲𝚛𝚎́𝚎́ 𝚕𝚎: ${formattedDate}\n`;
      infoText += `• 📸 𝙿𝚑𝚘𝚝𝚘: ${groupPp ? "✅ 𝙰𝚟𝚊𝚒𝚕𝚊𝚋𝚕𝚎" : "❌ 𝙽𝚘𝚗 𝚍𝚒𝚜𝚙𝚘𝚗𝚒𝚋𝚕𝚎"}\n`;
      infoText += `• 🔒 𝚁𝚎𝚜𝚝𝚛𝚒𝚌𝚝𝚒𝚘𝚗𝚜: ${metadata.restrict ? "✅ 𝙰𝚌𝚝𝚒𝚟𝚎́𝚎𝚜" : "❌ 𝙳𝚎́𝚜𝚊𝚌𝚝𝚒𝚟𝚎́𝚎𝚜"}\n`;
      infoText += `• 🌟 𝙰𝚗𝚗𝚘𝚗𝚌𝚎𝚜: ${metadata.announce ? "✅ 𝙰𝚌𝚝𝚒𝚟𝚎́𝚎𝚜" : "❌ 𝙳𝚎́𝚜𝚊𝚌𝚝𝚒𝚟𝚎́𝚎𝚜"}\n\n`;
      
      infoText += `👑 *𝚂𝚄𝙿𝙴𝚁𝙰𝙳𝙼𝙸𝙽𝚂* (${superAdmins.length})\n`;
      if (superAdmins.length > 0) {
        superAdmins.forEach((admin, index) => {
          const number = admin.id.split('@')[0];
          infoText += `${index + 1}. @${number}\n`;
        });
      } else {
        infoText += `𝙰𝚞𝚌𝚞𝚗 𝚜𝚞𝚙𝚎𝚛𝚊𝚍𝚖𝚒𝚗\n`;
      }
      
      infoText += `\n🛡️ *𝙰𝙳𝙼𝙸𝙽𝚂* (${admins.length - superAdmins.length})\n`;
      if (admins.length - superAdmins.length > 0) {
        admins
          .filter(a => a.admin === "admin")
          .forEach((admin, index) => {
            const number = admin.id.split('@')[0];
            infoText += `${index + 1}. @${number}\n`;
          });
      } else {
        infoText += `𝙰𝚞𝚌𝚞𝚗 𝚊𝚍𝚖𝚒𝚗 𝚜𝚞𝚙𝚙𝚕𝚎́𝚖𝚎𝚗𝚝𝚊𝚒𝚛𝚎\n`;
      }
      
      infoText += `\n📊 𝙳𝚎𝚛𝚗𝚒𝚎̀𝚛𝚎 𝚖𝚒𝚜𝚎 𝚊̀ 𝚓𝚘𝚞𝚛: ${new Date().toLocaleString('fr-FR')}`;
      
      // Supprimer le message de chargement
      try {
        await sock.sendMessage(from, { delete: loadingMsg.key });
      } catch (deleteError) {
        // Ignorer si on ne peut pas supprimer
      }
      
      // Envoyer les informations
      if (groupPp) {
        // Envoyer avec la photo de profil
        await sock.sendMessage(from, {
          image: { url: groupPp },
          caption: infoText,
          mentions: [...superAdminMentions, ...adminMentions]
        });
      } else {
        // Envoyer sans photo
        await sock.sendMessage(from, {
          text: infoText,
          mentions: [...superAdminMentions, ...adminMentions]
        });
      }
      
    } catch (error) {
      console.error("Group info error:", error);
      await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚐𝚎𝚝 𝚐𝚛𝚘𝚞𝚙 𝚒𝚗𝚏𝚘");
    }
  }
};
