export const name = "tag";

export async function execute(sock, msg, args) {
  const from = msg.key.remoteJid;

  if (!from.endsWith("@g.us")) {
    return await sock.sendMessage(from, { 
      text: "🤖 𝙶𝚛𝚘𝚞𝚙 𝚌𝚘𝚖𝚖𝚊𝚗𝚍 𝚘𝚗𝚕𝚢." 
    }, { quoted: msg });
  }

  try {
    const groupMetadata = await sock.groupMetadata(from);
    const participants = groupMetadata.participants;

    let message;
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (quotedMsg) {
      message =
        quotedMsg.conversation ||
        quotedMsg.extendedTextMessage?.text ||
        quotedMsg.imageMessage?.caption ||
        quotedMsg.videoMessage?.caption ||
        "🤖 𝙷𝚎𝚕𝚕𝚘";
    } else if (args.length) {
      message = args.join(" ");
    } else {
      message = "🤖 𝙷𝚎𝚕𝚕𝚘";
    }

    await sock.sendMessage(
      from,
      {
        text: message,
        mentions: participants.map(p => p.id)
      },
      { quoted: msg }
    );

  } catch (e) {
    console.error("Tag error:", e);
    await sock.sendMessage(from, { 
      text: "🤖 𝚃𝚊𝚐 𝚎𝚛𝚛𝚘𝚛." 
    }, { quoted: msg });
  }
}
