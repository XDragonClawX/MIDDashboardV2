import React, { useState } from 'react';
import { Rechnungsbeleg } from '../../types';
import { formatEuro, formatDate, getQuarterFromMonth } from '../../utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';

interface RechnungsPageProps {
  rechnungen: Rechnungsbeleg[];
  activeYear: string | null;
  activeYearLabel: string;
  onAddRechnung: (invoice: Omit<Rechnungsbeleg, 'id'>) => void;
  onUpdateRechnungStatus: (id: number, newStatus: Rechnungsbeleg['status']) => void;
}

export default function RechnungsPage({
  rechnungen,
  activeYear,
  activeYearLabel,
  onAddRechnung,
  onUpdateRechnungStatus,
}: RechnungsPageProps) {
  // Local states
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  // Filters state
  const [filterKat, setFilterKat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // Form states
  const [rSteller, setRSteller] = useState('');
  const [rNr, setRNr] = useState('');
  const [rDatum, setRDatum] = useState('');
  const [rZdatum, setRZdatum] = useState('');
  const [rNetto, setRNetto] = useState('');
  const [rBrutto, setRBrutto] = useState('');
  const [rKat, setRKat] = useState('Marketing');
  const [rAp, setRAp] = useState('AP4 – Öffentlichkeitsarbeit');
  const [rJahr, setRJahr] = useState(2025);
  const [rQuartal, setRQuartal] = useState(4);
  const [rFoerd, setRFoerd] = useState(true);
  const [rStatus, setRStatus] = useState<Rechnungsbeleg['status']>('ENTWURF');
  const [rBeschr, setRBeschr] = useState('');

  // Categories list
  const KATEGORIEN = [
    'Vergabeaufträge', 'Dienstreisen', 'Gegenstände <800€', 'Miete + Rechner',
    'Marketing', 'Veranstaltungen', 'Workshops', 'Juristische Beratung',
    'Hosting/Web', 'Öffentlichkeitsarbeit'
  ];

  // Auto calculate Gross Amount on the fly (19% VAT)
  const handleNettoChange = (val: string) => {
    setRNetto(val);
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) {
      setRBrutto((n * 1.19).toFixed(2));
    } else {
      setRBrutto('');
    }
  };

  const handleDatumChange = (val: string) => {
    setRDatum(val);
    if (val) {
      const month = new Date(val).getMonth() + 1;
      setRQuartal(getQuarterFromMonth(month));
    }
  };

  // Filtration logic
  const filteredRechnungen = rechnungen.filter((r) => {
    // 1. Global Year Filter (based on rechnungsdatum or project activeYear)
    if (activeYear) {
      const { von, bis } = (() => {
        if (activeYear === 'gesamt25') return { von: '2025-04-01', bis: '2025-12-31' };
        if (activeYear === 'mrz29') return { von: '2029-01-01', bis: '2029-03-31' };
        return { von: `${activeYear}-01-01`, bis: `${activeYear}-12-31` };
      })();
      if (r.rechnungsdatum < von || r.rechnungsdatum > bis) return false;
    }

    // 2. Inter-panel Filter Selectors
    if (filterKat && r.kostenkategorie !== filterKat) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterYear && String(r.foerderjahr) !== filterYear) return false;

    return true;
  });

  // KPI Calculations
  const totNetto = filteredRechnungen.reduce((s, r) => s + r.betragNetto, 0);
  const totFoerdNetto = filteredRechnungen.filter((r) => r.foerderfaehig).reduce((s, r) => s + r.betragNetto, 0);
  const totNichtFoerdNetto = totNetto - totFoerdNetto;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rSteller.trim()) { alert('Rechnungssteller fehlt'); return; }
    if (!rNr.trim()) { alert('Rechnungsnummer fehlt'); return; }
    if (!rDatum) { alert('Rechnungsdatum fehlt'); return; }
    const net = parseFloat(rNetto);
    if (isNaN(net) || net <= 0) { alert('Netto-Betrag muss größer als 0 sein'); return; }

    onAddRechnung({
      rechnungsnummer: rNr.trim(),
      rechnungssteller: rSteller.trim(),
      leistungsbeschreibung: rBeschr.trim(),
      rechnungsdatum: rDatum,
      zahlungsdatum: rZdatum || null,
      kostenkategorie: rKat,
      foerderjahr: Number(rJahr),
      quartal: Number(rQuartal),
      arbeitspaket: rAp,
      betragNetto: net,
      betragBrutto: parseFloat(rBrutto) || Math.round(net * 1.19 * 100) / 100,
      foerderfaehig: rFoerd,
      status: rStatus,
    });

    // Reset Form and Toggle Modal
    setRSteller('');
    setRNr('');
    setRDatum('');
    setRZdatum('');
    setRNetto('');
    setRBrutto('');
    setRBeschr('');
    setShowAddModal(false);
  };

  // Chart aggregation
  const catSums = KATEGORIEN.reduce((acc: { [key: string]: number }, cat) => {
    acc[cat] = filteredRechnungen.filter((r) => r.kostenkategorie === cat).reduce((s, r) => s + r.betragNetto, 0);
    return acc;
  }, {});

  const catData = Object.entries(catSums).map(([name, value]) => ({ name, value })).filter((d) => d.value > 0);

  const statusCounts = ['ENTWURF', 'IN_PRUEFUNG', 'EINGEREICHT', 'ARCHIVIERT'].reduce((acc: { [key: string]: number }, st) => {
    acc[st] = filteredRechnungen.filter((r) => r.status === st).length;
    return acc;
  }, {});

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value })).filter((d) => d.value > 0);

  const COLORS = ['#041422', '#58B49D', '#BA8B68', '#7F6DBA', '#E8B34A', '#E87979'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
            Sachkosten<span className="bg-zs-signal-gelb px-1 py-0.5 rounded">belege (Rechnungen)</span>
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Periodenerfassung von Rechnungen &middot; {activeYearLabel} &middot; Mehrwertsteuerrechner
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2 text-xs font-bold rounded-full bg-zs-signal-gelb text-zs-blau-schwarz hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-all shadow-xs self-start sm:self-auto cursor-pointer"
        >
          + Neue Rechnung erfassen
        </button>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-400">BELEGE IN PERIODE</div>
          <div className="text-2xl font-mono font-bold text-zs-blau-schwarz mt-1">
            {filteredRechnungen.length} Sätze
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-400">KOSTEN NETTO GESAMT</div>
          <div className="text-2xl font-mono font-bold text-zs-blau-schwarz mt-1">
            {formatEuro(totNetto, 2)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono font-semibold tracking-wider text-emerald-600 uppercase">FÖRDERFÄHIG BRUTTO</div>
          <div className="text-2xl font-mono font-bold text-zs-textil-gruen mt-1">
            {formatEuro(totFoerdNetto, 2)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-zinc-200 relative">
          <div className="text-[10px] font-mono font-semibold tracking-wider text-red-600 uppercase">NICHT FÖRDERFÄHIG</div>
          <div className="text-2xl font-mono font-bold text-red-600 mt-1">
            {formatEuro(totNichtFoerdNetto, 2)}
          </div>
        </div>
      </div>

      {/* Dynamic Filter selector bar */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200/80 flex flex-wrap gap-4 items-center">
        <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Filter:</span>
        <select
          value={filterKat}
          onChange={(e) => setFilterKat(e.target.value)}
          className="text-xs bg-zinc-50 border border-zinc-300 rounded-md px-2.5 py-1.5 focus:border-zs-blau-schwarz cursor-pointer"
        >
          <option value="">Alle Kategorien</option>
          {KATEGORIEN.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs bg-zinc-50 border border-zinc-300 rounded-md px-2.5 py-1.5 focus:border-zs-blau-schwarz cursor-pointer"
        >
          <option value="">Alle Status</option>
          <option value="ENTWURF">ENTWURF</option>
          <option value="IN_PRUEFUNG">IN PRÜFUNG</option>
          <option value="EINGEREICHT">EINGEREICHT</option>
          <option value="ARCHIVIERT">ARCHIVIERT</option>
        </select>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="text-xs bg-zinc-50 border border-zinc-300 rounded-md px-2.5 py-1.5 focus:border-zs-blau-schwarz cursor-pointer"
        >
          <option value="">Alle Förderjahre</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
          <option value="2027">2027</option>
          <option value="2028">2028</option>
          <option value="2029">2029</option>
        </select>
        <button
          onClick={() => {
            setFilterKat('');
            setFilterStatus('');
            setFilterYear('');
          }}
          className="text-xs font-mono text-zinc-400 hover:text-zs-blau-schwarz transition-all cursor-pointer underline decoration-dotted ml-auto"
        >
          Filter zurücksetzen
        </button>
      </div>

      {/* Categories chart visualizer */}
      {filteredRechnungen.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-xl border border-zinc-200 md:col-span-2 shadow-xs">
            <h3 className="text-[10px] font-mono font-bold tracking-wider text-zinc-400 uppercase mb-3">Ausgaben nach Kategorie</h3>
            <div className="h-56">
              {catData.length === 0 ? (
                <div className="h-full flex items-center justify-center font-mono text-xs text-zinc-400">Keine Daten</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="name" fontSize={10} stroke="#9CA3AF" tickFormatter={(v) => v.length > 11 ? `${v.slice(0, 10)}…` : v} />
                    <YAxis fontSize={9} stroke="#9CA3AF" tickFormatter={(v) => `${v} €`} />
                    <Tooltip formatter={(v: number) => [formatEuro(v, 2), '']} />
                    <Bar dataKey="value" fill="#7F6DBA" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
            <h3 className="text-[10px] font-mono font-bold tracking-wider text-zinc-400 uppercase mb-3">Statusaufteilung</h3>
            <div className="h-56 flex flex-col justify-center items-center relative">
              {statusData.length === 0 ? (
                <div className="font-mono text-xs text-zinc-400">Keine Daten</div>
              ) : (
                <>
                  <div className="h-[80%] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value">
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 text-[10px] font-mono max-h-12 overflow-y-auto">
                    {statusData.map((e, index) => (
                      <span key={index} className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        {e.name} ({e.value})
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expense ledger list table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <span className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-wider">Ergebnisliste</span>
          <span className="text-xs text-zinc-500 font-mono-important">{filteredRechnungen.length} Zeilen</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] text-zinc-400 tracking-wider">
                <th className="p-3 pl-5">Rechnungsnummer</th>
                <th className="p-3">Aussteller (Komp.)</th>
                <th className="p-3">Belegdatum</th>
                <th className="p-3">Kategorie</th>
                <th className="p-3 text-center">AP</th>
                <th className="p-3 text-right">Netto €</th>
                <th className="p-3 text-right">Brutto €</th>
                <th className="p-3 text-center">Förderfähig</th>
                <th className="p-3 text-center">Quartal</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRechnungen.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-xs text-zinc-400 font-mono">
                    Keine Rechnungsbelege mit diesen Filtereinstellungen gefunden.
                  </td>
                </tr>
              ) : (
                filteredRechnungen.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                    <td className="p-3 pl-5 font-mono text-xs text-zs-blau-schwarz font-semibold">
                      {r.rechnungsnummer}
                    </td>
                    <td className="p-3 text-xs font-semibold text-zinc-800">{r.rechnungssteller}</td>
                    <td className="p-3 text-xs text-zinc-600">{formatDate(r.rechnungsdatum)}</td>
                    <td className="p-3 text-xs text-zinc-600 max-w-[150px] truncate" title={r.kostenkategorie}>{r.kostenkategorie}</td>
                    <td className="p-3 text-xs text-center font-mono font-medium text-zinc-500">{(r.arbeitspaket || '').split(' ')[0] || '–'}</td>
                    <td className="p-3 text-xs text-right font-mono font-semibold">{formatEuro(r.betragNetto, 2)}</td>
                    <td className="p-3 text-xs text-right font-mono text-zinc-400">{formatEuro(r.betragBrutto, 2)}</td>
                    <td className="p-3 text-xs text-center font-bold">
                      {r.foerderfaehig ? (
                        <span className="text-emerald-600">✓</span>
                      ) : (
                        <span className="text-red-500">✗</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-center font-mono">Q{r.quartal}</td>
                    <td className="p-3 text-center text-xs relative">
                      <button
                        onClick={() => setActiveDropdownId(activeDropdownId === r.id ? null : r.id)}
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider transition-all border cursor-pointer ${
                          r.status === 'EINGEREICHT' ? 'bg-[#58B49D]/10 text-[#2a7060] border-[#58B49D]/35' :
                          r.status === 'IN_PRUEFUNG' ? 'bg-[#7F6DBA]/10 text-[#54468f] border-[#7F6DBA]/35' :
                          r.status === 'ARCHIVIERT' ? 'bg-zinc-100 text-zinc-600 border-zinc-200' :
                          'bg-amber-100 text-amber-700 border-amber-200'
                        }`}
                      >
                        {r.status} &nbsp;▾
                      </button>

                      {/* Dropdown overlay */}
                      {activeDropdownId === r.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveDropdownId(null)}></div>
                          <div className="absolute right-1/2 translate-x-1/2 mt-1 w-32 bg-white rounded-lg border border-zinc-200 shadow-lg z-20 overflow-hidden font-mono text-xs text-left">
                            {(['ENTWURF', 'IN_PRUEFUNG', 'EINGEREICHT', 'ARCHIVIERT'] as Rechnungsbeleg['status'][]).map((status) => (
                              <button
                                key={status}
                                onClick={() => {
                                  onUpdateRechnungStatus(r.id, status);
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: SAVE ACCOUNTING INVOICE ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-zs-blau-schwarz/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-xl w-full overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/30">
              <h3 className="font-display font-bold text-lg text-zs-blau-schwarz">Rechnungsbeleg erfassen</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zs-blau-schwarz transition-all text-xl font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Rechnungssteller <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="z.B. Skopos Nova GmbH"
                      value={rSteller}
                      onChange={(e) => setRSteller(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Rechnungsnummer <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="z.B. RE-2025-4519"
                      value={rNr}
                      onChange={(e) => setRNr(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Rechnungsdatum <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={rDatum}
                      onChange={(e) => handleDatumChange(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Zahlungsdatum</label>
                    <input
                      type="date"
                      value={rZdatum}
                      onChange={(e) => setRZdatum(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Betrag Netto (€) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={rNetto}
                      onChange={(e) => handleNettoChange(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Betrag Brutto (€) (Incl. VAT 19%)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Satzrechner..."
                      value={rBrutto}
                      onChange={(e) => setRBrutto(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white font-medium text-zinc-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Kostenkategorie</label>
                    <select
                      value={rKat}
                      onChange={(e) => setRKat(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    >
                      {KATEGORIEN.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Arbeitspaket (AP)</label>
                    <select
                      value={rAp}
                      onChange={(e) => setRAp(e.target.value)}
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Förderjahr</label>
                    <select
                      value={rJahr}
                      onChange={(e) => setRJahr(Number(e.target.value))}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    >
                      <option value="2025">2025 (BAFA-I)</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                      <option value="2028">2028</option>
                      <option value="2029">2029</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Abrufquartal</label>
                    <select
                      value={rQuartal}
                      onChange={(e) => setRQuartal(Number(e.target.value))}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    >
                      <option value="1">Q1 (Jan–Mär)</option>
                      <option value="2">Q2 (Apr–Jun)</option>
                      <option value="3">Q3 (Jul–Sep)</option>
                      <option value="4">Q4 (Okt–Dez)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Belegstatus</label>
                    <select
                      value={rStatus}
                      onChange={(e) => setRStatus(e.target.value as Rechnungsbeleg['status'])}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    >
                      <option value="ENTWURF">ENTWURF</option>
                      <option value="IN_PRUEFUNG">IN PRÜFUNG</option>
                      <option value="EINGEREICHT">EINGEREICHT</option>
                      <option value="ARCHIVIERT">ARCHIVIERT</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Leistungsbeschreibung / Projektbezug</label>
                  <textarea
                    rows={2}
                    placeholder="Wofür wurden die Sach- oder Dienstleistungskosten aufgewendet?"
                    value={rBeschr}
                    onChange={(e) => setRBeschr(e.target.value)}
                    className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 py-1.5 px-2 bg-zinc-50 rounded-lg border border-zinc-150">
                  <input
                    type="checkbox"
                    id="foerd-chk"
                    checked={rFoerd}
                    onChange={(e) => setRFoerd(e.target.checked)}
                    className="w-4 h-4 accent-zs-blau-schwarz cursor-pointer"
                  />
                  <label htmlFor="foerd-chk" className="text-xs font-semibold text-zs-blau-schwarz cursor-pointer select-none">
                    Diese Rechnung ist vollständig förderfähig im Rahmen der AZA-Bestimmungen
                  </label>
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
                  Beleg speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
