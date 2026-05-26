import React, { useState } from 'react';
import { Vergabe } from '../../types';
import { formatEuro, formatDate } from '../../utils';

interface VergabePageProps {
  vergaben: Vergabe[];
  activeYear: string | null;
  activeYearLabel: string;
  onAddVergabe: (vergabe: Omit<Vergabe, 'id'>) => void;
  onUpdateVergabe: (id: number, vergabe: Partial<Vergabe>) => void;
  onDeleteVergabe: (id: number) => void;
}

export default function VergabePage({
  vergaben,
  activeYear,
  activeYearLabel,
  onAddVergabe,
  onUpdateVergabe,
  onDeleteVergabe,
}: VergabePageProps) {
  // Local states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form fields
  const [vTitel, setVTitel] = useState('');
  const [vAn, setVAn] = useState('');
  const [vArt, setVArt] = useState('freihändige Vergabe');
  const [vWert, setVWert] = useState('');
  const [vAus, setVAus] = useState('');
  const [vFrist, setVFrist] = useState('');
  const [vZu, setVZu] = useState('');
  const [vVe, setVVe] = useState('');
  const [vAp, setVAp] = useState('AP2 – Technologietransfer');
  const [vStatus, setVStatus] = useState<Vergabe['status']>('Vorbereitung');
  const [vBafa, setVBafa] = useState(false);
  const [vNotiz, setVNotiz] = useState('');

  const STATI: Vergabe['status'][] = [
    'Vorbereitung', 'Veröffentlichung', 'Angebotsphase', 'Prüfung', 'Zuschlag', 'abgeschlossen'
  ];

  // Filters based on yearly scopes
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

  const missingBafaCount = filteredVergaben.filter((v) => !v.bafaFreigabe && v.status !== 'abgeschlossen').length;
  const totalVolume = filteredVergaben.reduce((s, v) => s + (v.auftragswert || 0), 0);

  const handleEditClick = (v: Vergabe) => {
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
    setVStatus(v.status);
    setVBafa(v.bafaFreigabe);
    setVNotiz(v.notizen);
    setShowFormModal(true);
  };

  const handleDeleteClick = (id: number, title: string) => {
    if (confirm(`Möchten Sie die Vergabe "${title}" wirklich löschen?`)) {
      onDeleteVergabe(id);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vTitel.trim()) {
      alert('Der Vergabetitel ist ein Pflichtfeld.');
      return;
    }

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
      status: vStatus,
      bafaFreigabe: vBafa,
      notizen: vNotiz.trim(),
    };

    if (editingId) {
      onUpdateVergabe(editingId, payload);
    } else {
      onAddVergabe(payload);
    }

    // Reset Form Fields
    setEditingId(null);
    setVTitel('');
    setVAn('');
    setVWert('');
    setVAus('');
    setVFrist('');
    setVZu('');
    setVVe('');
    setVNotiz('');
    setVBafa(false);
    setShowFormModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
            Vergabe<span className="bg-zs-signal-gelb px-1 py-0.5 rounded">management (Ausschreibungen)</span>
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Kanban-Board und Ausschreibungsregister &middot; {activeYearLabel}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setVTitel('');
            setVAn('');
            setVWert('');
            setVAus('');
            setVFrist('');
            setVZu('');
            setVVe('');
            setVNotiz('');
            setVBafa(false);
            setVStatus('Vorbereitung');
            setShowFormModal(true);
          }}
          className="px-5 py-2 text-xs font-bold rounded-full bg-zs-signal-gelb text-zs-blau-schwarz hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          + Neue Vergabe registrieren
        </button>
      </div>

      {/* Warning Box */}
      {missingBafaCount > 0 && (
        <div className="bg-red-50/80 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed animate-fade-in animate-pulse">
          <span className="text-lg">🚨</span>
          <div>
            <strong>Achtung:</strong> Es befinden sich <strong className="font-extrabold">{missingBafaCount} aktive Vergabe(n)</strong> ohne schriftliche BAFA-Freigabe (Zustimmung zum vorzeitigen Maßnahmenbeginn) im Umlauf! Vergaben ohne Freigabe riskieren den Verlust von Fördersummen.
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-400">VERGABESTELLEN AKTIV</div>
          <div className="text-2xl font-mono font-bold text-zs-blau-schwarz mt-1">
            {filteredVergaben.filter((v)=>v.status!=='abgeschlossen').length} im Prozess
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-400 font-semibold text-zs-textil-gruen">AUFTRAGSWERT PROZESS</div>
          <div className="text-2xl font-mono font-bold text-zs-textil-gruen mt-1">
            {formatEuro(totalVolume, 2)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-400 font-semibold text-red-500">AUSSTEHENDE BEILLIGUNGEN</div>
          <div className="text-2xl font-mono font-bold text-red-500 mt-1">
            {missingBafaCount} Anträge offen
          </div>
        </div>
      </div>

      {/* Kanban Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {STATI.map((colStatus) => {
          const colCards = filteredVergaben.filter((v) => v.status === colStatus);
          return (
            <div key={colStatus} className="bg-zinc-100/70 border border-zinc-200 rounded-2xl p-3 flex flex-col min-h-64 mb-1">
              <div className="flex justify-between items-center mb-3 pb-1.5 border-b border-zinc-300">
                <span className="text-[10px] font-mono font-bold tracking-wider text-zs-blau-schwarz/75 truncate" title={colStatus}>
                  {colStatus.toUpperCase()}
                </span>
                <span className="text-[9px] font-mono font-bold bg-[#041422]/10 px-1.5 py-0.5 rounded text-zs-blau-schwarz">
                  {colCards.length}
                </span>
              </div>
              <div className="space-y-2 flex-grow overflow-y-auto max-h-[30rem] scrollbar-thin">
                {colCards.length === 0 ? (
                  <div className="text-center py-6 text-[10px] text-zinc-400 font-mono tracking-wider italic">
                    Keine Vergabe
                  </div>
                ) : (
                  colCards.map((v) => (
                    <div
                      key={v.id}
                      className="bg-white p-3 border border-zinc-200 rounded-xl shadow-xs hover:border-zs-blau-schwarz transition-all flex flex-col gap-1 text-xs"
                    >
                      <div className="font-semibold text-zs-blau-schwarz leading-tight truncate" title={v.titel}>
                        {v.titel}
                      </div>
                      {v.auftragswert > 0 && (
                        <div className="font-mono text-[10px] text-zinc-500 mt-1">{formatEuro(v.auftragswert)}</div>
                      )}
                      {!v.bafaFreigabe && v.status !== 'abgeschlossen' && (
                        <div className="text-[9px] font-mono text-red-500 font-bold bg-red-50 border border-red-200/50 px-1.5 py-0.5 rounded mt-0.5 w-max">
                          ⚠ BAFA fehlt
                        </div>
                      )}
                      <div className="flex gap-1.5 mt-2 pt-1 border-t border-zinc-100 text-[10px] font-mono">
                        <button
                          onClick={() => handleEditClick(v)}
                          className="px-2 py-0.5 border border-zinc-200 rounded hover:bg-zs-blau-schwarz hover:text-white hover:border-zs-blau-schwarz transition-all cursor-pointer flex-1"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDeleteClick(v.id, v.titel)}
                          className="px-1 py-0.5 text-red-500 rounded hover:bg-red-50 transition-all cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Vergabe Spreadsheet registry list */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <span className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-wider">Ergebnisliste</span>
          <span className="text-xs text-zinc-500 font-mono">{filteredVergaben.length} Sätze</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[9px] text-zinc-400 tracking-wider">
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
            <tbody>
              {filteredVergaben.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-zinc-400 font-mono">
                    Keine Vergabeaufträge registriert für {activeYearLabel}.
                  </td>
                </tr>
              ) : (
                filteredVergaben.map((v) => (
                  <tr key={v.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                    <td className="p-3 pl-5 font-bold text-zs-blau-schwarz text-xs max-w-[200px] truncate" title={v.titel}>
                      {v.titel}
                    </td>
                    <td className="p-3 text-xs text-zinc-700 font-medium">{v.auftragnehmer || '–'}</td>
                    <td className="p-3 text-xs text-zinc-500 italic">{v.vergabeart || '–'}</td>
                    <td className="p-3 text-xs text-right font-mono font-semibold">{v.auftragswert ? formatEuro(v.auftragswert) : '–'}</td>
                    <td className="p-3 text-xs text-zinc-655 space-y-0.5">
                      {v.abgabeFrist && <div><span className="text-[10px] font-mono text-zinc-400">Abgabe:</span> {formatDate(v.abgabeFrist)}</div>}
                      {v.zuschlagsDatum && <div><span className="text-[10px] font-mono text-zinc-400">Zuschlag:</span> {formatDate(v.zuschlagsDatum)}</div>}
                    </td>
                    <td className="p-3 text-xs text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        v.bafaFreigabe ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        {v.bafaFreigabe ? 'Freigegeben' : 'Fehlt!'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider ${
                        v.status === 'abgeschlossen' ? 'bg-zinc-100 text-zinc-600' :
                        v.status === 'Zuschlag' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-zinc-100 text-zs-blau-schwarz border border-zinc-300'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleEditClick(v)}
                        className="px-2 py-1 rounded bg-zinc-100 hover:bg-zs-blau-schwarz hover:text-white transition-all text-[11px] font-semibold text-zinc-800 cursor-pointer"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => handleDeleteClick(v.id, v.titel)}
                        className="px-2 py-1 rounded text-red-500 hover:bg-red-50 transition-all text-[11px] font-semibold cursor-pointer"
                      >
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: SAVE / EDIT PROCUREMENTS ── */}
      {showFormModal && (
        <div className="fixed inset-0 bg-zs-blau-schwarz/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-xl w-full overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/30">
              <h3 className="font-display font-bold text-lg text-zs-blau-schwarz">
                {editingId ? 'Vergabebeleg bearbeiten' : 'Vergabeauftrag erfassen'}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="text-zinc-400 hover:text-zs-blau-schwarz transition-all text-xl font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Vergabstitel <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="z.B. Digitalisierungsberatung Textilunternehmen..."
                    value={vTitel}
                    onChange={(e) => setVTitel(e.target.value)}
                    className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Lösungsbieter / Auftragnehmer</label>
                    <input
                      type="text"
                      placeholder="z.B. re.solution GmbH"
                      value={vAn}
                      onChange={(e) => setVAn(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Vergabeart</label>
                    <select
                      value={vArt}
                      onChange={(e) => setVArt(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    >
                      <option>freihändige Vergabe</option>
                      <option>beschränkte Ausschreibung</option>
                      <option>öffentliche Ausschreibung</option>
                      <option>Direktvergabe</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Plan- / Auftragswert (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={vWert}
                      onChange={(e) => setVWert(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider font-semibold text-zs-textil-gruen">Arbeitspaket (AP)</label>
                    <select
                      value={vAp}
                      onChange={(e) => setVAp(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    >
                      <option>AP1 – Projektmanagement</option>
                      <option>AP2 – Technologietransfer</option>
                      <option>AP3 – Netzwerk</option>
                      <option>AP4 – Öffentlichkeitsarbeit</option>
                      <option>AP5 – Use-Cases</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono font-bold text-zinc-300 uppercase tracking-wider">Ausschreibung</label>
                    <input
                      type="date"
                      value={vAus}
                      onChange={(e) => setVAus(e.target.value)}
                      className="px-2 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-[11px] outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono font-bold text-zinc-300 uppercase tracking-wider">Abgabefrist</label>
                    <input
                      type="date"
                      value={vFrist}
                      onChange={(e) => setVFrist(e.target.value)}
                      className="px-2 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-[11px] outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono font-bold text-zinc-300 uppercase tracking-wider">Zuschlagsdatum</label>
                    <input
                      type="date"
                      value={vZu}
                      onChange={(e) => setVZu(e.target.value)}
                      className="px-2 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-[11px] outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono font-bold text-zinc-300 uppercase tracking-wider">Vertragsende</label>
                    <input
                      type="date"
                      value={vVe}
                      onChange={(e) => setVVe(e.target.value)}
                      className="px-2 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-[11px] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Vergabestufe Status</label>
                    <select
                      value={vStatus}
                      onChange={(e) => setVStatus(e.target.value as Vergabe['status'])}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    >
                      {STATI.map((s) => (
                        <option key={s} value={s}>{s}</option>
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
                    <label htmlFor="bafa-chk" className="text-xs font-semibold text-zs-blau-schwarz cursor-pointer select-none">
                      Schriftliche BAFA-Zustimmung erhalten
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Ausschreibungsnotizen</label>
                  <textarea
                    rows={2}
                    placeholder="Wichtige Bieterhistorie, Rückfragen oder Fristenhinweise..."
                    value={vNotiz}
                    onChange={(e) => setVNotiz(e.target.value)}
                    className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-zinc-100 flex justify-end gap-2 bg-zinc-50/50">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-zs-signal-gelb text-zs-blau-schwarz font-bold text-xs hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-all cursor-pointer"
                >
                  {editingId ? 'Änderungen speichern' : 'Vergabe erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
