import React, { useRef, useState } from 'react';

interface SettingsPageProps {
  onResetDatabase: () => void;
  onLoadJSONSnapshot: (snapshot: any) => void;
  exportDatabaseSnapshot: () => any;
}

export default function SettingsPage({
  onResetDatabase,
  onLoadJSONSnapshot,
  exportDatabaseSnapshot,
}: SettingsPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resetConfirmed, setResetConfirmed] = useState(false);

  // Constants thresholds states (Read-only configurations)
  const [constants] = useState([
    { key: 'Förderquote Bundesanteil (BAFA)', val: '90,00 %' },
    { key: 'Förderquote Landesanteil NRW (LHO)', val: '7,50 %' },
    { key: 'Eigenbeitrag (WIN.DN GmbH)', val: '2,50 %' },
    { key: 'Overhead-Zuschlag Koeffizient', val: '10,00 % pauschal des F0824-Werts' },
    { key: 'Vergabe-Obergrenze für freihändige Vergaben', val: '25.000,00 € netto' },
    { key: 'Jährliche Einreichungsfrist (Kassenschluss)', val: '15. November' },
  ]);

  const handleExportClick = () => {
    const data = exportDatabaseSnapshot();
    const str = JSON.stringify(data, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MiD-PCT_ERP_Datenbanksnapshot_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const json = JSON.parse(evt.target?.result as string);
          // basic validation
          if (!json.personal || !json.rechnungen) {
            alert('Die geladene Datei besitzt keine valide MiD-PCT Fördermitteldatenstruktur.');
            return;
          }
          onLoadJSONSnapshot(json);
          alert('Datenbanksnapshot erfolgreich eingepflegt!');
        } catch (err: any) {
          alert('Fehler beim Analysieren des Dateisnapshots: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleResetClick = () => {
    if (!resetConfirmed) {
      setResetConfirmed(true);
    } else {
      onResetDatabase();
      setResetConfirmed(false);
      alert('Datenbank auf Werkseinstellungen zurückgesetzt.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
          System<span className="bg-zs-signal-gelb px-1 py-0.5 rounded text-zs-blau-schwarz">einstellungen</span>
        </h1>
        <p className="text-xs font-mono text-zinc-500 mt-1">
          Globale Stellschrauben, Konstanten und Daten-Backups
        </p>
      </div>

      {/* Snapshot operations row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs space-y-4">
          <h3 className="font-display font-black text-sm text-zs-blau-schwarz">Datensicherung / JSON-Snapshot</h3>
          <p className="text-xs text-zinc-500 font-sans leading-relaxed">
            Sichern und restaurieren Sie den gesamten Zustand Ihres ERP-Systems (Schnittstellen, Lohnabrechnungen, Matchmaking und Use-Cases) offline-kompatibel als Datei.
          </p>

          <div className="flex gap-2 pt-2 flex-wrap">
            <button
              onClick={handleExportClick}
              className="px-4 py-2 text-xs font-bold rounded-full bg-zs-blau-schwarz text-zs-signal-gelb hover:opacity-90 transition-all cursor-pointer flex-1 text-center"
            >
              📥 Backup exportieren (.json)
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs font-bold rounded-full border border-zinc-250 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 transition-all cursor-pointer flex-1 text-center"
            >
              📤 Backup laden (.json)
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

        {/* Database reset */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-display font-black text-sm text-zs-blau-schwarz">Datenbank initialisieren</h3>
            <p className="text-xs text-zinc-500 font-sans leading-relaxed">
              Zerstört alle vorgenommenen Änderungen und richtet die Seeddaten für das Förderprojekt 2025 vollständig neu ein. Revisionshistorien werden gelöscht.
            </p>
          </div>
          <button
            onClick={handleResetClick}
            className={`px-4 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer mt-4 self-end ${
              resetConfirmed
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-red-50 text-red-650 hover:bg-red-100'
            }`}
          >
            {resetConfirmed ? 'Sicher? Erneut klicken zum Bestätigen!' : '⚠️ Datenbank zurücksetzen'}
          </button>
        </div>
      </div>

      {/* Constants table sheet */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xs pb-1">
        <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <span className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-wider">Regulatorische Konstanten (BAFA-STARK &middot; LHO NRW)</span>
        </div>
        <div className="divide-y divide-zinc-100">
          {constants.map((c, i) => (
            <div key={i} className="flex justify-between items-center p-4 text-xs">
              <span className="font-semibold text-zinc-700">{c.key}</span>
              <span className="font-mono text-zs-blau-schwarz font-bold bg-zinc-100 px-3 py-1 rounded border border-zinc-150">{c.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
