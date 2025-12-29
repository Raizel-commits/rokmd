/* protections_commands.js */
import fs from "fs-extra";

const sessionConfigs = new Map();
const defaultConfig = {
  antiLink: false,
  antiSpam: false,
  antiBot: false,
  antiTag: false,
  antiPromote: false,
  antiDemote: false,
  spamHistory: new Map(), // pour suivi anti-spam
  commands: new Map()     // commandes dynamiques par session
};

/* ================== INIT SESSION ================== */
export function initSession(sessionID) {
  if (!sessionConfigs.has(sessionID)) {
    sessionConfigs.set(sessionID, { ...defaultConfig, spamHistory: new Map(), commands: new Map() });
  }
}

/* ================== GET CONFIG ================== */
export function getConfig(sessionID) {
  initSession(sessionID);
  return sessionConfigs.get(sessionID);
}

/* ================== ENABLE / DISABLE ================== */
export function enable(sessionID, protection) {
  const cfg = getConfig(sessionID);
  if (cfg.hasOwnProperty(protection)) cfg[protection] = true;
}

export function disable(sessionID, protection) {
  const cfg = getConfig(sessionID);
  if (cfg.hasOwnProperty(protection)) cfg[protection] = false;
}

/* ================== CHECK LINK ================== */
const regexLink = /(https?:\/\/)?(www\.)?[\w-]+\.\w+\/?\S*/i;
export function containsLink(text) {
  return regexLink.test(text);
}

/* ================== CHECK PROTECTIONS ================== */
export async function checkProtections(sessionID, text, msg, sock) {
  const cfg = getConfig(sessionID);
  const jid = msg.key.remoteJid;

  // antiLink
  if (cfg.antiLink && containsLink(text)) {
    await sock.sendMessage(jid, { text: "⛔ Les liens sont interdits !" });
    return "antiLink";
  }

  // antiSpam
  if (cfg.antiSpam) {
    const sender = msg.key.participant || jid;
    const history = cfg.spamHistory.get(sender) || [];
    history.push(Date.now());
    cfg.spamHistory.set(sender, history.filter(t => t > Date.now() - 5000));
    if (cfg.spamHistory.get(sender).length > 3) {
      await sock.sendMessage(jid, { text: "⛔ Spam détecté !" });
      return "antiSpam";
    }
  }

  // antiBot
  if (cfg.antiBot && msg.key.participant?.endsWith("@bot")) {
    await sock.sendMessage(jid, { text: "⛔ Bots interdits !" });
    return "antiBot";
  }

  // antiTag
  if (cfg.antiTag) {
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentions.length > 3) {
      await sock.sendMessage(jid, { text: "⛔ Mention abusive !" });
      return "antiTag";
    }
  }

  // antiPromote / antiDemote (groupes uniquement)
  if ((cfg.antiPromote || cfg.antiDemote) && msg.message?.groupParticipant) {
    if (cfg.antiPromote && msg.message.groupParticipant.action === "promote") {
      await sock.sendMessage(jid, { text: "⛔ Promotion non autorisée !" });
      return "antiPromote";
    }
    if (cfg.antiDemote && msg.message.groupParticipant.action === "demote") {
      await sock.sendMessage(jid, { text: "⛔ Rétrogradation non autorisée !" });
      return "antiDemote";
    }
  }

  return null;
}

/* ================== COMMANDES ================== */
export async function loadCommands(sessionID, commandsFolder = "./commands") {
  initSession(sessionID);
  const cfg = getConfig(sessionID);

  await fs.ensureDir(commandsFolder);
  const files = fs.readdirSync(commandsFolder).filter(f => f.endsWith(".js"));
  for (const file of files) {
    const modulePath = `${commandsFolder}/${file}?update=${Date.now()}`;
    const cmd = await import(modulePath);
    if (cmd.default?.name && typeof cmd.default.execute === "function") {
      cfg.commands.set(cmd.default.name.toLowerCase(), cmd.default);
    }
  }
}

/* Exécution d’une commande depuis session */
export async function runCommand(sessionID, command, sock, msg, args) {
  const cfg = getConfig(sessionID);
  if (!cfg.commands.has(command)) return false;
  try {
    await cfg.commands.get(command).execute(sock, {
      raw: msg,
      from: msg.key.remoteJid,
      sender: msg.key.participant || msg.key.remoteJid,
      isGroup: msg.key.remoteJid.endsWith("@g.us"),
      reply: (text) => sock.sendMessage(msg.key.remoteJid, { text })
    }, args);
    return true;
  } catch (err) {
    console.error("Erreur commande:", err);
    await sock.sendMessage(msg.key.remoteJid, { text: "❌ Erreur commande" });
    return false;
  }
}

export default {
  initSession,
  getConfig,
  enable,
  disable,
  checkProtections,
  loadCommands,
  runCommand
};
