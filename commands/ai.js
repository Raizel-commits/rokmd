export default {
  name: "ai",
  description: "𝙰𝙸 𝚌𝚑𝚊𝚝",
  aliases: ["ask", "gpt"],
  
  async execute(sock, message, args) {
    const { from, reply, sender } = message;
    const query = args.join(" ").trim();
    
    if (!query) {
      await reply("🤖 𝙰𝚜𝚔 𝚖𝚎 𝚊𝚗𝚢𝚝𝚑𝚒𝚗𝚐");
      return;
    }
    
    try {
      // Envoyer un message de "pensée"
      const thinkingMsg = await reply("🤖 𝚃𝚑𝚒𝚗𝚔𝚒𝚗𝚐...");
      
      // Appeler l'API AI
      const apiUrl = `https://lance-frank-asta.onrender.com/api/gpt?q=${encodeURIComponent(query)}`;
      const res = await fetch(apiUrl);
      const data = await res.json();
      
      if (!data?.message) {
        throw new Error("No response from AI");
      }
      
      // Formater la réponse
      const aiResponse = `🤖 *𝙰𝙸 𝚁𝚎𝚜𝚙𝚘𝚗𝚜𝚎:*\n\n${data.message}\n\n👤 *𝙰𝚜𝚔𝚎𝚍 𝚋𝚢:* ${sender}`;
      
      // Envoyer la réponse et supprimer le "thinking"
      await sock.sendMessage(from, { text: aiResponse });
      
      // Supprimer le message "Thinking..." si possible
      try {
        await sock.sendMessage(from, {
          delete: thinkingMsg.key
        });
      } catch (deleteError) {
        console.log("Could not delete thinking message");
      }
      
    } catch (error) {
      console.error("AI error:", error);
      await reply("❌ 𝙰𝙸 𝚎𝚛𝚛𝚘𝚛");
    }
  }
};
