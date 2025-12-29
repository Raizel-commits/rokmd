import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs-extra';

import pairRouter from './pair.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Dossier pour les bots
const PAIRING_DIR = "./lib2/pairing";

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // tout à la racine

// Routes API
app.use('/code', pairRouter);

// Pages HTML
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/pair', (req, res) => res.sendFile(path.join(__dirname, 'pair.html')));

// Route pour lister tous les bots connectés
app.get('/list-bots', async (req, res) => {
  try{
    const bots = [];
    if(await fs.pathExists(PAIRING_DIR)){
      const folders = await fs.readdir(PAIRING_DIR);
      for(const f of folders){
        const jsonPath = `${PAIRING_DIR}/${f}/pairing.json`;
        if(await fs.pathExists(jsonPath)){
          const data = await fs.readJSON(jsonPath);
          bots.push({
            number: f,
            user: data.user || "bot",
            prefix: data.prefix || "!",
            code: data.code || null
          });
        }
      }
    }
    res.json({ bots });
  }catch(err){
    res.status(500).json({ error: err.message });
  }
});

// Démarrage serveur
app.listen(PORT, () => {
  console.log(`🚀 RAIZEL-XMD actif sur http://localhost:${PORT}`);
});
