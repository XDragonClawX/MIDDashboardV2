# Optimierungsplan: MiD-PCT Fördermittel-Cockpit & profi-online Suite (FKZ 46SK0267X)

Dieser Plan strukturiert die gezielte Weiterentwicklung des Zukunftsstoff-Dashboards auf die verbindlichen Vorgaben des STARK-Projekts (FKZ `46SK0267X`), kombiniert automatische Belegauswertung mit manueller profi-online-ZA-Kalkulation, ergänzt das 6-Felder-Steckbrief-Schema im Use-Case Management und entschlackt das Executive Cockpit sowie die Navigation.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Alle nachfolgenden Entscheidungen basieren auf Ihren Antworten aus der Klärungsrunde und den Vorgaben aus dem Projektkontext (`FKZ 46SK0267X`).

- **Bestätigte Prioritäten**: Umsetzung der drei Schwerpunkte **(1) profi-online ZA-Rechner & Positionen 0812–0843**, **(2) Use-Case 6-Felder-Steckbrief & Export**, **(3) Cockpit-Entschlackung & Navigations-UX**.
- **Bestätigte Förderquoten-Logik**: Durchgängige Umstellung von bisher 90 / 7,5 / 2,5 auf **90,00 % Bundesanteil (BAFA) und 10,00 % Eigenanteil (WIN.DN GmbH)** über alle Berechnungen, KPIs, Diagramme und Berichte hinweg.
- **Bestätigte ZA-Berechnungsmethode**: **Kombination aus Automatik und manueller ZA-Maske** – Ist-Ausgaben und erhaltene Vorauszahlungen werden automatisch nach `0812`–`0843` vorbefüllt und bleiben je Position manuell korrigierbar; Zweimonats-Vorschau und Kassenbestand werden direkt in der Maske ergänzt, um Zeile 19 centgenau auszuweisen.

---

## 1. Überblick & Kernkonzept

- **Zielsetzung**: Verwandlung des bisherigen Kontroll-Dashboards in ein revisionssicheres, schlankes Steuerungswerkzeug für das tägliche BAFA-/profi-online-Fördermanagement und das industrielle Use-Case-Partnering.
- **Zielgruppe**: Projektleitung, Netzwerk- und Vergabemanagement der WIN.DN GmbH sowie Gremien/Industriepartner (für Steckbrief-Exports).
- **Zentraler Mehrwert**:
  1. **Keine Medienbrüche bei Zahlungsanforderungen**: Direktes Mapping aller Personal- und Sachbelege auf `0812`/`0817`, `0820`, `0831`, `0835`, `0843` mit sofortiger Berechnung von Bundesanteil (90 %) und Zeile 19.
  2. **Standardisierte Use-Case-Kommunikation**: Jedes Pilotprojekt kann per Klick als formaler 6-Felder-Steckbrief (Titel, Partner, Problemstellung, Lösungsansatz, Status & Next Steps, Standort-Mehrwert) geprüft, bearbeitet, gedruckt und als Markdown/Text/CSV exportiert werden.
  3. **Ruhigeres, schnelleres Cockpit**: Reduzierung der visuellen Überfrachtung, klare Informationshierarchie und gestraffte Navigation nach Themenbereichen.

---

## 2. Nutzererlebnis & Visuelles Design

### Zentrale Nutzerflüsse

1. **profi-online Zahlungsanforderung (ZA) erstellen & prüfen**:
   - Nutzer öffnet den Bereich **Mittelabrufe & profi-online ZA** und wählt den Stichtag sowie eine gespeicherte historische ZA (`13.03.2026`, `01.06.2026`, `06.08.2026`) oder startet einen neuen Entwurf.
   - Die Tabelle zeigt je Kostenposition (`0812`/`0817`, `0820`, `0831`, `0835`, `0843`) automatisch die kumulierten Ist-Ausgaben aus Personal- und Sachbelegen; ein Toggle bzw. direkt editierbare Felder erlauben manuelle Korrekturen und die Eingabe der **Zweimonats-Vorschau**.
   - Darunter berechnet ein klar abgegrenzter Kalkulationsblock mit `tabular-nums`: Summe Ist + Vorschau, aktueller Kassenbestand, **90,00 % Bundesanteil**, abzüglich bereits erhaltener Bundesmittel = **rechnerische Bundesmittelanforderung (Zeile 19)** inklusive Copy-Paste-/Druckansicht für das BAFA-Portal.
2. **Use-Case 6-Felder-Steckbrief & Export**:
   - Auf einer Use-Case-Karte oder im Detail-Drawer schaltet der Nutzer zwischen **Operative Ansicht (To-Dos & Partner)** und **Steckbrief (6 Pflichtfelder)** um.
   - Fehlende Felder (`Problemstellung`, `Lösungsansatz`, `Status & Next Steps`, `Standort-Mehrwert`) werden nahtlos aus bestehenden Projektdaten vorbelegt bzw. im Bearbeitungsdialog gepflegt, sodass keine Daten verloren gehen.
   - Ein-Klick-Aktionen liefern den Steckbrief als **formatierten Text (Zwischenablage)**, **Markdown-Export** oder **Druck-/PDF-Steckbrief** sowie optionalen **Batch-Sammel-Export**.
3. **Entschlacktes Executive Cockpit & Gestraffte Navigation**:
   - Die Seitenleiste wird auf eine kompakte, logisch gruppierte Struktur reduziert (ohne redundante Sub-Labels oder doppelte Werkzeuge).
   - Die Top-Bar folgt einem ruhigen einzeiligen Aufbau (Aktiver Bereich / Scope links, Strg+K Suche und direkter ZA-Schnellzugriff rechts) – ohne dekorative Status-Ticker oder pulsierende Dummy-Badges.
   - Das Executive Cockpit konzentriert sich auf **4 primäre Finanz- und Projekt-KPIs (90/10-Logik)**, **eine zentrale Mittelabfluss-/Budget-Visualisierung**, **den komprimierten Batch-1/2/3-Use-Case-Fortschritt** und **dringende Aufgaben/Fristen** – verschachtelte Karten-in-Karten-Boxen, animierte Flow-Pfeile und doppelte Mini-Widgets werden entfernt.

### Visuelle Identität & Designsystem

- **Ästhetische Ausrichtung**: Präzises, behörden- und wirtschaftstaugliches Enterprise-Controlling ohne dekorativen Ballast („Quiet Authority & Tabular Rigor“).
- **Farbpalette (60-30-10-Verteilung)**:
  - *60 % Neutraler Hintergrund*: Helles Schiefergrau (`#F8FAFC`) und klares Weiß (`#FFFFFF`) für Arbeitsflächen.
  - *30 % Strukturelle Flächen & Typografie*: Tiefes Blauschwarz (`--color-zs-blau-schwarz`: `#041422`) für Sidebar, Hauptüberschriften und primäre Zahlen, ergänzt durch 1px Hairline-Borders (`#E2E8F0`) statt verschachtelter Boxen oder dicker linker Akzentstreifen.
  - *10 % Akzentfarben*: Signalgelb (`--color-zs-signal-gelb`: `#F9FF00`) strikt für aktive Navigationszustände und primäre Handlungsbuttons; Textilgrün (`#58B49D`), Papierbraun (`#BA8B68`) und semantische Statusfarben (Grün/Amber/Rot stets mit Textlabel) sparsam für Datenstatus.
- **Typografie & Zahlen-Disziplin**:
  - Beibehaltung der projektspezifischen Display-Typografie (`Space Grotesk`) für prägnante Überschriften und `JetBrains Mono` mit striktem `tabular-nums` für alle Euro-Beträge, profi-online-Codes (`0812`–`0843`), Quoten (`90,00 %` / `10,00 %`) und Datumswerte.
  - **Zero-Pill-Disziplin**: Statische Metadaten (Branchen, Förderkennzeichen `46SK0267X`, Zeitstempel) werden als ruhiger Fließtext mit `·`-Trennern statt als umrahmte Pill-Chips dargestellt; Pill-Optik bleibt ausschließlich interaktiven Filter-Tabs und Buttons vorbehalten.

---

## 3. Zentrale Produktentscheidungen & Abwägungen

- **Entscheidung 1: Einheitliche 90 % Bund / 10 % Eigenanteil-Logik mit Daten-Migration**
  - *Gewählter Ansatz*: Umstellung aller Berechnungsformeln, Typen und Seed-Anzeigen auf `90,00 % Bundesanteil` und `10,00 % Eigenanteil` (ohne LHO-7,5%-Zwischenspalte), plus automatische Neuberechnung bzw. Übernahme beim Laden gespeicherter `localStorage`-Einträge.
  - *Begründung*: Entspricht exakt den hinterlegten STARK/BAFA-Rahmendaten für `FKZ 46SK0267X` und verhindert fehlerhafte Zeilen-19-Summen bei neuen Zahlungsanforderungen.
  - *Verworfene Alternative*: Paralleles Beibehalten zweier Förderquoten-Modelle über einen globalen Umschalter, da dies die Komplexität im Cockpit unnötig erhöht und Fehlablesungen begünstigt.

- **Entscheidung 2: Kombinierter profi-online ZA-Kalkulator direkt im Bereich Mittelabrufe**
  - *Gewählter Ansatz*: Integration eines interaktiven **ZA-Rechners (`0812`–`0843`)** direkt als primärer Tab/Workspace innerhalb von **Mittelabrufe** (ergänzt durch Zuordnungsfelder für profi-online-Positionen bei Sachbelegen und Personalkosten).
  - *Begründung*: Nutzer müssen nicht zwischen mehreren Seiten springen, um Ist-Werte aus Belegen zusammenzutragen und eine neue ZA (inkl. Zweimonats-Vorschau, Kassenbestand und Zeile 19) einzureichen.
  - *Verworfene Alternative*: Verstecken des Rechners im allgemeinen Text-Reporting, was die Nachvollziehbarkeit pro Position erschwert hätte.

- **Entscheidung 3: Abwärtskompatible Erweiterung des Use-Case-Modells auf das 6-Felder-Steckbrief-Schema**
  - *Gewählter Ansatz*: Erweiterung des Use-Case-Datenmodells um optionale explizite Felder (`problemstellung`, `loesungsansatz`, `statusNextSteps`, `standortMehrwert`) mit intelligentem Fallback auf bestehende Felder (`projektbeschreibung`, `risiken`, `todos`, `notizen`), sodass alle 11 bestehenden Batch-1/2/3-Projekte sofort vollständige Steckbriefe anzeigen.
  - *Begründung*: Alle vorhandenen Batch-1- und Batch-2-Vorhaben bleiben nahtlos erhalten und lassen sich schrittweise redaktionell verfeinern.

---

## 4. Technische Architektur & Datenstrategie *(Technische Referenz)*

### System- & Komponentenarchitektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│ App Shell (Navigation, Globaler Förderjahr-Filter, Strg+K Suche)       │
│  ├─ Top-Bar: Aktiver Bereich · FKZ 46SK0267X · Suche · Primäraktion     │
│  └─ Entschlackte Sidebar (4 Gruppen, Single-Line Nav-Links)             │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────────┐   ┌───────────────────────────┐   ┌─────────────────┐
│ Executive Cockpit │   │ Mittelabrufe & profi-online│   │ Use-Case Mgmt   │
│ (Entschlackt)     │   │ ZA-Rechner (0812–0843)    │   │                 │
│                   │   │                           │   │ - Batch 1/2/3   │
│ - 4 Kern-KPIs     │   │ ┌───────────────────────┐ │   │ - To-Do-Liste   │
│   (90/10-Quote)   │   │ │ Automatik-Aggregator  │ │   │ - 6-Felder-     │
│ - Budget vs. Ist  │   │ │ (Personal + Belege)   │ │   │   Steckbrief    │
│   nach 0812-0843  │   │ └───────────┬───────────┘ │   │   Ansicht &     │
│ - Batch-Status    │   │             ▼             │   │   Multi-Export  │
│ - Fristen/Tasks   │   │ ┌───────────────────────┐ │   └─────────────────┘
└───────────────────┘   │ │ Manuelle ZA-Maske     │ │
                        │ │ Ist / 2M-Vorschau /   │ │   ┌─────────────────┐
                        │ │ Kasse -> Zeile 19     │ │   │ Reporting &     │
                        │ └───────────────────────┘ │   │ Sachbelege      │
                        │                           │   │ (0812–0843 Map  │
                        │ - Historische ZAs 2026    │   │  & FKZ 46SK...) │
                        └───────────────────────────┘   └─────────────────┘
```

### Datenmodell & Status-Mapping

- **profi-online Kostenpositionen (`0812`–`0843`)**:
  - `0812 / 0817` (Personalausgaben): Automatisches Mapping aus den monatlichen Arbeitgeber-Brutto- bzw. Netto-Personalanteilen (abzüglich SV/Zusatzversorgung bzw. getrennt ausweisbar über prozentuale/explizite Aufteilung auf `0812` und `0820`).
  - `0820` (Sozialabgaben / Zusatzversorgung): Automatisch aus den AG-Sozialabgaben/KZVK-Anteilen der Personaleinträge abgeleitet und in der ZA-Maske feinjustierbar.
  - `0831` (Dienstreisen / Reisekosten): Abgeleitet aus Rechnungsbelegen der Kategorie *Dienstreisen*.
  - `0835` (Vergabe von Aufträgen / Fremdleistungen): Abgeleitet aus *Vergabeaufträge*, *Workshops*, *Juristische Beratung*, *Ökoprofit-Checkup*, *Transformationsbooster*, *Veranstaltungen*.
  - `0843` (Sächliche Verwaltungsausgaben): Abgeleitet aus *Marketing*, *Öffentlichkeitsarbeit*, *Hosting/Web*, *Gegenstände <800€*, *Miete + Rechner*.
- **Zahlungsanforderung (`Zahlungsanforderung` Entity in `localStorage`)**:
  - Speichert `id`, `datum`, `zeitraumLabel`, `istJePosition` (`0812`, `0820`, `0831`, `0835`, `0843`), `vorschauJePosition` (Zweimonats-Vorschau), `kassenbestand`, `erhalteneBundesmittel`, `bundesanteil` (`90 %`), `zeile19Anforderung` und `status` (`Entwurf`, `Eingereicht`, `Abgerechnet`).
  - Vordefinierte Einträge für die historischen 2026er ZAs (`13.03.2026`, `01.06.2026`, `06.08.2026`) mit expliziter Kennzeichnung noch nachzutragender Original-PDF-Beträge (keine geschätzten Platzhalterzahlen!).
- **Use-Case-Steckbrief (6 Pflichtfelder)**:
  - Erweiterung der bestehenden Use-Case-Struktur um `problemstellung`, `loesungsansatz`, `statusNextSteps` und `standortMehrwert` zusätzlich zu `titel` und den kombinierten `Partner`-Angaben (`unternehmen`, `startupPartner`, `ansprechpartner`).
  - Unterstützung für direkten Einzel-Export (Zwischenablage, Markdown, Druckansicht) sowie Batch-Übersichtsexport.
- **Offline-HTML-Synchronisation**:
  - Nach Abschluss aller UI- und Logik-Anpassungen wird die Standalone-Datei neu generiert, damit auch die Offline-Version alle Optimierungen enthält.
