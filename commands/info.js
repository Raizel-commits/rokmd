import os from "os";

export default {
  name: "infos",
  description: "𝙳𝚒𝚜𝚙𝚕𝚊𝚢 𝚋𝚘𝚝 𝚊𝚗𝚍 𝚜𝚢𝚜𝚝𝚎𝚖 𝚒𝚗𝚏𝚘𝚛𝚖𝚊𝚝𝚒𝚘𝚗",
  aliases: ["info", "status", "botinfo"],
  
  async execute(sock, message) {
    const { from, reply, sender } = message;
    
    try {
      // Envoyer un message de test pour mesurer la latence
      const testStart = Date.now();
      const testMsg = await reply("📊 𝙲𝚊𝚕𝚌𝚞𝚕𝚊𝚝𝚒𝚗𝚐 𝚒𝚗𝚏𝚘𝚛𝚖𝚊𝚝𝚒𝚘𝚗...");
      const latency = Date.now() - testStart;
      
      // Informations du bot
      const botNumber = sock.user?.id?.split(':')[0] || '𝚄𝚗𝚔𝚗𝚘𝚠𝚗';
      const botJid = sock.user?.id || '𝚄𝚗𝚔𝚗𝚘𝚠𝚗';
      
      // Uptime
      const uptime = process.uptime();
      const days = Math.floor(uptime / (3600 * 24));
      const hours = Math.floor((uptime % (3600 * 24)) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      
      let uptimeStr = "";
      if (days > 0) uptimeStr += `${days}𝚍 `;
      if (hours > 0) uptimeStr += `${hours}𝚑 `;
      if (minutes > 0) uptimeStr += `${minutes}𝚖 `;
      uptimeStr += `${seconds}𝚜`;
      
      // Mémoire
      const memUsage = process.memoryUsage();
      const usedMemMB = (memUsage.rss / 1024 / 1024).toFixed(2);
      const heapUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
      const heapTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
      const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
      const freeMemGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
      const memUsagePercent = ((memUsage.rss / os.totalmem()) * 100).toFixed(2);
      
      // Plateforme système
      const platform = os.platform();
      const release = os.release();
      const arch = os.arch();
      const cpus = os.cpus();
      const cpuModel = cpus[0]?.model || '𝚄𝚗𝚔𝚗𝚘𝚠𝚗';
      const cpuCores = cpus.length;
      
      // Version Node.js
      const nodeVersion = process.version;
      const v8Version = process.versions.v8;
      
      // Construire le message d'information
      const infoText = `🤖 *𝙱𝙾𝚃 𝙸𝙽𝙵𝙾𝚁𝙼𝙰𝚃𝙸𝙾𝙽𝚂*\n\n` +
                      `• 📱 *𝙱𝚘𝚝 𝙽𝚞𝚖𝚋𝚎𝚛:* ${botNumber}\n` +
                      `• 🆔 *𝙱𝚘𝚝 𝙹𝙸𝙳:* ${botJid}\n` +
                      `• ⏱️ *𝚄𝚙𝚝𝚒𝚖𝚎:* ${uptimeStr}\n` +
                      `• 📶 *𝙻𝚊𝚝𝚎𝚗𝚌𝚢:* ${latency}𝚖𝚜\n\n` +
                      `💾 *𝙼𝙴𝙼𝙾𝚁𝚈 𝚄𝚂𝙰𝙶𝙴*\n` +
                      `• 📊 𝚄𝚜𝚎𝚍: ${usedMemMB}𝙼𝙱 (${memUsagePercent}%)\n` +
                      `• 🗂️ 𝙷𝚎𝚊𝚙: ${heapUsedMB}𝙼𝙱 / ${heapTotalMB}𝙼𝙱\n` +
                      `• 💽 𝚃𝚘𝚝𝚊𝚕: ${totalMemGB}𝙶𝙱\n` +
                      `• 🆓 𝙵𝚛𝚎𝚎: ${freeMemGB}𝙶𝙱\n\n` +
                      `💻 *𝚂𝚈𝚂𝚃𝙴𝙼*\n` +
                      `• 🖥️ 𝙿𝚕𝚊𝚝𝚏𝚘𝚛𝚖: ${platform} ${release}\n` +
                      `• ⚙️ 𝙰𝚛𝚌𝚑: ${arch}\n` +
                      `• 🧠 𝙲𝙿𝚄: ${cpuModel}\n` +
                      `• 🔢 𝙲𝚘𝚛𝚎𝚜: ${cpuCores}\n\n` +
                      `🛠️ *𝚂𝙾𝙵𝚃𝚆𝙰𝚁𝙴*\n` +
                      `• 📦 𝙽𝚘𝚍𝚎.𝚓𝚜: ${nodeVersion}\n` +
                      `• 🚀 𝚅𝟾: ${v8Version}\n\n` +
                      `👤 *𝚁𝚎𝚚𝚞𝚎𝚜𝚝𝚎𝚍 𝚋𝚢:* ${sender}`;
      
      // Supprimer le message de test
      try {
        await sock.sendMessage(from, { delete: testMsg.key });
      } catch (deleteError) {
        // Ignorer si on ne peut pas supprimer
      }
      
      // Envoyer les informations
      await sock.sendMessage(from, { text: infoText });
      
    } catch (error) {
      console.error("Info command error:", error);
      await reply("❌ 𝙴𝚛𝚛𝚘𝚛 𝚐𝚎𝚝𝚝𝚒𝚗𝚐 𝚋𝚘𝚝 𝚒𝚗𝚏𝚘");
    }
  }
};
