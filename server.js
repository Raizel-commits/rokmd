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

// Middleware
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

// Charger dynamiquement les commandes dans /commands
const loadCommands = async () => {
  const commands = new Map();
  const commandFiles = fs.readdirSync(path.join(__dirname, 'commands'))
    .filter(f => f.endsWith('.js'));

  for (const file of commandFiles) {
    const cmd = await import(`./commands/${file}?update=${Date.now()}`);
    if (cmd.default?.name && typeof cmd.default.execute === 'function') {
      commands.set(cmd.default.name.toLowerCase(), cmd.default);
    }
  }
  return commands;
};

// Global commands map
let commands = new Map();
(async () => {
  commands = await loadCommands();
  console.log(`📂 Commands loaded: ${[...commands.keys()].join(', ')}`);
})();

// Reload commands endpoint
app.get('/reload-commands', async (req, res) => {
  try {
    commands = await loadCommands();
    res.json({ status: '✅ Commands reloaded', list: [...commands.keys()] });
    console.log('📂 Commands reloaded');
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: '❌ Error reloading commands', error: err.message });
  }
});

// Lancer serveur
app.listen(PORT, () => {
  console.log(`🚀 RAIZEL-XMD running at http://localhost:${PORT}`);
  console.log(`🌐 Frontend Pairing: http://localhost:${PORT}/pair`);
  console.log(`🌐 Frontend QR: http://localhost:${PORT}/qrpage`);
});
