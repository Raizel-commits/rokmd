export const name = "tagall";

export async function execute(sock, msg, args) {
  try {
    const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
    const participants = groupMetadata.participants || [];
    const mentions = participants.map(p => p.id);

    const decoratedMentions = participants
      .map(p => `> 👾 @${p.id.split("@")[0]}`)
      .join("\n");

    const text = `> 𝚁𝙾𝙺-𝚇𝙳 

${decoratedMentions}

> ROK`;

    await sock.sendMessage(msg.key.remoteJid, {
      text: text,
      mentions
    }, { quoted: msg });

  } catch (err) {
    console.error("Tagall error:", err);
    await sock.sendMessage(msg.key.remoteJid, {
      text: "🤖 𝚃𝚊𝚐𝚊𝚕𝚕 𝚎𝚛𝚛𝚘𝚛."
    }, { quoted: msg });
  }
};
