import express from "express";
import fs from "fs-extra";
import pino from "pino";
import pn from "awesome-phonenumber";
import path from "path";
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
const PAIRING_DIR = "./sessions";

/* ================== UTILS ================== */
function formatNumber(num) {
    const phone = pn("+" + num.replace(/\D/g, ""));
    if (!phone.isValid()) throw new Error("Numéro invalide");
    return phone.getNumber("e164").replace("+", "");
}

const jidClean = (jid = "") => jid.split(":")[0];

async function removeSession(dir) {
    if (await fs.pathExists(dir)) await fs.remove(dir);
}

/* ================== LOAD COMMANDS ================== */
async function loadCommands() {
    const commands = new Map();
    const files = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));

    for (const file of files) {
        const modulePath = `../commands/${file}?update=${Date.now()}`;
        const cmd = await import(modulePath);

        if (cmd.default?.name && typeof cmd.default.execute === "function") {
            commands.set(cmd.default.name.toLowerCase(), cmd.default);
        }
    }
    return commands;
}

/* ================== GET LID (SENKU KEY) ================== */
function getLid(number, sock) {
    try {
        const data = JSON.parse(
            fs.readFileSync(`${PAIRING_DIR}/${number}/creds.json`, "utf8")
        );
        return data?.me?.lid || sock.user?.lid || "";
    } catch {
        return sock.user?.lid || "";
    }
}

/* ================== START SESSION ================== */
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

    /* ================== MESSAGE HANDLER ================== */
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg || !msg.message) return;

        const remoteJid = msg.key.remoteJid;
        const participant = msg.key.participant || remoteJid;

        const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            "";

        if (!text || !text.startsWith("!")) return;

        const number = jidClean(sock.user.id);
        const lidRaw = getLid(number, sock);
        const lid = lidRaw ? jidClean(lidRaw) + "@lid" : null;

        const senderClean = jidClean(participant);
        const ownerClean = jidClean(sock.user.id);

        /* ===== AUTORISATION (SENKU STYLE) ===== */
        const allowed =
            msg.key.fromMe ||
            senderClean === ownerClean ||
            participant === lid ||
            remoteJid === lid;

        if (!allowed) return;

        const args = text.slice(1).trim().split(/\s+/);
        const command = args.shift().toLowerCase();

        /* ===== RELOAD ===== */
        if (command === "reload") {
            commands = await loadCommands();
            return sock.sendMessage(remoteJid, { text: "✅ Commandes rechargées" });
        }

        /* ===== EXEC COMMAND ===== */
        if (commands.has(command)) {
            try {
                await commands.get(command).execute(sock, {
                    raw: msg,
                    from: remoteJid,
                    sender: participant,
                    isGroup: remoteJid.endsWith("@g.us"),
                    reply: (t) => sock.sendMessage(remoteJid, { text: t })
                }, args);
            } catch (err) {
                console.error("Erreur commande:", err);
                sock.sendMessage(remoteJid, { text: "❌ Erreur commande" });
            }
        }
    });

    /* ================== CONNECTION ================== */
    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        if (connection === "close") {
            const status = lastDisconnect?.error?.output?.statusCode;
            if (status === DisconnectReason.loggedOut) {
                await removeSession(SESSION_DIR);
            } else {
                setTimeout(() => startPairingSession(number), 2000);
            }
        }
    });

    /* ================== PAIRING CODE ================== */
    if (!sock.authState.creds.registered) {
        await delay(1500);
        const code = await sock.requestPairingCode(number);
        return code.match(/.{1,4}/g).join("-");
    }

    return null;
}

/* ================== API ROUTE ================== */
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
        return res.status(500).json({ error: err.message });
    }
});

export default router;
