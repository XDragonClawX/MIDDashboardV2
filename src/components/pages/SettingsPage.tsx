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
  X
} from 'lucide-react';
import { formatEuro } from '../../utils';

interface SettingsPageProps {
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
    vergaben: number;
    usecases: number;
    partners: number;
  };
  data: any;
}

export default function SettingsPage({
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

  // Regulatory constraints configuration list
  const [constants] = useState([
    { key: 'Förderquote Bundesanteil (BAFA)', val: '90,00 %' },
    { key: 'Förderquote Landesanteil NRW (LHO)', val: '7,50 %' },
    { key: 'Eigenbeitrag (WIN.DN GmbH)', val: '2,50 %' },
    { key: 'Overhead-Zuschlag Koeffizient', val: '10,00 % pauschal des F0824-Werts' },
    { key: 'Vergabe-Obergrenze für freihändige Vergaben', val: '25.000,00 € netto' },
    { key: 'Jährliche Einreichungsfrist (Kassenschluss)', val: '15. November' },
  ]);

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
      vergaben: Array.isArray(data.vergaben) ? data.vergaben.length : 0,
      usecases: Array.isArray(data.usecases) ? data.usecases.length : 0,
      partners: Array.isArray(data.partners) ? data.partners.length : 0,
    };
  };

  // Export static JSON File download trigger
  const handleExportClick = () => {
    const data = exportDatabaseSnapshot();
    const str = JSON.stringify(data, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MiD-PCT_Snapshot_${new Date().toISOString().slice(0, 10)}_${new Date().toTimeString().slice(0, 8).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import file processing logic
  const processImportTextState = (text: string, fileName: string, fileSize: number) => {
    try {
      const json = JSON.parse(text);
      // Valid structural verification matching our data layout
      if (!json.personal && !json.rechnungen && !json.vergaben && !json.partners) {
        alert('Ungültige Systemstruktur. Es wurden keine bekannten Förderkontingente oder Daten-Entitäten gefunden.');
        return;
      }
      setPreviewSnapshot({
        fileName,
        fileSize: formatBytes(fileSize),
        data: json,
      });
    } catch (err: any) {
      alert('Der System-Snapshot konnte nicht geparsed werden. Es muss sich um ein valides JSON handeln.');
    }
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
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
  };

  // Restore slot snapshot
  const handleRestoreSlot = (slot: BackupSlot) => {
    if (window.confirm(`Möchten Sie den Snapshot "${slot.name}" vom ${new Date(slot.timestamp).toLocaleString('de-DE')} wirklich in Ihr laufendes Cockpit einspielen? Ungesicherte Daten gehen verloren.`)) {
      onLoadJSONSnapshot(slot.data);
    }
  };

  // Delete slot snapshot
  const handleDeleteSlot = (id: string) => {
    const updated = localSlots.filter(s => s.id !== id);
    saveSlotsToStorage(updated);
  };

  // Reset core database
  const handleResetClick = () => {
    if (!resetConfirmed) {
      setResetConfirmed(true);
    } else {
      onResetDatabase();
      setResetConfirmed(false);
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
            <Clock className="w-3.5 h-3.5" /> SNAPSHOT ENGINE ACTIVE &bull; LOCAL PERSISTENT
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
            Backup- & <span className="text-[#58B49D]">Snapshot-Manager</span>
          </h1>
          <p className="text-zinc-400 text-xs font-sans max-w-2xl leading-relaxed">
            Sichern Sie den vollen operationalen Zustand dieses Fördermittel-Cockpits, verwalten Sie schnelle Browser-Wiederherstellungspunkte für Tests oder exportieren Sie Revisions-Pakete für Audits offline.
          </p>
        </div>
      </div>

      {/* 2. Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Direct Importer & Explorer */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active File Preview Banner (If uploaded file parses successfully) */}
          {previewSnapshot && (
            <div className="bg-[#f0fdf4] border-2 border-emerald-500 rounded-2xl p-6 shadow-md relative overflow-hidden animate-fade-in">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 p-12 opacity-[0.05] text-emerald-800 pointer-events-none">
                <FileCheck className="w-32 h-32" />
              </div>
              
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 animate-pulse" />
                  </span>
                  <div>
                    <h3 className="text-emerald-950 font-bold text-sm">Bereit für Restauration</h3>
                    <p className="text-[#134e4a] text-xs font-mono">{previewSnapshot.fileName} ({previewSnapshot.fileSize})</p>
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
                        <span className="text-[#134e4a] font-mono text-[10px] uppercase font-bold text-zinc-400">Personal</span>
                        <span className="text-md font-bold text-emerald-950">{counts.personal} Einträge</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 flex flex-col justify-between">
                        <span className="text-[#134e4a] font-mono text-[10px] uppercase font-bold text-zinc-400">Rechnungen</span>
                        <span className="text-md font-bold text-emerald-950">{counts.rechnungen} Belege</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 flex flex-col justify-between">
                        <span className="text-[#134e4a] font-mono text-[10px] uppercase font-bold text-zinc-400">Mittelabrufe</span>
                        <span className="text-md font-bold text-emerald-950">{counts.mittelabrufe} Claims</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 flex flex-col justify-between">
                        <span className="text-[#134e4a] font-mono text-[10px] uppercase font-bold text-zinc-400">Ausschreibungen</span>
                        <span className="text-md font-bold text-emerald-950">{counts.vergaben} Vorgänge</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 flex flex-col justify-between">
                        <span className="text-[#134e4a] font-mono text-[10px] uppercase font-bold text-zinc-400">Transformationspiloten</span>
                        <span className="text-md font-bold text-emerald-950">{counts.usecases} Use Cases</span>
                      </div>
                      <div className="bg-[#cbd5e1]/20 p-2 rounded-lg border border-emerald-100 flex flex-col justify-between">
                        <span className="text-[#134e4a] font-mono text-[10px] uppercase font-bold text-zinc-400">Partner &amp; Match</span>
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
              Haben Sie zuvor einen Snapshot aus diesem Dashboard exportiert? Ziehen Sie die JSON-Datei einfach in dieses Feld oder nutzen Sie den Dateidialog, um die Fördermittelstruktur und Revisionslogs wiederherzustellen.
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
                  Fördermittel-Snapshot <strong>hierher herüberziehen</strong> oder
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
                onChange={e => setNewSlotName(e.target.value)}
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
                  <p className="text-[10px] font-sans text-zinc-400 mt-0.5">Nutzen Sie das Eingabefeld oben, um einen schnellen Sicherungspunkt anzulegen.</p>
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
                          {new Date(slot.timestamp).toLocaleDateString('de-DE')} {new Date(slot.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[10px] font-mono text-zinc-500 font-bold uppercase">
                        <span>👥 Lohnstufen: <strong className="text-zinc-700">{slot.recordCounts.personal}</strong></span>
                        <span>📄 Rechnungen: <strong className="text-zinc-700">{slot.recordCounts.rechnungen}</strong></span>
                        <span>💰 Claims: <strong className="text-zinc-700">{slot.recordCounts.mittelabrufe}</strong></span>
                        <span>🛠️ Use Cases: <strong className="text-zinc-700">{slot.recordCounts.usecases}</strong></span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 self-end sm:self-center">
                      <button
                        onClick={() => handleRestoreSlot(slot)}
                        className="bg-white hover:bg-[#041422] text-[#041422] hover:text-[#58B49D] p-2 hover:border-[#041422] font-semibold rounded-lg border border-zinc-200 transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px]"
                        title="Snapshot einspielen"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Einspielen
                      </button>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="text-red-650 hover:bg-red-50 p-2 rounded-lg border border-transparent hover:border-red-100 transition-all cursor-pointer"
                        title="Snapshot löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Direct Exporter & Initialization Tools */}
        <div className="space-y-6">
          
          {/* Static Backup Exporter card */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <h3 className="font-display font-black text-sm text-[#041422] flex items-center gap-2">
              <DownloadCloud className="w-4 h-4 text-[#58B49D]" /> Snapshot exportieren
            </h3>
            <p className="text-xs text-zinc-500 font-sans leading-relaxed">
              Sichern Sie offline ein portables, vollständiges Abbild Ihrer gesamten Fördermittelverwaltung. Revisions Logs, Use-Cases, Partnerschaften und Lohnbelege werden gepackt.
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
              <h3 className="font-display font-black text-sm text-[#041422] flex items-center gap-1.5 text-red-650">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Datenbank zurücksetzen
              </h3>
              <p className="text-xs text-zinc-500 font-sans leading-relaxed mt-2">
                Setzt das System zu einem sauberen, standardkonformen Förderprojektstand (Seeddaten 2025) zurück. Alle manuell importierten Daten-Entwürfe und Transaktionsänderungen gehen dauerhaft verloren.
              </p>
            </div>

            <button
              onClick={handleResetClick}
              className={`w-full px-4 py-2.5 text-xs font-bold rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                resetConfirmed
                  ? 'bg-red-650 text-white animate-pulse'
                  : 'bg-red-50 text-red-650 hover:bg-red-100 border border-red-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              {resetConfirmed ? 'Sicher? Klick nochmals zur Bestätigung!' : 'Datenbank auf Initial-Seed zurücksetzen'}
            </button>
            
            {resetConfirmed && (
              <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 flex items-start gap-2 animate-fade-in text-red-800 text-[11px] leading-snug">
                <Info className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>Dieser Schritt ist unwiderruflich! Wenn Sie Ihren derzeitigen Stand nicht verlieren wollen, erstellen Sie oben einen lokalen Snapshot.</span>
              </div>
            )}
          </div>

          {/* Quick-Stats box */}
          <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200 space-y-3">
            <h4 className="font-mono text-[10px] uppercase tracking-wider font-extrabold text-zinc-400">Aktuelle Speicher-Belegung</h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-sans">
                <span className="text-zinc-600">Lokale SNAPSHOT-Slots:</span>
                <span className="font-bold text-zinc-800 font-mono">{localSlots.length} / 25</span>
              </div>
              <div className="flex justify-between font-sans">
                <span className="text-zinc-600">Verwendetes System-Protokoll:</span>
                <span className="font-bold text-zinc-800 font-mono">HTML5 LocalStorage</span>
              </div>
              <div className="flex justify-between font-sans pt-1 border-t border-zinc-205">
                <span className="text-zinc-650 font-bold">Laufender Speicherzustand:</span>
                <span className="text-[#58B49D] font-mono font-black uppercase">Aktiv &bull; Konsistent</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Regulatory Constants Bottom panel */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-zinc-100 bg-zinc-50/70">
          <span className="font-mono text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Regulatorische Konstanten (BAFA-STARK &bull; LHO NRW)</span>
        </div>
        <div className="divide-y divide-zinc-100">
          {constants.map((c, i) => (
            <div key={i} className="flex justify-between items-center p-4 text-xs font-sans hover:bg-zinc-50/30 transition-all">
              <span className="font-semibold text-zinc-700">{c.key}</span>
              <span className="font-mono text-[#041422] font-semibold bg-zinc-100 px-3 py-1 rounded border border-zinc-150">{c.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
