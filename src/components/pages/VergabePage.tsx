import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Vergabe, Task, OekoprofitCheckup, UseCase, SystemSettings } from '../../types';
import { DEFAULT_SETTINGS } from '../../data';
import {
  formatEuro,
  formatDate,
  addBusinessDaysISO,
  addWeeksISO,
  PROFI_STARK_FKZ,
} from '../../utils';
import {
  AlertTriangle,
  Check,
  Copy,
  Plus,
  Trash2,
  Edit3,
  FileCheck2,
  Calendar,
  FileSpreadsheet,
  FileText,
  ArrowRight,
  Download,
  Flame,
} from 'lucide-react';

function DeadlineRing({
  terminDatum,
  deadlineISO,
  done,
  maxDays,
}: {
  terminDatum?: string | null;
  deadlineISO: string | null;
  done: boolean;
  maxDays: number;
}) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  let ratio = 0;
  let label = '–';
  let strokeColor = '#cbd5e1';

  if (done) {
    ratio = 1;
    label = 'OK';
    strokeColor = '#10B981';
  } else if (deadlineISO && terminDatum) {
    const diffDays = Math.ceil(
      (new Date(`${deadlineISO}T23:59:59`).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    ratio = Math.max(0.08, Math.min(1, diffDays / maxDays));
    label = diffDays >= 0 ? `${diffDays}d` : `${diffDays}d`;
    strokeColor = diffDays < 0 ? '#dc2626' : diffDays <= 2 ? '#d97706' : '#00B4D8';
  }

  const dashOffset = circumference * (1 - ratio);

  return (
    <div className="relative w-9 h-9 shrink-0 flex items-center justify-center" title={done ? 'Fristgerecht erledigt' : deadlineISO ? `Frist: ${formatDate(deadlineISO)}` : 'Termin ausstehend'}>
      <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="#e4e4e7" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[9px] font-mono font-bold text-zs-blau-schwarz tabular-nums">
        {label}
      </span>
    </div>
  );
}

interface VergabePageProps {
  vergaben: Vergabe[];
  usecases?: UseCase[];
  oekoprofitCheckups?: OekoprofitCheckup[];
  activeYear: string | null;
  activeYearLabel: string;
  onAddVergabe: (vergabe: Omit<Vergabe, 'id'>) => void;
  onUpdateVergabe: (id: number, vergabe: Partial<Vergabe>) => void;
  onDeleteVergabe: (id: number) => void;
  onAddOekoprofit?: (item: Omit<OekoprofitCheckup, 'id'>) => void;
  onUpdateOekoprofit?: (id: number, item: Partial<OekoprofitCheckup>) => void;
  onDeleteOekoprofit?: (id: number) => void;
  onCreateOekoprofitInvoice?: (
    checkup: OekoprofitCheckup,
    trancheIndex: 1 | 2 | 3
  ) => { ok: boolean; rechnungId?: number; error?: string };
  onNavigateToRechnungen?: () => void;
  settings?: SystemSettings;
  tasks?: Task[];
  onUpdateTask?: (id: number, task: Partial<Task>) => void;
}

export default function VergabePage({
  vergaben,
  usecases = [],
  oekoprofitCheckups = [],
  activeYear,
  activeYearLabel,
  onAddVergabe,
  onUpdateVergabe,
  onDeleteVergabe,
  onAddOekoprofit,
  onUpdateOekoprofit,
  onDeleteOekoprofit,
  onCreateOekoprofitInvoice,
  onNavigateToRechnungen,
  settings = DEFAULT_SETTINGS,
  tasks = [],
  onUpdateTask,
}: VergabePageProps) {
  const gamificationEnabled = settings.gamificationMode !== false;
  const [subTab, setSubTab] = useState<'vergaben' | 'oekoprofit'>('vergaben');

  // VERGABEN STATES
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [vTitel, setVTitel] = useState('');
  const [vAn, setVAn] = useState('');
  const [vArt, setVArt] = useState('freihändige Vergabe');
  const [vWert, setVWert] = useState('');
  const [vAus, setVAus] = useState('');
  const [vFrist, setVFrist] = useState('');
  const [vZu, setVZu] = useState('');
  const [vVe, setVVe] = useState('');
  const [vAp, setVAp] = useState('AP2 – Technologietransfer');
  const [vUseCaseId, setVUseCaseId] = useState<string>('');
  const [vStatus, setVStatus] = useState<Vergabe['status']>('Vorbereitung');
  const [vBafa, setVBafa] = useState(false);
  const [vNotiz, setVNotiz] = useState('');

  // ÖKOPROFIT-CHECKUP STATES
  const [showOekoModal, setShowOekoModal] = useState(false);
  const [editingOekoId, setEditingOekoId] = useState<number | null>(null);
  const [deleteOekoConfirmId, setDeleteOekoConfirmId] = useState<number | null>(null);
  const [oekoFormError, setOekoFormError] = useState<string | null>(null);
  const [copiedOekoId, setCopiedOekoId] = useState<number | null>(null);
  const [invoiceFeedback, setInvoiceFeedback] = useState<string | null>(null);
  const [templateModal, setTemplateModal] = useState<{ title: string; content: string; filename: string } | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const [oStartup, setOStartup] = useState('');
  const [oBerater, setOBerater] = useState('');
  const [oBranche, setOBranche] = useState('Papier / Textil / Chemie');
  const [oVerguetung, setOVerguetung] = useState('5000');
  const [oT1, setOT1] = useState('');
  const [oT2, setOT2] = useState('');
  const [oT3, setOT3] = useState('');
  const [oStatus, setOStatus] = useState<OekoprofitCheckup['status']>('Geplant');
  const [oNotizen, setONotizen] = useState('');

  const STATI: Vergabe['status'][] = [
    'Vorbereitung',
    'Veröffentlichung',
    'Angebotsphase',
    'Prüfung',
    'Zuschlag',
    'abgeschlossen',
  ];

  const filteredVergaben = vergaben.filter((v) => {
    if (!activeYear) return true;
    const d = v.zuschlagsDatum || v.ausschreibungsDatum || '';
    if (!d) return true;
    const { von, bis } = (() => {
      if (activeYear === 'gesamt25') return { von: '2025-04-01', bis: '2025-12-31' };
      if (activeYear === 'mrz29') return { von: '2029-01-01', bis: '2029-03-31' };
      return { von: `${activeYear}-01-01`, bis: `${activeYear}-12-31` };
    })();
    return d >= von && d <= bis;
  });

  const missingBafaCount = filteredVergaben.filter(
    (v) => !v.bafaFreigabe && v.status !== 'abgeschlossen'
  ).length;
  const totalVolume = filteredVergaben.reduce((s, v) => s + (v.auftragswert || 0), 0);

  const oekoMetrics = useMemo(() => {
    const totalCommitted = oekoprofitCheckups.reduce((s, c) => s + (c.verguetungBrutto || 5000), 0);
    const totalReleased = oekoprofitCheckups.reduce((s, c) => {
      const basis = c.verguetungBrutto || 5000;
      return (
        s +
        (c.abschlag1Freigegeben ? basis * 0.25 : 0) +
        (c.abschlag2Freigegeben ? basis * 0.25 : 0) +
        (c.schlusszahlungFreigegeben ? basis * 0.5 : 0)
      );
    }, 0);
    const openReports = oekoprofitCheckups.filter(
      (c) =>
        (c.termin1Datum && !c.protokoll1Abgegeben) ||
        (c.termin2Datum && !c.protokoll2Abgegeben) ||
        (c.termin3Datum && !c.abschlussReportingAbgegeben)
    ).length;

    let protocolsExpected = 0;
    let protocolsInTime = 0;
    const todayISO = new Date().toISOString().slice(0, 10);
    oekoprofitCheckups.forEach((c) => {
      if (c.termin1Datum) {
        protocolsExpected++;
        const f1 = addBusinessDaysISO(c.termin1Datum, 5);
        if (c.protokoll1Abgegeben && (!f1 || todayISO <= f1 || c.abschlag1Freigegeben)) {
          protocolsInTime++;
        }
      }
      if (c.termin2Datum) {
        protocolsExpected++;
        const f2 = addBusinessDaysISO(c.termin2Datum, 5);
        if (c.protokoll2Abgegeben && (!f2 || todayISO <= f2 || c.abschlag2Freigegeben)) {
          protocolsInTime++;
        }
      }
      if (c.termin3Datum) {
        protocolsExpected++;
        const f3 = addWeeksISO(c.termin3Datum, 4);
        if (c.abschlussReportingAbgegeben && (!f3 || todayISO <= f3 || c.schlusszahlungFreigegeben)) {
          protocolsInTime++;
        }
      }
    });

    return {
      count: oekoprofitCheckups.length,
      totalCommitted,
      totalReleased,
      openReports,
      protocolsExpected,
      protocolsInTime,
    };
  }, [oekoprofitCheckups]);

  const handleEditClick = (v: Vergabe) => {
    setFormError(null);
    setEditingId(v.id);
    setVTitel(v.titel);
    setVAn(v.auftragnehmer);
    setVArt(v.vergabeart);
    setVWert(v.auftragswert ? String(v.auftragswert) : '');
    setVAus(v.ausschreibungsDatum || '');
    setVFrist(v.abgabeFrist || '');
    setVZu(v.zuschlagsDatum || '');
    setVVe(v.vertragsende || '');
    setVAp(v.arbeitspaket || 'AP2 – Technologietransfer');
    setVUseCaseId(v.useCaseId ? String(v.useCaseId) : '');
    setVStatus(v.status);
    setVBafa(v.bafaFreigabe);
    setVNotiz(v.notizen);
    setShowFormModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vTitel.trim()) {
      setFormError('Der Vergabetitel ist ein Pflichtfeld.');
      return;
    }
    setFormError(null);

    const payload = {
      titel: vTitel.trim(),
      auftragnehmer: vAn.trim(),
      vergabeart: vArt,
      auftragswert: parseFloat(vWert) || 0,
      ausschreibungsDatum: vAus || null,
      abgabeFrist: vFrist || null,
      zuschlagsDatum: vZu || null,
      vertragsende: vVe || null,
      arbeitspaket: vAp,
      useCaseId: vUseCaseId ? parseInt(vUseCaseId, 10) : null,
      status: vStatus,
      bafaFreigabe: vBafa,
      notizen: vNotiz.trim(),
    };

    if (editingId) {
      onUpdateVergabe(editingId, payload);
    } else {
      onAddVergabe(payload);
    }

    setEditingId(null);
    setVTitel('');
    setVAn('');
    setVWert('');
    setVAus('');
    setVFrist('');
    setVZu('');
    setVVe('');
    setVUseCaseId('');
    setVNotiz('');
    setVBafa(false);
    setShowFormModal(false);
  };

  const openNewOekoModal = () => {
    setOekoFormError(null);
    setEditingOekoId(null);
    setOStartup('');
    setOBerater('');
    setOBranche('Papier / Textil / Chemie');
    setOVerguetung('5000');
    setOT1('');
    setOT2('');
    setOT3('');
    setOStatus('Geplant');
    setONotizen('');
    setShowOekoModal(true);
  };

  const openEditOekoModal = (c: OekoprofitCheckup) => {
    setOekoFormError(null);
    setEditingOekoId(c.id);
    setOStartup(c.startupName);
    setOBerater(c.berater);
    setOBranche(c.branche);
    setOVerguetung(String(c.verguetungBrutto || 5000));
    setOT1(c.termin1Datum || '');
    setOT2(c.termin2Datum || '');
    setOT3(c.termin3Datum || '');
    setOStatus(c.status);
    setONotizen(c.notizen || '');
    setShowOekoModal(true);
  };

  const handleOekoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oStartup.trim()) {
      setOekoFormError('Bitte geben Sie den Namen des beratenen Startups an.');
      return;
    }
    setOekoFormError(null);
    const verguetung = parseFloat(oVerguetung) || 5000;

    if (editingOekoId && onUpdateOekoprofit) {
      onUpdateOekoprofit(editingOekoId, {
        startupName: oStartup.trim(),
        berater: oBerater.trim() || 'In Vergabe / Offen',
        branche: oBranche.trim() || 'Übergreifend',
        verguetungBrutto: verguetung,
        termin1Datum: oT1 || undefined,
        termin2Datum: oT2 || undefined,
        termin3Datum: oT3 || undefined,
        status: oStatus,
        notizen: oNotizen.trim(),
      });
    } else if (onAddOekoprofit) {
      onAddOekoprofit({
        startupName: oStartup.trim(),
        berater: oBerater.trim() || 'In Vergabe / Offen',
        branche: oBranche.trim() || 'Übergreifend',
        verguetungBrutto: verguetung,
        termin1Datum: oT1 || undefined,
        protokoll1Abgegeben: false,
        termin2Datum: oT2 || undefined,
        protokoll2Abgegeben: false,
        termin3Datum: oT3 || undefined,
        abschlussReportingAbgegeben: false,
        abschlag1Freigegeben: false,
        abschlag2Freigegeben: false,
        schlusszahlungFreigegeben: false,
        status: oStatus,
        notizen: oNotizen.trim(),
      });
    }
    setShowOekoModal(false);
  };

  const handleCopyOekoNachweis = (c: OekoprofitCheckup) => {
    const basis = c.verguetungBrutto || 5000;
    const f1 = addBusinessDaysISO(c.termin1Datum, 5);
    const f2 = addBusinessDaysISO(c.termin2Datum, 5);
    const f3 = addWeeksISO(c.termin3Datum, 4);
    const released =
      (c.abschlag1Freigegeben ? basis * 0.25 : 0) +
      (c.abschlag2Freigegeben ? basis * 0.25 : 0) +
      (c.schlusszahlungFreigegeben ? basis * 0.5 : 0);

    const text = [
      `LEISTUNGSNACHWEIS ÖKOPROFIT-CHECKUP / TRANSFORMATIONSBOOSTER`,
      `Projekt: Zukunftsstoff – Made in Düren / MiD-PTC (FKZ ${PROFI_STARK_FKZ})`,
      `profi-online Position: 0835 (Vergabe von Aufträgen / Fremdleistungen)`,
      `Methodik: Qualitativer, indikatorenbasierter Ressourcen-, Effizienz- und Wirkungs-Check (ohne formale LCA/ISO 14040)`,
      `------------------------------------------------------------------------`,
      `Startup: ${c.startupName} (${c.branche})`,
      `Beratungspartner: ${c.berater}`,
      `Gesamtvergütung brutto: ${formatEuro(basis, 2)} | Bisher freigegeben: ${formatEuro(released, 2)}`,
      ``,
      `1. Termin 1 (Skalierungsanalyse & Marktpotenziale): ${c.termin1Datum ? formatDate(c.termin1Datum) : 'offen'} | Protokoll (1–2 S., Frist ${f1 ? formatDate(f1) : '+5 WT'}): ${c.protokoll1Abgegeben ? 'JA' : 'NEIN'} | 1. Abschlag 25 % (${formatEuro(basis * 0.25, 2)}): ${c.abschlag1Freigegeben ? 'FREIGEGEBEN' : 'offen'}`,
      `2. Termin 2 (Regionale Markterschließung & Branchenintegration): ${c.termin2Datum ? formatDate(c.termin2Datum) : 'offen'} | Protokoll (1–2 S., Frist ${f2 ? formatDate(f2) : '+5 WT'}): ${c.protokoll2Abgegeben ? 'JA' : 'NEIN'} | 2. Abschlag 25 % (${formatEuro(basis * 0.25, 2)}): ${c.abschlag2Freigegeben ? 'FREIGEGEBEN' : 'offen'}`,
      `3. Termin 3 (Skalierungsstrategie & Pitch-Vorbereitung): ${c.termin3Datum ? formatDate(c.termin3Datum) : 'offen'} | Abschluss-Reporting (5–10 S., Frist ${f3 ? formatDate(f3) : '+4 Wo.'}): ${c.abschlussReportingAbgegeben ? 'JA' : 'NEIN'} | Schlusszahlung 50 % (${formatEuro(basis * 0.5, 2)}): ${c.schlusszahlungFreigegeben ? 'FREIGEGEBEN' : 'offen'}`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedOekoId(c.id);
    setTimeout(() => setCopiedOekoId(null), 2200);
  };

  const handleOpenTemplateModal = (c: OekoprofitCheckup, type: 'protokoll' | 'abschluss') => {
    const safeName = c.startupName.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (type === 'protokoll') {
      const content = [
        `# Ergebnisprotokoll Ökoprofit-Checkup (1–2 Seiten)`,
        ``,
        `- **Projekt:** Zukunftsstoff – Made in Düren / MiD-PTC (FKZ \`${PROFI_STARK_FKZ}\`)`,
        `- **profi-online Position:** 0835 (Vergabe von Aufträgen)`,
        `- **Startup:** ${c.startupName} (${c.branche})`,
        `- **Beratungspartner:** ${c.berater}`,
        `- **Termine:** T1 ${c.termin1Datum ? formatDate(c.termin1Datum) : 'tbd'} | T2 ${c.termin2Datum ? formatDate(c.termin2Datum) : 'tbd'}`,
        `- **Frist:** Max. 5 Werktage nach Beratungstermin`,
        ``,
        `## 1. Beratungsgegenstand & Teilnehmende`,
        `- Ansprechpartner Startup: ...`,
        `- Berater / WIN.DN Begleitung: ${c.berater}`,
        ``,
        `## 2. Indikatorenbasierter Ressourcen- & Effizienz-Check (qualitativ)`,
        `- Material- & Rohstoffeinsparung (Fokus Papier/Textil/Chemie): ...`,
        `- Energie- / CO2-Hebel im KMU-Einsatz (ohne formale ISO 14040 LCA): ...`,
        ``,
        `## 3. Beschlüsse & Nächste Schritte`,
        `- [ ] Maßnahme 1 (Verantwortlich / Termin)`,
        `- [ ] Vorbereitung Folgetermin / Abschlagsfreigabe (25 %)`,
      ].join('\n');
      setTemplateModal({
        title: `LV-Vorlage: Ergebnisprotokoll (1–2 S.) · ${c.startupName}`,
        content,
        filename: `Ergebnisprotokoll_${safeName}.md`,
      });
    } else {
      const content = [
        `# Abschluss-Reporting Ökoprofit-Checkup & Transformationsbooster (5–10 Seiten)`,
        ``,
        `- **Projekt:** Zukunftsstoff – Made in Düren / MiD-PTC (FKZ \`${PROFI_STARK_FKZ}\`)`,
        `- **Startup:** ${c.startupName} (${c.branche})`,
        `- **Beratungspartner:** ${c.berater}`,
        `- **Termin 3 (Abschluss):** ${c.termin3Datum ? formatDate(c.termin3Datum) : 'offen'} (Frist +4 Wochen)`,
        ``,
        `## 1. Executive Summary`,
        `Zusammenfassung der 3 Beratungsmeilensteine und zentraler Wirkungsindikatoren.`,
        ``,
        `## 2. Skalierungsanalyse & Marktpotenziale im Wirtschaftsraum Düren`,
        `Bewertung der industriellen Adaption in den Leitbranchen Papier, Textil und Chemie.`,
        ``,
        `## 3. Qualitativer Ressourcen-, Effizienz- und Transformations-Check`,
        `Indikatorbasierte Einsparpotenziale (Energie, Wasser, Reststoffe, Zirkularität).`,
        ``,
        `## 4. Roadmap, Pitch-Readiness & Empfehlungen zur Schlusszahlung (50 %)`,
        `Konkrete Use-Case-Empfehlung und Nachweis zur Freigabe der Schlussrate (${formatEuro((c.verguetungBrutto || 5000) * 0.5, 2)}).`,
      ].join('\n');
      setTemplateModal({
        title: `LV-Vorlage: Abschluss-Reporting (5–10 S.) · ${c.startupName}`,
        content,
        filename: `Abschluss_Reporting_${safeName}.md`,
      });
    }
    setCopiedTemplate(false);
  };

  const handleDownloadTemplate = () => {
    if (!templateModal) return;
    const blob = new Blob([templateModal.content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = templateModal.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const triggerTrancheInvoice = (c: OekoprofitCheckup, trancheIndex: 1 | 2 | 3) => {
    if (!onCreateOekoprofitInvoice) return;
    const res = onCreateOekoprofitInvoice(c, trancheIndex);
    if (res.ok) {
      setInvoiceFeedback(
        `Teilrechnung #${trancheIndex} für „${c.startupName}“ als Entwurf (Pos. 0835) in den Sachbelegen angelegt.`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
            Vergabemanagement <span className="text-zinc-500 font-semibold text-xl">&amp; Ökoprofit-Checkup</span>
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            FKZ {PROFI_STARK_FKZ} &middot; Pos. 0835 Vergabe von Aufträgen &middot; {activeYearLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {subTab === 'vergaben' ? (
            <button
              onClick={() => {
                setFormError(null);
                setEditingId(null);
                setVTitel('');
                setVAn('');
                setVWert('');
                setVAus('');
                setVFrist('');
                setVZu('');
                setVVe('');
                setVUseCaseId('');
                setVNotiz('');
                setVBafa(false);
                setVStatus('Vorbereitung');
                setShowFormModal(true);
              }}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-zs-blau-schwarz text-white hover:bg-[#08243d] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-zs-signal-gelb" />
              <span>Neue Vergabe</span>
            </button>
          ) : (
            <button
              onClick={openNewOekoModal}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-zs-blau-schwarz text-white hover:bg-[#08243d] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-zs-signal-gelb" />
              <span>Neuer Ökoprofit-Checkup (5.000 €)</span>
            </button>
          )}
        </div>
      </div>

      {/* Segmented Navigation */}
      <div className="inline-flex items-center gap-1 p-1 bg-zinc-200/70 rounded-lg border border-zinc-200">
        <button
          onClick={() => setSubTab('vergaben')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'vergaben'
              ? 'bg-white text-zs-blau-schwarz shadow-xs'
              : 'text-zinc-600 hover:text-zs-blau-schwarz'
          }`}
        >
          Ausschreibungen &amp; Kanban ({filteredVergaben.length})
        </button>
        <button
          onClick={() => setSubTab('oekoprofit')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'oekoprofit'
              ? 'bg-white text-zs-blau-schwarz shadow-xs'
              : 'text-zinc-600 hover:text-zs-blau-schwarz'
          }`}
        >
          Ökoprofit-Checkup &amp; Booster ({oekoprofitCheckups.length})
        </button>
      </div>

      {subTab === 'vergaben' ? (
        <>
          {missingBafaCount > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-900 p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong>Hinweis BAFA-Freigabe (Compliance-Gate):</strong> Es befinden sich{' '}
                <strong className="font-extrabold">{missingBafaCount} aktive Vergabe(n)</strong> ohne schriftliche
                BAFA-Freigabe im Umlauf. Verknüpfte Rechnungen werden im Status „EINGEREICHT“ bis zur Freigabe gesperrt.
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-zinc-200">
              <div className="text-[11px] font-mono text-zinc-500 uppercase">Vergabeverfahren aktiv</div>
              <div className="text-2xl font-mono font-bold text-zs-blau-schwarz tabular-nums mt-1">
                {filteredVergaben.filter((v) => v.status !== 'abgeschlossen').length} im Prozess
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-zinc-200">
              <div className="text-[11px] font-mono text-zinc-500 uppercase">Auftragswert Gesamt</div>
              <div className="text-2xl font-mono font-bold text-[#58B49D] tabular-nums mt-1">
                {formatEuro(totalVolume, 2)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-zinc-200">
              <div className="text-[11px] font-mono text-zinc-500 uppercase">Ausstehende Bewilligungen</div>
              <div className="text-2xl font-mono font-bold text-red-700 tabular-nums mt-1">
                {missingBafaCount} Anträge offen
              </div>
            </div>
          </div>

          {/* Kanban Container */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {STATI.map((colStatus) => {
              const colCards = filteredVergaben.filter((v) => v.status === colStatus);
              return (
                <div
                  key={colStatus}
                  className="bg-zinc-100/80 border border-zinc-200 rounded-xl p-3 flex flex-col min-h-64"
                >
                  <div className="flex justify-between items-center mb-3 pb-1.5 border-b border-zinc-300">
                    <span
                      className="text-[10px] font-mono font-bold tracking-wider text-zs-blau-schwarz uppercase truncate"
                      title={colStatus}
                    >
                      {colStatus}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-zinc-600 tabular-nums">
                      {colCards.length}
                    </span>
                  </div>
                  <div className="space-y-2 flex-grow overflow-y-auto max-h-[30rem]">
                    {colCards.length === 0 ? (
                      <div className="text-center py-6 text-[11px] text-zinc-400 font-mono">Keine Vergabe</div>
                    ) : (
                      colCards.map((v) => (
                        <div
                          key={v.id}
                          className="bg-white p-3 border border-zinc-200 rounded-lg hover:border-zs-blau-schwarz transition-colors flex flex-col gap-1 text-xs"
                        >
                          <div className="font-semibold text-zs-blau-schwarz leading-tight" title={v.titel}>
                            {v.titel}
                          </div>
                          {v.auftragswert > 0 && (
                            <div className="font-mono text-[11px] text-zinc-600 tabular-nums mt-0.5">
                              {formatEuro(v.auftragswert, 2)}
                            </div>
                          )}
                          {v.useCaseId && (
                            <div className="text-[10px] font-mono text-zinc-500">
                              Use-Case #{v.useCaseId}
                            </div>
                          )}
                          {!v.bafaFreigabe && v.status !== 'abgeschlossen' && (
                            <div className="text-[10px] font-mono text-red-700 font-semibold flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>BAFA-Freigabe fehlt</span>
                            </div>
                          )}

                          {tasks && tasks.filter((t) => t.vergabeId === v.id).length > 0 && (
                            <div className="mt-2 space-y-1 text-[10px] font-mono border-t border-zinc-100 pt-2">
                              <span className="text-zinc-500 block font-semibold">
                                Aufgaben ({tasks.filter((t) => t.vergabeId === v.id && t.status === 'erledigt').length}/
                                {tasks.filter((t) => t.vergabeId === v.id).length}):
                              </span>
                              {tasks
                                .filter((t) => t.vergabeId === v.id)
                                .map((t) => (
                                  <div key={t.id} className="flex items-center gap-1.5 truncate text-zinc-700">
                                    <input
                                      type="checkbox"
                                      checked={t.status === 'erledigt'}
                                      onChange={() => {
                                        if (onUpdateTask) {
                                          onUpdateTask(t.id, {
                                            status: t.status === 'erledigt' ? 'offen' : 'erledigt',
                                          });
                                        }
                                      }}
                                      className="cursor-pointer rounded border-zinc-300 h-3 w-3 text-zs-blau-schwarz"
                                    />
                                    <span
                                      className={`truncate ${
                                        t.status === 'erledigt' ? 'line-through text-zinc-400' : ''
                                      }`}
                                      title={t.title}
                                    >
                                      {t.title}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}

                          {deleteConfirmId === v.id ? (
                            <div className="flex gap-1.5 items-center bg-red-50 p-1.5 rounded border border-red-200 mt-2 w-full justify-between">
                              <span className="text-[10px] text-red-700 font-bold font-mono">Löschen?</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    onDeleteVergabe(v.id);
                                    setDeleteConfirmId(null);
                                  }}
                                  className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 cursor-pointer"
                                >
                                  Ja
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-0.5 rounded bg-zinc-200 text-zinc-700 text-[10px] font-bold hover:bg-zinc-300 cursor-pointer"
                                >
                                  Nein
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-1.5 mt-2 pt-1.5 border-t border-zinc-100 text-[11px] font-mono">
                              <button
                                onClick={() => handleEditClick(v)}
                                className="px-2 py-1 border border-zinc-200 rounded hover:bg-zs-blau-schwarz hover:text-white hover:border-zs-blau-schwarz transition-colors cursor-pointer flex-1"
                              >
                                Bearbeiten
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(v.id)}
                                className="px-2 py-1 text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                title="Löschen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vergabe Registry List */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/70">
              <span className="font-mono text-xs font-bold text-zinc-600 uppercase tracking-wider">
                Vergaberegister (0835 / 0843)
              </span>
              <span className="text-xs text-zinc-500 font-mono tabular-nums">
                {filteredVergaben.length} Verfahren
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] text-zinc-500 uppercase">
                    <th className="p-3 pl-5">Ausschreibungstitel</th>
                    <th className="p-3">Auftragnehmer / Bieter</th>
                    <th className="p-3">Art der Vergabe</th>
                    <th className="p-3 text-right">Auftragswert (€)</th>
                    <th className="p-3">Fristen</th>
                    <th className="p-3 text-center">BAFA Freigabe</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredVergaben.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs text-zinc-400 font-mono">
                        Keine Vergabeaufträge registriert für {activeYearLabel}.
                      </td>
                    </tr>
                  ) : (
                    filteredVergaben.map((v) => {
                      const linkedUc = v.useCaseId ? usecases.find((u) => u.id === v.useCaseId) : null;
                      return (
                        <tr key={v.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="p-3 pl-5 font-bold text-zs-blau-schwarz max-w-[240px]">
                            <div className="truncate" title={v.titel}>
                              {v.titel}
                            </div>
                            {linkedUc && (
                              <div className="text-[10px] font-mono font-normal text-zinc-500">
                                Use-Case: {linkedUc.unternehmen}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-zinc-700 font-medium">{v.auftragnehmer || '–'}</td>
                          <td className="p-3 text-zinc-500">{v.vergabeart || '–'}</td>
                          <td className="p-3 text-right font-mono font-semibold tabular-nums">
                            {v.auftragswert ? formatEuro(v.auftragswert, 2) : '–'}
                          </td>
                          <td className="p-3 text-zinc-600 font-mono text-[11px] tabular-nums space-y-0.5">
                            {v.abgabeFrist && <div>Abgabe: {formatDate(v.abgabeFrist)}</div>}
                            {v.zuschlagsDatum && <div>Zuschlag: {formatDate(v.zuschlagsDatum)}</div>}
                          </td>
                          <td className="p-3 text-center font-mono text-[11px] font-bold">
                            <span className={v.bafaFreigabe ? 'text-emerald-700' : 'text-red-700'}>
                              {v.bafaFreigabe ? 'Freigegeben' : 'Fehlt'}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-[11px] font-semibold text-zs-blau-schwarz">
                            {v.status}
                          </td>
                          <td className="p-3 pr-5 text-right space-x-2 whitespace-nowrap">
                            {deleteConfirmId === v.id ? (
                              <div className="inline-flex gap-1.5 items-center bg-red-50 p-1 px-2 rounded border border-red-200">
                                <span className="text-[10px] text-red-700 font-bold font-mono">Löschen?</span>
                                <button
                                  onClick={() => {
                                    onDeleteVergabe(v.id);
                                    setDeleteConfirmId(null);
                                  }}
                                  className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 cursor-pointer"
                                >
                                  Ja
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-0.5 rounded bg-zinc-200 text-zinc-700 text-[10px] font-bold hover:bg-zinc-300 cursor-pointer"
                                >
                                  Nein
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditClick(v)}
                                  className="px-2.5 py-1 rounded border border-zinc-200 hover:bg-zs-blau-schwarz hover:text-white transition-colors text-[11px] font-semibold text-zinc-800 cursor-pointer"
                                >
                                  Bearbeiten
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(v.id)}
                                  className="px-2 py-1 rounded text-red-600 hover:bg-red-50 transition-colors text-[11px] font-semibold cursor-pointer"
                                >
                                  Löschen
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* TAB 2: ÖKOPROFIT-CHECKUP & TRANSFORMATIONSBOOSTER */
        <div className="space-y-5">
          {invoiceFeedback && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold">{invoiceFeedback}</span>
              <div className="flex items-center gap-2">
                {onNavigateToRechnungen && (
                  <button
                    onClick={onNavigateToRechnungen}
                    className="px-3 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Zu Sachbelegen 0831–0843</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => setInvoiceFeedback(null)}
                  className="text-emerald-700 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-zinc-200 rounded-xl p-4 text-xs text-zinc-700 space-y-1.5">
            <div className="font-bold text-zs-blau-schwarz flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#58B49D]" />
              <span>Leistungsverzeichnis Ökoprofit-Checkup &amp; Transformationsbooster (profi-online Pos. 0835)</span>
            </div>
            <p className="font-mono text-[11px] text-zinc-600">
              5.000,00 € brutto pauschal je Startup &middot; 3 Beratungstermine &middot; Ergebnisprotokolle (1–2 Seiten) max. 5 Werktage nach T1/T2 &middot; Abschluss-Reporting (5–10 Seiten) max. 4 Wochen nach T3 &middot; Abschläge: 25 % / 25 % / 50 % &middot; Qualitativer Ressourcen-/Wirkungs-Check (keine formale Ökobilanzierung / LCA).
            </p>
          </div>

          {/* Ökoprofit KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-zinc-200">
              <div className="text-[11px] font-mono text-zinc-500 uppercase">Begleitete Startups</div>
              <div className="text-2xl font-mono font-bold text-zs-blau-schwarz tabular-nums mt-1">
                {oekoMetrics.count}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-zinc-200">
              <div className="text-[11px] font-mono text-zinc-500 uppercase">Zugesagtes Volumen (0835)</div>
              <div className="text-2xl font-mono font-bold text-zs-blau-schwarz tabular-nums mt-1">
                {formatEuro(oekoMetrics.totalCommitted, 2)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-zinc-200">
              <div className="text-[11px] font-mono text-zinc-500 uppercase">Freigegebene Abschläge</div>
              <div className="text-2xl font-mono font-bold text-[#58B49D] tabular-nums mt-1">
                {formatEuro(oekoMetrics.totalReleased, 2)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-zinc-200">
              <div className="text-[11px] font-mono text-zinc-500 uppercase">
                {gamificationEnabled ? '5-Werktage-Protokoll-Streak' : 'Offene Protokolle / Fristen'}
              </div>
              {gamificationEnabled ? (
                <div className="mt-1 flex items-baseline justify-between">
                  <div className="text-2xl font-mono font-bold text-[#10B981] tabular-nums flex items-center gap-1.5">
                    <Flame className="w-5 h-5 text-amber-500" />
                    <span>
                      {oekoMetrics.protocolsInTime} / {oekoMetrics.protocolsExpected}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {oekoMetrics.protocolsExpected > 0 &&
                    oekoMetrics.protocolsInTime === oekoMetrics.protocolsExpected
                      ? 'Gold-Status'
                      : `${oekoMetrics.openReports} offen`}
                  </span>
                </div>
              ) : (
                <div
                  className={`text-2xl font-mono font-bold tabular-nums mt-1 ${
                    oekoMetrics.openReports > 0 ? 'text-amber-700' : 'text-zinc-600'
                  }`}
                >
                  {oekoMetrics.openReports}
                </div>
              )}
            </div>
          </div>

          {oekoprofitCheckups.length === 0 ? (
            <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-10 text-center space-y-3">
              <div className="font-display font-bold text-base text-zs-blau-schwarz">
                Noch kein Ökoprofit-Checkup erfasst
              </div>
              <p className="text-xs text-zinc-500 max-w-lg mx-auto">
                Erfassen Sie Startups im Ökoprofit-Checkup (5.000,00 € brutto pauschal unter Pos. 0835), um die 3 Beratungstermine, Fristen sowie Abschlags-Teilrechnungen zu steuern.
              </p>
              <button
                onClick={openNewOekoModal}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-zs-blau-schwarz text-white hover:bg-[#08243d] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-zs-signal-gelb" />
                <span>Ersten Checkup anlegen</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {oekoprofitCheckups.map((c) => {
                const basis = c.verguetungBrutto || 5000;
                const frist1 = addBusinessDaysISO(c.termin1Datum, 5);
                const frist2 = addBusinessDaysISO(c.termin2Datum, 5);
                const frist3 = addWeeksISO(c.termin3Datum, 4);
                const releasedSum =
                  (c.abschlag1Freigegeben ? basis * 0.25 : 0) +
                  (c.abschlag2Freigegeben ? basis * 0.25 : 0) +
                  (c.schlusszahlungFreigegeben ? basis * 0.5 : 0);

                return (
                  <div key={c.id} className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-3">
                      <div>
                        <div className="text-[11px] font-mono text-zinc-500">
                          {c.branche} &middot; Berater: {c.berater} &middot; Status:{' '}
                          <strong className="text-zs-blau-schwarz">{c.status}</strong>
                        </div>
                        <h3 className="font-display font-bold text-lg text-zs-blau-schwarz mt-0.5">
                          {c.startupName}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums">
                        <span className="text-zinc-600">
                          Freigabe: <strong className="text-zs-blau-schwarz">{formatEuro(releasedSum, 2)}</strong> /{' '}
                          {formatEuro(basis, 2)}
                        </span>
                        <button
                          onClick={() => handleOpenTemplateModal(c, 'protokoll')}
                          className="px-2.5 py-1 border border-zinc-200 rounded-lg hover:bg-zinc-50 flex items-center gap-1 cursor-pointer text-[11px]"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Protokoll-Vorlage</span>
                        </button>
                        <button
                          onClick={() => handleOpenTemplateModal(c, 'abschluss')}
                          className="px-2.5 py-1 border border-zinc-200 rounded-lg hover:bg-zinc-50 flex items-center gap-1 cursor-pointer text-[11px]"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Abschluss-Vorlage</span>
                        </button>
                        <button
                          onClick={() => handleCopyOekoNachweis(c)}
                          className="px-2.5 py-1 border border-zinc-200 rounded-lg hover:bg-zinc-50 flex items-center gap-1 cursor-pointer text-[11px]"
                        >
                          {copiedOekoId === c.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#58B49D]" />
                              <span>Kopiert</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Leistungsnachweis</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => openEditOekoModal(c)}
                          className="px-2.5 py-1 border border-zinc-200 rounded-lg hover:bg-zinc-50 flex items-center gap-1 cursor-pointer text-[11px]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Bearbeiten</span>
                        </button>
                        {deleteOekoConfirmId === c.id ? (
                          <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 rounded px-2 py-0.5 text-[11px]">
                            <button
                              onClick={() => {
                                onDeleteOekoprofit?.(c.id);
                                setDeleteOekoConfirmId(null);
                              }}
                              className="text-red-700 font-bold cursor-pointer"
                            >
                              Löschen bestätigen
                            </button>
                            <button
                              onClick={() => setDeleteOekoConfirmId(null)}
                              className="text-zinc-500 ml-1 cursor-pointer"
                            >
                              Abbrechen
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeleteOekoConfirmId(c.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="Checkup löschen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Termin 1 */}
                      <div className="border border-zinc-200 rounded-lg p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-zs-blau-schwarz">
                            Termin 1 · Skalierungsanalyse &amp; Marktpotenziale
                          </div>
                          {gamificationEnabled && (
                            <DeadlineRing
                              terminDatum={c.termin1Datum}
                              deadlineISO={frist1}
                              done={c.protokoll1Abgegeben}
                              maxDays={7}
                            />
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-600 flex items-center gap-1.5 tabular-nums">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Termin: {c.termin1Datum ? formatDate(c.termin1Datum) : 'noch offen'}</span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500 tabular-nums">
                          Protokollfrist (+5 WT): <strong>{frist1 ? formatDate(frist1) : 'nach Termin'}</strong>
                        </div>
                        <div className="pt-2 border-t border-zinc-100 space-y-1.5">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={c.protokoll1Abgegeben}
                              onChange={(e) =>
                                onUpdateOekoprofit?.(c.id, { protokoll1Abgegeben: e.target.checked })
                              }
                              className="accent-zs-blau-schwarz"
                            />
                            <span>Ergebnisprotokoll 1 (1–2 S.) liegt vor</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer font-mono text-[11px] tabular-nums">
                            <input
                              type="checkbox"
                              checked={c.abschlag1Freigegeben}
                              onChange={(e) =>
                                onUpdateOekoprofit?.(c.id, { abschlag1Freigegeben: e.target.checked })
                              }
                              className="accent-[#58B49D]"
                            />
                            <span>1. Abschlag (25 % = {formatEuro(basis * 0.25, 2)}) freigegeben</span>
                          </label>
                          <AnimatePresence>
                            {c.abschlag1Freigegeben && !c.tranche1Invoiced && onCreateOekoprofitInvoice && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <button
                                  type="button"
                                  onClick={() => triggerTrancheInvoice(c, 1)}
                                  className="mt-1.5 w-full py-1.5 px-2.5 rounded-lg bg-zs-blau-schwarz text-white text-[11px] font-bold hover:bg-[#08243d] flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5 text-zs-signal-gelb" />
                                  <span>Teilrechnung 1 in Sachbelege (0835)</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          {c.tranche1Invoiced && (
                            <div className="text-[10px] font-mono text-emerald-700 font-bold pt-1">
                              In Sachbelegen (0835) erfasst
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Termin 2 */}
                      <div className="border border-zinc-200 rounded-lg p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-zs-blau-schwarz">
                            Termin 2 · Regionale Markterschließung &amp; KMU-Integration
                          </div>
                          {gamificationEnabled && (
                            <DeadlineRing
                              terminDatum={c.termin2Datum}
                              deadlineISO={frist2}
                              done={c.protokoll2Abgegeben}
                              maxDays={7}
                            />
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-600 flex items-center gap-1.5 tabular-nums">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Termin: {c.termin2Datum ? formatDate(c.termin2Datum) : 'noch offen'}</span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500 tabular-nums">
                          Protokollfrist (+5 WT): <strong>{frist2 ? formatDate(frist2) : 'nach Termin'}</strong>
                        </div>
                        <div className="pt-2 border-t border-zinc-100 space-y-1.5">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={c.protokoll2Abgegeben}
                              onChange={(e) =>
                                onUpdateOekoprofit?.(c.id, { protokoll2Abgegeben: e.target.checked })
                              }
                              className="accent-zs-blau-schwarz"
                            />
                            <span>Ergebnisprotokoll 2 (1–2 S.) liegt vor</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer font-mono text-[11px] tabular-nums">
                            <input
                              type="checkbox"
                              checked={c.abschlag2Freigegeben}
                              onChange={(e) =>
                                onUpdateOekoprofit?.(c.id, { abschlag2Freigegeben: e.target.checked })
                              }
                              className="accent-[#58B49D]"
                            />
                            <span>2. Abschlag (25 % = {formatEuro(basis * 0.25, 2)}) freigegeben</span>
                          </label>
                          <AnimatePresence>
                            {c.abschlag2Freigegeben && !c.tranche2Invoiced && onCreateOekoprofitInvoice && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <button
                                  type="button"
                                  onClick={() => triggerTrancheInvoice(c, 2)}
                                  className="mt-1.5 w-full py-1.5 px-2.5 rounded-lg bg-zs-blau-schwarz text-white text-[11px] font-bold hover:bg-[#08243d] flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5 text-zs-signal-gelb" />
                                  <span>Teilrechnung 2 in Sachbelege (0835)</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          {c.tranche2Invoiced && (
                            <div className="text-[10px] font-mono text-emerald-700 font-bold pt-1">
                              In Sachbelegen (0835) erfasst
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Termin 3 */}
                      <div className="border border-zinc-200 rounded-lg p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-zs-blau-schwarz">
                            Termin 3 · Skalierungsstrategie &amp; Pitch-Vorbereitung
                          </div>
                          {gamificationEnabled && (
                            <DeadlineRing
                              terminDatum={c.termin3Datum}
                              deadlineISO={frist3}
                              done={c.abschlussReportingAbgegeben}
                              maxDays={28}
                            />
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-600 flex items-center gap-1.5 tabular-nums">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Termin: {c.termin3Datum ? formatDate(c.termin3Datum) : 'noch offen'}</span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500 tabular-nums">
                          Reportingfrist (+4 Wo.): <strong>{frist3 ? formatDate(frist3) : 'nach Termin'}</strong>
                        </div>
                        <div className="pt-2 border-t border-zinc-100 space-y-1.5">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={c.abschlussReportingAbgegeben}
                              onChange={(e) =>
                                onUpdateOekoprofit?.(c.id, {
                                  abschlussReportingAbgegeben: e.target.checked,
                                })
                              }
                              className="accent-zs-blau-schwarz"
                            />
                            <span>Abschluss-Reporting (5–10 S.) abgenommen</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer font-mono text-[11px] tabular-nums">
                            <input
                              type="checkbox"
                              checked={c.schlusszahlungFreigegeben}
                              onChange={(e) =>
                                onUpdateOekoprofit?.(c.id, {
                                  schlusszahlungFreigegeben: e.target.checked,
                                })
                              }
                              className="accent-[#58B49D]"
                            />
                            <span>Schlusszahlung (50 % = {formatEuro(basis * 0.5, 2)}) freigegeben</span>
                          </label>
                          <AnimatePresence>
                            {c.schlusszahlungFreigegeben && !c.tranche3Invoiced && onCreateOekoprofitInvoice && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <button
                                  type="button"
                                  onClick={() => triggerTrancheInvoice(c, 3)}
                                  className="mt-1.5 w-full py-1.5 px-2.5 rounded-lg bg-zs-blau-schwarz text-white text-[11px] font-bold hover:bg-[#08243d] flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5 text-zs-signal-gelb" />
                                  <span>Schlussrechnung in Sachbelege (0835)</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          {c.tranche3Invoiced && (
                            <div className="text-[10px] font-mono text-emerald-700 font-bold pt-1">
                              In Sachbelegen (0835) erfasst
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {c.notizen && (
                      <div className="text-xs text-zinc-600 border-t border-zinc-100 pt-2.5">
                        <strong className="font-mono text-[11px] uppercase text-zinc-500 mr-2">Notiz:</strong>
                        {c.notizen}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: SAVE / EDIT VERGABE */}
      {showFormModal && (
        <div className="fixed inset-0 bg-zs-blau-schwarz/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/70">
              <h3 className="font-display font-bold text-lg text-zs-blau-schwarz">
                {editingId ? 'Vergabebeleg bearbeiten' : 'Vergabeauftrag erfassen'}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-zinc-400 hover:text-zs-blau-schwarz text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                    {formError}
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono font-bold text-zinc-500 uppercase">
                    Vergabetitel <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. Digitalisierungsberatung Textilunternehmen..."
                    value={vTitel}
                    onChange={(e) => setVTitel(e.target.value)}
                    className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono font-bold text-zinc-500 uppercase">
                      Auftragnehmer / Bieter
                    </label>
                    <input
                      type="text"
                      placeholder="z.B. re.solution GmbH"
                      value={vAn}
                      onChange={(e) => setVAn(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono font-bold text-zinc-500 uppercase">Vergabeart</label>
                    <select
                      value={vArt}
                      onChange={(e) => setVArt(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    >
                      <option>freihändige Vergabe</option>
                      <option>beschränkte Ausschreibung</option>
                      <option>öffentliche Ausschreibung</option>
                      <option>Direktvergabe</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono font-bold text-zinc-500 uppercase">
                      Auftragswert (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={vWert}
                      onChange={(e) => setVWert(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs font-mono tabular-nums outline-none focus:border-zs-blau-schwarz"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono font-bold text-zinc-500 uppercase">Arbeitspaket (AP)</label>
                    <select
                      value={vAp}
                      onChange={(e) => setVAp(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    >
                      <option>AP1 – Projektmanagement</option>
                      <option>AP2 – Technologietransfer</option>
                      <option>AP3 – Netzwerk</option>
                      <option>AP4 – Öffentlichkeitsarbeit</option>
                      <option>AP5 – Use-Cases</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono font-bold text-zinc-500 uppercase">Use-Case</label>
                    <select
                      value={vUseCaseId}
                      onChange={(e) => setVUseCaseId(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    >
                      <option value="">– Kein Use-Case –</option>
                      {usecases.map((u) => (
                        <option key={u.id} value={u.id}>
                          #{u.id} · {u.unternehmen}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Ausschreibung</label>
                    <input
                      type="date"
                      value={vAus}
                      onChange={(e) => setVAus(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-zinc-300 rounded-lg text-[11px] outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Abgabefrist</label>
                    <input
                      type="date"
                      value={vFrist}
                      onChange={(e) => setVFrist(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-zinc-300 rounded-lg text-[11px] outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Zuschlag</label>
                    <input
                      type="date"
                      value={vZu}
                      onChange={(e) => setVZu(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-zinc-300 rounded-lg text-[11px] outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Vertragsende</label>
                    <input
                      type="date"
                      value={vVe}
                      onChange={(e) => setVVe(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-zinc-300 rounded-lg text-[11px] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono font-bold text-zinc-500 uppercase">Vergabestatus</label>
                    <select
                      value={vStatus}
                      onChange={(e) => setVStatus(e.target.value as Vergabe['status'])}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    >
                      {STATI.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="bafa-chk"
                      checked={vBafa}
                      onChange={(e) => setVBafa(e.target.checked)}
                      className="w-4 h-4 accent-zs-blau-schwarz"
                    />
                    <label htmlFor="bafa-chk" className="text-xs font-semibold text-zs-blau-schwarz cursor-pointer">
                      Schriftliche BAFA-Zustimmung erhalten
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono font-bold text-zinc-500 uppercase">Notizen</label>
                  <textarea
                    rows={2}
                    placeholder="Wichtige Bieterhistorie, Rückfragen oder Fristenhinweise..."
                    value={vNotiz}
                    onChange={(e) => setVNotiz(e.target.value)}
                    className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-zinc-100 flex justify-end gap-2 bg-zinc-50/70">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-zs-blau-schwarz text-white font-bold text-xs hover:bg-[#08243d] cursor-pointer"
                >
                  {editingId ? 'Änderungen speichern' : 'Vergabe erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT ÖKOPROFIT-CHECKUP */}
      {showOekoModal && (
        <div className="fixed inset-0 bg-zs-blau-schwarz/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/70">
              <h3 className="font-display font-bold text-lg text-zs-blau-schwarz">
                {editingOekoId ? 'Ökoprofit-Checkup bearbeiten' : 'Neuer Ökoprofit-Checkup (Pos. 0835)'}
              </h3>
              <button
                onClick={() => setShowOekoModal(false)}
                className="text-zinc-400 hover:text-zs-blau-schwarz text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleOekoSubmit}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                {oekoFormError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium">
                    {oekoFormError}
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono font-bold text-zinc-500 uppercase">
                    Startup / Unternehmen *
                  </label>
                  <input
                    type="text"
                    value={oStartup}
                    onChange={(e) => setOStartup(e.target.value)}
                    placeholder="Name des beratenen Startups"
                    className="px-3 py-2 border border-zinc-300 rounded-lg outline-none focus:border-zs-blau-schwarz"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono font-bold text-zinc-500 uppercase">Beratungspartner</label>
                    <input
                      type="text"
                      value={oBerater}
                      onChange={(e) => setOBerater(e.target.value)}
                      placeholder="Auftragnehmer / Berater"
                      className="px-3 py-2 border border-zinc-300 rounded-lg outline-none focus:border-zs-blau-schwarz"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono font-bold text-zinc-500 uppercase">Branchenfokus</label>
                    <input
                      type="text"
                      value={oBranche}
                      onChange={(e) => setOBranche(e.target.value)}
                      className="px-3 py-2 border border-zinc-300 rounded-lg outline-none focus:border-zs-blau-schwarz"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono font-bold text-zinc-500 uppercase">
                      Pauschale brutto (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={oVerguetung}
                      onChange={(e) => setOVerguetung(e.target.value)}
                      className="px-3 py-2 border border-zinc-300 rounded-lg font-mono tabular-nums outline-none focus:border-zs-blau-schwarz"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono font-bold text-zinc-500 uppercase">Status</label>
                    <select
                      value={oStatus}
                      onChange={(e) => setOStatus(e.target.value as OekoprofitCheckup['status'])}
                      className="px-3 py-2 border border-zinc-300 rounded-lg outline-none focus:border-zs-blau-schwarz bg-white"
                    >
                      <option value="Geplant">Geplant</option>
                      <option value="In Beratung">In Beratung</option>
                      <option value="Reporting offen">Reporting offen</option>
                      <option value="Abgeschlossen">Abgeschlossen</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Termin 1 Datum</label>
                    <input
                      type="date"
                      value={oT1}
                      onChange={(e) => setOT1(e.target.value)}
                      className="px-2.5 py-1.5 border border-zinc-300 rounded-lg outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Termin 2 Datum</label>
                    <input
                      type="date"
                      value={oT2}
                      onChange={(e) => setOT2(e.target.value)}
                      className="px-2.5 py-1.5 border border-zinc-300 rounded-lg outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Termin 3 Datum</label>
                    <input
                      type="date"
                      value={oT3}
                      onChange={(e) => setOT3(e.target.value)}
                      className="px-2.5 py-1.5 border border-zinc-300 rounded-lg outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono font-bold text-zinc-500 uppercase">Notizen / Schwerpunkte</label>
                  <textarea
                    rows={2}
                    value={oNotizen}
                    onChange={(e) => setONotizen(e.target.value)}
                    placeholder="Indikatorenbasierter Ressourcen- und Wirkungsfokus..."
                    className="px-3 py-2 border border-zinc-300 rounded-lg outline-none focus:border-zs-blau-schwarz"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-zinc-100 flex justify-end gap-2 bg-zinc-50/70">
                <button
                  type="button"
                  onClick={() => setShowOekoModal(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-zs-blau-schwarz text-white font-bold text-xs hover:bg-[#08243d] cursor-pointer"
                >
                  {editingOekoId ? 'Speichern' : 'Checkup anlegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LV MARKDOWN TEMPLATE PREVIEW */}
      {templateModal && (
        <div
          className="fixed inset-0 bg-zs-blau-schwarz/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setTemplateModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-2xl w-full overflow-hidden"
          >
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/70">
              <h3 className="font-display font-bold text-base text-zs-blau-schwarz">{templateModal.title}</h3>
              <button
                onClick={() => setTemplateModal(null)}
                className="text-zinc-400 hover:text-zs-blau-schwarz text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <textarea
                readOnly
                rows={16}
                value={templateModal.content}
                className="w-full p-3 rounded-lg bg-zinc-50 border border-zinc-200 font-mono text-xs text-zinc-800 outline-none resize-none"
              />
            </div>
            <div className="p-4 border-t border-zinc-100 flex justify-end gap-2 bg-zinc-50/70">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(templateModal.content);
                  setCopiedTemplate(true);
                  setTimeout(() => setCopiedTemplate(false), 2000);
                }}
                className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-white hover:bg-zinc-100"
              >
                {copiedTemplate ? <Check className="w-3.5 h-3.5 text-[#58B49D]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTemplate ? 'Kopiert' : 'Markdown kopieren'}</span>
              </button>
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2 rounded-lg bg-zs-blau-schwarz text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-[#08243d]"
              >
                <Download className="w-3.5 h-3.5 text-zs-signal-gelb" />
                <span>.md herunterladen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
