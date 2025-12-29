import express from "express";
import fs from "fs-extra";
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
import pn from "awesome-phonenumber";
import { setupWelcomeBye } from "./commands/welcomeBye.js";

const router = express.Router();
const PAIRING_DIR = "./lib2/pairing";

async function removeFile(dir) {
    if (await fs.pathExists(dir)) await fs.remove(dir);
}

function formatNumber(num) {
    const phone = pn("+" + num.replace(/\D/g, ""));
    if (!phone.isValid()) throw new Error("❌ Numéro invalide");
    return phone.getNumber("e164").replace("+", "");
}

async function loadCommands() {
    const commands = new Map();
    const files = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
    for (const f of files) {
        const cmd = await import(`./commands/${f}`);
        commands.set(cmd.name, cmd);
    }
    return commands;
}

export async function startPairingSession(number, user, userPrefix) {
    const dir = path.join(PAIRING_DIR, number);
    await fs.ensureDir(dir);

    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys)
        },
        printQRInTerminal: false,
        browser: Browsers.windows("Chrome"),
        markOnlineOnConnect: false
    });

    sock.ev.on("creds.update", saveCreds);
    const commands = await loadCommands();

    const userSettings = {
        prefix: userPrefix || "!",
        autoreact: false,
        autorecording: false,
        autoread: false,
        autotyping: false
    };

    setupWelcomeBye(sock);

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
        const prefixUsed = userSettings.prefix || "!";
        if (text.startsWith(prefixUsed)) {
            const args = text.slice(prefixUsed.length).trim().split(/ +/);
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

        if (userSettings.autoreact) {
            const reactions = ["👍","😂","❤️","😮","😢"];
            const random = reactions[Math.floor(Math.random() * reactions.length)];
            await sock.sendMessage(jid, { react: { text: random, key: msg.key } });
        }
        if (userSettings.autoread) await sock.readMessages([msg.key]);
        if (userSettings.autorecording) {
            await sock.sendPresenceUpdate("recording", jid);
            setTimeout(() => sock.sendPresenceUpdate("available", jid), 5000);
        }
        if (userSettings.autotyping) {
            await sock.sendPresenceUpdate("composing", jid);
            setTimeout(() => sock.sendPresenceUpdate("available", jid), 5000);
        }
    });

    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        if (connection === "close") {
            const status = lastDisconnect?.error?.output?.statusCode;
            if (status === DisconnectReason.loggedOut) {
                await removeFile(dir);
            } else {
                console.log("🔄 Redémarrage session...", number);
                setTimeout(() => startPairingSession(number, user, userPrefix), 2000);
            }
        }
    });

    if (!sock.authState.creds.registered) {
        await delay(1500);
        try {
            const pairingCode = await sock.requestPairingCode(number);
            const formatted = pairingCode?.match(/.{1,4}/g)?.join("-") || pairingCode;
            await fs.writeJSON(path.join(dir, "pairing.json"), { code: formatted, user, prefix: userSettings.prefix }, { spaces: 2 });
            return formatted;
        } catch (err) {
            await removeFile(dir);
            throw new Error("❌ Impossible de générer le pairing code: " + err.message);
        }
    }

    return null;
}

router.get("/code", async (req, res) => {
    let num = req.query.number;
    const user = req.query.user || "bot";
    const prefix = req.query.prefix || "!";

    if (!num) return res.status(400).json({ error: "❌ Numéro requis" });

    try {
        num = formatNumber(num);
        const code = await startPairingSession(num, user, prefix);
        if (code) return res.json({ code });
        else return res.json({ status: "✅ Déjà connecté" });
    } catch (err) {
        console.error("Pairing error:", err);
        exec("pm2 restart qasim"); 
        return res.status(503).json({ error: err.message });
    }
});

export default router;
