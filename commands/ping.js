export const name = "ping";
export const description = "Test bot latency";

export async function execute(sock, msg) {
    const jid = msg.key.remoteJid;
    
    const start = Date.now();
    await sock.sendMessage(jid, { text: "🏓 Testing..." });
    const latency = Date.now() - start;
    
    let indicator;
    let status;
    
    if (latency <= 100) {
        indicator = "🟢";
        status = "Excellent";
    } else if (latency <= 300) {
        indicator = "🟡";
        status = "Good";
    } else if (latency <= 800) {
        indicator = "🟠";
        status = "Average";
    } else {
        indicator = "🔴";
        status = "Poor latency";
    }
    
    await sock.sendMessage(jid, {
        text: `${indicator} *Pong*\n⚡ Latency: *${latency} ms*\n📶 Status: *${status}*`
    });
}
