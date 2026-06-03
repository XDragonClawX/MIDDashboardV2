import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.resolve(process.cwd(), 'dist');
const indexPath = path.join(distPath, 'index.html');
const outputPath = path.resolve(process.cwd(), 'MiD-PCT_Dashboard_OFFLINE.html');

console.log('--- Offline Single-File HTML Generator ---');

if (!fs.existsSync(indexPath)) {
  console.error("Fehler: dist/index.html nicht gefunden!");
  process.exit(1);
}

let htmlContent = fs.readFileSync(indexPath, 'utf-8');

// Extract all asset references BEFORE any replacement
const cssLinks = [];
const jsScripts = [];

// Find CSS link tags
const cssRegex = /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']\/?assets\/([^"'?#]+)["'][^>]*>/gi;
let m;
while ((m = cssRegex.exec(htmlContent)) !== null) {
  cssLinks.push({ tag: m[0], file: m[1] });
}

// Find JS script tags
const jsRegex = /<script\b[^>]*\bsrc=["']\/?assets\/([^"'?#]+)["'][^>]*><\/script>/gi;
while ((m = jsRegex.exec(htmlContent)) !== null) {
  jsScripts.push({ tag: m[0], file: m[1] });
}

// Inline CSS - replace each unique tag exactly once using split/join
for (const { tag, file } of cssLinks) {
  const filePath = path.join(distPath, 'assets', file);
  if (fs.existsSync(filePath)) {
    console.log(`Inlining CSS: ${file}`);
    const css = fs.readFileSync(filePath, 'utf-8');
    // Use split/join to replace only the first occurrence safely
    const parts = htmlContent.split(tag);
    htmlContent = parts[0] + `<style>${css}</style>` + parts.slice(1).join(tag);
  }
}

// Inline JS - replace each unique tag exactly once
for (const { tag, file } of jsScripts) {
  const filePath = path.join(distPath, 'assets', file);
  if (fs.existsSync(filePath)) {
    console.log(`Inlining JS: ${file}`);
    const js = fs.readFileSync(filePath, 'utf-8');
    const parts = htmlContent.split(tag);
    htmlContent = parts[0] + `<script type="module">\n${js}\n</script>` + parts.slice(1).join(tag);
  }
}

fs.writeFileSync(outputPath, htmlContent, 'utf-8');

const srcOutputPath = path.resolve(process.cwd(), 'src', 'MiD-PCT_Dashboard_OFFLINE.html');
fs.writeFileSync(srcOutputPath, htmlContent, 'utf-8');

const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
console.log('------------------------------------------');
console.log(`ERFOLG! Offline-Version erstellt.`);
console.log(`- ${cssLinks.length} CSS-Stylesheets inlined`);
console.log(`- ${jsScripts.length} JS-Scripts inlined`);
console.log(`Dateigröße: ${sizeMB} MB`);
console.log(`Speicherort: ${outputPath}`);
console.log('------------------------------------------');
