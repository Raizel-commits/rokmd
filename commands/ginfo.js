export default {
  name: "ginfo",
  description: "ℹ️ Get group info (profile pic & description)",
  
  async execute(sock, message, args) {
    const { from, reply, isGroup } = message;

    if (!isGroup) return await reply("❌ This command works only in groups");

    try {
      // Récupérer les métadonnées du groupe
      const group = await sock.groupMetadata(from);

      // Description
      const desc = group.desc || "❌ No description set";

      // Photo de profil
      let ppUrl;
      try {
        ppUrl = await sock.profilePictureUrl(from, "image");
      } catch {
        ppUrl = null; // Pas de photo
      }

      let text = `ℹ️ 𝙂𝚛𝚘𝚞𝚙 Info\n\n📄 𝙳𝚎𝚜𝚌𝚛𝚒𝚙𝚝𝚒𝚘𝚗: ${desc}\n👥 𝙿𝚊𝚛𝚝𝚒𝚌𝚒𝚙𝚊𝚗𝚝𝚜: ${group.participants.length}`;

      // Envoyer avec photo si elle existe
      if (ppUrl) {
        await sock.sendMessage(from, { image: { url: ppUrl }, caption: text });
      } else {
        await reply(text);
      }

    } catch (e) {
      console.error("Group info error:", e);
      await reply("❌ Cannot fetch group info");
    }
  }
};