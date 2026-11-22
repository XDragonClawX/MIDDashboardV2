# System- & Zahlendokumentation: MiD-PCT — Fördermittel-ERP („Zukunftsstoff – Made in Düren“)

Stand der Codebasis-Dokumentation: **14. November 2026** (App-Datenstand: Mai 2026)  
Förderkennzeichen: **`46SK0267X`** · Bewilligungsbehörde: **BAFA (STARK-Programm)** · Träger: **WIN.DN GmbH (Düren)**

---

## 1. Projekt- & Systemübersicht

| Eigenschaft | Wert / Spezifikation |
|---|---|
| **Anwendungsname (`metadata.json` / `<title>`)** | `MiD-PCT — Fördermittel-ERP` |
| **Projektbezeichnung** | Zukunftsstoff – Made in Düren (Teil-/Folgeprojekt *Made in Düren – Papier, Textil, Chemie* / MiD-PTC) |
| **Projektträger** | WIN.DN GmbH (Wirtschafts- und Innovationsnetzwerk Düren) |
| **Förderprogramm & FKZ** | STARK-Programm · BAFA · Förderkennzeichen **`46SK0267X`** |
| **Projektlaufzeit (AZA-Plan)** | **01.04.2025 – 31.03.2029** (48 Monate, aufgeteilt in 5 AZA-Perioden) |
| **Förderquoten-Logik** | **90,00 % Bundesanteil (BAFA)** / **10,00 % Eigenanteil (WIN.DN GmbH)** (LHO-Landesanteil = `0,00 €` / `0 %`) |
| **Gesamtprojektvolumen (AZA-Bescheid)** | **`1.545.876,28 €`** (Bund 90 %: `1.391.288,65 €` · Eigenanteil 10 %: `154.587,63 €`) |
| **Frontend-Stack** | React `^19.0.1`, TypeScript `~5.8.2`, Vite `^6.2.3`, Tailwind CSS `^4.1.14`, Recharts `^3.8.1`, Lucide-React `^0.546.0`, Motion `^12.23.24`, SheetJS (`xlsx ^0.18.5`) |
| **Backend & Offline-Distribution** | Express `^4.21.2` auf Port `3000` (`server.ts`), TypeScript-Ausführung via `tsx ^4.21.0`, Bundle via `esbuild ^0.25.0`; Single-File-Offline-Export **`MiD-PCT_Dashboard_OFFLINE.html`** (via `scripts/generate-offline.js` und Route `/api/download-offline`) |
| **Persistenzschicht** | Browser `localStorage` (14 primäre Datenschlüssel `midpct_*` + `midpct_backup_slots` + `midpct_tvoed_scenarios`) sowie JSON-Snapshot Export/Import |

### 1.1 API-Endpunkte (`server.ts`, Port `3000`)

| Methode & Pfad | Funktion |
|---|---|
| `GET /api/download-offline` | Liefert das gebündelte Einzeldatei-HTML `MiD-PCT_Dashboard_OFFLINE.html` direkt als Browser-Download aus. |
| `GET /api/zukunftsstoff-usecases` | Ruft aktive Use-Cases von `https://www.zukunftsstoff.de/aktive-use-cases` ab (`zukunftsstoff_live`) und stellt einen strukturierten Fallback (`cache_fallback` / `local_fallback`) für Batch 1/2 bereit. |

### 1.2 `localStorage`-Persistenzschlüssel

Alle operativen Daten werden clientseitig unter folgenden Schlüsseln gespeichert:

| Bereich | `localStorage`-Key | Bereich | `localStorage`-Key |
|---|---|---|---|
| Personalbuchungen | `midpct_personal` | Audit-Protokoll | `midpct_audit` |
| Rechnungsbelege | `midpct_rechnungen` | Partnerdatenbank | `midpct_partner` |
| Mittelabrufe (BAFA) | `midpct_mittelabrufe` | Mitarbeitenden-Liste | `midpct_mitarbeiter_namen` |
| Zahlungsanforderungen (ZAs) | `midpct_zas` | Use-Case-Notizen | `midpct_uc_notes` |
| Manuelle Budget-Buchungen | `midpct_buchungen` | Use-Case-Belegzuordnungen | `midpct_uc_inv` |
| Vergabevorgänge | `midpct_vergaben` | Events / Termine | `midpct_events` |
| Use-Cases | `midpct_usecases` | Ökoprofit-Checkups | `midpct_oekoprofit_checkups` |
| Gelöschte Seed-UCs | `midpct_deleted_usecases` | Backup-Slots (max. `25`) | `midpct_backup_slots` |
| TVöD-Vergleichsszenarien | `midpct_tvoed_scenarios` | — | — |

*(Hinweis: Beim Laden aus `localStorage` migriert `App.tsx` bestehende Personaleinträge automatisch auf 90 % Bundesanteil / 10 % Eigenanteil, filtert etwaige historische `LHO_LAND`-Mittelabrufe heraus und ergänzt fehlende Seed-ZAs.)*

---

## 2. Globale Förderlogik, Konstanten & Berechnungsregeln

### 2.1 `profi-online` Kostenpositionen (Ausgabenbasis `0812–0843`)

| Code (`ProfiPositionCode`) | Anzeige (`profi-online`) | Bezeichnung | Berechnungs- & Zuordnungsregel im System |
|---|---|---|---|
| `0812` | `0812 / 0817` | **Personalausgaben** | Standardmäßig **`82,00 %`** der Arbeitgeber-Personalkosten (`splitPersonalToProfi` mit Default `svShareOfAg = 0,18`). |
| `0820` | `0820` | **Sozialabgaben & ZVK** | Standardmäßig **`18,00 %`** der Arbeitgeber-Personalkosten (im ZA-Rechner zwischen `0 %` und `50 %` anpassbar; Rest zu 100 % geht an `0812`). |
| `0831` | `0831` | **Dienstreisen / Reisekosten** | Sachbelege der Kategorie *Dienstreisen* / *Reisekosten* sowie AZA-Reisekostenbudget. |
| `0835` | `0835` | **Vergabe von Aufträgen / Fremdleistungen** | Sachbelege der Kategorien *Vergabeaufträge*, *Ökoprofit-Checkup*, *Transformationsbooster*, *Juristische Beratung*, *Workshops*, *Veranstaltungen*, *Design-Sprint*, *Fremdleistung* / *Beratung*. |
| `0843` | `0843` | **Sächliche Verwaltungsausgaben** | Sachbelege (*Marketing*, *Öffentlichkeitsarbeit*, *Hosting/Web*, *Gegenstände <800€*, *Miete + Rechner*) **zuzüglich `10,00 %` Geschäftsbedarfspauschale** auf förderfähige Personalkosten (`0812 + 0820`). |

### 2.2 Förderfähige Personalberechnung & Geschäftsbedarfspauschale
- Für jeden Personaleintrag gilt:
  - `sachkosten` (Geschäftsbedarfspauschale `0843`) = `agKosten × 0,10` (optional im ZA-Rechner deaktivierbar)
  - `foerderfaehig` = `agKosten + sachkosten`
  - `bafaAnteil` (Bundesanteil) = `roundEuro(foerderfaehig × 0,90)`
  - `eigenaufwand` (Eigenanteil WIN.DN) = `roundEuro(foerderfaehig − bafaAnteil)`

### 2.3 Formel für BAFA Zahlungsanforderungen (`profi-online` Zeile 19)
Im Modul **Mittelabrufe & profi-online ZA** werden für jede Zahlungsanforderung berechnet:
1. $\text{Summe Ist-Ausgaben} = \sum_{p \in \{0812, 0820, 0831, 0835, 0843\}} \text{Ist}_p$ (automatisch kumuliert bis `stichtagIst` aus `Personal` + förderfähigen `Rechnungsbelegen`, manuell überschreibbar).
2. $\text{Summe Zweimonats-Vorschau} = \sum_{p \in \{0812..0843\}} \text{Vorschau}_p$
3. $\text{Ausgabenbasis Gesamt} = \text{Summe Ist} + \text{Summe Vorschau}$
4. $\text{Bundesanteil (90,00 \%)} = \text{roundEuro}(\text{Ausgabenbasis Gesamt} \times 0,90)$
5. $\text{Eigenanteil (10,00 \%)} = \text{roundEuro}(\text{Ausgabenbasis Gesamt} \times 0,10)$
6. **Rechnerische Bundesmittelanforderung (Zeile 19)**:
   $$\text{Zeile 19} = \max\Big(0,\; \text{roundEuro}\big(\text{Bundesanteil (90 \%)} - \text{bereits erhaltene Bundesmittel} - \text{Kassenbestand}\big)\Big)$$

### 2.4 Ökoprofit-Checkup & Transformationsbooster (Vergabe `0835`)
Regelparameter aus `LV_koprofit_Konzept.docx` und `SettingsPage.tsx`:
- **Standardvergütung**: **`5.000,00 € brutto`** je Startup
- **Terminstruktur**: **3 Beratungstermine**
  1. Termin 1: Nachhaltigkeitsbasierte Skalierungsanalyse & Marktpotenziale
  2. Termin 2: Regionale Markterschließung & nachhaltige Branchenintegration
  3. Termin 3: Nachhaltige Skalierungsstrategie & Pitch-Vorbereitung
- **Verbindliche Abgabefristen** (automatisch berechnet über `addBusinessDaysISO` / `addWeeksISO`):
  - Ergebnisprotokolle (1–2 Seiten) nach Termin 1 und Termin 2: **max. 5 Werktage** (`Mo–Fr`, ohne Wochenenden) nach jeweiligem Termin
  - Abschluss-Reporting (5–10 Seiten) nach Termin 3: **max. 4 Wochen** (`+28 Kalendertage`) nach Termin 3
- **Abschlagsplan**: **`25 %`** nach Termin 1 + Protokoll (`1.250,00 €`) · **`25 %`** nach Termin 2 + Protokoll (`1.250,00 €`) · **`50 %`** nach Termin 3 + Abschluss-Reporting (`2.500,00 €`)

### 2.5 Industrie- & Startup-Use-Cases (6-Felder-Steckbrief-Schema)
Jeder Use-Case besitzt im Modul **Use-Case Management** (`Drawer-Ansicht: Steckbrief`) sowie für Plain-Text-Zwischenablage, Markdown-Download (`.md`) und Drucklayout ein verbindliches 6-Felder-Schema:
1. **Titel** · 2. **Partner** (Industrieunternehmen, Startup/Lösungspartner, Ansprechpartner) · 3. **Problemstellung** · 4. **Lösungsansatz** · 5. **Status & Next Steps** · 6. **Standort-Mehrwert**.

---

## 3. Funktionsumfang der 15 Module & Global-Navigation

### 3.1 Globale Steuerung (`App.tsx`)
- **3-teilige Sidebar-Navigation**: *Finanz- & Fördersteuerung* (6 Module), *Ecosystem & Netzwerk* (4 Module), *Werkzeuge & Audit* (5 Module).
- **Globaler Jahres-Scope**: Schnellumschalter für `2025` (`gesamt25`: Apr–Dez 2025), `2026`, `2027`, `2028`, `2029` (`mrz29`: Jan–Mär 2029) sowie `Alle` (Gesamtlaufzeit).
- **Globale Schnellsuche (`Strg+K`)**: Durchsucht live Rechnungsbelege, Personalbuchungen, Vergaben, Use-Cases, Ökoprofit-Checkups, ZAs, Partner und Aufgaben mit direktem Sprung in das Zielmodul.

### 3.2 Modulübersicht (alle 15 Seiten)

| Kategorie | Modul | Kernfunktionen & Eigenschaften |
|---|---|---|
| **Finanzen** | **1. Executive Cockpit** | • **3 Kern-KPI-Karten mit interaktiver Drilldown-Logik**:<br>  1. *Bundesmittel-Saldo* (Bewilligter Bundesanteil 90 % minus erhaltene BAFA-Auszahlungen) → klickbar, filtert direkt auf `Mittelabrufe` → Tab `Abrufe` → Status `Ausgezahlt`.<br>  2. *Eigenanteil WIN.DN (10 %)* (Ist-Eigenanteil inkl. Auslastung & Rest-Eigenanteil) → klickbar, filtert auf `Budget & AZA-Plan` → Tab `Kategorien & Positionen` → Fokus `Nur Eigenanteil (10 %)`.<br>  3. *Offene Mittelabrufe* (offener Anforderungsbetrag zzgl. Anzahl offener Abrufe & ZAs) → klickbar, filtert auf `Mittelabrufe` → Tab `Abrufe` → Status `Offen / Eingereicht`.<br>• **`profi-online` Kostenpositionen (0812–0843)**: Gruppiertes Balkendiagramm (Plan vs. Ist) sowie interaktive Tabelle — Klick auf `0812/0820` öffnet `Personalkosten`, Klick auf `0831–0843` öffnet `Sachbelege` vorgefiltert auf die jeweilige `profi`-Position.<br>• **Prioritäre Aufgaben** (direkt abhakbar inkl. Rücksprung zu `Aufgaben`) & **Letzte ZA-Statusbox**. |
| **Finanzen** | **2. Budget & AZA-Plan** | • 5 Sub-Tabs: *Kategorien & Positionen* (Plan-vs.-Ist-Fortschrittsbalken für 0812/0820, 0831, 0835, 0843), *Jahresübersicht (2025–2029)*, *Personalbudget (AZA)*, *Vergaben & Booster (AZA)*, *Manuelle Buchungen*.<br>• Drilldown-Quotenfokus-Filter (`Alle (100 %)`, `Nur Bundesanteil (90 %)`, `Nur Eigenanteil (10 %)`), Pie-Chart der 90/10-Finanzierung und Anlage/Statuswechsel manueller Buchungen. |
| **Finanzen** | **3. Personalkosten 0812/0820** | • Monatliche Erfassung & Status-Workflow (`ENTWURF`, `IN_PRUEFUNG`, `EINGEREICHT`, `ARCHIVIERT`).<br>• **TVöD-Stufensimulator & Rücklagenrechner** (Tarifgruppe/Stufe → Vergleich IST vs. TVöD/AZA-Soll).<br>• **BAFA-Änderungsantrag-Generator**: Automatische Textsynthese für Mittelverschiebungen/Stufenanpassungen (inkl. TVöD-Begründung ohne Budgeterhöhung) zum Kopieren.<br>• **Globales Mitarbeitenden-Management** (Anlegen, Entfernen, Einzel- und Global-Umbenennung mit Vererbung auf alle Belege). |
| **Finanzen** | **4. Sachbelege 0831–0843** | • Verwaltung aller Eingangsrechnungen mit automatischer **19 %-MwSt.-Bruttoberechnung** (`Netto × 1,19`), automatischer Quartalszuordnung und automatischem Mapping auf `profi-online`-Positionen (`0831`, `0835`, `0843`).<br>• Filter nach Kostenkategorie (12 Kategorien), Status, Jahr sowie **`profi-online`-Position** (inkl. Drilldown-Badge vom Cockpit).<br>• Kostenverteilungs-Balken- und Tortendiagramme. |
| **Finanzen** | **5. Mittelabrufe & profi-online ZA** | • 3 Sub-Tabs:<br>  1. **`profi-online` ZA-Rechner**: Auswahl/Neuanlage von Zahlungsanforderungen, konfigurierbare SV-Quote (Default `18 %`) & 10-%-Pauschale, Auto-Berechnung Ist bis Stichtag, manuelle Zweimonats-Vorschau je Position `0812–0843`, Eingabe Kassenbestand & erhaltene Bundesmittel, Live-Berechnung Zeile 19, Speichern & Textzusammenfassung kopieren.<br>  2. **BAFA-Mittelabrufe**: Liste + Statusfilter (`Alle`, `Offen / Eingereicht`, `Ausgezahlt`), Statuswechsel-Workflow, Neuanlage modal, Soll/Ist-Chart.<br>  3. **Kassenschluss-Checkliste**: Countdown zum jährlichen BAFA-Kassenschluss am **15. November** (mit Dringlichkeitswarnung bei `<= 30 Tagen`) und abhakbarer Prüfcheckliste. |
| **Finanzen** | **6. Liquiditätsüberwachung** | • Monatliche Cashflow-Gegenüberstellung (BAFA-Einzahlungen 90 % vs. Personal-/Sachausgaben) mit Berechnung von Netto-Saldo und **max. Vorfinanzierungsbedarf**.<br>• Gestapeltes Balkendiagramm, kumulierte Liquiditäts-Flächenkurve und Monats-Einzelnachweistabelle. |
| **Ecosystem** | **7. Vergabevorgänge** | • 2 Sub-Tabs:<br>  1. **Vergabevorgänge (`0835`)**: 6-stufige Pipeline (`Vorbereitung` → `Veröffentlichung` → `Angebotsphase` → `Prüfung` → `Zuschlag` → `abgeschlossen`), BAFA-Freigabe-Flag und Warnzähler bei fehlender BAFA-Freigabe.<br>  2. **Ökoprofit-Checkup & Transformationsbooster**: Verwaltung der `5.000 €`-Startup-Checkups mit automatischer Berechnung der 5-WT-Protokollfristen, 4-Wochen-Reportingfrist, 25 %/25 %/50 %-Abschlagsfreigaben und Leistungsverzeichnis-Zusammenfassung zum Kopieren. |
| **Ecosystem** | **8. Use-Case Management** | • Batch-Tabs (`Batch 1`, `Batch 2`, `Batch 3`, `Alle`), Fortschrittsbalken, integrierte Karten-Checklisten (`todos`), Erfolgs- und Relevanzbewertung (`1–5`).<br>• **Detail-Drawer** mit 2 Modi (*Operativ* inkl. Notizen, Aufgaben & verknüpften Rechnungen vs. *6-Felder-Steckbrief* inkl. Plain-Text-Kopie, `.md`-Export und Druckansicht).<br>• Live-Synchronisation gegen `zukunftsstoff.de` (`/api/zukunftsstoff-usecases`) und Batch-2-Synchronisation. |
| **Ecosystem** | **9. Partner Datenbank** | • 3 Ansichten: *Ökosystem-Karten*, *Partnerverzeichnis (Tabelle)* und interaktive *Matchmaking-Matrix* (`Industrieunternehmen × Startups/Dienstleister` mit 4-Stufen-Klickzyklus: `NONE` → `POTENTIAL` → `LINKED` → `ACTIVE_PILOT`).<br>• Direkter Excel/CSV-Import (`.xlsx`, `.xls`, `.csv`) über SheetJS. |
| **Ecosystem** | **10. Aufgaben & To-Dos** | • Relationales Aufgabenboard (**Spalten-/Kanban-Ansicht** `offen` / `in_bearbeitung` / `erledigt` und **Listenansicht**) mit Fremdschlüssel-Verlinkung zu Use-Cases (`useCaseId`), Vergaben (`vergabeId`) und Rechnungsbelegen (`rechnungId`).<br>• Prioritäten (`hoch`, `mittel`, `niedrig`), Fälligkeitsdaten und Modulfremdschlüssel-Filter. |
| **Werkzeuge** | **11. TVöD Tarife-Rechner** | • Interaktiver Arbeitgeber-Vollkostenrechner auf Basis von `TVOED_VKA_TABLE` (`E 5`–`E 15` inkl. Stufen `1–6` sowie `SHK` über Stunden × Stundensatz × `4,25` Wochen).<br>• Synchronisierte Wochenstunden-/Prozent-Steuerung (`39 h/Woche = 100 %`), anpassbare AG-SV-Quote (Standard `22,0 %` bzw. `9,5 %` bei SHK), JSZ-Quote (`50 %`) und Overhead-Faktor.<br>• Persistente Szenarien-Vergleichsliste (`midpct_tvoed_scenarios`). |
| **Werkzeuge** | **12. Excel/CSV Importer** | • 3-stufiger Import-Wizard (*1. Upload per Drag & Drop* → *2. Spalten-Mapping* → *3. Vorschau & Übernahme*) für 5 Zielmodule: `personal`, `rechnungen`, `mittelabrufe`, `vergaben`, `partners`. |
| **Werkzeuge** | **13. Berichte & Exporte** | • UTF-8-CSV-Exporte (`;` getrennt) für Personalbelege und Kostenrechnungen.<br>• **Quartalsbericht-Synthesizer (BAFA-STARK V22)**: Kompiliert ASCII-Zwischennachweis nach Positionen `0812–0843` zzgl. optionaler Sachberichts-Textbausteine.<br>• **Quartals Forecast & Ad-Hoc Simulator**: Vergleicht AZA-Jahresetat (geviertelt) mit *Ist*, *Entwürfen* und frei modellierbaren Simulationsposten (inkl. Pacing-Ampel und Überlaufwarnung). |
| **Werkzeuge** | **14. Revisions-Änderungslog** | • GoB/GoBD-orientiertes Audit-Log aller Create/Update/Delete/Import/Reset-Aktionen mit Volltextsuche und CSV-Export. |
| **Werkzeuge** | **15. Systemeinstellungen** | • Vollständiger JSON-Snapshot-Export/Import (Drag & Drop), **bis zu `25` lokale Browser-Snapshot-Slots**, direkter Download von **`MiD-PCT_Dashboard_OFFLINE.html`**, Reset auf Initial-Seeddaten sowie Anzeige der 7 regulatorischen STARK-Konstanten. |

---

## 4. Vollständige Zahlengrundlage: AZA-Gesamtfinanzierungsplan (2025–2029)

### 4.1 Jahresübersicht nach Förderbescheid (`AZA_PLAN.foerder`)

| Periode | Schlüssel | Zeitraum | Gesamtbudget (€) | Bundesanteil 90,00 % (€) | Eigenanteil 10,00 % (€) | LHO (€) |
|---|---|---|---|---|---|---|
| **2025 (Apr–Dez)** | `gesamt25` | `2025-04-01` – `2025-12-31` | `224.464,37` | `202.017,93` | `22.446,44` | `0,00` |
| **2026** | `2026` | `2026-01-01` – `2026-12-31` | `415.642,78` | `374.078,50` | `41.564,28` | `0,00` |
| **2027** | `2027` | `2027-01-01` – `2027-12-31` | `416.887,92` | `375.199,13` | `41.688,79` | `0,00` |
| **2028** | `2028` | `2028-01-01` – `2028-12-31` | `424.083,56` | `381.675,20` | `42.408,36` | `0,00` |
| **2029 (Jan–Mär)** | `mrz29` | `2029-01-01` – `2029-03-31` | `64.797,65` | `58.317,89` | `6.479,76` | `0,00` |
| **Gesamtlaufzeit (48 Mon.)** | `alle` | **`2025-04-01` – `2029-03-31`** | **`1.545.876,28`** | **`1.391.288,65`** | **`154.587,63`** | **`0,00`** |

*(Hinweis zur Cent-Rundung: Die ungerundeten Einzelpostensummen aus `AZA_PLAN` ergeben in `2026` `415.642,79 €` und in `2028` `424.083,57 €`, insgesamt `1.545.876,30 €`; die um `0,02 €` abweichende Gesamtsumme `1.545.876,28 €` entspricht der fest hinterlegten Bescheidsumme in `AZA_PLAN.foerder`.)*

### 4.2 AZA-Detailpositionen nach Jahren (in €)

#### Personalausgaben (`0812 / 0820`)
| Stelle / Rolle | 2025 (Apr–Dez) | 2026 | 2027 | 2028 | 2029 (Jan–Mär) | Summe 5 Jahre |
|---|---:|---:|---:|---:|---:|---:|
| Innovations-Manager/in (Master) – Projektleitung | `52.399,08` | `69.865,44` | `75.432,47` | `77.190,47` | `18.525,71` | **`293.413,17`** |
| Netzwerk-Manager/in (Master) | `46.120,35` | `65.875,16` | `67.258,75` | `71.385,14` | `17.445,17` | **`268.084,57`** |
| Vergabe-Manager/in (Bachelor) | `22.276,42` | `31.418,37` | `31.960,42` | `33.911,71` | `8.286,70` | **`127.853,62`** |
| Studentische Hilfskraft | `9.816,50` | `24.312,00` | `24.324,00` | `24.336,00` | `3.272,17` | **`86.060,67`** |
| **Summe Personal (`0812 / 0820`)** | **`130.612,35`** | **`191.470,97`** | **`198.975,64`** | **`206.823,32`** | **`47.529,75`** | **`775.412,03`** |

*Rechnerischer Cockpit-Split (`82 %` / `18 %` über Gesamtlaufzeit):*  
- `0812 / 0817` (Personalausgaben `82 %`): **`635.837,86 €`**  
- `0820` (Sozialabgaben / ZVK `18 %`): **`139.574,17 €`**

#### Vergaben, Dienstreisen & sächliche Verwaltungsausgaben (`0831`, `0835`, `0843`)
| Position | `profi`-Pos. | 2025 (Apr–Dez) | 2026 | 2027 | 2028 | 2029 (Jan–Mär) | Summe 5 Jahre |
|---|---|---:|---:|---:|---:|---:|---:|
| Juristische Beratung | `0835` | `15.000,00` | `7.600,00` | `0,00` | `0,00` | `0,00` | **`22.600,00`** |
| Design-Sprint + Use-Case-Definition | `0835` | `15.000,00` | `0,00` | `0,00` | `0,00` | `0,00` | **`15.000,00`** |
| Ökoprofit-Checkup | `0835` | `0,00` | `20.000,00` | `20.000,00` | `20.000,00` | `0,00` | **`60.000,00`** |
| Veranstaltungen | `0835` | `11.143,00` | `13.423,00` | `13.423,00` | `13.423,00` | `8.365,00` | **`59.777,00`** |
| Mitgliedsbeiträge Kooperationspartner | `0835` | `5.775,00` | `3.000,00` | `3.000,00` | `7.700,00` | `1.925,00` | **`21.400,00`** |
| Transformations-Booster 1–4 (je `37.000 €`) | `0835` | `0,00` | `148.000,00` | `0,00` | `0,00` | `0,00` | **`148.000,00`** |
| Transformations-Booster 5–8 (je `37.000 €`) | `0835` | `0,00` | `0,00` | `148.000,00` | `0,00` | `0,00` | **`148.000,00`** |
| Transformations-Booster 9–12 (je `37.000 €`) | `0835` | `0,00` | `0,00` | `0,00` | `148.000,00` | `0,00` | **`148.000,00`** |
| **Zwischensumme Position `0835`** | **`0835`** | **`46.918,00`** | **`192.023,00`** | **`184.423,00`** | **`189.123,00`** | **`10.290,00`** | **`622.777,00`** |
| Marketing & Öffentlichkeitsarbeit | `0843` | `31.000,00` | `10.100,00` | `10.500,00` | `3.500,00` | `1.800,00` | **`56.900,00`** |
| Geschäftsbedarf (`10 %` auf Personal) | `0843` | `13.061,23` | `19.147,10` | `19.897,56` | `20.682,33` | `4.752,97` | **`77.541,19`** |
| Miete & Leasing (Drucker-Leasing) | `0843` | `1.274,79` | `1.699,72` | `1.699,72` | `1.699,72` | `424,93` | **`6.798,88`** |
| Gegenstände `< 800 €` | `0843` | `1.598,00` | `0,00` | `0,00` | `0,00` | `0,00` | **`1.598,00`** |
| **Zwischensumme Position `0843`** | **`0843`** | **`46.934,02`** | **`30.946,82`** | **`32.097,28`** | **`25.882,05`** | **`6.977,90`** | **`142.838,07`** |
| Dienstreisen / Reisekosten | `0831` | `0,00` | `1.202,00` | `1.392,00` | `2.255,20` | `0,00` | **`4.849,20`** |

*(Hinweis: Im Array `AZA_PLAN.auftraege` sind alle 17 `0835`-Posten plus `Marketing & Öffentlichkeitsarbeit` (`0843`) zusammengefasst, was eine Listen-Summe von `679.677,00 €` ergibt; im `profi-online`-Abgleich wird `Marketing & Öffentlichkeitsarbeit` (`56.900,00 €`) korrekt der Position `0843` zugerechnet.)*

### 4.3 TVöD-VKA-Tarifmatrix (`TVOED_VKA_TABLE`, monatliches Grundentgelt in €)

Standardannahmen im `TVoDRechnerPage`: **`39,0 Std./Woche`** = `100 %`, AG-Sozialabgaben **`22,0 %`** (bei `SHK`: **`9,5 %`**), Jahressonderzahlung **`50,0 %`**, SHK-Default **`15 h/Woche × 15 €/h × 4,25 Wochen = 956,25 €`**.

| Entgeltgruppe | Stufe 1 (€) | Stufe 2 (€) | Stufe 3 (€) | Stufe 4 (€) | Stufe 5 (€) | Stufe 6 (€) |
|---|---:|---:|---:|---:|---:|---:|
| **E 15** | `5.504,00` | `6.084,28` | `6.649,03` | `7.253,38` | `7.837,38` | `8.234,38` |
| **E 14** | `4.980,50` | `5.510,35` | `6.084,28` | `6.650,00` | `7.215,10` | `7.635,00` |
| **E 13** | `4.628,76` | `5.122,59` | `5.675,31` | `6.139,60` | `6.739,52` | `7.035,79` |
| **E 12** | `4.170,32` | `4.581,34` | `5.061,67` | `5.650,08` | `6.363,30` | `6.636,31` |
| **E 11** | `4.032,38` | `4.410,41` | `4.765,62` | `5.410,00` | `6.010,00` | `6.280,00` |
| **E 10** | `3.895,33` | `4.191,53` | `4.528,25` | `4.973,96` | `5.438,45` | `5.573,90` |
| **E 9b** | `3.566,25` | `3.891,07` | `4.165,00` | `4.505,00` | `5.015,00` | `5.290,00` |
| **E 9a** | `3.448,20` | `3.690,00` | `3.890,00` | `4.290,00` | `4.390,00` | `4.690,00` |
| **E 8** | `3.281,40` | `3.480,00` | `3.630,00` | `3.780,00` | `3.930,00` | `4.010,00` |
| **E 7** | `3.095,10` | `3.310,00` | `3.470,00` | `3.610,00` | `3.730,00` | `3.810,00` |
| **E 6** | `3.040,00` | `3.210,00` | `3.350,00` | `3.480,00` | `3.600,00` | `3.680,00` |
| **E 5** | `2.920,00` | `3.110,00` | `3.240,00` | `3.370,00` | `3.480,00` | `3.550,00` |
| **SHK** | `956,25` | `956,25` | `956,25` | `956,25` | `956,25` | `956,25` |

---

## 5. Erfasste Echtdaten / Seed-Bestände im Detail (`src/data.ts`)

### 5.1 Personalkosten (`SEED_PERSONAL`, 13 Monatsdatensätze, Jul–Dez 2025)

**3 hinterlegte Mitarbeitende (`SEED_MITARBEITER`)**: `von Styp-Rekowski`, `Lena Guth`, `Lea Fischöder`.

| Mitarbeiter/in | Monate (2025) | AG-Kosten (`0812/0820`) (€) | 10 %-Pauschale (`0843`) (€) | Förderfähig gesamt (€) | BAFA 90 % (€) | Eigenanteil 10 % (€) |
|---|---:|---:|---:|---:|---:|---:|
| **von Styp-Rekowski** | `6` (Jul–Dez) | `35.498,95` | `3.549,89` | `39.048,84` | `35.143,96` | `3.904,88` |
| **Lena Guth** | `3` (Okt–Dez) | `13.438,86` | `1.343,90` | `14.782,76` | `13.304,48` | `1.478,28` |
| **Lea Fischöder** | `4` (Sep–Dez) | `4.501,96` | `450,21` | `4.952,17` | `4.456,95` | `495,22` |
| **Summe Personal-Seed (13 Sätze)** | **13** | **`53.439,77`** | **`5.344,00`** | **`58.783,77`** | **`52.905,40`** | **`5.878,37`** |

- **Quartalsaufteilung 2025**:
  - **Q3 2025** (`4` Einträge): AG `18.108,28 €` + 10%-Pauschale `1.810,83 €` = `19.919,11 €` (`90 %` Bund: `17.927,20 €`, `10 %` Eigenanteil: `1.991,91 €`)
  - **Q4 2025** (`9` Einträge): AG `35.331,49 €` + 10%-Pauschale `3.533,17 €` = `38.864,66 €` (`90 %` Bund: `34.978,19 €`, `10 %` Eigenanteil: `3.886,47 €`)
- **`profi-online`-Split (82/18 %)**: `0812` = **`43.820,61 €`** · `0820` = **`9.619,16 €`** · `0843`-Pauschale = **`5.344,00 €`**.

*(Einzeldatensätze: `von Styp-Rekowski` Jul–Sep je `5.675,31 €` AG (`EINGEREICHT`), Okt `5.709,92 €` (`EINGEREICHT`), Nov `6.623,50 €` inkl. JSZ (`ENTWURF`), Dez `6.139,60 €` (`ENTWURF`); `Lena Guth` Okt `4.232,45 €` (`EINGEREICHT`), Nov `4.232,45 €` (`ENTWURF`), Dez `4.973,96 €` inkl. JSZ (`ENTWURF`); `Lea Fischöder` Sep–Nov je `1.082,35 €` (Sep–Okt `EINGEREICHT`, Nov `ENTWURF`), Dez `1.254,91 €` inkl. JSZ (`ENTWURF`).)*

### 5.2 Rechnungsbelege (`SEED_RECHNUNGEN`, 20 Belege)

Alle 20 Belege sind als förderfähig (`foerderfaehig: true`) markiert; im Seed entspricht `betragBrutto` jeweils `betragNetto`.

- **Gesamtsumme (20 Belege)**: **`63.586,25 €`** (`90 %` BAFA: **`57.227,63 €`** · `10 %` Eigenanteil: **`6.358,63 €`**)

#### Nach `profi-online` Kostenposition:
| `profi`-Position | Anzahl Belege | Summe Netto/Brutto (€) |
|---|---:|---:|
| **`0835` Vergabe / Fremdleistungen** | `9` | **`32.783,54`** |
| **`0843` Sächl. Verwaltungsausgaben** | `11` | **`30.802,71`** |
| **`0831` Dienstreisen** | `0` | **`0,00`** |

#### Nach Abrechnungsperiode:
| Zeitraum | Anzahl Belege | Pos. `0835` (€) | Pos. `0843` (€) | Gesamt (€) |
|---|---:|---:|---:|---:|
| **2025 Q2** | `6` | `2.953,49` | `69,73` | **`3.023,22`** |
| **2025 Q3** | `6` | `1.224,00` | `593,93` | **`1.817,93`** |
| **2025 Q4** | `5` | `12.898,05` | `21.101,00` | **`33.999,05`** |
| **2026 Q1** | `3` | `15.708,00` | `9.038,05` | **`24.746,05`** |
| **Summe** | **`20`** | **`32.783,54`** | **`30.802,71`** | **`63.586,25`** |

#### Nach Kategorie (System-Kategorien der 20 Belege):
| Kategorie | Belege | Betrag (€) | Kategorie | Belege | Betrag (€) |
|---|---:|---:|---|---:|---:|
| Marketing (`0843`) | `6` | `29.932,78` | Gegenstände `<800€` (`0843`) | `4` | `593,93` |
| Juristische Beratung (`0835`) | `2` | `15.708,00` | Hosting/Web (`0843`) | `1` | `276,00` |
| Workshops (`0835`) | `1` | `12.495,00` | Vergabeaufträge (`0835`) | `1` | `153,00` |
| Veranstaltungen (`0835`) | `5` | `4.427,54` | — | — | — |

### 5.3 BAFA-Mittelabrufe (`SEED_MITTELABRUFE`) & `profi-online` ZAs (`SEED_ZAHLUNGSANFORDERUNGEN`)

| Abrufnummer | Zeitraum | Quartal | Mittelgeber | Beantragt (€) | Eingegangen (€) | Offen (€) | Status |
|---|---|---|---|---:|---:|---:|---|
| **`BAFA-2025-Q2Q3`** | `01.07.2025 – 30.09.2025` | Q3 / 2025 | `BAFA_BUND` | `22.123,62` | `22.123,62` | `0,00` | `ARCHIVIERT` |
| **`BAFA-2025-Q4`** | `01.10.2025 – 31.12.2025` | Q4 / 2025 | `BAFA_BUND` | `35.262,90` | `0,00` | `35.262,90` | `EINGEREICHT` |
| **Summe Mittelabrufe** | — | — | — | **`57.386,52`** | **`22.123,62`** | **`35.262,90`** | — |

**Registrierte 2026er Zahlungsanforderungen (`SEED_ZAHLUNGSANFORDERUNGEN`)**:
1. **`ZA 46SK0267X · 13.03.2026`** (Ist-Stichtag `2026-03-13`, Status: `Eingereicht`, `belegVollstaendig: false`)
2. **`ZA 46SK0267X · 01.06.2026`** (Ist-Stichtag `2026-06-01`, Zeitraum `14.03.–01.06.2026`, Status: `Eingereicht`, `belegVollstaendig: false`)
3. **`ZA 46SK0267X · 06.08.2026`** (Ist-Stichtag `2026-08-06`, Zeitraum `02.06.–06.08.2026`, Status: `Abgerechnet`, `belegVollstaendig: false`)

### 5.4 Kumulierte Ist-Gesamtwerte im Cockpit-Startzustand (Alle Jahre)

Aus `SEED_PERSONAL` (`58.783,77 €`) + `SEED_RECHNUNGEN` (`63.586,25 €`) ergeben sich ohne manuelle Ergänzungen folgende Cockpit-Summen:

| `profi`-Position | Plan 2025–2029 (€) | Ist erfasst (€) | Ausschöpfung (%) | Restbudget (€) |
|---|---:|---:|---:|---:|
| **`0812 / 0817` Personalausgaben** | `635.837,86` | `43.820,61` | `6,89 %` | `592.017,25` |
| **`0820` Sozialabgaben / ZVK** | `139.574,17` | `9.619,16` | `6,89 %` | `129.955,01` |
| **`0831` Dienstreisen** | `4.849,20` | `0,00` | `0,00 %` | `4.849,20` |
| **`0835` Vergabe von Aufträgen** | `622.777,00` | `32.783,54` | `5,26 %` | `589.993,46` |
| **`0843` Sächl. Verwaltungsausgaben** | `142.838,07` | `36.146,71` | `25,31 %` | `106.691,36` |
| **Gesamt Ist (Personal + Sach)** | **`1.545.876,28`** *(Bescheid)* | **`122.370,02`** | **`7,92 %`** | **`1.423.506,26`** |

- **Ist Bundesanteil (90,00 %)**: `110.133,02 €` vs. **Plan Bundesanteil**: `1.391.288,65 €`
- **Ist Eigenanteil (10,00 %)**: `12.237,00 €` vs. **Plan Eigenanteil**: `154.587,63 €` (Rest-Eigenanteil: `142.350,63 €`, Ausschöpfung `7,92 %`)
- **Cockpit KPI *Bundesmittel-Saldo***: `1.391.288,65 € − 22.123,62 € =` **`1.369.165,03 €`** (`1,59 %` ausgezahlt)
- **Cockpit KPI *Offene Mittelabrufe***: **`35.262,90 €`** (`1` offener Mittelabruf `BAFA-2025-Q4` + `2` offene ZAs im Status `Eingereicht`)

### 5.5 Vergaben (`SEED_VERGABEN`) & Ökoprofit-Checkups (`SEED_OEKOPROFIT_CHECKUPS`)

| ID | Vergabetitel | Auftragnehmer | Auftragswert (€) | Arbeitspaket | Status | BAFA-Freigabe |
|---:|---|---|---:|---|---|---|
| `1` | Digitalisierungsberatung Textilunternehmen | Müller & Partner GmbH | `24.000,00` | AP2 – Technologietransfer | `Zuschlag` | `Ja` |
| `2` | Design Thinking Workshop (Skopos Nova) | Skopos Nova GmbH | `12.495,00` | AP2 – Technologietransfer | `abgeschlossen` | `Ja` |
| `3` | Marketing-Kampagne (Crolla Lowis) | Crolla Lowis | `29.750,00` | AP4 – Öffentlichkeitsarbeit | `abgeschlossen` | `Ja` |
| `4` | Juristische Beratung (Redeker/Sellner/Dahs) | Redeker/Sellner/Dahs | `15.708,00` | AP1 – Projektmanagement | `Zuschlag` | `Ja` |
| **Σ** | **4 Vergabeverfahren** | — | **`81.953,00`** | — | **2 abgeschlossen / 2 Zuschlag** | **4 / 4** |

- **Ökoprofit-Checkups (`SEED_OEKOPROFIT_CHECKUPS`)**: Im Auslieferungszustand **`0` erfasste Einträge (`[]`)**; Vergütungssatz je Checkup beträgt **`5.000,00 €` brutto** bei `60.000,00 €` AZA-Gesamtbudget (`20.000 €/Jahr` in `2026–2028`, entspricht rechnerisch 12 Checkups à `5.000 €`).

### 5.6 Use-Cases (`SEED_USECASES`, 11 Pilotvorhaben)

- **Verteilung nach Batches**: Batch 1: **`3`** (`aktiv`) · Batch 2: **`7`** (`in Vorbereitung`) · Batch 3: **`1`** (`Pipeline`)
- **Verteilung nach Branchen**: Papier **`6`** · Textil **`3`** · Chemie **`2`**
- **Durchschnittliche Erfolgswahrscheinlichkeit**: **`80,09 %`** · **Integrierte Checklistenpunkte (`todos`)**: **`42`** (`0` im Seed erledigt)

| ID | Titel | Industrieunternehmen | Startup / Partner | Branche | Reifegrad | Batch | Status | Wahrsch. | Pol. Rel. | Deadline |
|---:|---|---|---|---|---|---|---|---|---:|---|
| `1` | Chemisches Recycling von Kunststoff- und Mischgewebeabfällen | GKD Group | re.solution GmbH | Textil | Pilotbetrieb | Batch 1 | `aktiv` | `85 %` | `5/5` | `2026-09-30` |
| `2` | KI-basierter Chatbot für den Maschinenpark | Sihl GmbH | INC Innovation Center GmbH | Papier | Pilotbetrieb | Batch 1 | `aktiv` | `82 %` | `4/5` | `2026-09-30` |
| `3` | Starke Netze — Peak-Shaving mit KI-gestützten Batteriespeichern | Leitungspartner GmbH / Dürener Industrie | minimum energy | Chemie | Pilotbetrieb | Batch 1 | `aktiv` | `80 %` | `5/5` | `2026-09-30` |
| `4` | KI-gestützte Fertigungsoptimierung & Gewebeinspektion | Heimbach GmbH | OptiVision AI Solutions | Textil | Prototyp | Batch 2 | `in Vorbereitung` | `85 %` | `5/5` | `2027-04-30` |
| `5` | Wasserstoffbasierte Prozesswärme in der Papierherstellung | Schoellershammer GmbH | H2-Heat Innovations | Papier | Konzept | Batch 2 | `in Vorbereitung` | `78 %` | `5/5` | `2027-03-31` |
| `6` | Biobasierte Barrierebeschichtungen für Spezialpapiere | Kanzan Spezialpapiere GmbH | BioCoat Materials | Papier | Konzept | Batch 2 | `in Vorbereitung` | `82 %` | `5/5` | `2027-05-31` |
| `7` | Zirkuläre Abwärmenutzung & Sektorenkopplung Tissue-Produktion | Metsä Tissue GmbH (Werk Kreuzau) | SymbioHeat Analytics | Papier | Idee | Batch 2 | `in Vorbereitung` | `75 %` | `4/5` | `2027-06-30` |
| `8` | Autonome KI-Fertigungsautomation & Großwalzenbearbeitung | Carl Krafft & Söhne GmbH & Co. KG | RobCo | Papier | Prototyp | Batch 2 | `in Vorbereitung` | `84 %` | `4/5` | `2027-04-30` |
| `9` | Inline-KI-Qualitätsüberwachung für technische Filtrationsvliese | Neenah Gessner / Textilindustrie Düren | SensorEdge AI | Textil | Prototyp | Batch 2 | `in Vorbereitung` | `86 %` | `4/5` | `2027-05-31` |
| `10` | Industrielle Abwärmespeicherung & Hochtemperatur-Speicher | AkzoNobel / Industriepark Rütgers | Kraftblock | Chemie | Idee | Batch 2 | `in Vorbereitung` | `79 %` | `5/5` | `2027-06-30` |
| `11` | Biobasierte Barrierebeschichtungen für Papierverpackungen | Mondi / Kanzan Spezialpapiere | BioCoat Materials (in Anbahnung) | Papier | Idee | Batch 3 | `Pipeline` | `65 %` | `4/5` | `2028-03-31` |

### 5.7 Partnerdatenbank (`SEED_PARTNER`, 25 Partner), Aufgaben (`SEED_TASKS`, 4) & Events (`SEED_EVENTS`, 4)

- **Partnerdatenbank (25 Einträge)**:
  - Nach Klassifikation: **`10`** Industrieunternehmen · **`10`** Startup / Lösungspartner · **`3`** Dienstleister · **`2`** Kooperationspartner
  - Nach Status: **`14`** Vorbereitung · **`6`** Pilot läuft · **`3`** aktiv · **`2`** abgeschlossen
- **Aufgaben (`4` Seed-Aufgaben)**:
  1. `Abstimmung Lastensteuerung definieren` (`in_bearbeitung`, Priorität `hoch`, fällig `2026-06-15`)
  2. `Maschinenpark-Handbücher in SharePoint hochladen` (`offen`, Priorität `mittel`, fällig `2026-06-30`)
  3. `Prüfungsnotizen der Kanzlei bewerten` (`offen`, Priorität `hoch`, fällig `2026-06-10`)
  4. `GEMA-Gebührenbeleg final prüfen` (`erledigt`, Priorität `niedrig`, fällig `2026-06-05`)
- **Events (`4` Meilensteine)**:
  1. `2025-06-25`: *DN POWER UP Kickoff Event* (Arena Kreis Düren)
  2. `2025-11-21`: *Design Thinking Workshop Use Cases* (WIN.DN Gründerzentrum)
  3. `2026-01-28`: *Regionalforum Strukturwandel* (FZ Jülich, Audimax)
  4. `2026-06-15`: *Sitzung Lenkungskreis Q2-2026* (Rathaus Düren)

---

## 6. Liquiditäts-Fallback-Annahmen & explizite Datenlücken

### 6.1 Fallback-Meilensteinzuflüsse (`LiquiditaetsPage.tsx`)
Sofern für eine Periode noch keine archivierten BAFA-Mittelabrufe im `localStorage` vorliegen, nutzt die Liquiditätsüberwachung folgende feste Meilenstein-Projektionswerte (ausschließlich `BAFA_BUND` 90 %):

| Jahr | Monat | Fallback-Einzahlung (€) | Hinweis |
|---|---|---:|---|
| **2025** | September (9) | `22.123,62` | Q2/Q3-Auszahlung (entspricht `BAFA-2025-Q2Q3`) |
| **2025** | Dezember (12) | `35.262,90` | Q4-Projektion (entspricht `BAFA-2025-Q4`) |
| **2026** | April (4) / Oktober (10) | `48.500,00` / `54.000,00` | Plan-Fallback `102.500,00 €` |
| **2027** | April (4) / Oktober (10) | `51.200,00` / `55.000,00` | Plan-Fallback `106.200,00 €` |
| **2028** | April (4) / Oktober (10) | `52.000,00` / `56.000,00` | Plan-Fallback `108.000,00 €` |
| **2029** | März (3) | `32.000,00` | Schluss-Fallback |

### 6.2 Explizit dokumentierte Datenlücken im aktuellen Auslieferungsstand
1. **Zahlungsanforderungen 2026 (`13.03.2026`, `01.06.2026`, `06.08.2026`)**: In `SEED_ZAHLUNGSANFORDERUNGEN` sind die Betragsfelder je `profi`-Position (`0812–0843`), die Zweimonats-Vorschau, der Kassenbestand sowie Zeile 19 mit **`0,00 €`** initialisiert und mit **`belegVollstaendig: false`** markiert. Die Originalbeträge aus den zugrunde liegenden BAFA-PDFs (`ZA_46SK0267X_20260313.pdf`, `ZA_46SK0267X_20260601.pdf`, `ZA_46SK0267X_20260806.pdf`) liegen nicht im Repository vor und müssen im Modul **ZA-Rechner (`profi-online`)** nachgetragen bzw. über *Auto-Ist* neu berechnet werden.
2. **Personalkosten ab 01/2026**: `SEED_PERSONAL` enthält 13 Monatsdatensätze für **07–12/2025**. Personaleinträge ab Januar 2026 sind im Initial-Seed nicht hinterlegt und werden über den Excel-Import (`Arbeitgeberkosten_Sachkosten_...xlsx`) oder die manuelle Erfassung eingepflegt.
3. **Rechnungsbelege ab Q2/2026**: `SEED_RECHNUNGEN` endet im Februar 2026 (`2026-02-10`); Belege der Position `0831` (Dienstreisen) sind im Seed noch `0`.
4. **Ökoprofit-Checkups (`0835`)**: Noch keine aktiven Checkups im Seed (`0` Datensätze).
