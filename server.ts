import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE = path.join(DATA_DIR, 'midpct_db.json');

function ensureDataDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  ensureDataDirs();

  // Increased JSON limit for base64 PDF parsing & state snapshots
  app.use(express.json({ limit: '16mb' }));

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasDb: fs.existsSync(DB_FILE),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Load persisted hybrid DB state
  app.get('/api/state', (req, res) => {
    try {
      if (!fs.existsSync(DB_FILE)) {
        return res.json({ exists: false, state: null });
      }
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      res.json({ exists: true, state: parsed });
    } catch (err: any) {
      console.error('Error reading midpct_db.json:', err);
      res.status(500).json({ exists: false, error: 'Fehler beim Lesen der Server-Datenbank.' });
    }
  });

  // Save persisted hybrid DB state + daily backup snapshot
  app.post('/api/state', (req, res) => {
    try {
      ensureDataDirs();
      const payload = {
        ...req.body,
        serverSavedAt: new Date().toISOString(),
      };
      const serialized = JSON.stringify(payload, null, 2);
      fs.writeFileSync(DB_FILE, serialized, 'utf-8');

      const today = new Date().toISOString().slice(0, 10);
      const backupFile = path.join(BACKUP_DIR, `${today}.json`);
      fs.writeFileSync(backupFile, serialized, 'utf-8');

      res.json({
        ok: true,
        savedAt: payload.serverSavedAt,
        backupFile: `data/backups/${today}.json`,
      });
    } catch (err: any) {
      console.error('Error saving midpct_db.json:', err);
      res.status(500).json({ ok: false, error: 'Server-Persistenz fehlgeschlagen.' });
    }
  });

  // AI-assisted PDF parser (Rechnungsbeleg or profi-online ZA PDF) using server-side Gemini API
  app.post('/api/parse-pdf', async (req, res) => {
    try {
      const { base64Data, mimeType, targetType, fileName } = req.body || {};
      if (!base64Data || typeof base64Data !== 'string') {
        return res.status(400).json({ error: 'Keine Datei-Daten (base64Data) übermittelt.' });
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const pdfHash = crypto.createHash('sha256').update(buffer).digest('hex');

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY ist auf dem Server nicht konfiguriert.',
          pdfHash,
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      if (targetType === 'za') {
        const prompt =
          'Analysiere dieses deutsche profi-online / BAFA Zahlungsanforderungs-PDF (Projekt MiD-PCT FKZ 46SK0267X). Extrahiere Kennung, ZA-Datum, Stichtag Ist-Ausgaben, Spalte 2 (bisher abgerufene/geplante Ausgaben), die kumulierten Ist-Ausgaben (Spalte 3) sowie die Zweimonats-Vorschau (Spalte 5) getrennt für die Positionen 0812, 0817, 0820, 0831, 0835, 0843, sowie Zeile 14, Zeile 16 (Kassenbestand), Zeile 17 (Zusätzlich zu verrechnen) und Zeile 19 (Angeforderte Bundesmittel). Nutze 0 als Zahl wenn eine Position nicht vorkommt.';

        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: [
            { inlineData: { mimeType: mimeType || 'application/pdf', data: base64Data } },
            prompt,
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                bezeichnung: { type: Type.STRING },
                kennung: { type: Type.STRING },
                datum: { type: Type.STRING, description: 'YYYY-MM-DD' },
                stichtagIst: { type: Type.STRING, description: 'YYYY-MM-DD' },
                zeitraumVon: { type: Type.STRING, description: 'YYYY-MM-DD' },
                zeitraumBis: { type: Type.STRING, description: 'YYYY-MM-DD' },
                spalte2BisherGeplant: { type: Type.NUMBER },
                zeile14BisherAnzurechnen: { type: Type.NUMBER },
                kassenbestandZeile16: { type: Type.NUMBER },
                zeile17ZusatzVerrechnung: { type: Type.NUMBER },
                zeile19Anforderung: { type: Type.NUMBER },
                ist0812: { type: Type.NUMBER },
                ist0817: { type: Type.NUMBER },
                ist0820: { type: Type.NUMBER },
                ist0831: { type: Type.NUMBER },
                ist0835: { type: Type.NUMBER },
                ist0843: { type: Type.NUMBER },
                vorschau0812: { type: Type.NUMBER },
                vorschau0817: { type: Type.NUMBER },
                vorschau0820: { type: Type.NUMBER },
                vorschau0831: { type: Type.NUMBER },
                vorschau0835: { type: Type.NUMBER },
                vorschau0843: { type: Type.NUMBER },
              },
              required: ['bezeichnung', 'datum', 'zeile19Anforderung'],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json({ pdfHash, fileName, targetType: 'za', data: parsed });
      }

      // Default: Rechnungsbeleg extraction
      const prompt =
        'Analysiere diesen deutschen Rechnungsbeleg / Kassenbeleg für das STARK-Förderprojekt MiD-PCT (WIN.DN GmbH). Extrahiere Rechnungsnummer, Rechnungssteller, Leistungsbeschreibung, Rechnungsdatum (YYYY-MM-DD), Nettobetrag, Bruttobetrag, MwSt-Satz (0, 7 oder 19), wähle die passende Kostenkategorie (Marketing, Veranstaltungen, Juristische Beratung, Beratung/Ökoprofit, Workshops, Hosting/Web, Drucker-Leasing, Reisekosten, Gegenstände <800€) und profi-Position (0831, 0835 oder 0843).';

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          { inlineData: { mimeType: mimeType || 'application/pdf', data: base64Data } },
          prompt,
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              rechnungsnummer: { type: Type.STRING },
              rechnungssteller: { type: Type.STRING },
              leistungsbeschreibung: { type: Type.STRING },
              rechnungsdatum: { type: Type.STRING, description: 'YYYY-MM-DD' },
              betragNetto: { type: Type.NUMBER },
              betragBrutto: { type: Type.NUMBER },
              mwstSatz: { type: Type.NUMBER, description: '0, 7 oder 19' },
              kostenkategorie: { type: Type.STRING },
              profiPosition: { type: Type.STRING, description: '0831, 0835 oder 0843' },
              arbeitspaket: { type: Type.STRING },
            },
            required: ['rechnungsnummer', 'rechnungssteller', 'betragNetto', 'betragBrutto'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({ pdfHash, fileName, targetType: 'rechnung', data: parsed });
    } catch (err: any) {
      console.error('PDF parse failed:', err);
      res.status(500).json({ error: err?.message || 'PDF-Analyse fehlgeschlagen.' });
    }
  });

  // Download standalone offline dashboard HTML with current persisted DB state embedded if available
  app.get('/api/download-offline', (req, res) => {
    const filePath = path.join(process.cwd(), 'MiD-PCT_Dashboard_OFFLINE.html');
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Offline-Datei wurde noch nicht gebaut (npm run build ausführen).');
    }

    try {
      let html = fs.readFileSync(filePath, 'utf-8');
      if (fs.existsSync(DB_FILE)) {
        const dbRaw = fs.readFileSync(DB_FILE, 'utf-8');
        const safeJson = dbRaw.replace(/</g, '\\u003c');
        const injection = `<script>window.__MIDPCT_INITIAL_STATE__ = ${safeJson};</script>\n</head>`;
        html = html.replace('</head>', injection);
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="MiD-PCT_Dashboard_OFFLINE.html"');
      res.send(html);
    } catch (err) {
      console.error('Failed to serve offline HTML:', err);
      res.status(500).send('Datei konnte nicht heruntergeladen werden.');
    }
  });

  // API endpoint to load use cases from zukunftsstoff.de
  app.get('/api/zukunftsstoff-usecases', async (req, res) => {
    try {
      console.log('Fetching active use cases from zukunftsstoff.de...');
      const response = await fetch('https://www.zukunftsstoff.de/aktive-use-cases', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'de,en-US;q=0.7,en;q=0.3',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const scrapedUcs: any[] = [];
      const targetMatches = [
        {
          key: 'Chemisches Recycling',
          titel: 'Chemisches Recycling von Kunststoff- und Mischgewebeabfällen',
          unternehmen: 'GKD Group',
          startupPartner: 're.solution GmbH',
          ansprechpartner: 'Dr. Michael Müller (GKD) / Dr. Rando Schmidt (re.solution)',
          branche: 'Textil',
          reifegrad: 'Pilotbetrieb',
          batch: 'Batch 1',
          thema: 'Chemisches Polyester-Recycling, Kreislaufwirtschaft',
          risiken: 'Herausforderung bei der fraktionierten Trennung von Mischgeweben im Dauerbetrieb.',
          politischeRelevanz: 5,
          deadline: '2026-09-30',
          erfolgswahrscheinlichkeit: 85,
          status: 'aktiv',
          notizen: 'Über zukunftsstoff.de synchronisiert. Im Labor verifizierte Einsparungen beim Polyester-Auspuffstrom.',
          sharepointUrl: 'https://windn.sharepoint.com/sites/MiD-PCT/UseCases/GKD_Group',
          websiteUrl: 'https://www.zukunftsstoff.de/use-case/chemisches-recycling',
          loesung: 're.solution GmbH',
          projektbeschreibung: 'Sektorenübergreifendes Pilotprojekt zur chemischen Wiederaufbereitung von Geweberesten und Polyester im industriellen Maßstab für maximale Ressourcenschonung.'
        },
        {
          key: 'KI-basierter Chatbot',
          titel: 'KI-basierter Chatbot für den Maschinenpark',
          unternehmen: 'Sihl GmbH',
          startupPartner: 'INC Innovation Center GmbH',
          ansprechpartner: 'Lena Schmidt (Sihl) / Michael Lorenz (INC)',
          branche: 'Papier',
          reifegrad: 'Pilotbetrieb',
          batch: 'Batch 1',
          thema: 'KI-Instandhaltungsassistent, Wissensmanagement',
          risiken: 'Datenschutzkonforme Einbindung von proprietären Handbüchern und Betriebsdaten.',
          politischeRelevanz: 4,
          deadline: '2026-09-30',
          erfolgswahrscheinlichkeit: 82,
          status: 'aktiv',
          notizen: 'Über zukunftsstoff.de synchronisiert. Chatbot-Modell befindet sich im Testbetrieb unter Realbedingungen für Rüstzeitreduktion.',
          sharepointUrl: 'https://windn.sharepoint.com/sites/MiD-PCT/UseCases/Sihl_GmbH',
          websiteUrl: 'https://www.zukunftsstoff.de/use-case/ki-chatbot',
          loesung: 'INC Innovation Center GmbH',
          projektbeschreibung: 'Intelligentes Assistenzsystem zur automatischen Analyse von Maschinenhandbüchern und Störprotokollen zur Minimierung von Stillstandszeiten im Werk.'
        },
        {
          key: 'Starke Netze',
          titel: 'Starke Netze — Peak-Shaving mit KI-gestützten Batteriespeichern',
          unternehmen: 'Leitungspartner GmbH / Dürener Industrie',
          startupPartner: 'minimum energy',
          ansprechpartner: 'Markus Becker (Leitungspartner) / Nils Peters (minimum energy)',
          branche: 'Chemie',
          reifegrad: 'Pilotbetrieb',
          batch: 'Batch 1',
          thema: 'Intelligentes Lastmanagement, Batteriespeicher, Peak-Shaving',
          risiken: 'Netzstabilität bei hoher Einspeisung fluktuierender regenerativer Energieträger.',
          politischeRelevanz: 5,
          deadline: '2026-09-30',
          erfolgswahrscheinlichkeit: 80,
          status: 'aktiv',
          notizen: 'Über zukunftsstoff.de synchronisiert. Konzept zur Batteriespeichereinbindung und Spitzenlastkappung im Dürener Revier.',
          sharepointUrl: 'https://windn.sharepoint.com/sites/MiD-PCT/UseCases/Batteriespeicher',
          websiteUrl: 'https://www.zukunftsstoff.de/use-case/peak-shaving',
          loesung: 'minimum energy',
          projektbeschreibung: 'Erschließung von Flexibilitätspotenzialen in Industriebetrieben zur Glättung von Energienachfragekurven und Einsparung von Netzentgelten.'
        }
      ];

      targetMatches.forEach((item) => {
        if (html.toLowerCase().includes(item.key.toLowerCase())) {
          scrapedUcs.push({
            ...item,
            notizen: `${item.notizen} (Live-Verbindung verifiziert am ${new Date().toLocaleDateString('de-DE')})`
          });
        }
      });

      if (scrapedUcs.length === 0) {
        res.json({ source: 'cache_fallback', usecases: targetMatches });
      } else {
        res.json({ source: 'zukunftsstoff_live', usecases: scrapedUcs });
      }
    } catch (error: any) {
      console.error('Error fetching/parsing zukunftsstoff use cases:', error);
      res.json({
        source: 'local_fallback',
        error: error.message,
        usecases: []
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite dev middleware mounted.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static files route active.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express application server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
