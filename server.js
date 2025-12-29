import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';

import qrRouter from './qr.js';
import pairRouter from './pair.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir fichiers statiques à la racine
app.use(express.static(__dirname));

// Routes API
app.use('/qr', qrRouter);
app.use('/code', pairRouter);

// Pages HTML
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/pair', (req, res) => res.sendFile(path.join(__dirname, 'pair.html')));
app.get('/qrpage', (req, res) => res.sendFile(path.join(__dirname, 'qr.html')));

// Charger dynamiquement les commandes
const commands = new Map();
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  commands.set(command.default.name, command.default);
}
console.log(`📂 Commands loaded: ${[...commands.keys()].join(', ')}`);

// Lancer serveur
app.listen(PORT, () => {
  console.log(`🚀 RAIZEL-XMD running at http://localhost:${PORT}`);
});
