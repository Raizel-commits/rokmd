import { downloadContentFromMessage } from "@whiskeysockets/baileys";

export const name = "setpp";

export async function execute(sock, msg, args) {
  const from = msg.key.remoteJid;
  const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;

  if (!ctxInfo || !ctxInfo.quotedMessage?.imageMessage) {
    return await sock.sendMessage(from, {
      text: "🤖 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊𝚗 𝚒𝚖𝚊𝚐𝚎."
    }, { quoted: msg });
  }

  try {
    const quoted = ctxInfo.quotedMessage.imageMessage;
    const stream = await downloadContentFromMessage(quoted, "image");
    let buffer = Buffer.from([]);

    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    await sock.updateProfilePicture(sock.user.id, buffer);

    await sock.sendMessage(from, {
      text: "🤖 𝙿𝚛𝚘𝚏𝚒𝚕𝚎 𝚙𝚒𝚌 𝚞𝚙𝚍𝚊𝚝𝚎𝚍."
    }, { quoted: msg });

  } catch (err) {
    console.error("Setpp error:", err);
    await sock.sendMessage(from, {
      text: "🤖 𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚞𝚙𝚍𝚊𝚝𝚎."
    }, { quoted: msg });
  }
}
