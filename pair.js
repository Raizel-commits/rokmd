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
    delay,
    makeCacheableSignalKeyStore
} from "@whiskeysockets/baileys";

const router = express.Router();
const PAIRING_DIR = "./lib2/pairing";

/* ================== UTILS ================== */
function formatNumber(num) {
    const phone = pn("+" + num.replace(/\D/g, ""));
    if (!phone.isValid()) throw new Error("Numéro invalide");
    return phone.getNumber("e164").replace("+", "");
}

async function removeSession(dir) {
    if (await fs.pathExists(dir)) await fs.remove(dir);
}

async function loadCommands() {
    const commands = new Map();
    const files = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));

    for (const file of files) {
        const modulePath = `./commands/${file}?update=${Date.now()}`;
        const command = await import(modulePath);
        if (command.default?.name && typeof command.default.execute === "function") {
            commands.set(command.default.name.toLowerCase(), command.default);
        }
    }
    return commands;
}

/* ============ SERIALIZE (SENKU CORE) ============ */
function serializeMessage(sock, msg) {
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");

    const sender = isGroup
        ? msg.key.participant
        : from;

    const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        "";

    return {
        raw: msg,
        from,
        sender,
        isGroup,
        text,
        fromMe: msg.key.fromMe,
        reply: (text) => sock.sendMessage(from, { text })
    };
}

/* ================== PAIRING ================== */
async function startPairingSession(number) {
    const SESSION_DIR = path.join(PAIRING_DIR, number);
    await fs.ensureDir(SESSION_DIR);

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
        },
        logger: pino({ level: "silent" }),
        browser: Browsers.windows("Chrome"),
        printQRInTerminal: false,
        markOnlineOnConnect: false
    });

    sock.ev.on("creds.update", saveCreds);

    let commands = await loadCommands();

    /* ============ MESSAGE HANDLER ============ */
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg || !msg.message) return;

        const m = serializeMessage(sock, msg);

        if (!m.text || !m.text.startsWith("!")) return;

        const args = m.text.slice(1).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();

        // 🔐 OWNER ONLY (comme Senku)
        const owner = sock.user.id;
        if (m.sender !== owner) return;

        // Reload commandes
        if (cmdName === "reload") {
            commands = await loadCommands();
            return m.reply("✅ Commandes rechargées");
        }

        if (commands.has(cmdName)) {
            try {
                await commands.get(cmdName).execute(sock, m, args, commands);
            } catch (err) {
                console.error("Erreur commande:", err);
                m.reply("❌ Erreur commande");
            }
        }
    });

    /* ============ CONNECTION HANDLER ============ */
    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            const formatted = qr.match(/.{1,4}/g)?.join("-");
            await fs.writeJSON(
                path.join(SESSION_DIR, "pairing.json"),
                { code: formatted },
                { spaces: 2 }
            );
        }

        if (connection === "close") {
            const status = lastDisconnect?.error?.output?.statusCode;
            if (status === DisconnectReason.loggedOut) {
                await removeSession(SESSION_DIR);
            } else {
                setTimeout(() => startPairingSession(number), 2000);
            }
        }
    });

    /* ============ PAIRING CODE ============ */
    if (!sock.authState.creds.registered) {
        await delay(1500);
        try {
            const pairingCode = await sock.requestPairingCode(number);
            const formatted = pairingCode?.match(/.{1,4}/g)?.join("-");
            await fs.writeJSON(
                path.join(SESSION_DIR, "pairing.json"),
                { code: formatted },
                { spaces: 2 }
            );
            return formatted;
        } catch (err) {
            await removeSession(SESSION_DIR);
            throw new Error("Impossible de générer le pairing code");
        }
    }

    return null;
}

/* ================== ROUTE API ================== */
router.get("/", async (req, res) => {
    let num = req.query.number;
    if (!num) return res.status(400).json({ error: "Numéro requis" });

    try {
        num = formatNumber(num);
        const code = await startPairingSession(num);

        if (code) return res.json({ code });
        return res.json({ status: "Déjà connecté" });
    } catch (err) {
        console.error("Pairing error:", err.message);
        exec("pm2 restart qasim");
        return res.status(503).json({ error: err.message });
    }
});

export default router;
