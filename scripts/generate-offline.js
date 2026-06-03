import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// =========================================================================
// ACHTUNG / HINWEIS:
// Diese Datei "generate-offline.js" ist ein internes Build-Skript für Node.js!
// Sie müssen diese Datei NICHT manuell öffnen, starten oder doppelklicken.
//
// Wenn Sie das Dashboard OHNE Node und Python verwenden möchten:
// Doppelklicken Sie einfach auf die Datei "MiD-PCT_Dashboard_OFFLINE.html"
// im Hauptverzeichnis Ihres Projekts. Sie öffnet sich sofort in Ihrem Browser.
// =========================================================================

// Da das Projekt als "type": "module" deklariert ist, müssen wir __dirname aus import.meta.url berechnen:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.resolve(process.cwd(), 'dist');
const indexPath = path.join(distPath, 'index.html');
const outputPath = path.resolve(process.cwd(), 'MiD-PCT_Dashboard_OFFLINE.html');

console.log('--- Offline Single-File HTML Generator ---');
console.log(`Quellpfad: ${indexPath}`);
console.log(`Zielpfad: ${outputPath}`);

if (!fs.existsSync(indexPath)) {
  console.error("Fehler: dist/index.html wurde nicht gefunden! Bitte stelle sicher, dass 'vite build' vorher erfolgreich durchgelaufen ist.");
  process.exit(1);
}

let htmlContent = fs.readFileSync(indexPath, 'utf-8');

// 1. CSS inlinen
// RegExp sucht nach Link-Tags mit href="/assets/index-xxxx.css" oder "assets/index-xxxx.css" (mit oder ohne Slash vorne)
const cssLinkRegex = /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']\/?assets\/([^"']+)["'][^>]*>/gi;
let cssLinkMatch;
let inlinedCssCount = 0;

// Da wir den HTML-String wÃ¤hrend der Schleife verÃ¤ndern, arbeiten wir mit einer Kopie oder ersetzen gezielt
const matches = [];
let match;
while ((match = cssLinkRegex.exec(htmlContent)) !== null) {
  matches.push({
    fullTag: match[0],
    fileName: match[1]
  });
}

for (const m of matches) {
  const cssFilePath = path.join(distPath, 'assets', m.fileName);
  if (fs.existsSync(cssFilePath)) {
    console.log(`Inlining CSS: ${m.fileName}`);
    const cssContent = fs.readFileSync(cssFilePath, 'utf-8');
    htmlContent = htmlContent.replace(m.fullTag, `<style>${cssContent}</style>`);
    inlinedCssCount++;
  } else {
    console.warn(`Warnung: CSS Datei ${cssFilePath} wurde nicht gefunden.`);
  }
}

// 2. JS inlinen
// RegExp sucht nach Script-Tags vom Typ Typ "module" mit src="/assets/index-xxxx.js" oder "assets/index-xxxx.js"
const jsScriptRegex = /<script\s+[^>]*src=["']\/?assets\/([^"']+)["'][^>]*><\/script>/gi;
const jsMatches = [];
while ((match = jsScriptRegex.exec(htmlContent)) !== null) {
  jsMatches.push({
    fullTag: match[0],
    fileName: match[1]
  });
}

let inlinedJsCount = 0;
for (const m of jsMatches) {
  const jsFilePath = path.join(distPath, 'assets', m.fileName);
  if (fs.existsSync(jsFilePath)) {
    console.log(`Inlining JS: ${m.fileName}`);
    let jsContent = fs.readFileSync(jsFilePath, 'utf-8');
    
    // Wenn es inlined ist, mÃ¼ssen wir type="module" entfernen, da manche Browser blockieren.
    // Wir ersetzen den gesamten Tag mit einem einfachen non-module script tag.
    htmlContent = htmlContent.replace(m.fullTag, `<script type="text/javascript">\n${jsContent}\n</script>`);
    inlinedJsCount++;
  } else {
    console.warn(`Warnung: JS Datei ${jsFilePath} wurde nicht gefunden.`);
  }
}

// Hilfsweise prÃ¼fen wir auf weitere typische Vite-Muster
htmlContent = htmlContent.replace(/<script\s+type=["']module["']\s+crossorigin\s+src=["']\/?assets\/([^"']+)["']><\/script>/gi, (match, jsFileName) => {
  const jsFilePath = path.join(distPath, 'assets', jsFileName);
  if (fs.existsSync(jsFilePath)) {
    console.log(`Inlining JS (Backup-Muster): ${jsFileName}`);
    const jsContent = fs.readFileSync(jsFilePath, 'utf-8');
    inlinedJsCount++;
    return `<script type="text/javascript">\n${jsContent}\n</script>`;
  }
  return match;
});

// Schreibe die finale eigenstÃ¤ndige Offline-Datei
fs.writeFileSync(outputPath, htmlContent, 'utf-8');

// Erstelle einen zusätzlichen Klon direkt im /src/ Verzeichnis,
// damit die Datei garantiert im Web-Editor Dateiexplorer sichtbar ist!
const srcOutputPath = path.resolve(process.cwd(), 'src', 'MiD-PCT_Dashboard_OFFLINE.html');
fs.writeFileSync(srcOutputPath, htmlContent, 'utf-8');

console.log('------------------------------------------');
console.log(`ERFOLG! Standalone Offline-Version erfolgreich erstellt.`);
console.log(`- ${inlinedCssCount} CSS-Stylesheets inlined`);
console.log(`- ${inlinedJsCount} JS-Scripts inlined`);
console.log(`DateigrÃ¶Ãe: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
console.log(`Speicherort: ${outputPath}`);
console.log('------------------------------------------');
