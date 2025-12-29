import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import QRCode from 'qrcode';
import pino from 'pino';
import pn from 'awesome-phonenumber';
import { exec } from 'child_process';
import {
  makeWASocket,
  useMultiFileAuthState,
  Browsers,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
} from '@whiskeysockets/baileys';

const router = express.Router();
const PAIRING_DIR = './sessions';
const COMMANDS_DIR = './commands';

// Objet global pour suivre toutes les sessions actives
const sessionsActives = {};

/* ================== UTILS ================== */
function formatNumber(num) {
  const phone = pn('+' + num.replace(/\D/g, ''));
  if (!phone.isValid()) throw new Error('Numéro invalide');
  return phone.getNumber('e164').replace('+', '');
}

const jidClean = (jid = '') => jid.split(':')[0];

async function removeDir(dir) {
  if (await fs.pathExists(dir)) await fs.remove(dir);
}

/* ================== COMMANDS ================== */
async function loadCommands() {
  const commands = new Map();
  await fs.ensureDir(COMMANDS_DIR);
  const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const modulePath = `${COMMANDS_DIR}/${file}?update=${Date.now()}`;
    const cmd = await import(modulePath);
    if (cmd.default?.name && typeof cmd.default.execute === 'function') {
      commands.set(cmd.default.name.toLowerCase(), cmd.default);
    }
  }
  return commands;
}

/* ================== GET LID ================== */
function getLid(number, sock) {
  try {
    const data = JSON.parse(fs.readFileSync(`${PAIRING_DIR}/${number}/creds.json`, 'utf8'));
    return data?.me?.lid || sock.user?.lid || '';
  } catch {
    return sock.user?.lid || '';
  }
}

/* ================== PAIRING ROUTE ================== */
router.get('/', async (req, res) => {
  let num = req.query.number;
  if (!num) return res.status(400).json({ error: 'Numéro requis' });

  try {
    num = formatNumber(num);

    // Vérifie si une session existe déjà pour ce numéro
    if (sessionsActives[num]) {
      return res.json({ status: 'Déjà connecté' });
    }

    const SESSION_DIR = path.join(PAIRING_DIR, num);
    await fs.ensureDir(SESSION_DIR);

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      browser: Browsers.windows('Chrome'),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
      },
      markOnlineOnConnect: false,
      printQRInTerminal: false,
    });

    sock.ev.on('creds.update', saveCreds);

    let commands = await loadCommands();

    // Stocke la session active
    sessionsActives[num] = { sock, commands };

    /* ================== MESSAGE HANDLER ================== */
    sock.ev.on('messages.upsert', async ({ messages }) => {
      const msg = messages[0];
      if (!msg || !msg.message) return;

      const remoteJid = msg.key.remoteJid;
      const participant = msg.key.participant || remoteJid;
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        '';

      if (!text || !text.startsWith('!')) return;

      const ownerClean = jidClean(sock.user.id);
      const senderClean = jidClean(participant);
      const lidRaw = getLid(num, sock);
      const lid = lidRaw ? jidClean(lidRaw) + '@lid' : null;

      // Autorisation : uniquement le propriétaire ou lid de cette session
      const allowed =
        msg.key.fromMe ||
        senderClean === ownerClean ||
        participant === lid ||
        remoteJid === lid;

      if (!allowed) return;

      const args = text.slice(1).trim().split(/\s+/);
      const command = args.shift().toLowerCase();

      // Reload des commandes
      if (command === 'reload') {
        commands = await loadCommands();
        sessionsActives[num].commands = commands;
        return sock.sendMessage(remoteJid, { text: '✅ Commandes rechargées' });
      }

      // Exécution commande
      if (commands.has(command)) {
        try {
          await commands.get(command).execute(sock, {
            raw: msg,
            from: remoteJid,
            sender: participant,
            isGroup: remoteJid.endsWith('@g.us'),
            reply: (t) => sock.sendMessage(remoteJid, { text: t }),
          }, args);
        } catch (err) {
          console.error('Erreur commande:', err);
          sock.sendMessage(remoteJid, { text: '❌ Erreur commande' });
        }
      }
    });

    /* ================== CONNECTION ================== */
    sock.ev.on('connection.update', async ({ connection, qr, lastDisconnect }) => {
      if (qr) {
        const qrDataURL = await QRCode.toDataURL(qr);
        return res.json({ qr: qrDataURL });
      }

      if (connection === 'close') {
        const status = lastDisconnect?.error?.output?.statusCode;
        // Supprime la session si déconnecté
        if (status === DisconnectReason.loggedOut) {
          delete sessionsActives[num];
          await removeDir(SESSION_DIR);
        } else {
          setTimeout(() => router.get(req, res), 2000);
        }
      }
    });

  } catch (e) {
    console.error('Pairing error:', e.message);
    return res.status(503).json({ error: 'Service indisponible' });
  }
});

export default router;
