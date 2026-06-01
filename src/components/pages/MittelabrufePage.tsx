import React, { useState } from 'react';
import { Mittelabruf } from '../../types';
import { formatEuro, formatDate } from '../../utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface MittelabrufePageProps {
  mittelabrufe: Mittelabruf[];
  activeYear: string | null;
  activeYearLabel: string;
  onAddMittelabruf: (abruf: Omit<Mittelabruf, 'id'>) => void;
  onUpdateMittelabrufStatus: (id: number, newStatus: Mittelabruf['status']) => void;
  initialGeber?: string;
  onGeberChange?: (geber: string) => void;
}

export default function MittelabrufePage({
  mittelabrufe,
  activeYear,
  activeYearLabel,
  onAddMittelabruf,
  onUpdateMittelabrufStatus,
  initialGeber = 'all',
  onGeberChange,
}: MittelabrufePageProps) {
  // Local states
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  // Filter geber state
  const [filterGeber, setFilterGeber] = useState(initialGeber === 'all' ? '' : initialGeber);

  React.useEffect(() => {
    if (initialGeber !== undefined) {
      setFilterGeber(initialGeber === 'all' ? '' : initialGeber);
    }
  }, [initialGeber]);

  // Kassenschluss Checklist items (Priority 1)
  const [checklist, setChecklist] = useState([
    { id: 1, text: 'Arbeitgeberkosten (Lohnbelege) im IST-Verzeichnis vollständig abgeglichen', completed: true },
    { id: 2, text: 'Sachkostenbelege und Rechnungen auf BAFA-Konformität geprüft (Netto, Sachbericht vorhanden)', completed: true },
    { id: 3, text: 'Einhaltung der 10%-Obergrenze für die Pauschale geprüft', completed: false },
    { id: 4, text: 'Vergabegrenzen und BAFA-Freigaben für Transformations-Booster kontrolliert', completed: false },
    { id: 5, text: 'Mittelabruf-Formular vollständig ausgefüllt und von WIN.DN GmbH Geschäftsführung unterzeichnet', completed: false },
    { id: 6, text: 'LHO (Landesanteil 7,5%) parallel bei der Landeshauptkasse beantragt', completed: false },
  ]);

  // Form states
  const [maNr, setMaNr] = useState('');
  const [maGeber, setMaGeber] = useState<'BAFA_BUND' | 'LHO_LAND'>('BAFA_BUND');
  const [maVon, setMaVon] = useState('');
  const [maBis, setMaBis] = useState('');
  const [maBean, setMaBean] = useState('');
  const [maEing, setMaEing] = useState('');
  const [maQ, setMaQ] = useState(4);
  const [maStatus, setMaStatus] = useState<Mittelabruf['status']>('ENTWURF');

  const now = new Date();
  const currentYear = now.getFullYear();
  const deadlineDate = new Date(currentYear, 10, 15); // Nov 15th
  const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Filtration based on global year and Mittelgeber
  const filteredAbrufe = mittelabrufe.filter((a) => {
    if (activeYear) {
      if (activeYear === 'gesamt25' && a.foerderjahr !== 2025) return false;
      if (activeYear === 'mrz29' && a.foerderjahr !== 2029) return false;
      if (activeYear !== 'gesamt25' && activeYear !== 'mrz29' && String(a.foerderjahr) !== String(activeYear)) return false;
    }
    if (filterGeber && a.mittelgeber !== filterGeber) return false;
    return true;
  });

  const totBeantragt = filteredAbrufe.reduce((s, a) => s + a.beantragt, 0);
  const totEingegangen = filteredAbrufe.reduce((s, a) => s + a.eingegangen, 0);
  const pendingFunds = totBeantragt - totEingegangen;

  // Toggle checklist
  const toggleCheck = (id: number) => {
    setChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maNr.trim()) { alert('Abrufnummer fehlt'); return; }
    if (!maVon || !maBis) { alert('Zeitraum fehlt'); return; }
    const beantragtNum = parseFloat(maBean);
    if (isNaN(beantragtNum) || beantragtNum <= 0) { alert('Beantragter Betrag ungültig'); return; }

    const eingegangenNum = parseFloat(maEing) || 0;

    onAddMittelabruf({
      abrufnummer: maNr.trim(),
      zeitraumVon: maVon,
      zeitraumBis: maBis,
      mittelgeber: maGeber,
      foerderjahr: Number(activeYear && activeYear !== 'gesamt25' && activeYear !== 'mrz29' ? activeYear : 2025),
      quartal: Number(maQ),
      beantragt: beantragtNum,
      eingegangen: eingegangenNum,
      differenz: beantragtNum - eingegangenNum,
      status: maStatus,
    });

    setMaNr('');
    setMaVon('');
    setMaBis('');
    setMaBean('');
    setMaEing('');
    setShowAddModal(false);
  };

  // Recharts data
  const chartsData = filteredAbrufe.map((a) => ({
    name: a.abrufnummer.length > 12 ? `${a.abrufnummer.slice(0, 11)}…` : a.abrufnummer,
    Beantragt: a.beantragt,
    Eingegangen: a.eingegangen || 0,
  }));

  const checkedCount = checklist.filter((x) => x.completed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
            Mittel<span className="bg-zs-signal-gelb px-1 py-0.5 rounded">abrufe</span>
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Einreichung BAFA (Bundeskasse Halle) &amp; LHO (Landeshauptkasse NRW) &middot; {activeYearLabel}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2 text-xs font-bold rounded-full bg-zs-signal-gelb text-zs-blau-schwarz hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          + Abruf registrieren
        </button>
      </div>

      {/* Kassenschluss Banner & Countdown Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Countdown Box */}
        <div className="bg-[#BA8B68]/10 border border-zs-papier-braun/25 p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold text-zinc-500 tracking-wider">JÄHRLICHER KASSENSCHLUSS</span>
              <span className="text-[10px] font-mono bg-zs-papier-braun text-white font-bold px-2 py-0.5 rounded">15. November</span>
            </div>
            <div className="text-5xl font-mono font-black text-zs-papier-braun mt-4 tracking-tighter">
              {daysLeft > 0 ? `${daysLeft} Tage` : 'Frist fällig'}
            </div>
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
              Bis zum 15. November müssen alle Lohnbelege und Sachkosten-Quittungen beim Prüfverfahren eingegangen sein.
            </p>
          </div>
          {daysLeft <= 30 && daysLeft > 0 && (
            <div className="mt-4 px-3 py-2 bg-red-100 border border-red-300 rounded-lg text-xs font-mono font-bold text-red-700 animate-pulse">
              ⚠️ DRINGLICH: Weniger als 30 Tage verbleibend!
            </div>
          )}
        </div>

        {/* Priority 1 Checklist */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs lg:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
              Checkliste Kassenschluss-Vorbereitung (15. Nov.)
            </h3>
            <span className="text-xs font-mono font-bold text-zs-textil-gruen bg-zs-textil-gruen/10 px-2 py-0.5 rounded">
              {checkedCount} / {checklist.length} abgearbeitet
            </span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-2">
            {checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className={`flex gap-3 text-xs items-start p-2.5 rounded-lg border cursor-pointer select-none transition-all ${
                  item.completed
                    ? 'bg-zinc-50 border-zinc-150 text-zinc-400'
                    : 'bg-white border-zinc-200 text-zs-blau-schwarz hover:border-zinc-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => {}} // toggled on container tap
                  className="w-4 h-4 rounded border-zinc-300 text-zs-blau-schwarz focus:ring-zs-blau-schwarz mt-0.5 cursor-pointer"
                />
                <span className={item.completed ? 'line-through text-zinc-400' : 'font-medium'}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* stats and chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200">
            <div className="text-[10px] font-mono text-zinc-400">BEANTRAGT IN PERIODE</div>
            <div className="text-2xl font-mono font-bold text-zs-blau-schwarz mt-1">
              {formatEuro(totBeantragt, 2)}
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-zinc-200">
            <div className="text-[10px] font-mono text-zinc-400 font-semibold text-zs-textil-gruen">EINGEGANGEN</div>
            <div className="text-2xl font-mono font-bold text-zs-textil-gruen mt-1">
              {formatEuro(totEingegangen, 2)}
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-zinc-200">
            <div className="text-[10px] font-mono text-zinc-400 font-semibold text-amber-500">AUSSTEHENDER BETRAG</div>
            <div className="text-2xl font-mono font-bold text-amber-500 mt-1">
              {formatEuro(pendingFunds, 2)}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs lg:col-span-2">
          <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase mb-4">Beantragter vs. Eingegangener Cashflow (Prüfzyklus)</h3>
          <div className="h-64">
            {chartsData.length === 0 ? (
              <div className="h-full flex items-center justify-center font-mono text-xs text-zinc-400">Keine Daten vorhanden</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartsData} margin={{ left: -15, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" fontSize={10} stroke="#9CA3AF" />
                  <YAxis fontSize={9} stroke="#9CA3AF" tickFormatter={(v) => `${(v/1000).toFixed(0)}k €`} />
                  <Tooltip formatter={(v: number) => [formatEuro(v, 2), '']} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Beantragt" fill="#041422" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Eingegangen" fill="#58B49D" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Mittelgeber Filter row */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold text-zinc-400 uppercase">Mittelgeber filtern:</span>
          <div className="flex flex-wrap gap-1">
            {[
              { key: 'all', label: 'Alle Mittelgeber' },
              { key: 'BAFA_BUND', label: 'BAFA Bund (90%)' },
              { key: 'LHO_LAND', label: 'LHO NRW (7.5%)' },
            ].map((g) => {
              const isSelected = (g.key === 'all' && !filterGeber) || filterGeber === g.key;
              return (
                <button
                  key={g.key}
                  onClick={() => {
                    const nextVal = g.key === 'all' ? '' : g.key;
                    setFilterGeber(nextVal);
                    if (onGeberChange) {
                      onGeberChange(g.key);
                    }
                  }}
                  className={`px-3 py-1 text-xs font-mono font-semibold rounded-full border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-zs-blau-schwarz text-white border-zs-blau-schwarz'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-100'
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>
        {filterGeber && (
          <button
            onClick={() => {
              setFilterGeber('');
              if (onGeberChange) {
                onGeberChange('all');
              }
            }}
            className="text-[10px] font-mono font-bold text-[#D04C3D] hover:underline flex items-center gap-1 bg-red-50 px-2 py-1 rounded border border-red-200/50 cursor-pointer"
          >
            ✕ Filter aufheben
          </button>
        )}
      </div>

      {/* Tabular view of Abrufe */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <span className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-wider">Ergebnisliste</span>
          <span className="text-xs text-zinc-500 font-mono">{filteredAbrufe.length} drawings found</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] text-zinc-400 tracking-wider">
                <th className="p-3 pl-5">Abrufnummer</th>
                <th className="p-3">Zeitraum</th>
                <th className="p-3">Mittelgeber</th>
                <th className="p-3 text-center">Periode</th>
                <th className="p-3 text-right">Beantragt €</th>
                <th className="p-3 text-right">Eingegangen €</th>
                <th className="p-3 text-right">Differenz €</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAbrufe.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-zinc-400 font-mono">
                    Keine Mittelabrufe registriert für {activeYearLabel}.
                  </td>
                </tr>
              ) : (
                filteredAbrufe.map((a) => {
                  const isBafa = a.mittelgeber === 'BAFA_BUND';
                  return (
                    <tr key={a.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <td className="p-3 pl-5 font-mono text-xs font-bold text-zs-blau-schwarz">{a.abrufnummer}</td>
                      <td className="p-3 text-xs text-zinc-600">{formatDate(a.zeitraumVon)} – {formatDate(a.zeitraumBis)}</td>
                      <td className="p-3 text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          isBafa ? 'bg-[#041422]/10 text-zs-blau-schwarz' : 'bg-[#BA8B68]/15 text-[#7a4a1e]'
                        }`}>
                          {isBafa ? 'BAFA (Mitte)' : 'LHO (Düsseldorf)'}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-center font-mono">Q{a.quartal} &middot; {a.foerderjahr}</td>
                      <td className="p-3 text-xs text-right font-mono font-medium">{formatEuro(a.beantragt, 2)}</td>
                      <td className="p-3 text-xs text-right font-mono font-bold text-zs-textil-gruen">{formatEuro(a.eingegangen || 0, 2)}</td>
                      <td className={`p-3 text-xs text-right font-mono font-medium ${a.differenz > 0 ? 'text-amber-600' : 'text-zinc-600'}`}>{formatEuro(a.differenz, 2)}</td>
                      <td className="p-3 text-center text-xs relative">
                        <button
                          onClick={() => setActiveDropdownId(activeDropdownId === a.id ? null : a.id)}
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider transition-all border cursor-pointer ${
                            a.status === 'EINGEREICHT' ? 'bg-[#58B49D]/10 text-[#2a7060] border-[#58B49D]/35' :
                            a.status === 'IN_PRUEFUNG' ? 'bg-[#7F6DBA]/10 text-[#54468f] border-[#7F6DBA]/35' :
                            a.status === 'ARCHIVIERT' ? 'bg-zinc-100 text-zinc-600 border-zinc-200' :
                            'bg-amber-100 text-amber-700 border-amber-200'
                          }`}
                        >
                          {a.status} &nbsp;▾
                        </button>

                        {/* Dropdown overlay */}
                        {activeDropdownId === a.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveDropdownId(null)}></div>
                            <div className="absolute right-1/2 translate-x-1/2 mt-1 w-32 bg-white rounded-lg border border-zinc-200 shadow-lg z-20 overflow-hidden font-mono text-xs">
                              {(['ENTWURF', 'IN_PRUEFUNG', 'EINGEREICHT', 'ARCHIVIERT'] as Mittelabruf['status'][]).map((status) => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    onUpdateMittelabrufStatus(a.id, status);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-zs-signal-gelb/30 transition-all cursor-pointer"
                                >
                                  {status}
                                </button>
                              ))}
                            </div>
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

      {/* ── MODAL: REGISTER DRAWING ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-zs-blau-schwarz/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/30">
              <h3 className="font-display font-bold text-lg text-zs-blau-schwarz">Mittelabruf registrieren</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zs-blau-schwarz transition-all text-xl font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="p-6 space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Abrufnummer <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="z.B. BAFA-2025-Q4-01"
                    value={maNr}
                    onChange={(e) => setMaNr(e.target.value)}
                    className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Mittelgeber</label>
                  <select
                    value={maGeber}
                    onChange={(e) => setMaGeber(e.target.value as 'BAFA_BUND' | 'LHO_LAND')}
                    className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                  >
                    <option value="BAFA_BUND">BAFA (Bundeskasse Halle)</option>
                    <option value="LHO_LAND">LHO Land NRW (Kofinanzierung)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Von</label>
                    <input
                      type="date"
                      value={maVon}
                      onChange={(e) => setMaVon(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Bis</label>
                    <input
                      type="date"
                      value={maBis}
                      onChange={(e) => setMaBis(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Beantragter Wert (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={maBean}
                      onChange={(e) => setMaBean(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Eingegangener Wert (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Noch ausstehend..."
                      value={maEing}
                      onChange={(e) => setMaEing(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white text-emerald-700 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Auszahlungsquartal</label>
                    <select
                      value={maQ}
                      onChange={(e) => setMaQ(Number(e.target.value))}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    >
                      <option value="1">Q1</option>
                      <option value="2">Q2</option>
                      <option value="3">Q3</option>
                      <option value="4">Q4</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Status</label>
                    <select
                      value={maStatus}
                      onChange={(e) => setMaStatus(e.target.value as Mittelabruf['status'])}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    >
                      <option value="ENTWURF">ENTWURF</option>
                      <option value="IN_PRUEFUNG">IN PRÜFUNG</option>
                      <option value="EINGEREICHT">EINGEREICHT</option>
                      <option value="ARCHIVIERT">ARCHIVIERT</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-zinc-100 flex justify-end gap-2 bg-zinc-50/50">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-zs-signal-gelb text-zs-blau-schwarz font-bold text-xs hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-all cursor-pointer"
                >
                  Registrieren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
