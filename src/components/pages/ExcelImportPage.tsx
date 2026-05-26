import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

interface ExcelImportPageProps {
  onImportPersonal: (data: any[]) => void;
  onImportRechnungen: (data: any[]) => void;
  onImportMittelabrufe: (data: any[]) => void;
  onImportVergaben: (data: any[]) => void;
}

export default function ExcelImportPage({
  onImportPersonal,
  onImportRechnungen,
  onImportMittelabrufe,
  onImportVergaben,
}: ExcelImportPageProps) {
  // Wizard Stages: 1 = upload, 2 = column mapping, 3 = preview & merge
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [targetModule, setTargetModule] = useState<'personal' | 'rechnungen' | 'mittelabrufe' | 'vergaben'>('rechnungen');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsed spreadsheet data
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [columnMappings, setColumnMappings] = useState<{ [key: string]: string }>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);

  // Target structures for mappings
  const TARGET_FIELDS: { [key: string]: { label: string; req: boolean }[] } = {
    personal: [
      { label: 'monat', req: true },
      { label: 'vorname', req: true },
      { label: 'nachname', req: true },
      { label: 'position', req: false },
      { label: 'arbeitnehmerBrutto', req: true },
      { label: 'arbeitgeberKosten', req: true },
      { label: 'jahr', req: true },
    ],
    rechnungen: [
      { label: 'rechnungsnummer', req: true },
      { label: 'rechnungsdatum', req: true },
      { label: 'rechnungssteller', req: true },
      { label: 'betragNetto', req: true },
      { label: 'kostenkategorie', req: true },
      { label: 'foerderfaehig', req: false },
    ],
    mittelabrufe: [
      { label: 'abrufnummer', req: true },
      { label: 'zeitraumVon', req: true },
      { label: 'zeitraumBis', req: true },
      { label: 'beantragt', req: true },
      { label: 'eingegangen', req: false },
    ],
    vergaben: [
      { label: 'titel', req: true },
      { label: 'auftragnehmer', req: false },
      { label: 'auftragswert', req: true },
      { label: 'status', req: true },
    ]
  };

  const currentTargetFields = TARGET_FIELDS[targetModule];

  // Drag handlings
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileParsing(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileParsing(e.target.files[0]);
    }
  };

  // SheetJS Excel Parser
  const handleFileParsing = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data.length === 0) {
          alert('Die hochgeladene Datei enthält keine Daten.');
          return;
        }

        const headers = (data[0] || []).map((h) => String(h).trim());
        const rows = data.slice(1).map((r) => {
          const rowObj: any = {};
          headers.forEach((h, idx) => {
            rowObj[h] = r[idx];
          });
          return rowObj;
        });

        setParsedHeaders(headers);
        setParsedRows(rows);

        // Auto-detect mappings based on matching strings
        const initialMap: any = {};
        currentTargetFields.forEach((field) => {
          const matched = headers.find(
            (h) => h.toLowerCase() === field.label.toLowerCase() || h.toLowerCase().includes(field.label.toLowerCase())
          );
          if (matched) initialMap[field.label] = matched;
        });
        setColumnMappings(initialMap);

        setImportStatusMessage(null);
        setStage(2); // move on to column mapper
      } catch (err: any) {
        alert('Fehler beim Lesen der Excel-Datei: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Skip step / load dummy template generator
  const handleLoadSampleTemplate = () => {
    let dummyHeaders: string[] = [];
    let dummyRows: any[] = [];

    if (targetModule === 'rechnungen') {
      dummyHeaders = ['Rechnungsnr.', 'Datum', 'Creditor', 'Betrag Netto (€)', 'Kostenart'];
      dummyRows = [
        { 'Rechnungsnr.': 'RE-2026-618', 'Datum': '2026-06-15', 'Creditor': 'Dürener Stadtwerke', 'Betrag Netto (€)': 1450.00, 'Kostenart': 'Hosting/Web' },
        { 'Rechnungsnr.': 'RE-2026-702', 'Datum': '2026-07-20', 'Creditor': 'Messedienstleister GmbH', 'Betrag Netto (€)': 4820.00, 'Kostenart': 'Marketing' },
        { 'Rechnungsnr.': 'RE-2026-805', 'Datum': '2026-08-01', 'Creditor': 'RWTH Aachen Transfer', 'Betrag Netto (€)': 45000.00, 'Kostenart': 'Vergabeaufträge' },
      ];
    } else if (targetModule === 'personal') {
      dummyHeaders = ['Lohnmonat', 'Vorname', 'Nachname', 'Rolle', 'Gehalt Brutto (€)', 'AG-Kosten (€)', 'Abrechnungsjahr'];
      dummyRows = [
        { 'Lohnmonat': 6, 'Vorname': 'Elena', 'Nachname': 'Krämer', 'Rolle': 'Transformationsbeauftragte Papier', 'Gehalt Brutto (€)': 4850.00, 'AG-Kosten (€)': 5820.00, 'Abrechnungsjahr': 2026 },
        { 'Lohnmonat': 6, 'Vorname': 'Simon', 'Nachname': 'Wegner', 'Rolle': 'Projektleiter WIN.DN', 'Gehalt Brutto (€)': 5400.00, 'AG-Kosten (€)': 6480.00, 'Abrechnungsjahr': 2026 },
      ];
    } else {
      dummyHeaders = ['Code', 'Tag', 'Beschreibung', 'Betrag (€)'];
      dummyRows = [
        { 'Code': 'AB-Q1-2026', 'Tag': '2026-03-10', 'Beschreibung': 'Sonderabruf BAFA', 'Betrag (€)': 125000.00 }
      ];
    }

    setParsedHeaders(dummyHeaders);
    setParsedRows(dummyRows);

    // Initial Mapping
    const initialMap: any = {};
    if (targetModule === 'rechnungen') {
      initialMap['rechnungsnummer'] = 'Rechnungsnr.';
      initialMap['rechnungsdatum'] = 'Datum';
      initialMap['rechnungssteller'] = 'Creditor';
      initialMap['betragNetto'] = 'Betrag Netto (€)';
      initialMap['kostenkategorie'] = 'Kostenart';
    } else if (targetModule === 'personal') {
      initialMap['monat'] = 'Lohnmonat';
      initialMap['vorname'] = 'Vorname';
      initialMap['nachname'] = 'Nachname';
      initialMap['position'] = 'Rolle';
      initialMap['arbeitnehmerBrutto'] = 'Gehalt Brutto (€)';
      initialMap['arbeitgeberKosten'] = 'AG-Kosten (€)';
      initialMap['jahr'] = 'Abrechnungsjahr';
    }

    setColumnMappings(initialMap);
    setStage(2);
  };

  const handleApplyMapping = () => {
    // 1. Validation checks on mapped categories
    const errors: string[] = [];
    currentTargetFields.forEach((field) => {
      if (field.req && !columnMappings[field.label]) {
        errors.push(`Erforderliches ERP-Feld "${field.label}" ist keiner Excel-Spalte zugeordnet.`);
      }
    });

    setValidationErrors(errors);
    setStage(3); // Go to merge confirmations stage
  };

  const handleMergeData = () => {
    // Map Excel values into normalized structures
    const normalizedData = parsedRows.map((row) => {
      const obj: any = {};
      currentTargetFields.forEach((f) => {
        const xlHeader = columnMappings[f.label];
        let val = xlHeader ? row[xlHeader] : undefined;

        // Clean values
        if (f.label === 'betragNetto' || f.label === 'arbeitnehmerBrutto' || f.label === 'arbeitgeberKosten' || f.label === 'beantragt' || f.label === 'eingegangen' || f.label === 'auftragswert') {
          val = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, '')) || 0;
        } else if (f.label === 'monat' || f.label === 'jahr') {
          val = Number(val) || 0;
        } else if (f.label === 'foerderfaehig') {
          val = val === true || String(val).toLowerCase() === 'ja' || String(val).toLowerCase() === 'yes' || val === undefined;
        }

        obj[f.label] = val;
      });
      return obj;
    });

    // Invoke action handler
    if (targetModule === 'personal') {
      onImportPersonal(normalizedData);
    } else if (targetModule === 'rechnungen') {
      onImportRechnungen(normalizedData);
    } else if (targetModule === 'mittelabrufe') {
      onImportMittelabrufe(normalizedData);
    } else if (targetModule === 'vergaben') {
      onImportVergaben(normalizedData);
    }

    setImportStatusMessage(`Erfolgreich ${normalizedData.length} Datensätze in das Modul "${targetModule.toUpperCase()}" eingepflegt.`);
    setStage(1);
    setParsedHeaders([]);
    setParsedRows([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
          Excel &amp; <span className="bg-zs-signal-gelb px-1 py-0.5 rounded text-zs-blau-schwarz">CSV Importer</span>
        </h1>
        <p className="text-xs font-mono text-zinc-500 mt-1">
          Drei-Stufen-Assistent zur automatisierten Einreichung von Alt-Tabellen (SheetJS)
        </p>
      </div>

      {importStatusMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 text-xs font-semibold animate-fade-in">
          <span>🎉</span>
          <div>{importStatusMessage}</div>
        </div>
      )}

      {/* Progress Wizard Line */}
      <div className="bg-white p-5 rounded-xl border border-zinc-200 flex justify-between items-center text-xs font-mono">
        <div className="flex gap-4 items-center">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${stage >= 1 ? 'bg-zs-blau-schwarz text-white' : 'bg-zinc-100 text-zinc-400'}`}>1</span>
          <span className={stage === 1 ? 'font-bold text-zs-blau-schwarz' : 'text-zinc-400'}>Upload &amp; Quellwahl</span>
        </div>
        <div className="h-0.5 bg-zinc-200 flex-grow mx-4" />
        <div className="flex gap-4 items-center">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${stage >= 2 ? 'bg-zs-blau-schwarz text-white' : 'bg-zinc-100 text-zinc-400'}`}>2</span>
          <span className={stage === 2 ? 'font-bold text-zs-blau-schwarz' : 'text-zinc-400'}>Spalten-Mapping</span>
        </div>
        <div className="h-0.5 bg-zinc-200 flex-grow mx-4" />
        <div className="flex gap-4 items-center">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${stage >= 3 ? 'bg-zs-blau-schwarz text-white' : 'bg-zinc-100 text-zinc-400'}`}>3</span>
          <span className={stage === 3 ? 'font-bold text-zs-blau-schwarz' : 'text-zinc-400'}>Review &amp; Merge</span>
        </div>
      </div>

      {/* STAGE 1: UPLOAD ZONE */}
      {stage === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="bg-white p-5 rounded-xl border border-zinc-200 space-y-4">
            <h3 className="font-display font-black text-sm text-zs-blau-schwarz">Target-Modul wählen</h3>
            <p className="text-xs text-zinc-500 font-sans leading-relaxed">
              Wählen Sie den Zielrechner im ERP-System, in den die importierten Spaltensätze gemischt werden sollen.
            </p>
            <div className="space-y-2">
              {[
                { key: 'rechnungen', label: 'Expense-Rechnungen (Sachbelege)' },
                { key: 'personal', label: 'Echte Personalkosten (Lohnsätze)' },
                { key: 'mittelabrufe', label: 'Finanzabrufe (BAFA/LHO)' },
                { key: 'vergaben', label: 'Vergabeausschreibungen' },
              ].map((m) => (
                <div
                  key={m.key}
                  onClick={() => setTargetModule(m.key as any)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                    targetModule === m.key
                      ? 'bg-zs-blau-schwarz text-zs-signal-gelb border-zs-blau-schwarz shadow-xs font-bold'
                      : 'bg-white text-zinc-650 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <input
                    type="radio"
                    checked={targetModule === m.key}
                    onChange={() => {}}
                    className="accent-zs-signal-gelb cursor-pointer"
                  />
                  <span className="text-xs">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 p-5 flex flex-col justify-between">
            {/* Drag n drop box */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3 cursor-pointer select-none transition-all ${
                dragActive
                  ? 'border-zs-textil-gruen bg-zs-textil-gruen/5'
                  : 'border-zinc-200 hover:border-zs-blau-schwarz bg-zinc-50/50'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <span className="text-4xl text-zinc-300">📊</span>
              <div>
                <p className="text-xs font-semibold text-zs-blau-schwarz">Spreadsheet drag &amp; drop oder hier klicken</p>
                <p className="text-[10px] font-mono text-zinc-400 mt-1">Unterstützt .xlsx, .xls, .csv Tabellenblätter</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-between items-center pt-4 border-t border-zinc-100">
              <span className="text-[11px] text-zinc-400 font-mono">Keine lokale Datei parat?</span>
              <button
                onClick={handleLoadSampleTemplate}
                className="px-4 py-1.5 text-xs font-semibold rounded-full bg-zinc-100 border border-zinc-200 hover:bg-zs-blau-schwarz hover:text-white transition-all cursor-pointer"
              >
                🔬 Demodaten laden &amp; analysieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: COLUMN MAPPING DIALOG */}
      {stage === 2 && (
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-6 animate-fade-in">
          <div>
            <h3 className="font-display font-bold text-base text-zs-blau-schwarz">Mapping der Excel-Spalten</h3>
            <p className="text-xs text-zinc-500 font-sans mt-0.5">
              Verknüpfen Sie die Datenfelder des MiD-PCT ERPs mit den passenden Überschriften aus Ihrem Tabellenblatt.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form Fields Mappings */}
            <div className="space-y-4">
              {currentTargetFields.map((field) => (
                <div key={field.label} className="grid grid-cols-3 items-center gap-4 text-xs font-mono">
                  <span className="text-zinc-650 font-medium">
                    {field.label} {field.req && <span className="text-red-500">*</span>}
                  </span>
                  <span className="text-zinc-400 text-[10px] italic">mapped to ➜</span>
                  <select
                    value={columnMappings[field.label] || ''}
                    onChange={(e) => setColumnMappings({ ...columnMappings, [field.label]: e.target.value })}
                    className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz cursor-pointer font-sans"
                  >
                    <option value="">-- Nicht zuweisen --</option>
                    {parsedHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-150 text-xs text-zinc-600 space-y-2">
              <div className="font-bold text-zs-blau-schwarz uppercase text-[10px] font-mono tracking-wider">Gelesene Excel-Spalten:</div>
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {parsedHeaders.map((h) => (
                  <span key={h} className="bg-white border border-zinc-200 text-zinc-600 text-[10px] px-2.5 py-1 rounded font-mono font-semibold">
                    {h}
                  </span>
                ))}
              </div>
              <div className="text-[10px] text-zinc-400 pt-3 leading-relaxed">
                * Das System versucht Spalten wie "Rechnungsnummer" oder "Betrag" automatisch per Synonymen zuzuordnen. Korrigieren Sie falsche Zuordnungen manuell.
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
            <button
              onClick={() => setStage(1)}
              className="px-4 py-2 border border-zinc-200 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 rounded-full cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              onClick={handleApplyMapping}
              className="px-5 py-2 rounded-full bg-zs-signal-gelb text-zs-blau-schwarz font-extrabold text-xs hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-all cursor-pointer"
            >
              Zuordnung anwenden
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: PREVIEW DATA & COMMIT MERGE */}
      {stage === 3 && (
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-6 animate-fade-in">
          <div>
            <h3 className="font-display font-bold text-base text-zs-blau-schwarz">Revisionsprüfung vor Buchung</h3>
            <p className="text-xs text-zinc-500 font-sans mt-0.5">
              Prüfen Sie die extrahierten Buchungssätze. Zeilen mit fehlenden Muss-Angaben werden hervorgehoben.
            </p>
          </div>

          {validationErrors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-805 p-4 rounded-xl text-xs space-y-1">
              <strong className="font-bold">Zuweisungswarnungen:</strong>
              {validationErrors.map((err, idx) => (
                <div key={idx}>⚠️ {err}</div>
              ))}
            </div>
          )}

          {/* Quick Table Preview grid */}
          <div className="overflow-x-auto border border-zinc-150 rounded-xl max-h-72 scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[9px] text-zinc-400 tracking-wider">
                  {currentTargetFields.map((f) => (
                    <th key={f.label} className="p-2.5">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 10).map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-zinc-100 hover:bg-zinc-50/30">
                    {currentTargetFields.map((f) => {
                      const xlH = columnMappings[f.label];
                      const cellVal = xlH ? row[xlH] : undefined;
                      return (
                        <td key={f.label} className="p-2.5 font-mono text-[11px] text-zinc-600 truncate max-w-[150px]">
                          {cellVal === undefined ? '–' : String(cellVal)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedRows.length > 10 && (
            <p className="text-[10px] font-mono text-zinc-400 text-center">... und {parsedRows.length - 10} weitere Zeilen ...</p>
          )}

          <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
            <button
              onClick={() => setStage(2)}
              className="px-4 py-2 border border-zinc-200 text-xs font-semibold text-zinc-400 hover:bg-zinc-100 rounded-full cursor-pointer"
            >
              Zurück
            </button>
            <button
              onClick={handleMergeData}
              disabled={validationErrors.length > 0}
              className={`px-5 py-2 rounded-full font-bold text-xs transition-all cursor-pointer ${
                validationErrors.length > 0
                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed border-zinc-200'
                  : 'bg-zs-blau-schwarz text-zs-signal-gelb hover:opacity-90'
              }`}
            >
              In Datenbank einbuchen ({parsedRows.length} Sätze)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
