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
const WHITELIST_FILE = "./lib2/whitelist.json";

/* ================= UTILS ================= */

function formatNumber(num) {
    const phone = pn("+" + num.replace(/\D/g, ""));
    if (!phone.isValid()) throw new Error("Numéro invalide");
    return phone.getNumber("e164").replace("+", "");
}

async function getWhitelist() {
    if (!(await fs.pathExists(WHITELIST_FILE))) {
        await fs.writeJSON(WHITELIST_FILE, { allowed: [] }, { spaces: 2 });
    }
    const data = await fs.readJSON(WHITELIST_FILE);
    return data.allowed || [];
}

async function removeSession(dir) {
    if (await fs.pathExists(dir)) await fs.remove(dir);
}

/* ================= PAIRING ================= */

async function startPairingSession(number) {

    const whitelist = await getWhitelist();

    // 🔒 VERROU PRIVÉ
    if (!whitelist.includes(number)) {
        throw new Error("Accès refusé : bot privé");
    }

    const SESSION_DIR = path.join(PAIRING_DIR, number);
    await fs.ensureDir(SESSION_DIR);

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(
                state.keys,
                pino({ level: "fatal" })
            )
        },
        logger: pino({ level: "silent" }),
        browser: Browsers.windows("Chrome"),
        printQRInTerminal: false,
        markOnlineOnConnect: false
    });

    sock.ev.on("creds.update", saveCreds);

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

/* ================= ROUTE ================= */

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
        return res.status(403).json({ error: err.message });
    }
});

export default router;
