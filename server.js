import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

/* ===== USERS FILE ===== */
const usersFile = path.join(__dirname, "users.json");
if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([]));
}

/* ===== MIDDLEWARE ===== */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: "SECRETSTORY_N_AUTH",
    resave: false,
    saveUninitialized: false
}));

/* ===== AUTH MIDDLEWARE ===== */
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    next();
}

/* ===== ROUTES ===== */
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "register.html"));
});

/* ===== REGISTER ===== */
app.post("/register", (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(usersFile));

    if (!username || !password) {
        return res.send("Champs manquants");
    }

    if (users.find(u => u.username === username)) {
        return res.send("Utilisateur déjà existant");
    }

    users.push({ username, password });
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

    res.redirect("/login");
});

/* ===== LOGIN ===== */
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(usersFile));

    const user = users.find(
        u => u.username === username && u.password === password
    );

    if (!user) {
        return res.send("Identifiants incorrects");
    }

    req.session.user = user;
    res.redirect("/");
});

/* ===== LOGOUT ===== */
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

/* ===== PROTECTED PAGES ===== */
app.get("/", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/pair", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "pair.html"));
});

app.get("/qr", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "qr.html"));
});

/* ===== SERVER ===== */
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
