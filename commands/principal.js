export const name = "principal";

export async function execute(sock, msg, args) {
  try {
    const from = msg.key.remoteJid;

    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, { text: "🤖 𝙶𝚛𝚘𝚞𝚙 𝚌𝚘𝚖𝚖𝚊𝚗𝚍 𝚘𝚗𝚕𝚢." });
    }

    const groupMetadata = await sock.groupMetadata(from);
    const creatorId = groupMetadata.owner;

    if (!creatorId) {
      return await sock.sendMessage(from, { text: "🤖 𝙲𝚛𝚎𝚊𝚝𝚘𝚛 𝚞𝚗𝚊𝚟𝚊𝚒𝚕𝚊𝚋𝚕𝚎." });
    }

    await sock.sendMessage(from, {
      text: `🤖 𝙶𝚛𝚘𝚞𝚙 𝚌𝚛𝚎𝚊𝚝𝚘𝚛: @${creatorId.split("@")[0]}`,
      mentions: [creatorId]
    });

  } catch (err) {
    console.error("Principal command error:", err);
    await sock.sendMessage(msg.key.remoteJid, { text: "🤖 𝙲𝚘𝚖𝚖𝚊𝚗𝚍 𝚎𝚛𝚛𝚘𝚛." });
  }
}
