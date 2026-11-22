import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Rechnungsbeleg,
  SystemSettings,
  Zahlungsanforderung,
  ProfiPositionCode,
} from '../../types';
import { DEFAULT_SETTINGS } from '../../data';
import {
  createEmptyProfiAmounts,
  normalizeProfiAmounts,
  mulPercent,
  subEuro,
  sumEuro,
  roundEuro,
  PROFI_POSITIONEN,
} from '../../utils';
import { Sparkles, FileSpreadsheet, UploadCloud, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ExcelImportPageProps {
  settings?: SystemSettings;
  zas?: Zahlungsanforderung[];
  onImportPersonal: (data: any[]) => void;
  onImportRechnungen: (data: any[]) => void;
  onImportMittelabrufe: (data: any[]) => void;
  onImportVergaben: (data: any[]) => void;
  onImportPartners: (data: any[]) => void;
  onAddRechnung?: (beleg: Omit<Rechnungsbeleg, 'id'>) => { ok: boolean; error?: string };
  onSaveZa?: (za: Omit<Zahlungsanforderung, 'id'> | Zahlungsanforderung) => void;
}

export default function ExcelImportPage({
  settings = DEFAULT_SETTINGS,
  zas = [],
  onImportPersonal,
  onImportRechnungen,
  onImportMittelabrufe,
  onImportVergaben,
  onImportPartners,
  onAddRechnung,
  onSaveZa,
}: ExcelImportPageProps) {
  const [mode, setMode] = useState<'excel' | 'pdf'>('excel');

  // ── EXCEL / CSV WIZARD STATE ──
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [targetModule, setTargetModule] = useState<
    'personal' | 'rechnungen' | 'mittelabrufe' | 'vergaben' | 'partners'
  >('rechnungen');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [columnMappings, setColumnMappings] = useState<{ [key: string]: string }>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // ── KI-PDF PARSER STATE ──
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [pdfTargetType, setPdfTargetType] = useState<'rechnung' | 'za'>('rechnung');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfSuccess, setPdfSuccess] = useState<string | null>(null);
  const [pdfHash, setPdfHash] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [parsedRechnungDraft, setParsedRechnungDraft] = useState<Omit<Rechnungsbeleg, 'id'> | null>(null);
  const [parsedZaDraft, setParsedZaDraft] = useState<Omit<Zahlungsanforderung, 'id'> | null>(null);

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
    ],
    partners: [
      { label: 'name', req: true },
      { label: 'typ', req: true },
      { label: 'branche', req: true },
      { label: 'status', req: true },
      { label: 'email', req: false },
      { label: 'ort', req: false },
      { label: 'bewertung', req: false },
    ],
  };

  const currentTargetFields = TARGET_FIELDS[targetModule];

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
          setParseError('Die hochgeladene Datei enthält keine Daten.');
          return;
        }
        setParseError(null);

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

        const initialMap: any = {};
        currentTargetFields.forEach((field) => {
          const matched = headers.find(
            (h) =>
              h.toLowerCase() === field.label.toLowerCase() ||
              h.toLowerCase().includes(field.label.toLowerCase())
          );
          if (matched) initialMap[field.label] = matched;
        });
        setColumnMappings(initialMap);
        setImportStatusMessage(null);
        setStage(2);
      } catch (err: any) {
        setParseError('Fehler beim Lesen der Excel-Datei: ' + (err?.message || 'Unbekannter Fehler'));
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleLoadSampleTemplate = () => {
    let dummyHeaders: string[] = [];
    let dummyRows: any[] = [];

    if (targetModule === 'rechnungen') {
      dummyHeaders = ['Rechnungsnr.', 'Datum', 'Creditor', 'Betrag Netto (€)', 'Kostenart'];
      dummyRows = [
        {
          'Rechnungsnr.': 'RE-2026-618',
          Datum: '2026-06-15',
          Creditor: 'Dürener Stadtwerke',
          'Betrag Netto (€)': 1450.0,
          Kostenart: 'Hosting/Web',
        },
        {
          'Rechnungsnr.': 'RE-2026-702',
          Datum: '2026-07-20',
          Creditor: 'Messedienstleister GmbH',
          'Betrag Netto (€)': 4820.0,
          Kostenart: 'Marketing',
        },
      ];
    } else if (targetModule === 'personal') {
      dummyHeaders = ['Lohnmonat', 'Vorname', 'Nachname', 'Rolle', 'Gehalt Brutto (€)', 'AG-Kosten (€)', 'Abrechnungsjahr'];
      dummyRows = [
        {
          Lohnmonat: 6,
          Vorname: 'Elena',
          Nachname: 'Krämer',
          Rolle: 'Transformationsbeauftragte Papier',
          'Gehalt Brutto (€)': 4850.0,
          'AG-Kosten (€)': 5820.0,
          Abrechnungsjahr: 2026,
        },
      ];
    } else if (targetModule === 'mittelabrufe') {
      dummyHeaders = ['Beleg-Nr', 'von', 'bis', 'Betrag Beantragt (€)', 'Geldeingang (€)'];
      dummyRows = [
        {
          'Beleg-Nr': 'AB-Q1-2026',
          von: '2026-01-01',
          bis: '2026-03-31',
          'Betrag Beantragt (€)': 125000.0,
          'Geldeingang (€)': 0,
        },
      ];
    } else if (targetModule === 'vergaben') {
      dummyHeaders = ['Ausschreibungstitel', 'Bieter/Partner', 'Kalkulierter Wert (€)', 'Status'];
      dummyRows = [
        {
          Ausschreibungstitel: 'Digitale Leitstandssoftware',
          'Bieter/Partner': 'Control GmbH',
          'Kalkulierter Wert (€)': 75000.0,
          Status: 'Vorbereitung',
        },
      ];
    } else {
      dummyHeaders = ['Name des Partners', 'Typ des Partners', 'Branche / Sektor', 'Status', 'E-Mail', 'Firmensitz/Ort', 'Bewertung (1-5)'];
      dummyRows = [
        {
          'Name des Partners': 'Aachen Analytics GmbH',
          'Typ des Partners': 'Startup / Lösungspartner',
          'Branche / Sektor': 'Übergreifend',
          Status: 'aktiv',
          'E-Mail': 'hello@aachen-analytics.de',
          'Firmensitz/Ort': 'Aachen',
          'Bewertung (1-5)': 5,
        },
      ];
    }

    setParsedHeaders(dummyHeaders);
    setParsedRows(dummyRows);

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
    } else if (targetModule === 'mittelabrufe') {
      initialMap['abrufnummer'] = 'Beleg-Nr';
      initialMap['zeitraumVon'] = 'von';
      initialMap['zeitraumBis'] = 'bis';
      initialMap['beantragt'] = 'Betrag Beantragt (€)';
      initialMap['eingegangen'] = 'Geldeingang (€)';
    } else if (targetModule === 'vergaben') {
      initialMap['titel'] = 'Ausschreibungstitel';
      initialMap['auftragnehmer'] = 'Bieter/Partner';
      initialMap['auftragswert'] = 'Kalkulierter Wert (€)';
      initialMap['status'] = 'Status';
    } else {
      initialMap['name'] = 'Name des Partners';
      initialMap['typ'] = 'Typ des Partners';
      initialMap['branche'] = 'Branche / Sektor';
      initialMap['status'] = 'Status';
      initialMap['email'] = 'E-Mail';
      initialMap['ort'] = 'Firmensitz/Ort';
      initialMap['bewertung'] = 'Bewertung (1-5)';
    }

    setColumnMappings(initialMap);
    setStage(2);
  };

  const handleApplyMapping = () => {
    const errors: string[] = [];
    currentTargetFields.forEach((field) => {
      if (field.req && !columnMappings[field.label]) {
        errors.push(`Erforderliches ERP-Feld "${field.label}" ist keiner Excel-Spalte zugeordnet.`);
      }
    });
    setValidationErrors(errors);
    setStage(3);
  };

  const handleMergeData = () => {
    const normalizedData = parsedRows.map((row) => {
      const obj: any = {};
      currentTargetFields.forEach((f) => {
        const xlHeader = columnMappings[f.label];
        let val = xlHeader ? row[xlHeader] : undefined;

        if (
          ['betragNetto', 'arbeitnehmerBrutto', 'arbeitgeberKosten', 'beantragt', 'eingegangen', 'auftragswert', 'bewertung'].includes(
            f.label
          )
        ) {
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

    if (targetModule === 'personal') onImportPersonal(normalizedData);
    else if (targetModule === 'rechnungen') onImportRechnungen(normalizedData);
    else if (targetModule === 'mittelabrufe') onImportMittelabrufe(normalizedData);
    else if (targetModule === 'vergaben') onImportVergaben(normalizedData);
    else if (targetModule === 'partners') onImportPartners(normalizedData);

    setImportStatusMessage(
      `Erfolgreich ${normalizedData.length} Datensätze in das Modul "${targetModule.toUpperCase()}" eingepflegt.`
    );
    setStage(1);
    setParsedHeaders([]);
    setParsedRows([]);
  };

  // ── KI-PDF PARSING HANDLER ──
  const handlePdfUpload = async (file: File) => {
    setPdfError(null);
    setPdfSuccess(null);
    setParsedRechnungDraft(null);
    setParsedZaDraft(null);
    setPdfFileName(file.name);

    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      setPdfError('Der KI-PDF-Parser erfordert den laufenden Express-Backend-Server (nicht im file:// Offline-Modus).');
      return;
    }

    setPdfLoading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const raw = String(reader.result || '');
          const commaIdx = raw.indexOf(',');
          resolve(commaIdx >= 0 ? raw.slice(commaIdx + 1) : raw);
        };
        reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/parse-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64,
          mimeType: file.type || 'application/pdf',
          fileName: file.name,
          targetType: pdfTargetType,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || `Server-Fehler (${res.status})`);
      }

      setPdfHash(json.pdfHash || null);
      const d = json.data || {};

      if (pdfTargetType === 'rechnung') {
        const dat = d.rechnungsdatum || new Date().toISOString().slice(0, 10);
        const yr = parseInt(dat.slice(0, 4), 10) || 2026;
        const m = parseInt(dat.slice(5, 7), 10) || 1;
        const netto = roundEuro(Number(d.betragNetto) || 0);
        const brutto = roundEuro(Number(d.betragBrutto) || netto * 1.19);
        const mwst: 0 | 7 | 19 | 'brutto' = [0, 7, 19].includes(Number(d.mwstSatz))
          ? (Number(d.mwstSatz) as 0 | 7 | 19)
          : 'brutto';

        setParsedRechnungDraft({
          rechnungsnummer: d.rechnungsnummer || `PDF-${Date.now().toString().slice(-4)}`,
          rechnungssteller: d.rechnungssteller || 'Unbekannter Kreditor',
          leistungsbeschreibung: d.leistungsbeschreibung || file.name,
          rechnungsdatum: dat,
          zahlungsdatum: d.zahlungsdatum || null,
          kostenkategorie: d.kostenkategorie || 'Vergabeaufträge',
          profiPosition: (d.profiPosition as ProfiPositionCode) || '0835',
          foerderjahr: yr,
          quartal: Math.ceil(m / 3),
          arbeitspaket: d.arbeitspaket || 'AP2 – Technologietransfer',
          betragNetto: netto,
          betragBrutto: brutto,
          mwstSatz: mwst,
          foerderfaehigerBetrag: settings.vorsteuerabzugsberechtigt && mwst !== 'brutto' ? netto : brutto,
          foerderfaehig: true,
          pdfHash: json.pdfHash,
          status: 'ENTWURF',
        });
      } else {
        const istMap = normalizeProfiAmounts(d.istJePosition || createEmptyProfiAmounts());
        const vorschauMap = normalizeProfiAmounts(d.vorschauJePosition || createEmptyProfiAmounts());
        const sortedExisting = [...zas].sort((a, b) => a.datum.localeCompare(b.datum));
        const prevZa = sortedExisting[sortedExisting.length - 1];
        const fallbackSpalte2 = prevZa
          ? sumEuro([
              ...Object.values(prevZa.istJePosition || {}),
              ...Object.values(prevZa.vorschauJePosition || {}),
            ])
          : 0;
        const sp2 = d.spalte2BisherGeplant !== undefined ? roundEuro(Number(d.spalte2BisherGeplant)) : fallbackSpalte2;
        const z14 = mulPercent(sp2, 90);
        const z15 = mulPercent(sumEuro(Object.values(istMap)), 90);
        const z16 = subEuro(z14, z15);
        const z17 = roundEuro(Number(d.zeile17ZusatzVerrechnung) || 0);
        const z18 = mulPercent(sumEuro(Object.values(vorschauMap)), 90);
        const z19 =
          d.zeile19Anforderung !== undefined
            ? roundEuro(Number(d.zeile19Anforderung))
            : Math.max(0, subEuro(subEuro(z18, z16), z17));

        setParsedZaDraft({
          bezeichnung: d.bezeichnung || `ZA PDF Import (${file.name})`,
          kennung: d.kennung || '',
          datum: d.datum || new Date().toISOString().slice(0, 10),
          zeitraumVon: d.zeitraumVon || '2026-01-01',
          zeitraumBis: d.zeitraumBis || '2026-09-30',
          stichtagIst: d.stichtagIst || d.datum || new Date().toISOString().slice(0, 10),
          spalte2BisherGeplant: sp2,
          istJePosition: istMap,
          vorschauJePosition: vorschauMap,
          kassenbestand: z16,
          erhalteneBundesmittel: z14,
          zeile14BisherAnzurechnen: z14,
          zeile17ZusatzVerrechnung: z17,
          bundesanteilQuote: 0.9,
          zeile19Anforderung: z19,
          belegVollstaendig: true,
          manuelleKorrektur: false,
          pdfHash: json.pdfHash,
          status: 'Eingereicht',
          notizen: `KI-PDF Extrakt (SHA-256: ${String(json.pdfHash || '').slice(0, 12)})`,
        });
      }
    } catch (err: any) {
      setPdfError(err?.message || 'KI-Analyse der PDF fehlgeschlagen.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSaveParsedRechnung = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedRechnungDraft || !onAddRechnung) return;
    const res = onAddRechnung(parsedRechnungDraft);
    if (!res.ok) {
      setPdfError(res.error || 'Beleg konnte nicht gebucht werden.');
      return;
    }
    setPdfSuccess(`Sachbeleg ${parsedRechnungDraft.rechnungsnummer} inkl. PDF SHA-256 Hash revisionssicher eingebucht.`);
    setParsedRechnungDraft(null);
  };

  const handleSaveParsedZa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedZaDraft || !onSaveZa) return;
    onSaveZa(parsedZaDraft);
    setPdfSuccess(`Zahlungsanforderung „${parsedZaDraft.bezeichnung}“ inkl. PDF SHA-256 Hash im ZA-Rechner gesichert.`);
    setParsedZaDraft(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
            KI-PDF &amp; Excel Importer
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Automatisierte PDF-Belegextraktion (inkl. SHA-256 Prüfsumme) &amp; 3-Stufen Excel/CSV-Assistent
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-zinc-200/70 rounded-lg border border-zinc-200 self-start sm:self-auto">
          <button
            onClick={() => setMode('excel')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer ${
              mode === 'excel' ? 'bg-white text-zs-blau-schwarz shadow-xs' : 'text-zinc-600'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel / CSV Tabellen</span>
          </button>
          <button
            onClick={() => setMode('pdf')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer ${
              mode === 'pdf' ? 'bg-white text-zs-blau-schwarz shadow-xs' : 'text-zinc-600'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#58B49D]" />
            <span>KI-PDF Beleg- &amp; ZA-Parser</span>
          </button>
        </div>
      </div>

      {mode === 'pdf' ? (
        <div className="space-y-6">
          {pdfError && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{pdfError}</span>
            </div>
          )}
          {pdfSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl flex items-center gap-2.5 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{pdfSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-zinc-200 space-y-3">
              <h3 className="font-display font-bold text-sm text-zs-blau-schwarz">1. Dokumenttyp wählen</h3>
              <p className="text-xs text-zinc-500">
                Wählen Sie, ob das hochgeladene PDF eine Eingangsrechnung (Pos. 0831–0843) oder eine profi-online ZA ist.
              </p>
              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPdfTargetType('rechnung')}
                  className={`w-full text-left p-3 rounded-xl border cursor-pointer ${
                    pdfTargetType === 'rechnung'
                      ? 'bg-zs-blau-schwarz text-zs-signal-gelb border-zs-blau-schwarz font-bold'
                      : 'bg-white text-zinc-700 border-zinc-200'
                  }`}
                >
                  Eingangsrechnung / Sachbeleg (0831–0843)
                </button>
                <button
                  type="button"
                  onClick={() => setPdfTargetType('za')}
                  className={`w-full text-left p-3 rounded-xl border cursor-pointer ${
                    pdfTargetType === 'za'
                      ? 'bg-zs-blau-schwarz text-zs-signal-gelb border-zs-blau-schwarz font-bold'
                      : 'bg-white text-zinc-700 border-zinc-200'
                  }`}
                >
                  profi-online Zahlungsanforderung (ZA)
                </button>
              </div>
              {pdfHash && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] font-mono text-emerald-900 break-all space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Originaldokument SHA-256 ({pdfFileName})</span>
                  </div>
                  <div>{pdfHash}</div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-zinc-200 flex flex-col justify-center">
              <div
                onClick={() => !pdfLoading && pdfInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-200 hover:border-zs-blau-schwarz rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3 cursor-pointer bg-zinc-50/50 transition-all"
              >
                <input
                  type="file"
                  ref={pdfInputRef}
                  accept=".pdf,application/pdf,image/png,image/jpeg"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handlePdfUpload(e.target.files[0]);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <UploadCloud className="w-10 h-10 text-[#58B49D]" />
                <div>
                  <p className="text-xs font-bold text-zs-blau-schwarz">
                    {pdfLoading
                      ? 'Dokument wird serverseitig analysiert & SHA-256 gehasht...'
                      : 'PDF-Rechnung, Scan oder profi-online ZA-PDF hier hochladen'}
                  </p>
                  <p className="text-[11px] font-mono text-zinc-400 mt-1">
                    Unterstützt .pdf, .png, .jpg &middot; Serverseitige Extraktion ohne Browser-API-Key
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Review Extracted Rechnung */}
          {parsedRechnungDraft && (
            <form onSubmit={handleSaveParsedRechnung} className="bg-white p-6 rounded-xl border border-zinc-200 space-y-4">
              <h3 className="font-display font-bold text-base text-zs-blau-schwarz">
                Extrahierten Sachbeleg prüfen &amp; einbuchen
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Rechnungsnummer</label>
                  <input
                    type="text"
                    value={parsedRechnungDraft.rechnungsnummer}
                    onChange={(e) =>
                      setParsedRechnungDraft({ ...parsedRechnungDraft, rechnungsnummer: e.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Kreditor</label>
                  <input
                    type="text"
                    value={parsedRechnungDraft.rechnungssteller}
                    onChange={(e) =>
                      setParsedRechnungDraft({ ...parsedRechnungDraft, rechnungssteller: e.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">profi-Position</label>
                  <select
                    value={parsedRechnungDraft.profiPosition || '0835'}
                    onChange={(e) =>
                      setParsedRechnungDraft({
                        ...parsedRechnungDraft,
                        profiPosition: e.target.value as ProfiPositionCode,
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white font-mono"
                  >
                    <option value="0831">0831 · Dienstreisen</option>
                    <option value="0835">0835 · Vergabe / Fremdleistung</option>
                    <option value="0843">0843 · Sächl. Verwaltung</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Leistungsbeschreibung</label>
                  <input
                    type="text"
                    value={parsedRechnungDraft.leistungsbeschreibung}
                    onChange={(e) =>
                      setParsedRechnungDraft({ ...parsedRechnungDraft, leistungsbeschreibung: e.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Rechnungsdatum</label>
                  <input
                    type="date"
                    value={parsedRechnungDraft.rechnungsdatum}
                    onChange={(e) =>
                      setParsedRechnungDraft({ ...parsedRechnungDraft, rechnungsdatum: e.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Netto (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={parsedRechnungDraft.betragNetto}
                    onChange={(e) =>
                      setParsedRechnungDraft({
                        ...parsedRechnungDraft,
                        betragNetto: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Brutto (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={parsedRechnungDraft.betragBrutto}
                    onChange={(e) =>
                      setParsedRechnungDraft({
                        ...parsedRechnungDraft,
                        betragBrutto: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setParsedRechnungDraft(null)}
                  className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold cursor-pointer"
                >
                  Verwerfen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-zs-blau-schwarz text-white text-xs font-bold cursor-pointer"
                >
                  In Sachbelege (0831–0843) übernehmen
                </button>
              </div>
            </form>
          )}

          {/* Review Extracted ZA */}
          {parsedZaDraft && (
            <form onSubmit={handleSaveParsedZa} className="bg-white p-6 rounded-xl border border-zinc-200 space-y-4">
              <h3 className="font-display font-bold text-base text-zs-blau-schwarz">
                Extrahierte profi-online ZA prüfen &amp; übernehmen
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Bezeichnung</label>
                  <input
                    type="text"
                    value={parsedZaDraft.bezeichnung}
                    onChange={(e) => setParsedZaDraft({ ...parsedZaDraft, bezeichnung: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Kennung</label>
                  <input
                    type="text"
                    value={parsedZaDraft.kennung || ''}
                    onChange={(e) => setParsedZaDraft({ ...parsedZaDraft, kennung: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Zeile 19 (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={parsedZaDraft.zeile19Anforderung}
                    onChange={(e) =>
                      setParsedZaDraft({
                        ...parsedZaDraft,
                        zeile19Anforderung: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>
              <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] text-zinc-500">
                      <th className="p-2">Pos.</th>
                      <th className="p-2 text-right">Spalte 3 Ist (€)</th>
                      <th className="p-2 text-right">Spalte 5 Vorschau (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {PROFI_POSITIONEN.map((p) => (
                      <tr key={p.code}>
                        <td className="p-2 font-bold">{p.displayCode} · {p.kurzBezeichnung}</td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={parsedZaDraft.istJePosition[p.code]}
                            onChange={(e) =>
                              setParsedZaDraft({
                                ...parsedZaDraft,
                                istJePosition: {
                                  ...parsedZaDraft.istJePosition,
                                  [p.code]: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-32 px-2 py-1 text-right border border-zinc-300 rounded"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={parsedZaDraft.vorschauJePosition[p.code]}
                            onChange={(e) =>
                              setParsedZaDraft({
                                ...parsedZaDraft,
                                vorschauJePosition: {
                                  ...parsedZaDraft.vorschauJePosition,
                                  [p.code]: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-32 px-2 py-1 text-right border border-zinc-300 rounded"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setParsedZaDraft(null)}
                  className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold cursor-pointer"
                >
                  Verwerfen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-zs-blau-schwarz text-white text-xs font-bold cursor-pointer"
                >
                  In ZA-Rechner speichern
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        /* ── EXCEL / CSV WIZARD ── */
        <div className="space-y-6">
          {parseError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold">
              <div>{parseError}</div>
              <button onClick={() => setParseError(null)} className="text-red-500 hover:text-red-700 font-bold cursor-pointer">
                ✕
              </button>
            </div>
          )}

          {importStatusMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 text-xs font-semibold">
              <div>{importStatusMessage}</div>
            </div>
          )}

          <div className="bg-white p-5 rounded-xl border border-zinc-200 flex justify-between items-center text-xs font-mono">
            <div className="flex gap-4 items-center">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                  stage >= 1 ? 'bg-zs-blau-schwarz text-white' : 'bg-zinc-100 text-zinc-400'
                }`}
              >
                1
              </span>
              <span className={stage === 1 ? 'font-bold text-zs-blau-schwarz' : 'text-zinc-400'}>
                Upload &amp; Quellwahl
              </span>
            </div>
            <div className="h-0.5 bg-zinc-200 flex-grow mx-4" />
            <div className="flex gap-4 items-center">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                  stage >= 2 ? 'bg-zs-blau-schwarz text-white' : 'bg-zinc-100 text-zinc-400'
                }`}
              >
                2
              </span>
              <span className={stage === 2 ? 'font-bold text-zs-blau-schwarz' : 'text-zinc-400'}>Spalten-Mapping</span>
            </div>
            <div className="h-0.5 bg-zinc-200 flex-grow mx-4" />
            <div className="flex gap-4 items-center">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                  stage >= 3 ? 'bg-zs-blau-schwarz text-white' : 'bg-zinc-100 text-zinc-400'
                }`}
              >
                3
              </span>
              <span className={stage === 3 ? 'font-bold text-zs-blau-schwarz' : 'text-zinc-400'}>Review &amp; Merge</span>
            </div>
          </div>

          {stage === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-xl border border-zinc-200 space-y-4">
                <h3 className="font-display font-black text-sm text-zs-blau-schwarz">Target-Modul wählen</h3>
                <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                  Wählen Sie den Zielrechner im ERP-System, in den die importierten Spaltensätze gemischt werden sollen.
                </p>
                <div className="space-y-2">
                  {[
                    { key: 'rechnungen', label: 'Expense-Rechnungen (Sachbelege)' },
                    { key: 'personal', label: 'Echte Personalkosten (Lohnsätze)' },
                    { key: 'mittelabrufe', label: 'Finanzabrufe (BAFA Bund)' },
                    { key: 'vergaben', label: 'Vergabeausschreibungen' },
                    { key: 'partners', label: 'Partnerdatenbank (Akteure)' },
                  ].map((m) => (
                    <div
                      key={m.key}
                      onClick={() => setTargetModule(m.key as any)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                        targetModule === m.key
                          ? 'bg-zs-blau-schwarz text-zs-signal-gelb border-zs-blau-schwarz shadow-xs font-bold'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
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
                  <FileSpreadsheet className="w-10 h-10 text-zinc-300" />
                  <div>
                    <p className="text-xs font-semibold text-zs-blau-schwarz">
                      Spreadsheet drag &amp; drop oder hier klicken
                    </p>
                    <p className="text-[10px] font-mono text-zinc-400 mt-1">
                      Unterstützt .xlsx, .xls, .csv Tabellenblätter
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-between items-center pt-4 border-t border-zinc-100">
                  <span className="text-[11px] text-zinc-400 font-mono">Keine lokale Datei parat?</span>
                  <button
                    onClick={handleLoadSampleTemplate}
                    className="px-4 py-1.5 text-xs font-semibold rounded-full bg-zinc-100 border border-zinc-200 hover:bg-zs-blau-schwarz hover:text-white transition-all cursor-pointer"
                  >
                    Demodaten laden &amp; analysieren
                  </button>
                </div>
              </div>
            </div>
          )}

          {stage === 2 && (
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-6">
              <div>
                <h3 className="font-display font-bold text-base text-zs-blau-schwarz">Mapping der Excel-Spalten</h3>
                <p className="text-xs text-zinc-500 font-sans mt-0.5">
                  Verknüpfen Sie die Datenfelder des MiD-PCT ERPs mit den passenden Überschriften aus Ihrem Tabellenblatt.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {currentTargetFields.map((field) => (
                    <div key={field.label} className="grid grid-cols-3 items-center gap-4 text-xs font-mono">
                      <span className="text-zinc-600 font-medium">
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
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-xs text-zinc-600 space-y-2">
                  <div className="font-bold text-zs-blau-schwarz uppercase text-[10px] font-mono tracking-wider">
                    Gelesene Excel-Spalten:
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {parsedHeaders.map((h) => (
                      <span
                        key={h}
                        className="bg-white border border-zinc-200 text-zinc-600 text-[10px] px-2.5 py-1 rounded font-mono font-semibold"
                      >
                        {h}
                      </span>
                    ))}
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

          {stage === 3 && (
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-6">
              <div>
                <h3 className="font-display font-bold text-base text-zs-blau-schwarz">Revisionsprüfung vor Buchung</h3>
                <p className="text-xs text-zinc-500 font-sans mt-0.5">
                  Prüfen Sie die extrahierten Buchungssätze.
                </p>
              </div>

              {validationErrors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs space-y-1">
                  <strong className="font-bold">Zuweisungswarnungen:</strong>
                  {validationErrors.map((err, idx) => (
                    <div key={idx}>{err}</div>
                  ))}
                </div>
              )}

              <div className="overflow-x-auto border border-zinc-200 rounded-xl max-h-72 scrollbar-thin">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[9px] text-zinc-400 tracking-wider">
                      {currentTargetFields.map((f) => (
                        <th key={f.label} className="p-2.5">
                          {f.label}
                        </th>
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
                            <td
                              key={f.label}
                              className="p-2.5 font-mono text-[11px] text-zinc-600 truncate max-w-[150px]"
                            >
                              {cellVal === undefined ? '–' : String(cellVal)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
      )}
    </div>
  );
}
