@echo off
:: Set coding profile to UTF-8 to display German special characters correctly
chcp 65001 >nul
title Zukunftstoff MiD-PCT Dashboard Launcher

echo =======================================================================
echo              MiD-PCT Fördermittel-Dashboard V2 Launcher
echo =======================================================================
echo.
echo Dieses Skript prüft Ihre Umgebung und startet das Dashboard im Browser.
echo Erforderlich: Node.js (https://nodejs.org)
echo.

:: 1. Prüfen ob Node.js installiert ist
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [HINWEIS] Node.js wurde auf diesem System nicht gefunden.
    echo Versuche automatischen Fallback über Python (keine Installationen notwendig)...
    echo.
    goto :TRY_PYTHON
)

:: Node.js Pfad - Standardmäßig laden
:: 2. Prüfen ob Abhängigkeiten installiert werden müssen
if not exist node_modules (
    echo [INFO] node_modules nicht gefunden. Installiere Abhängigkeiten (npm install)...
    echo Dies kann beim ersten Start 1-2 Minuten dauern...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [WARNUNG] Die Installation der Abhängigkeiten meldet Fehler.
        echo Bitte prüfen Sie Ihre Internetverbindung.
    )
)

:: 3. Webbrowser im Hintergrund aufrufen
echo [INFO] Öffne Dashboard im Browser unter http://localhost:3000 ...
start http://localhost:3000

:: 4. Server starten
echo [INFO] Starte Node-Server (npm run dev)...
echo.
echo =======================================================================
echo   Das Dashboard ist jetzt aktiv. Lassen Sie dieses Fenster offen!
echo   Zum Stoppen: Schließen Sie einfach dieses Fenster oder drücken Sie Strg+C
echo =======================================================================
echo.

call npm run dev
pause
exit /b

:TRY_PYTHON
:: Prüfen ob python3, python oder py installiert ist
set PY_CMD=
where python3 >nul 2>nul
if %errorlevel% equ 0 (
    set PY_CMD=python3
) else (
    where python >nul 2>nul
    if %errorlevel% equ 0 (
        set PY_CMD=python
    ) else (
        where py >nul 2>nul
        if %errorlevel% equ 0 (
            set PY_CMD=py
        )
    )
)

if "%PY_CMD%"=="" (
    echo =======================================================================
    echo [FEHLER] Weder Node.js noch Python wurden auf Ihrem PC gefunden.
    echo =======================================================================
    echo.
    echo Um das Dashboard lokal zu verwenden, installieren Sie bitte eine Option:
    echo 1. Node.js (Empfohlen, unterstützt Echtzeit-Features): https://nodejs.org
    echo 2. Python (Ultraleicht, dient als lokaler Web-Hoster): https://python.org
    echo.
    echo Alternativ können Sie versuchen, die Datei 'dist/index.html' direkt im
    echo Browser zu öffnen. Manche Browser (z.B. Firefox) erlauben das Starten.
    echo.
    pause
    exit /b
)

:: Wenn Python gefunden wurde, starten wir das kompilierte Produktions-Verzeichnis
if not exist dist (
    echo [FEHLER] Das Produktionsverzeichnis 'dist/' existiert nicht.
    echo Das Dashboard muss mindestens einmal mit Node.js kompiliert werden,
    echo oder dieses Paket muss vollständig entpackt werden.
    echo.
    pause
    exit /b
)

echo [INFO] Python gefunden (%PY_CMD%). Starte Dashboard im serverlosen Client-Modus...
echo [INFO] Ändere Arbeitsverzeichnis auf 'dist/'...
cd dist

echo [INFO] Öffne Dashboard im Browser unter http://localhost:3000 ...
start http://localhost:3000

echo.
echo =======================================================================
echo   Das Dashboard läuft im serverlosen Client-Modus via Python!
echo   Vollständige Datenspeicherung und Snapshots laufen im Webbrowser.
echo.
echo   Zum Stoppen: Schließen Sie dieses Fenster.
echo =======================================================================
echo.

:: Server starten depending on python versions
%PY_CMD% -m http.server 3000 2>nul
if %errorlevel% neq 0 (
    %PY_CMD% -m SimpleHTTPServer 3000
)

pause
