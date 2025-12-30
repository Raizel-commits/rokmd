export default {
  name: "infocountry",
  description: "𝙶𝚎𝚝 𝚍𝚎𝚝𝚊𝚒𝚕𝚎𝚍 𝚒𝚗𝚏𝚘𝚛𝚖𝚊𝚝𝚒𝚘𝚗 𝚊𝚋𝚘𝚞𝚝 𝚊 𝚌𝚘𝚞𝚗𝚝𝚛𝚢",
  aliases: ["countryinfo", "country", "flag"],
  
  async execute(sock, message, args) {
    const { from, reply } = message;
    
    if (!args[0]) {
      await reply("🌍 𝚄𝚜𝚊𝚐𝚎: .𝚌𝚘𝚞𝚗𝚝𝚛𝚢𝚒𝚗𝚏𝚘 <𝚌𝚘𝚞𝚗𝚝𝚛𝚢_𝚗𝚊𝚖𝚎>\n𝙴𝚡𝚊𝚖𝚙𝚕𝚎: .𝚌𝚘𝚞𝚗𝚝𝚛𝚢𝚒𝚗𝚏𝚘 𝙵𝚛𝚊𝚗𝚌𝚎\n.𝚌𝚘𝚞𝚗𝚝𝚛𝚢𝚒𝚗𝚏𝚘 𝙸𝚗𝚍𝚒𝚊\n.𝚌𝚘𝚞𝚗𝚝𝚛𝚢𝚒𝚗𝚏𝚘 𝚄𝚂𝙰");
      return;
    }

    const countryName = args.join(" ");
    
    try {
      // Message de chargement
      const loadingMsg = await reply("🌍 𝚂𝚎𝚊𝚛𝚌𝚑𝚒𝚗𝚐 𝚏𝚘𝚛 𝚌𝚘𝚞𝚗𝚝𝚛𝚢 𝚒𝚗𝚏𝚘𝚛𝚖𝚊𝚝𝚒𝚘𝚗...");
      
      const apiUrl = `https://api.siputzx.my.id/api/tools/countryInfo?name=${encodeURIComponent(countryName)}`;
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!data?.status || !data.data) {
        await reply(`❌ 𝙽𝚘 𝚒𝚗𝚏𝚘𝚛𝚖𝚊𝚝𝚒𝚘𝚗 𝚏𝚘𝚞𝚗𝚍 𝚏𝚘𝚛 "${countryName}"`);
        return;
      }

      const info = data.data;
      
      // Formater les informations des voisins
      const neighborsText = info.neighbors?.length > 0 
        ? info.neighbors.map(n => n.name).join(", ")
        : "𝙽𝚘𝚗𝚎";
      
      // Formater les langues
      let languagesText = "𝚄𝚗𝚔𝚗𝚘𝚠𝚗";
      if (info.languages?.native && info.languages.native.length > 0) {
        languagesText = info.languages.native.join(", ");
      } else if (info.languages?.official) {
        languagesText = info.languages.official;
      }
      
      // Formater les devises
      let currencyText = "𝚄𝚗𝚔𝚗𝚘𝚠𝚗";
      if (info.currency && typeof info.currency === 'object') {
        currencyText = `${info.currency.name} (${info.currency.code})`;
      } else if (info.currency) {
        currencyText = info.currency;
      }
      
      // Construire la légende détaillée
      const caption = `🌍 *${info.name?.common || info.name || countryName}* ${info.flagEmoji || "🏳️"}
      
📊 *𝙱𝚊𝚜𝚒𝚌 𝙸𝚗𝚏𝚘:*
• 🏛️ 𝙲𝚊𝚙𝚒𝚝𝚊𝚕: ${info.capital || "𝚄𝚗𝚔𝚗𝚘𝚠𝚗"}
• 🌐 𝙲𝚘𝚗𝚝𝚒𝚗𝚎𝚗𝚝: ${info.continent?.name || "𝚄𝚗𝚔𝚗𝚘𝚠𝚗"} ${info.continent?.emoji || ""}
• 🗺️ 𝚁𝚎𝚐𝚒𝚘𝚗: ${info.region || "𝚄𝚗𝚔𝚗𝚘𝚠𝚗"}
• 🏷️ 𝚂𝚞𝚋𝚛𝚎𝚐𝚒𝚘𝚗: ${info.subregion || "𝚄𝚗𝚔𝚗𝚘𝚠𝚗"}

📈 *𝚂𝚝𝚊𝚝𝚒𝚜𝚝𝚒𝚌𝚜:*
• 📞 𝙿𝚑𝚘𝚗𝚎 𝙲𝚘𝚍𝚎: +${info.phoneCode || "𝙽/𝙰"}
• 📏 𝙰𝚛𝚎𝚊: ${info.area?.squareKilometers?.toLocaleString() || "𝚄𝚗𝚔𝚗𝚘𝚠𝚗"} 𝙺𝙼²
• 👥 𝙿𝚘𝚙𝚞𝚕𝚊𝚝𝚒𝚘𝚗: ${info.population ? info.population.toLocaleString() : "𝚄𝚗𝚔𝚗𝚘𝚠𝚗"}
• 🏷️ 𝙳𝚎𝚗𝚜𝚒𝚝𝚢: ${info.density ? info.density.toFixed(2) : "𝚄𝚗𝚔𝚗𝚘𝚠𝚗"}/𝙺𝙼²

💱 *𝙴𝚌𝚘𝚗𝚘𝚖𝚢:*
• 💰 𝙲𝚞𝚛𝚛𝚎𝚗𝚌𝚢: ${currencyText}
• 💬 𝙻𝚊𝚗𝚐𝚞𝚊𝚐𝚎𝚜: ${languagesText}
• 🏭 𝙶𝙳𝙿: ${info.gdp ? "$" + info.gdp.toLocaleString() : "𝚄𝚗𝚔𝚗𝚘𝚠𝚗"}

📍 *𝙶𝚎𝚘𝚐𝚛𝚊𝚙𝚑𝚢:*
• 🔗 𝙸𝚂𝙾 𝙲𝚘𝚍𝚎: ${info.isoCode?.alpha2 || ""}/${info.isoCode?.alpha3 || ""}
• 🌐 𝚃𝙻𝙳: ${info.internetTLD || "𝙽/𝙰"}
• 🤝 𝙽𝚎𝚒𝚐𝚑𝚋𝚘𝚛𝚜: ${neighborsText}`;

      // Supprimer le message de chargement
      try {
        await sock.sendMessage(from, { delete: loadingMsg.key });
      } catch (deleteError) {
        // Ignorer si on ne peut pas supprimer
      }
      
      // Envoyer le drapeau avec les informations
      await sock.sendMessage(from, {
        image: { url: info.flag },
        caption: caption
      });
      
    } catch (error) {
      console.error("Country info error:", error);
      await reply("❌ 𝙴𝚛𝚛𝚘𝚛 𝚏𝚎𝚝𝚌𝚑𝚒𝚗𝚐 𝚌𝚘𝚞𝚗𝚝𝚛𝚢 𝚒𝚗𝚏𝚘𝚛𝚖𝚊𝚝𝚒𝚘𝚗");
    }
  }
};
