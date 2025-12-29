export const name = "promote";

export async function execute(sock, msg, args) {
  try {
    const from = msg.key.remoteJid;
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const target = mentioned?.[0] || quoted;

    if (!target) {
      return await sock.sendMessage(from, {
        text: "🤖 𝙼𝚎𝚗𝚝𝚒𝚘𝚗 𝚘𝚛 𝚛𝚎𝚙𝚕𝚢 𝚝𝚘 𝚞𝚜𝚎𝚛."
      }, { quoted: msg });
    }

    await sock.groupParticipantsUpdate(from, [target], "promote");

    await sock.sendMessage(from, {
      text: `🤖 𝙰𝚍𝚖𝚒𝚗: @${target.split("@")[0]}`,
      mentions: [target]
    });

  } catch (err) {
    console.error("Promote error:", err);
    await sock.sendMessage(msg.key.remoteJid, {
      text: "🤖 𝙲𝚘𝚖𝚖𝚊𝚗𝚍 𝚎𝚛𝚛𝚘𝚛."
    }, { quoted: msg });
  }
}
