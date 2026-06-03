@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title Zukunftstoff MiD-PCT Dashboard Launcher

:: Ins Verzeichnis der Batch-Datei wechseln (wichtig bei Doppelklick!)
cd /d "%~dp0"

echo =======================================================================
echo              MiD-PCT Foerdermittel-Dashboard V2 Launcher
echo =======================================================================
echo.
echo Arbeitsverzeichnis: %CD%
echo.

:: 1. Pruefen ob Node.js installiert ist
where node >nul 2>nul
if !errorlevel! neq 0 goto :TRY_PYTHON

echo [INFO] Node.js gefunden.
node --version
echo.

:: 2. Abhaengigkeiten installieren falls noetig
if not exist "node_modules" (
    echo [INFO] node_modules nicht gefunden. Installiere Abhaengigkeiten...
    echo Dies kann beim ersten Start 1-2 Minuten dauern...
    echo.
    call npm install
    if !errorlevel! neq 0 (
        echo.
        echo [FEHLER] npm install ist fehlgeschlagen.
        echo Pruefen Sie Ihre Internetverbindung.
        echo.
        pause
        exit /b 1
    )
)

:: 3. Browser zeitverzoegert oeffnen (Server braucht einen Moment)
echo [INFO] Oeffne Browser in 4 Sekunden unter http://localhost:3000 ...
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

:: 4. Server starten
echo [INFO] Starte Node-Server (npm run dev)...
echo.
echo =======================================================================
echo   Dashboard wird gestartet. Lassen Sie dieses Fenster offen!
echo   Zum Stoppen: Strg+C oder Fenster schliessen.
echo =======================================================================
echo.

call npm run dev
echo.
echo [INFO] Server beendet.
pause
exit /b 0

:TRY_PYTHON
echo [HINWEIS] Node.js nicht gefunden. Versuche Python-Fallback...
echo.

set "PY_CMD="
where python >nul 2>nul && set "PY_CMD=python"
if "!PY_CMD!"=="" where python3 >nul 2>nul && set "PY_CMD=python3"
if "!PY_CMD!"=="" where py >nul 2>nul && set "PY_CMD=py"

if "!PY_CMD!"=="" (
    echo =======================================================================
    echo [FEHLER] Weder Node.js noch Python wurden gefunden.
    echo =======================================================================
    echo.
    echo Optionen:
    echo   1. Node.js installieren: https://nodejs.org
    echo   2. Python installieren:  https://python.org
    echo   3. Oder oeffnen Sie direkt: MiD-PCT_Dashboard_OFFLINE.html
    echo.
    pause
    exit /b 1
)

echo [INFO] Python gefunden: !PY_CMD!
!PY_CMD! --version
echo.

if not exist "dist" (
    echo [FEHLER] Verzeichnis 'dist' fehlt. Build wurde noch nicht erstellt.
    echo Bitte zuerst mit Node.js bauen: npm install ^&^& npm run build
    echo Alternativ direkt oeffnen: MiD-PCT_Dashboard_OFFLINE.html
    echo.
    pause
    exit /b 1
)

echo [INFO] Starte Python HTTP-Server auf Port 3000...
echo [INFO] Oeffne Browser in 3 Sekunden ...
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

echo.
echo =======================================================================
echo   Dashboard laeuft im Client-Modus via Python.
echo   Zum Stoppen: Strg+C oder Fenster schliessen.
echo =======================================================================
echo.

cd dist
!PY_CMD! -m http.server 3000
echo.
echo [INFO] Server beendet.
pause
exit /b 0
