import React, { useRef, useState, useEffect } from 'react';
import {
  DownloadCloud,
  UploadCloud,
  RotateCcw,
  FileCheck,
  Info,
  Save,
  Trash2,
  Database,
  Sparkles,
  Clock,
  AlertTriangle,
  FolderOpen,
  CheckCircle2,
  Calendar,
  X,
  Server,
  ShieldCheck,
  RefreshCw,
  EyeOff,
  Presentation,
  Scale,
  Layers,
} from 'lucide-react';
import { AzaPlanVersion, SystemSettings } from '../../types';
import { AZA_VERSION_META } from '../../data';
import { recordBackupTimestamp, hasBackupInCurrentMonth, getLastBackupTimestamp } from '../../utils';

interface SettingsPageProps {
  settings: SystemSettings;
  onUpdateSettings: (partial: Partial<SystemSettings>) => void;
  serverSyncStatus: 'synced' | 'saving' | 'offline';
  lastServerSync: string | null;
  onSyncWithServer: (dir: 'push' | 'pull') => Promise<{ ok: boolean; message: string }>;
  onResetDatabase: () => void;
  onLoadJSONSnapshot: (snapshot: any) => void;
  exportDatabaseSnapshot: () => any;
}

interface BackupSlot {
  id: string;
  name: string;
  timestamp: string;
  recordCounts: {
    personal: number;
    rechnungen: number;
    mittelabrufe: number;
    zas?: number;
    vergaben: number;
    oekoprofit?: number;
    usecases: number;
    partners: number;
  };
  data: any;
}

export default function SettingsPage({
  settings,
  onUpdateSettings,
  serverSyncStatus,
  lastServerSync,
  onSyncWithServer,
  onResetDatabase,
  onLoadJSONSnapshot,
  exportDatabaseSnapshot,
}: SettingsPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const [newSlotName, setNewSlotName] = useState('');
  const [localSlots, setLocalSlots] = useState<BackupSlot[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState<{
    fileName: string;
    fileSize: string;
    data: any;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmSlotId, setConfirmSlotId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState<'push' | 'pull' | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Regulatory constraints configuration list
  const constants = [
    { key: 'Förderkennzeichen (STARK / BAFA)', val: '46SK0267X' },
    { key: 'Förderquote Bundesanteil (BAFA)', val: '90,00 %' },
    { key: 'Eigenanteil (WIN.DN GmbH)', val: '10,00 %' },
    { key: 'profi-online Ausgabenpositionen', val: '0812, 0817, 0820, 0831, 0835, 0843' },
    { key: 'Geschäftsbedarfspauschale', val: '10,00 % auf Personal (0812/0817/0820) → 0843' },
    {
      key: 'Vorsteuerabzugsberechtigung (§ 15 UStG)',
      val: settings.vorsteuerabzugsberechtigt
        ? 'Ja → Nettobetrag förderfähig'
        : 'Nein → Bruttobetrag förderfähig',
    },
    { key: 'Aktive AZA-Finanzplan-Version', val: AZA_VERSION_META[settings.azaVersion].label },
    { key: 'Ökoprofit-Checkup / Transformationsbooster', val: '5.000 € brutto · 3 Termine · 25% / 25% / 50%' },
    { key: 'Jährliche Einreichungsfrist (Kassenschluss)', val: '15. November' },
  ];

  // Load physical backup slots on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('midpct_backup_slots');
      if (stored) {
        setLocalSlots(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse backup slots', e);
    }
  }, []);

  // Save slots
  const saveSlotsToStorage = (updated: BackupSlot[]) => {
    setLocalSlots(updated);
    try {
      localStorage.setItem('midpct_backup_slots', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save backup slots', e);
    }
  };

  // Helper file size formatter
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Helper count records
  const extractRecordCounts = (data: any) => {
    return {
      personal: Array.isArray(data.personal) ? data.personal.length : 0,
      rechnungen: Array.isArray(data.rechnungen) ? data.rechnungen.length : 0,
      mittelabrufe: Array.isArray(data.mittelabrufe) ? data.mittelabrufe.length : 0,
      zas: Array.isArray(data.zas) ? data.zas.length : 0,
      vergaben: Array.isArray(data.vergaben) ? data.vergaben.length : 0,
      oekoprofit: Array.isArray(data.oekoprofitCheckups) ? data.oekoprofitCheckups.length : 0,
      usecases: Array.isArray(data.usecases) ? data.usecases.length : 0,
      partners: Array.isArray(data.partners) ? data.partners.length : 0,
    };
  };

  // Handle manual server sync
  const handleTriggerSync = async (dir: 'push' | 'pull') => {
    setSyncBusy(dir);
    setSyncFeedback(null);
    try {
      const res = await onSyncWithServer(dir);
      setSyncFeedback({ ok: res.ok, text: res.message });
    } catch (err: any) {
      setSyncFeedback({
        ok: false,
        text: err?.message || 'Fehler bei der Server-Synchronisation.',
      });
    } finally {
      setSyncBusy(null);
    }
  };

  // Export static JSON File download trigger
  const handleExportClick = () => {
    const data = exportDatabaseSnapshot();
    const str = JSON.stringify(data, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MiD-PCT_Snapshot_${new Date().toISOString().slice(0, 10)}_${new Date()
      .toTimeString()
      .slice(0, 8)
      .replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    recordBackupTimestamp();
    setStatusMessage('JSON-Backup exportiert & als Monats-Sicherung („Backup-Wächter“) dokumentiert.');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Import file processing logic
  const processImportTextState = (text: string, fileName: string, fileSize: number) => {
    setImportError(null);
    try {
      const json = JSON.parse(text);
      if (!json.personal && !json.rechnungen && !json.vergaben && !json.partners && !json.zas) {
        setImportError(
          'Ungültige Systemstruktur. Es wurden keine bekannten Förderkontingente oder Daten-Entitäten gefunden.'
        );
        return;
      }
      setPreviewSnapshot({
        fileName,
        fileSize: formatBytes(fileSize),
        data: json,
      });
    } catch {
      setImportError(
        'Der System-Snapshot konnte nicht gelesen werden. Bitte wählen Sie eine valide JSON-Datei.'
      );
    }
  };

  // Drag & drop handlers
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
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          processImportTextState(evt.target.result as string, file.name, file.size);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          processImportTextState(evt.target.result as string, file.name, file.size);
        }
      };
      reader.readAsText(file);
    }
  };

  // Complete restoring of file snapshot
  const triggerRestoreSnapshot = (data: any) => {
    onLoadJSONSnapshot(data);
    setPreviewSnapshot(null);
    setStatusMessage('JSON-Snapshot erfolgreich in das Cockpit eingespielt.');
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Save snapshot inside virtual storage slot
  const handleSaveToSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSlotName.trim();
    if (!name) return;

    const dataSnapshot = exportDatabaseSnapshot();
    const counts = extractRecordCounts(dataSnapshot);

    const newSlot: BackupSlot = {
      id: String(Date.now()),
      name,
      timestamp: new Date().toISOString(),
      recordCounts: counts,
      data: dataSnapshot,
    };

    const updated = [newSlot, ...localSlots];
    saveSlotsToStorage(updated);
    setNewSlotName('');
    setStatusMessage(`Lokaler Snapshot „${name}“ gespeichert.`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Restore slot snapshot (inline 2-step confirmation)
  const handleRestoreSlot = (slot: BackupSlot) => {
    if (confirmSlotId !== slot.id) {
      setConfirmSlotId(slot.id);
      return;
    }
    onLoadJSONSnapshot(slot.data);
    setConfirmSlotId(null);
    setStatusMessage(`Snapshot „${slot.name}“ wiederhergestellt.`);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Delete slot snapshot
  const handleDeleteSlot = (id: string) => {
    const updated = localSlots.filter((s) => s.id !== id);
    saveSlotsToStorage(updated);
  };

  // Reset core database
  const handleResetClick = () => {
    if (!resetConfirmed) {
      setResetConfirmed(true);
    } else {
      onResetDatabase();
      setResetConfirmed(false);
      setStatusMessage('Systemdatenbank auf den aktuellen STARK-Seedstand zurückgesetzt.');
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-full">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-[#041422] text-white p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-lg border border-white/5">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] text-white pointer-events-none">
          <Database className="w-96 h-96" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#5d9487] text-[#041422] text-[10px] font-mono font-bold tracking-widest uppercase px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" /> HYBRIDE PERSISTENZ &bull; STEUER- &amp; AZA-STEUERUNG
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
            System-, Steuer- &amp; <span className="text-[#58B49D]">Snapshot-Manager</span>
          </h1>
          <p className="text-zinc-400 text-xs font-sans max-w-2xl leading-relaxed">
            Steuern Sie die § 15 UStG Vorsteuer-Logik, aktive AZA-Finanzplan-Versionen, DSGVO- &amp;
            Boardroom-Ansichten sowie hybride Server-Synchronisation und portable Offline-Revisionspakete.
          </p>
        </div>
      </div>

      {/* 2. System-, Steuer- & Server-Konfiguration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Steuerrecht & AZA-Plan-Versionierung */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3">
            <div>
              <h3 className="font-display font-black text-sm text-[#041422] flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#58B49D]" /> Förderrecht (§ 15 UStG) &amp; AZA-Planstand
              </h3>
              <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                Steuert die förderfähige Bemessungsgrundlage aller Sachbelege (0831–0843) sowie die Soll-Basis.
              </p>
            </div>
          </div>

          {/* Vorsteuerabzugsberechtigt Switch */}
          <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/60 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-[#041422]">
                Vorsteuerabzugsberechtigung (§ 15 UStG / ANBest-P)
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                {settings.vorsteuerabzugsberechtigt
                  ? 'Aktiviert: Umsatzsteuer ist abzugsfähig — nur Nettobeträge (bzw. 0 % bei steuerfreien Leistungen) sind zuwendungsfähig.'
                  : 'Deaktiviert (Standard): Keine Vorsteuerabzugsberechtigung — Bruttobeträge inkl. USt sind voll zuwendungsfähig.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  vorsteuerabzugsberechtigt: !settings.vorsteuerabzugsberechtigt,
                })
              }
              className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                settings.vorsteuerabzugsberechtigt
                  ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                  : 'bg-[#041422] text-[#58B49D] border-[#041422] hover:opacity-90'
              }`}
            >
              {settings.vorsteuerabzugsberechtigt ? 'Vorsteuer: JA (Netto)' : 'Vorsteuer: NEIN (Brutto)'}
            </button>
          </div>

          {/* AZA Plan Version Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#041422] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#58B49D]" /> Aktive AZA-Finanzplan-Version
            </label>
            <div className="space-y-2">
              {(Object.keys(AZA_VERSION_META) as AzaPlanVersion[]).map((versionKey) => {
                const meta = AZA_VERSION_META[versionKey];
                const active = settings.azaVersion === versionKey;
                return (
                  <button
                    key={versionKey}
                    type="button"
                    onClick={() => onUpdateSettings({ azaVersion: versionKey })}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      active
                        ? 'border-[#041422] bg-[#041422]/5 ring-1 ring-[#041422]'
                        : 'border-zinc-200 bg-white hover:border-[#58B49D]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#041422]">{meta.label}</span>
                      {active && (
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#58B49D] text-[#041422]">
                          Aktiv
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{meta.beschreibung}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hybride Server-Persistenz & Ansichtsmodi */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3">
            <div>
              <h3 className="font-display font-black text-sm text-[#041422] flex items-center gap-2">
                <Server className="w-4 h-4 text-[#58B49D]" /> Server-Persistenz (data/midpct_db.json)
              </h3>
              <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                Automatischer Hintergrund-Abgleich mit dem Node.js-Backend sowie manuelle Push/Pull-Synchronisation.
              </p>
            </div>
            <span
              className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full border ${
                serverSyncStatus === 'synced'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : serverSyncStatus === 'saving'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-200'
              }`}
            >
              {serverSyncStatus === 'synced'
                ? 'Server Synchron'
                : serverSyncStatus === 'saving'
                ? 'Speichert...'
                : 'Lokal / Offline'}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/60 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-600 font-medium">Letzter Server-Abgleich:</span>
              <span className="font-mono font-bold text-[#041422]">
                {lastServerSync
                  ? `${new Date(lastServerSync).toLocaleDateString('de-DE')} ${new Date(
                      lastServerSync
                    ).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                  : 'Noch kein Abgleich in dieser Sitzung'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                disabled={syncBusy !== null}
                onClick={() => handleTriggerSync('push')}
                className="px-4 py-2.5 rounded-full text-xs font-bold bg-[#041422] text-[#58B49D] hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                {syncBusy === 'push' ? 'Übertrage...' : 'Stand auf Server sichern'}
              </button>
              <button
                type="button"
                disabled={syncBusy !== null}
                onClick={() => handleTriggerSync('pull')}
                className="px-4 py-2.5 rounded-full text-xs font-bold bg-white text-[#041422] border border-zinc-300 hover:bg-zinc-100 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {syncBusy === 'pull' ? 'Lade...' : 'Stand vom Server laden'}
              </button>
            </div>

            {syncFeedback && (
              <div
                className={`p-2.5 rounded-lg text-xs font-medium flex items-center justify-between gap-2 ${
                  syncFeedback.ok
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                <span>{syncFeedback.text}</span>
                <button
                  type="button"
                  onClick={() => setSyncFeedback(null)}
                  className="font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Privacy & Boardroom Modes */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-[#041422]">Datenschutz- &amp; Präsentations-Modi</h4>

            <div className="p-3.5 rounded-xl border border-zinc-200 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <EyeOff className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-zinc-800">DSGVO Privacy-Modus</div>
                  <div className="text-[11px] text-zinc-500">
                    Maskiert Klarnamen (z. B. M. M.) und Einzelgehälter in Personal-, Cockpit- &amp; Export-Ansichten.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ privacyMode: !settings.privacyMode })}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-all whitespace-nowrap ${
                  settings.privacyMode
                    ? 'bg-[#58B49D] text-[#041422]'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {settings.privacyMode ? 'Aktiv' : 'Aus'}
              </button>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-200 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Presentation className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-zinc-800">Boardroom-Präsentationsmodus</div>
                  <div className="text-[11px] text-zinc-500">
                    Blendet die linke Navigationsleiste für Beiratssitzungen und Beamer-Präsentationen aus.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ boardroomMode: !settings.boardroomMode })}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-all whitespace-nowrap ${
                  settings.boardroomMode
                    ? 'bg-[#041422] text-[#58B49D]'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {settings.boardroomMode ? 'Aktiv' : 'Aus'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Snapshot Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Direct Importer & Explorer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active File Preview Banner */}
          {previewSnapshot && (
            <div className="bg-[#f0fdf4] border-2 border-emerald-500 rounded-2xl p-6 shadow-md relative overflow-hidden animate-fade-in">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 p-12 opacity-[0.05] text-emerald-800 pointer-events-none">
                <FileCheck className="w-32 h-32" />
              </div>

              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-emerald-950 font-bold text-sm">Bereit für Restauration</h3>
                    <p className="text-[#134e4a] text-xs font-mono">
                      {previewSnapshot.fileName} ({previewSnapshot.fileSize})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewSnapshot(null)}
                  className="p-1 rounded-full hover:bg-emerald-100 text-[#134e4a] transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Data specs summary block */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-sans">
                {(() => {
                  const counts = extractRecordCounts(previewSnapshot.data);
                  return (
                    <>
                      <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 flex flex-col justify-between">
                        <span className="font-mono text-[10px] uppercase font-bold text-zinc-400">Personal</span>
                        <span className="text-md font-bold text-emerald-950">{counts.personal} Einträge</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 flex flex-col justify-between">
                        <span className="font-mono text-[10px] uppercase font-bold text-zinc-400">Rechnungen</span>
                        <span className="text-md font-bold text-emerald-950">{counts.rechnungen} Belege</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 flex flex-col justify-between">
                        <span className="font-mono text-[10px] uppercase font-bold text-zinc-400">Abrufe &amp; ZAs</span>
                        <span className="text-md font-bold text-emerald-950">
                          {counts.mittelabrufe} Abrufe · {counts.zas} ZAs
                        </span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 flex flex-col justify-between">
                        <span className="font-mono text-[10px] uppercase font-bold text-zinc-400">Ausschreibungen</span>
                        <span className="text-md font-bold text-emerald-950">{counts.vergaben} Vorgänge</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 flex flex-col justify-between">
                        <span className="font-mono text-[10px] uppercase font-bold text-zinc-400">
                          Transformationspiloten
                        </span>
                        <span className="text-md font-bold text-emerald-950">{counts.usecases} Use Cases</span>
                      </div>
                      <div className="bg-[#cbd5e1]/20 p-2 rounded-lg border border-emerald-100 flex flex-col justify-between">
                        <span className="font-mono text-[10px] uppercase font-bold text-zinc-400">Partner &amp; Match</span>
                        <span className="text-md font-bold text-emerald-950">{counts.partners} Einträge</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => triggerRestoreSnapshot(previewSnapshot.data)}
                  className="flex-1 bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-full hover:bg-emerald-800 shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FolderOpen className="w-4 h-4" /> Snapshot jetzt einspielen &amp; aktivieren
                </button>
                <button
                  onClick={() => setPreviewSnapshot(null)}
                  className="bg-white text-emerald-800 font-bold text-xs px-4 py-2.5 rounded-full border border-emerald-200 hover:bg-emerald-50 transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {/* Backup Importer Zone */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs relative overflow-hidden transition-all duration-300">
            <h3 className="font-display font-black text-sm text-[#041422] flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#58B49D]" /> Offline-Snapshot laden (.json)
            </h3>
            <p className="text-xs text-zinc-500 font-sans leading-relaxed mt-2">
              Haben Sie zuvor einen Snapshot aus diesem Dashboard exportiert? Ziehen Sie die JSON-Datei einfach in
              dieses Feld oder nutzen Sie den Dateidialog, um die Fördermittelstruktur und GoBD-Revisionslogs
              wiederherzustellen.
            </p>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive
                  ? 'border-emerald-600 bg-emerald-50/50'
                  : 'border-zinc-200 hover:border-[#58B49D] bg-zinc-50/30'
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-2">
                <UploadCloud className="w-8 h-8 text-zinc-400" />
                <p className="text-xs text-zinc-600 font-sans">
                  Fördermittel-Snapshot <strong>hierher ziehen</strong> oder
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-1.5 text-xs font-bold rounded-full bg-[#041422] text-white hover:opacity-90 transition-all cursor-pointer mt-1"
                >
                  Datei auswählen
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportFileChange}
                  accept=".json"
                  className="hidden"
                />
              </div>
            </div>
            {importError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between gap-2">
                <span>{importError}</span>
                <button
                  onClick={() => setImportError(null)}
                  className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
            {statusMessage && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2">
                <span>{statusMessage}</span>
                <button
                  onClick={() => setStatusMessage(null)}
                  className="text-emerald-600 hover:text-emerald-800 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Local Snapshot Slots (virtual history engine in localstorage) */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-display font-black text-sm text-[#041422] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#58B49D]" /> Virtuelle Snapshot-Historie
                </h3>
                <p className="text-zinc-500 text-[11px] font-sans mt-0.5">
                  Erstellen Sie sekundenschnelle Wiederherstellungspunkte lokal in Ihrem Webbrowser-Speicher.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#cbd5e1]/30 text-[#041422] border border-[#cbd5e1] self-start px-2 py-0.5 rounded">
                Slots: {localSlots.length} benutzt
              </span>
            </div>

            {/* Form to create quick slot backup */}
            <form onSubmit={handleSaveToSlot} className="flex gap-2">
              <input
                type="text"
                placeholder="Name des lokalen Snapshots (z.B. Stand vor Massenimport)..."
                value={newSlotName}
                onChange={(e) => setNewSlotName(e.target.value)}
                className="flex-1 bg-zinc-50 border border-zinc-200 rounded-full px-4 py-2 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#58B49D] font-sans"
              />
              <button
                type="submit"
                disabled={!newSlotName.trim()}
                className={`px-4 py-2 text-xs font-bold rounded-full flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-all ${
                  newSlotName.trim()
                    ? 'bg-[#58B49D] text-[#041422] hover:bg-[#4ea28c]'
                    : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-3.5 h-3.5" /> Snapshot sichern
              </button>
            </form>

            <div className="space-y-2 mt-4 max-h-72 overflow-y-auto scrollbar-thin">
              {localSlots.length === 0 ? (
                <div className="text-center py-8 bg-zinc-50/50 rounded-xl border border-zinc-100">
                  <Clock className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs font-sans text-zinc-400">Keine lokalen Snapshots im Browser-Cache vorhanden.</p>
                  <p className="text-[10px] font-sans text-zinc-400 mt-0.5">
                    Nutzen Sie das Eingabefeld oben, um einen schnellen Sicherungspunkt anzulegen.
                  </p>
                </div>
              ) : (
                localSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/40 hover:bg-zinc-50 transition-all text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-zinc-800 text-sm leading-tight">{slot.name}</span>
                        <span className="text-[9px] font-mono bg-zinc-100 text-zinc-500 rounded border border-zinc-200 p-0.5 px-1 inline-flex items-center gap-0.5 whitespace-nowrap">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(slot.timestamp).toLocaleDateString('de-DE')}{' '}
                          {new Date(slot.timestamp).toLocaleTimeString('de-DE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[10px] font-mono text-zinc-500 font-bold uppercase tabular-nums">
                        <span>
                          Personal: <strong className="text-zinc-700">{slot.recordCounts.personal}</strong>
                        </span>
                        <span>
                          · Belege: <strong className="text-zinc-700">{slot.recordCounts.rechnungen}</strong>
                        </span>
                        <span>
                          · Abrufe/ZAs:{' '}
                          <strong className="text-zinc-700">
                            {slot.recordCounts.mittelabrufe}/{slot.recordCounts.zas || 0}
                          </strong>
                        </span>
                        <span>
                          · Ökoprofit: <strong className="text-zinc-700">{slot.recordCounts.oekoprofit || 0}</strong>
                        </span>
                        <span>
                          · Use-Cases: <strong className="text-zinc-700">{slot.recordCounts.usecases}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 self-end sm:self-center">
                      {confirmSlotId === slot.id ? (
                        <>
                          <button
                            onClick={() => handleRestoreSlot(slot)}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 font-semibold rounded-lg transition-all cursor-pointer text-[11px] whitespace-nowrap"
                          >
                            Wirklich einspielen?
                          </button>
                          <button
                            onClick={() => setConfirmSlotId(null)}
                            className="bg-white hover:bg-zinc-100 text-zinc-600 px-2.5 py-1.5 font-semibold rounded-lg border border-zinc-200 transition-all cursor-pointer text-[11px]"
                          >
                            Abbrechen
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleRestoreSlot(slot)}
                            className="bg-white hover:bg-[#041422] text-[#041422] hover:text-[#58B49D] p-2 hover:border-[#041422] font-semibold rounded-lg border border-zinc-200 transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px] whitespace-nowrap"
                            title="Snapshot einspielen"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Einspielen
                          </button>
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="text-red-600 hover:bg-red-50 p-2 rounded-lg border border-transparent hover:border-red-100 transition-all cursor-pointer"
                            title="Snapshot löschen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Direct Exporter & Initialization Tools */}
        <div className="space-y-6">
          {/* OFFLINE HTML DASHBOARD DOWNLOAD CARD */}
          <div className="bg-[#f0f9ff] p-5 rounded-2xl border border-sky-200 shadow-xs space-y-4">
            <h3 className="font-display font-black text-sm text-sky-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-600" /> Offline-Dashboard herunterladen
            </h3>
            <p className="text-xs text-sky-900 font-sans leading-relaxed">
              Sie können die voll funktionsfähige, autarke Offline-Version inkl. eingebettetem aktuellen Datenstand (
              <strong>MiD-PCT_Dashboard_OFFLINE.html</strong>) direkt herunterladen und ohne Serververbindung per
              Doppelklick im Browser öffnen.
            </p>
            <button
              onClick={() => {
                const a = document.createElement('a');
                a.href = '/api/download-offline';
                a.download = 'MiD-PCT_Dashboard_OFFLINE.html';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                recordBackupTimestamp();
                setStatusMessage('Offline-HTML-Dashboard heruntergeladen & Monats-Sicherung registriert.');
                setTimeout(() => setStatusMessage(null), 4000);
              }}
              className="w-full px-4 py-2.5 text-xs font-bold rounded-full bg-sky-700 hover:bg-sky-800 text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <DownloadCloud className="w-4 h-4" /> Offline-HTML herunterladen
            </button>
          </div>

          {/* Static Backup Exporter card */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display font-black text-sm text-[#041422] flex items-center gap-2">
                <DownloadCloud className="w-4 h-4 text-[#58B49D]" /> Snapshot exportieren
              </h3>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  hasBackupInCurrentMonth()
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-800'
                }`}
              >
                {hasBackupInCurrentMonth() ? 'Monat gesichert' : 'Offen'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-sans leading-relaxed">
              Sichern Sie offline ein portables, vollständiges Abbild Ihrer gesamten Fördermittelverwaltung inkl.
              GoBD-Hashkette, Use-Cases, Partnerschaften, Mitarbeiterstamm und Belegen.
              {getLastBackupTimestamp() && (
                <span className="block text-[10px] font-mono text-zinc-400 mt-1">
                  Letzter Export: {new Date(getLastBackupTimestamp()!).toLocaleDateString('de-DE')}
                </span>
              )}
            </p>
            <button
              onClick={handleExportClick}
              className="w-full px-4 py-2.5 text-xs font-bold rounded-full bg-[#041422] text-[#58B49D] hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <DownloadCloud className="w-4 h-4" /> Backup exportieren (.json)
            </button>
          </div>

          {/* Dangerous Database Initialization Area */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <div>
              <h3 className="font-display font-black text-sm text-red-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Datenbank zurücksetzen
              </h3>
              <p className="text-xs text-zinc-500 font-sans leading-relaxed mt-2">
                Setzt das System auf den verifizierten STARK-Seedstand (inkl. 2026er ZAs und Mitarbeiterstamm) zurück.
                Manuell geänderte Transaktionen werden dabei überschrieben.
              </p>
            </div>

            <button
              onClick={handleResetClick}
              className={`w-full px-4 py-2.5 text-xs font-bold rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                resetConfirmed
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              {resetConfirmed ? 'Sicher? Klick nochmals zur Bestätigung!' : 'Datenbank auf Initial-Seed zurücksetzen'}
            </button>

            {resetConfirmed && (
              <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 flex items-start gap-2 animate-fade-in text-red-800 text-[11px] leading-snug">
                <Info className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>
                  Dieser Schritt ist unwiderruflich! Wenn Sie Ihren derzeitigen Stand nicht verlieren wollen, erstellen
                  Sie oben einen lokalen Snapshot.
                </span>
              </div>
            )}
          </div>

          {/* Quick-Stats box */}
          <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200 space-y-3">
            <h4 className="font-mono text-[10px] uppercase tracking-wider font-extrabold text-zinc-400">
              Aktuelle Speicher-Architektur
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-sans">
                <span className="text-zinc-600">Lokale SNAPSHOT-Slots:</span>
                <span className="font-bold text-zinc-800 font-mono">{localSlots.length} / 25</span>
              </div>
              <div className="flex justify-between font-sans">
                <span className="text-zinc-600">Persistenz-Layer:</span>
                <span className="font-bold text-zinc-800 font-mono">Hybrid (File-DB + LocalStorage)</span>
              </div>
              <div className="flex justify-between font-sans pt-1 border-t border-zinc-200">
                <span className="text-zinc-600 font-bold">Laufender Speicherzustand:</span>
                <span className="text-[#58B49D] font-mono font-black uppercase">Aktiv &bull; GoBD-Chained</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Regulatory Constants Bottom panel */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-zinc-100 bg-zinc-50/70">
          <span className="font-mono text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
            Regulatorische Konstanten (BAFA STARK · FKZ 46SK0267X)
          </span>
        </div>
        <div className="divide-y divide-zinc-100">
          {constants.map((c, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-4 text-xs font-sans hover:bg-zinc-50/30 transition-all"
            >
              <span className="font-semibold text-zinc-700">{c.key}</span>
              <span className="font-mono text-[#041422] font-semibold bg-zinc-100 px-3 py-1 rounded border border-zinc-200">
                {c.val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
