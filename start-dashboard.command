#!/bin/bash
# MiD-PCT Fördermittel-Dashboard V2 Launcher for macOS

# Wechselt in den Ordner in dem dieses Skript liegt
cd "$(dirname "$0")"

clear
echo "======================================================================="
echo "             MiD-PCT Fördermittel-Dashboard V2 Launcher"
echo "======================================================================="
echo ""
echo "Dieses Skript prüft die Umgebung und startet das Dashboard im Browser."
echo "Erforderlich: Node.js (https://nodejs.org)"
echo ""

# 1. Prüfen ob Node.js installiert ist
if ! command -v node &> /dev/null; then
    echo "[HINWEIS] Node.js wurde auf diesem Mac nicht gefunden."
    echo "Suche nach einem automatischen Fallback über Python (keine Installationen notwendig)..."
    echo ""
    
    # Check for python3 or python
    if command -v python3 &> /dev/null; then
        PY_CMD="python3"
    elif command -v python &> /dev/null; then
        PY_CMD="python"
    else
        echo "======================================================================="
        echo "[FEHLER] Weder Node.js noch Python wurden auf Ihrem Mac gefunden."
        echo "======================================================================="
        echo ""
        echo "Um das Dashboard lokal zu verwenden, installieren Sie bitte eine Option:"
        echo "1. Node.js (Empfohlen, unterstützt live API-Usecases): https://nodejs.org"
        echo "2. Python (Ultraleicht, dient als lokaler Web-Hoster): https://python.org"
        echo ""
        read -p "Drücken Sie ENTER zum Beenden..."
        exit 1
    fi
    
    # Check if dist folder exists
    if [ ! -d "dist" ]; then
        echo "[FEHLER] Das Produktionsverzeichnis 'dist/' existiert nicht."
        echo "Das Dashboard muss mindestens einmal mit Node.js kompiliert werden,"
        echo "oder dieses Paket muss vollständig entpackt werden."
        echo ""
        read -p "Drücken Sie ENTER zum Beenden..."
        exit 1
    fi
    
    echo "[INFO] Python gefunden ($PY_CMD). Starte Dashboard im serverlosen Client-Modus..."
    echo "[INFO] Ändere Arbeitsverzeichnis auf 'dist/'..."
    cd dist
    
    echo "[INFO] Öffne Dashboard im Browser unter http://localhost:3000 ..."
    open "http://localhost:3000"
    
    echo ""
    echo "======================================================================="
    echo "  Das Dashboard läuft im serverlosen Client-Modus via Python!"
    echo "  Vollständige Datenspeicherung und Snapshots laufen im Webbrowser."
    echo ""
    echo "  Zum Stoppen: Schließen Sie dieses Terminal."
    echo "======================================================================="
    echo ""
    
    $PY_CMD -m http.server 3000 2>/dev/null || $PY_CMD -m SimpleHTTPServer 3000
    exit 0
fi

# 2. Prüfen ob Abhängigkeiten installiert werden müssen
if [ ! -d "node_modules" ]; then
    echo "[INFO] node_modules nicht gefunden. Installiere Abhängigkeiten (npm install)..."
    echo "Dies kann beim ersten Start 1-2 Minuten dauern..."
    echo ""
    npm install
fi

# 3. Webbrowser aufrufen
echo "[INFO] Öffne Dashboard im Browser unter http://localhost:3000 ..."
open "http://localhost:3000"

# 4. Server starten
echo "[INFO] Starte Node-Server (npm run dev)..."
echo ""
echo "======================================================================="
echo "  Das Dashboard ist jetzt aktiv. Lassen Sie dieses Fenster offen!"
echo "  Zum Stoppen: Schließen Sie das Terminal oder drücken Sie Strg+C"
echo "======================================================================="
echo ""

npm run dev
