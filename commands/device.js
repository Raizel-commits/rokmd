import { getDevice } from "@whiskeysockets/baileys";

export default {
  name: "device",
  description: "𝙳𝚎𝚝𝚎𝚌𝚝 𝚍𝚎𝚟𝚒𝚌𝚎 𝚞𝚜𝚎𝚍 𝚏𝚘𝚛 𝚊 𝚖𝚎𝚜𝚜𝚊𝚐𝚎",
  
  async execute(sock, message) {
    const { from, reply, quoted, sender } = message;
    
    if (!quoted) {
      await reply("📱 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊 𝚖𝚎𝚜𝚜𝚊𝚐𝚎 𝚝𝚘 𝚍𝚎𝚝𝚎𝚌𝚝 𝚍𝚎𝚟𝚒𝚌𝚎");
      return;
    }
    
    try {
      // Utiliser getDevice pour détecter l'appareil
      const device = getDevice(quoted.id);
      
      // Formater la réponse
      let response = `📱 *𝙳𝚎𝚟𝚒𝚌𝚎 𝙳𝚎𝚝𝚎𝚌𝚝𝚒𝚘𝚗*\n\n`;
      
      if (device) {
        response += `• 𝙿𝚕𝚊𝚝𝚏𝚘𝚛𝚖: ${device}\n`;
        
        // Ajouter des emojis basés sur la plateforme
        const platform = device.toLowerCase();
        if (platform.includes('android')) {
          response += `• 𝙸𝚌𝚘𝚗: 🤖\n`;
          response += `• 𝙽𝚘𝚝𝚎: 𝙰𝚗𝚍𝚛𝚘𝚒𝚍 𝚍𝚎𝚟𝚒𝚌𝚎\n`;
        } else if (platform.includes('ios') || platform.includes('iphone')) {
          response += `• 𝙸𝚌𝚘𝚗: 🍏\n`;
          response += `• 𝙽𝚘𝚝𝚎: 𝚒𝙾𝚂 𝚍𝚎𝚟𝚒𝚌𝚎\n`;
        } else if (platform.includes('web')) {
          response += `• 𝙸𝚌𝚘𝚗: 🌐\n`;
          response += `• 𝙽𝚘𝚝𝚎: 𝚆𝚎𝚋 𝙱𝚛𝚘𝚠𝚜𝚎𝚛\n`;
        } else if (platform.includes('desktop')) {
          response += `• 𝙸𝚌𝚘𝚗: 💻\n`;
          response += `• 𝙽𝚘𝚝𝚎: 𝙳𝚎𝚜𝚔𝚝𝚘𝚙 𝙰𝚙𝚙\n`;
        } else {
          response += `• 𝙸𝚌𝚘𝚗: 📱\n`;
          response += `• 𝙽𝚘𝚝𝚎: 𝙾𝚝𝚑𝚎𝚛 𝚍𝚎𝚟𝚒𝚌𝚎\n`;
        }
      } else {
        response += `• 𝙿𝚕𝚊𝚝𝚏𝚘𝚛𝚖: 𝚄𝚗𝚔𝚗𝚘𝚠𝚗\n`;
        response += `• 𝙸𝚌𝚘𝚗: ❓\n`;
        response += `• 𝙽𝚘𝚝𝚎: 𝙲𝚘𝚞𝚕𝚍 𝚗𝚘𝚝 𝚍𝚎𝚝𝚎𝚛𝚖𝚒𝚗𝚎\n`;
      }
      
      response += `\n👤 𝚁𝚎𝚚𝚞𝚎𝚜𝚝𝚎𝚍 𝚋𝚢: ${sender}`;
      
      await sock.sendMessage(from, { text: response });
      
    } catch (error) {
      console.error("Device command error:", error);
      await reply("❌ 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚍𝚎𝚝𝚎𝚌𝚝 𝚍𝚎𝚟𝚒𝚌𝚎");
    }
  }
};
