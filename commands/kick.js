export default {
  name: "kick",
  description: "𝙺𝚒𝚌𝚔 𝚞𝚜𝚎𝚛 𝚏𝚛𝚘𝚖 𝚐𝚛𝚘𝚞𝚙",
  aliases: ["remove", "ban", "expel"],
  
  async execute(sock, message, args) {
    const { from, reply, isGroup, mentionedJids, quoted, sender, chat } = message;
    
    // Vérifier si c'est un groupe
    if (!isGroup) {
      await reply("❌ 𝙶𝚛𝚘𝚞𝚙 𝚘𝚗𝚕𝚢 𝚌𝚘𝚖𝚖𝚊𝚗𝚍");
      return;
    }
    
    // Vérifier les permissions de l'expéditeur
    const participant = chat.participants.find(p => p.id === sender);
    const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
    
    if (!isAdmin) {
      await reply("❌ 𝚈𝚘𝚞 𝚖𝚞𝚜𝚝 𝚋𝚎 𝚊𝚗 𝚊𝚍𝚖𝚒𝚗 𝚝𝚘 𝚔𝚒𝚌𝚔 𝚞𝚜𝚎𝚛𝚜");
      return;
    }
    
    // Collecter les cibles
    let targets = [];
    
    if (mentionedJids && mentionedJids.length > 0) {
      targets = [...mentionedJids];
    } else if (quoted) {
      targets = [quoted.sender];
    } else if (args[0]) {
      // Permettre de spécifier un numéro directement
      const phoneNumber = args[0].replace(/[^0-9]/g, "");
      if (phoneNumber) {
        targets = [`${phoneNumber}@s.whatsapp.net`];
      }
    }
    
    // Éliminer les doublons
    targets = [...new Set(targets)];
    
    if (targets.length === 0) {
      await reply("📝 𝚄𝚜𝚊𝚐𝚎:\n• .𝚔𝚒𝚌𝚔 @𝚞𝚜𝚎𝚛\n• .𝚔𝚒𝚌𝚔 <𝚙𝚑𝚘𝚗𝚎_𝚗𝚞𝚖𝚋𝚎𝚛>\n• 𝚁𝚎𝚙𝚕𝚢 .𝚔𝚒𝚌𝚔 𝚝𝚘 𝚊 𝚖𝚎𝚜𝚜𝚊𝚐𝚎");
      return;
    }
    
    // Vérifier les cibles
    const invalidTargets = [];
    const validTargets = [];
    
    for (const target of targets) {
      const targetInGroup = chat.participants.find(p => p.id === target);
      
      if (!targetInGroup) {
        const targetNumber = target.split('@')[0];
        invalidTargets.push(`@${targetNumber}`);
        continue;
      }
      
      // Empêcher de kick un admin/superadmin si vous n'êtes pas superadmin
      if (targetInGroup.admin === "superadmin" && participant.admin !== "superadmin") {
        const targetNumber = target.split('@')[0];
        await reply(`❌ 𝙲𝚊𝚗𝚗𝚘𝚝 𝚔𝚒𝚌𝚔 𝚜𝚞𝚙𝚎𝚛𝚊𝚍𝚖𝚒𝚗 @${targetNumber}`);
        return;
      }
      
      if (targetInGroup.admin === "admin" && participant.admin !== "superadmin") {
        const targetNumber = target.split('@')[0];
        await reply(`❌ 𝙲𝚊𝚗𝚗𝚘𝚝 𝚔𝚒𝚌𝚔 𝚊𝚍𝚖𝚒𝚗 @${targetNumber}`);
        return;
      }
      
      // Empêcher de se kick soi-même
      if (target === sender) {
        await reply("❌ 𝚈𝚘𝚞 𝚌𝚊𝚗𝚗𝚘𝚝 𝚔𝚒𝚌𝚔 𝚢𝚘𝚞𝚛𝚜𝚎𝚕𝚏");
        return;
      }
      
      validTargets.push(target);
    }
    
    if (validTargets.length === 0) {
      await reply(`❌ 𝙽𝚘 𝚟𝚊𝚕𝚒𝚍 𝚞𝚜𝚎𝚛𝚜 𝚝𝚘 𝚔𝚒𝚌𝚔\n𝙸𝚗𝚟𝚊𝚕𝚒𝚍: ${invalidTargets.join(', ')}`);
      return;
    }
    
    try {
      // Message de confirmation
      const targetNumbers = validTargets.map(t => t.split('@')[0]);
      const mentionsText = targetNumbers.map(n => `@${n}`).join(', ');
      
      await reply(`⚠️ 𝙺𝚒𝚌𝚔𝚒𝚗𝚐 ${validTargets.length} 𝚞𝚜𝚎𝚛(𝚜): ${mentionsText}`);
      
      // Effectuer le kick
      await sock.groupParticipantsUpdate(from, validTargets, "remove");
      
      // Message de succès
      const groupName = chat.name || "Group";
      
      await reply(`✅ 𝚂𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢 𝚔𝚒𝚌𝚔𝚎𝚍 ${validTargets.length} 𝚞𝚜𝚎𝚛(𝚜) 𝚏𝚛𝚘𝚖 ${groupName}\n👋 ${mentionsText}`, {
        mentions: validTargets
      });
      
      // Message d'avertissement pour les cibles invalides
      if (invalidTargets.length > 0) {
        await reply(`ℹ️ 𝙽𝚘𝚝 𝚒𝚗 𝚐𝚛𝚘𝚞𝚙: ${invalidTargets.join(', ')}`);
      }
      
    } catch (error) {
      console.error("Kick error:", error);
      
      let errorMessage = "❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚔𝚒𝚌𝚔 𝚞𝚜𝚎𝚛(𝚜)";
      
      if (error.message.includes('401')) {
        errorMessage = "❌ 𝙸'𝚖 𝚗𝚘𝚝 𝚊𝚗 𝚊𝚍𝚖𝚒𝚗 𝚒𝚗 𝚝𝚑𝚒𝚜 𝚐𝚛𝚘𝚞𝚙";
      } else if (error.message.includes('403')) {
        errorMessage = "❌ 𝙿𝚎𝚛𝚖𝚒𝚜𝚜𝚒𝚘𝚗 𝚍𝚎𝚗𝚒𝚎𝚍";
      } else if (error.message.includes('404')) {
        errorMessage = "❌ 𝚄𝚜𝚎𝚛 𝚗𝚘𝚝 𝚏𝚘𝚞𝚗𝚍 𝚒𝚗 𝚐𝚛𝚘𝚞𝚙";
      } else if (error.message.includes('409')) {
        errorMessage = "❌ 𝙲𝚊𝚗𝚗𝚘𝚝 𝚔𝚒𝚌𝚔 𝚐𝚛𝚘𝚞𝚙 𝚘𝚠𝚗𝚎𝚛";
      } else if (error.message.includes('500')) {
        errorMessage = "❌ 𝚂𝚎𝚛𝚟𝚎𝚛 𝚎𝚛𝚛𝚘𝚛";
      }
      
      await reply(errorMessage);
    }
  }
};
