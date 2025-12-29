export const name = "whois";

export async function execute(sock, msg, args) {
  const from = msg.key.remoteJid;

  try {
    let targetJid;

    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      targetJid = msg.message.extendedTextMessage.contextInfo.participant;
    } else if (args.length) {
      targetJid = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    } else {
      targetJid = msg.key.participant || from;
    }

    const contact = await sock.onWhatsApp(targetJid);
    const profileUrl = await sock.profilePictureUrl(targetJid, "image").catch(() => null);

    const userNumber = contact[0]?.jid?.split("@")[0] || targetJid.split("@")[0];
    const number = targetJid.split("@")[0];

    let whoisText = `🤖 𝚄𝚜𝚎𝚛 𝚒𝚗𝚏𝚘:
🤖 𝚁𝚎𝚐 𝚗𝚞𝚖𝚋𝚎𝚛: +${userNumber}
🤖 𝙹𝙸𝙳: +${number}`;

    if (!profileUrl) {
      whoisText += "\n🤖 𝙽𝚘 𝚙𝚛𝚘𝚏𝚒𝚕𝚎 𝚙𝚒𝚌𝚝𝚞𝚛𝚎.";
      await sock.sendMessage(from, { text: whoisText }, { quoted: msg });
      return;
    }

    await sock.sendMessage(from, {
      image: { url: profileUrl },
      caption: whoisText
    }, { quoted: msg });

  } catch (err) {
    console.error("Whois error:", err);
    await sock.sendMessage(from, { text: "🤖 𝚆𝚑𝚘𝚒𝚜 𝚎𝚛𝚛𝚘𝚛." }, { quoted: msg });
  }
}
