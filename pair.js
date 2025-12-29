import express from "express";
import fs from "fs-extra";
import pino from "pino";
import pn from "awesome-phonenumber";
import path from "path";
import { exec } from "child_process";
import {
    makeWASocket,
    useMultiFileAuthState,
    Browsers,
    fetchLatestBaileysVersion,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    delay
} from "@whiskeysockets/baileys";

import { setupWelcomeBye } from "./commands/welcomeBye.js";

const router = express.Router();
const PAIRING_DIR = "./lib2/pairing";

// Supprimer un dossier
async function removeFile(dir) {
    if (await fs.pathExists(dir)) await fs.remove(dir);
}

// Vérifie et formate le numéro
function formatNumber(num) {
    const phone = pn("+" + num.replace(/\D/g, ""));
    if (!phone.isValid()) throw new Error("❌ Numéro invalide");
    return phone.getNumber("e164").replace("+", "");
}

// Charger toutes les commandes
async function loadCommands() {
    const commands = new Map();
    const files = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
    for (const f of files) {
        const cmd = await import(`./commands/${f}`);
        commands.set(cmd.name, cmd);
    }
    return commands;
}

// Crée une session WhatsApp et intègre commandes + welcome/bye
export async function startPairingSession(number) {
    const dir = path.join(PAIRING_DIR, number);
    await fs.ensureDir(dir);

    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
        },
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: Browsers.windows("Chrome"),
        markOnlineOnConnect: false
    });

    sock.ev.on("creds.update", saveCreds);

    // Charger les commandes
    const commands = await loadCommands();

    // Paramètres automatiques par utilisateur
    const userSettings = {
        autoreact: false,
        autorecording: false,
        autoread: false,
        autotyping: false
    };

    // Setup welcome + bye automatique
    setupWelcomeBye(sock);

    // Écouter messages pour commandes et auto-actions
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg || !msg.message) return;

        const jid = msg.key.remoteJid;
        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            "";

        if (!text) return;

        const prefix = "!";
        if (text.startsWith(prefix)) {
            const args = text.slice(prefix.length).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();

            if (commands.has(cmdName)) {
                try {
                    await commands.get(cmdName).execute(sock, msg, args, commands, userSettings);
                } catch (err) {
                    await sock.sendMessage(jid, { text: `❌ Erreur commande: ${err.message}` });
                }
            }
            return;
        }

        // Actions automatiques selon userSettings
        if (userSettings.autoreact) {
            const reactions = ["👍","😂","❤️","😮","😢"];
            const random = reactions[Math.floor(Math.random() * reactions.length)];
            await sock.sendMessage(jid, { react: { text: random, key: msg.key } });
        }

        if (userSettings.autoread) {
            await sock.readMessages([msg.key]);
        }

        if (userSettings.autorecording) {
            await sock.sendPresenceUpdate("recording", jid);
            setTimeout(() => sock.sendPresenceUpdate("available", jid), 5000);
        }

        if (userSettings.autotyping) {
            await sock.sendPresenceUpdate("composing", jid);
            setTimeout(() => sock.sendPresenceUpdate("available", jid), 5000);
        }
    });

    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            const code = qr?.match(/.{1,4}/g)?.join("-");
            await fs.writeJSON(path.join(dir, "pairing.json"), { code }, { spaces: 2 });
        }

        if (connection === "close") {
            const status = lastDisconnect?.error?.output?.statusCode;
            if (status === DisconnectReason.loggedOut) {
                await removeFile(dir);
            } else {
                console.log("🔄 Redémarrage session...", number);
                setTimeout(() => startPairingSession(number), 2000);
            }
        }
    });

    if (!sock.authState.creds.registered) {
        await delay(1500);
        try {
            const pairingCode = await sock.requestPairingCode(number);
            const formatted = pairingCode?.match(/.{1,4}/g)?.join("-") || pairingCode;
            await fs.writeJSON(path.join(dir, "pairing.json"), { code: formatted }, { spaces: 2 });
            return formatted;
        } catch (err) {
            await removeFile(dir);
            throw new Error("❌ Impossible de générer le pairing code: " + err.message);
        }
    }

    return null; // Déjà connecté
}

// Route GET pour générer le pairing
router.get("/", async (req, res) => {
    let num = req.query.number;
    if (!num) return res.status(400).json({ error: "❌ Numéro requis" });

    try {
        num = formatNumber(num);
        const code = await startPairingSession(num);

        if (!code) {
            return res.json({ code: "ALREADY_CONNECTED" });
        }

        return res.json({ code });
    } catch (err) {
        console.error("Pairing error:", err);
        exec("pm2 restart qasim");
        return res.status(503).json({ code: null, error: err.message });
    }
});

export default router;
