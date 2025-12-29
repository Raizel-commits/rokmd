import os from "os";

export const name = "infos";
export const description = "Display bot and system information";

export async function execute(sock, msg) {
    const jid = msg.key.remoteJid;
    
    try {
        // Bot number
        const botNumber = sock.user?.id?.split(':')[0] || 'Unknown';
        
        // Uptime
        const uptime = process.uptime();
        const h = Math.floor(uptime / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        const s = Math.floor(uptime % 60);
        const uptimeStr = `${h}h ${m}m ${s}s`;
        
        // Memory
        const usedMemMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
        const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        
        // Platform
        const platform = `${os.platform()} ${os.release()}`;
        
        // Latency
        const start = Date.now();
        await sock.sendMessage(jid, { text: "Testing..." });
        const latency = Date.now() - start;
        
        const infoText = `🔰 *𝙱𝙾𝚃 𝙸𝙽𝙵𝙾*\n\n` +
                         `📱 𝙽𝚞𝚖𝚋𝚎𝚛: ${botNumber}\n` +
                         `⏱️ 𝚄𝚙𝚝𝚒𝚖𝚎: ${uptimeStr}\n` +
                         `🫩 𝙻𝚊𝚝𝚎𝚗𝚌𝚢: ${latency} ms\n` +
                         `💾 𝙼𝚎𝚖𝚘𝚛𝚢: ${usedMemMB} MB / ${totalMemGB} GB\n` +
                         `💻 𝙿𝚕𝚊𝚝𝚏𝚘𝚛𝚖: ${platform}`;
        
        await sock.sendMessage(jid, { text: infoText });
        
    } catch (error) {
        await sock.sendMessage(jid, {
            text: "𝙴𝚛𝚛𝚘𝚛 𝚐𝚎𝚝𝚝𝚒𝚗𝚐 𝚋𝚘𝚝 𝚒𝚗𝚏𝚘."
        });
    }
}
