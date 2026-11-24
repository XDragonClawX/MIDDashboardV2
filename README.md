<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f310cc36-3efe-4d60-b0c1-417d4a23f8d2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Zugriffsschutz und Datensicherheit

Der Server ist standardmäßig nur auf dem eigenen Rechner erreichbar (`127.0.0.1`).
Das Dashboard enthält Gehälter, Belege und Zahlungsanforderungen – im Netz bitte nur mit Passwort betreiben:

| Variable | Bedeutung |
|---|---|
| `HOST` | Adresse, auf der der Server lauscht (Standard `127.0.0.1`; für das Netz `0.0.0.0`) |
| `PORT` | Port (Standard `3000`) |
| `MIDPCT_PASSWORD` | Aktiviert den Zugriffsschutz (HTTP-Anmeldung im Browser) für App und API |
| `MIDPCT_USER` | Benutzername für die Anmeldung (Standard `midpct`) |

Beispiel (PowerShell): `$env:HOST="0.0.0.0"; $env:MIDPCT_PASSWORD="…"; npm run dev`

Ohne Passwort gibt der Server beim Start eine Warnung aus, wenn er im Netz erreichbar ist.

Weitere Schutzmaßnahmen:
- Der Datenstand wird atomar geschrieben (Temp-Datei, dann Umbenennen).
- Vor jedem Überschreiben wird der vorherige Stand gesichert – höchstens einmal pro Stunde, die letzten 72 Sicherungen in `data/backups/` bleiben erhalten.
- Speichert ein zweiter Browser, ohne den neuesten Serverstand zu kennen, wird der Stand nicht überschrieben (Status „Konflikt“ in den Einstellungen).
- PDF-Analyse: höchstens 10 Anfragen pro Minute, nur PDF/PNG/JPEG/WebP bis ca. 10 MB.
