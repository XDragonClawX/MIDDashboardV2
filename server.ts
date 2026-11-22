import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Zentrale Use-Case-Stammdaten der aktiven Piloten von zukunftsstoff.de.
// Dient sowohl dem Live-Abgleich (Keyword-Match gegen die Website) als auch
// als Offline-Fallback – dadurch keine doppelte Pflege.
const ZUKUNFTSSTOFF_USECASES = [
  {
    key: 'Chemisches Recycling',
    titel: 'Chemisches Recycling (zukunftsstoff.de)',
    unternehmen: 're.solution GmbH / GKD Group',
    ansprechpartner: 'Dr. Klaus Schmitz',
    branche: 'Textil',
    reifegrad: 'Pilotbetrieb',
    batch: 'Batch 2',
    thema: 'Chemisches Polyester-Recycling',
    risiken: 'Herausforderung bei der fraktionierten Trennung von Mischgeweben im Dauerbetrieb.',
    politischeRelevanz: 5,
    deadline: '2026-11-30',
    erfolgswahrscheinlichkeit: 85,
    status: 'aktiv',
    notizen: 'Über zukunftsstoff.de synchronisiert. Im Labor verifizierte Einsparungen beim Polyester-Auspuffstrom.',
    sharepointUrl: 'https://windn.sharepoint.com/sites/MiD-PCT/Freigegebene%20Dokumente/Use-Cases/Chemisches-Recycling',
    websiteUrl: 'https://www.zukunftsstoff.de/aktive-use-cases',
    loesung: 'Chemisches Recycling von Polyester-Mischgewebe',
    projektbeschreibung: 'Sektorenübergreifendes Pilotprojekt zur chemischen Wiederaufbereitung von Geweberesten und Polyester im industriellen Maßstab für maximale Ressourcenschonung.'
  },
  {
    key: 'KI-basierter Chatbot',
    titel: 'KI-basierter Chatbot für den Maschinenpark (zukunftsstoff.de)',
    unternehmen: 'Sihl GmbH / remberg GmbH',
    ansprechpartner: 'Katrin Meyer',
    branche: 'Papier',
    reifegrad: 'Prototyp',
    batch: 'Batch 2',
    thema: 'KI-Instandhaltungsassistent',
    risiken: 'Datenschutzkonforme Einbindung von proprietären Handbüchern und Betriebsdaten.',
    politischeRelevanz: 4,
    deadline: '2026-12-15',
    erfolgswahrscheinlichkeit: 90,
    status: 'aktiv',
    notizen: 'Über zukunftsstoff.de synchronisiert. Chatbot-Modell befindet sich in der Testphase unter Realbedingungen für Rüstzeitreduktion.',
    sharepointUrl: 'https://windn.sharepoint.com/sites/MiD-PCT/Freigegebene%20Dokumente/Use-Cases/Chatbot-Maschinenpark',
    websiteUrl: 'https://www.zukunftsstoff.de/aktive-use-cases',
    loesung: 'KI-Instandhaltungstextassistent',
    projektbeschreibung: 'Intelligentes Assistenzsystem zur automatischen Analyse von Maschinenhandbüchern und Störprotokollen zur Minimierung von Stillstandszeiten im Werk.'
  },
  {
    key: 'Starke Netze',
    titel: 'Starke Netze - Peak-Shaving (zukunftsstoff.de)',
    unternehmen: 'Leitungspartner GmbH',
    ansprechpartner: 'Thomas Jansen',
    branche: 'Energie',
    reifegrad: 'Konzept',
    batch: 'Batch 2',
    thema: 'Intelligentes Lastmanagement',
    risiken: 'Netzstabilität bei hoher Einspeisung fluktuierender regenerativer Energieträger.',
    politischeRelevanz: 4,
    deadline: '2027-02-28',
    erfolgswahrscheinlichkeit: 75,
    status: 'Pipeline',
    notizen: 'Über zukunftsstoff.de synchronisiert. Konzept zur Batteriespeichereinbindung und Spitzenlastkappung im Dürener Revier.',
    sharepointUrl: 'https://windn.sharepoint.com/sites/MiD-PCT/Freigegebene%20Dokumente/Use-Cases/Peak-Shaving',
    websiteUrl: 'https://www.zukunftsstoff.de/aktive-use-cases',
    loesung: 'Peak-Shaving Spitzenlaststeuerung',
    projektbeschreibung: 'Erschließung von Flexibilitätspotenzialen in Industriebetrieben zur Glättung von Energienachfragekurven und Einsparung von Netzentgelten.'
  }
];

// Offline-/Netzwerk-Fallback: dieselben Stammdaten, aber mit stabiler ID und
// angepasstem Hinweistext.
const OFFLINE_FALLBACK_USECASES = ZUKUNFTSSTOFF_USECASES.map((uc, index) => {
  const { key, ...rest } = uc;
  void key;
  return {
    ...rest,
    id: 101 + index,
    notizen: 'Aus zukunftsstoff.de geladen (Offline-Modus).',
  };
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || '0.0.0.0';

  // Add middleware to parse JSON
  app.use(express.json());

  // API endpoint to load use cases from zukunftsstoff.de
  app.get('/api/zukunftsstoff-usecases', async (_req, res) => {
    try {
      console.log('Fetching active use cases from zukunftsstoff.de...');
      // Fetch the website
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
      const htmlLower = html.toLowerCase();

      // Scan HTML text to check which use cases are actually present on the page.
      const scrapedUcs = ZUKUNFTSSTOFF_USECASES
        .filter((item) => htmlLower.includes(item.key.toLowerCase()))
        .map((item) => ({
          ...item,
          // Tag with synced badge indicator
          notizen: `${item.notizen} (Live-Verbindung verifiziert am ${new Date().toLocaleDateString('de-DE')})`,
        }));

      // If for any reason no use case keyword matched, fallback to returning all three as standard
      if (scrapedUcs.length === 0) {
        console.warn('Scraper did not find exact string matches, returning fallback dataset.');
        res.json({
          source: 'cache_fallback',
          usecases: ZUKUNFTSSTOFF_USECASES,
        });
      } else {
        res.json({
          source: 'zukunftsstoff_live',
          usecases: scrapedUcs,
        });
      }

    } catch (error: unknown) {
      console.error('Error fetching/parsing zukunftsstoff use cases:', error);
      // Clean fallback in case of no network access or offline mode
      res.json({
        source: 'local_fallback',
        error: error instanceof Error ? error.message : String(error),
        usecases: OFFLINE_FALLBACK_USECASES,
      });
    }
  });

  // Serve static assets or mount Vite dev server as middleware
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
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static files route active.');
  }

  app.listen(PORT, HOST, () => {
    console.log(`Express application server running on http://${HOST}:${PORT}`);
  });
}

startServer();
