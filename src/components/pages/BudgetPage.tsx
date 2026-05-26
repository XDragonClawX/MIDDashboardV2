import React, { useState } from 'react';
import { PersonalEintrag, Rechnungsbeleg, Mittelabruf, Buchung } from '../../types';
import { formatEuro } from '../../utils';
import { AZA_PLAN, AZA_JAHRE } from '../../data';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface BudgetPageProps {
  personal: PersonalEintrag[];
  rechnungen: Rechnungsbeleg[];
  mittelabrufe: Mittelabruf[];
  buchungen: Buchung[];
  activeYear: string | null;
  activeYearLabel: string;
  onSetGlobalYear: (year: string | null) => void;
  onAddBuchung: (booking: Omit<Buchung, 'id'>) => void;
  onUpdateBuchungStatus: (id: number, newStatus: Buchung['status']) => void;
}

export default function BudgetPage({
  personal,
  rechnungen,
  mittelabrufe,
  buchungen,
  activeYear,
  activeYearLabel,
  onSetGlobalYear,
  onAddBuchung,
  onUpdateBuchungStatus,
}: BudgetPageProps) {
  // Tabs state
  const [activeTab, setActiveTab] = useState<'kategorie' | 'jahre' | 'personal' | 'vergaben' | 'buchungen'>('kategorie');
  const [showAddBookingModal, setShowAddBookingModal] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  // Form states to Add Booking
  const [bDatum, setBDatum] = useState('');
  const [bBetrag, setBBetrag] = useState('');
  const [bKat, setBKat] = useState('Personalkosten');
  const [bAp, setBAp] = useState('AP1 – Projektmanagement');
  const [bBeschr, setBBeschr] = useState('');
  const [bStatus, setBStatus] = useState<Buchung['status']>('gebucht');
  const [bFoerd, setBFoerd] = useState(true);

  // Years array
  const JKEYS = activeYear ? [activeYear] : ['gesamt25', '2026', '2027', '2028', 'mrz29'];
  const JLABELS: { [key: string]: string } = {
    gesamt25: '2025 (Apr-Dez)', '2026': '2026', '2027': '2027', '2028': '2028', mrz29: '2029 (Jan-Mär)'
  };

  const showGesamtColumn = JKEYS.length > 1;

  // Plan summations
  const sumPlan = (items: any[], key: string) => items.reduce((s, i) => s + (i[key] || 0), 0);
  const sumPlanTotal = (items: any[]) => JKEYS.reduce((s, k) => s + sumPlan(items, k), 0);

  const planPersonal = AZA_PLAN.personal;
  const planOverhead = AZA_PLAN.overhead;
  const planAuftraege = AZA_PLAN.auftraege;
  const planMiete = AZA_PLAN.miete;
  const planGegenst = AZA_PLAN.gegenst;
  const planReisen = AZA_PLAN.reisen;

  const totPersonalVal = sumPlanTotal(planPersonal);
  const totOverheadVal = JKEYS.reduce((s, k) => s + (planOverhead[k] || 0), 0);
  const totAuftraegeVal = sumPlanTotal(planAuftraege);
  const totMieteVal = JKEYS.reduce((s, k) => s + (planMiete[k] || 0), 0);
  const totGegVal = JKEYS.reduce((s, k) => s + (planGegenst[k] || 0), 0);
  const totReisenVal = JKEYS.reduce((s, k) => s + (planReisen[k] || 0), 0);

  const totBudgetValAvailable = totPersonalVal + totOverheadVal + totAuftraegeVal + totMieteVal + totGegVal + totReisenVal;

  const bafaAnteilGlobal = JKEYS.reduce((s, k) => s + AZA_PLAN.foerder[k].bafa, 0);
  const lhoAnteilGlobal = JKEYS.reduce((s, k) => s + AZA_PLAN.foerder[k].lho, 0);
  const eigenAnteilGlobal = JKEYS.reduce((s, k) => s + AZA_PLAN.foerder[k].eigen, 0);

  const pieData = [
    { name: 'BAFA Bund (90%)', value: bafaAnteilGlobal, color: '#041422' },
    { name: 'LHO Land NRW (7,5%)', value: lhoAnteilGlobal, color: '#58B49D' },
    { name: 'Eigenaufwand WIN.DN (2,5%)', value: eigenAnteilGlobal, color: '#F9FF00' },
  ];

  // Helper row renderer of progress bar
  const renderProgressBar = (title: string, planned: number, actual: number, colorStyle: string, isIndented = false) => {
    const depletionPct = planned > 0 ? (actual / planned) * 100 : 0;
    const isExceeded = depletionPct > 100;
    return (
      <div className={`space-y-1.5 ${isIndented ? 'pl-6' : ''}`}>
        <div className="flex justify-between text-xs items-baseline">
          <span className="font-medium text-[#041422]">{title}</span>
          <span className="font-mono text-zinc-500 text-[11px]">
            Ist: <strong className="text-zs-blau-schwarz">{formatEuro(actual)}</strong> &nbsp;/&nbsp; Plan: {formatEuro(planned)}
          </span>
        </div>
        <div className="w-full bg-zinc-150 h-2.5 rounded-full overflow-hidden flex relative">
          <div
            className={`h-full rounded-full transition-all duration-300 ${colorStyle}`}
            style={{ width: `${Math.min(depletionPct, 100)}%` }}
          />
          {isExceeded && (
            <div className="h-full bg-red-500 rounded-r-full" style={{ width: `${Math.min(depletionPct - 100, 100)}%` }} />
          )}
        </div>
        <div className="flex justify-between text-[9px] font-mono text-zinc-400">
          <span>Auslastung: {depletionPct.toFixed(1)}%</span>
          {isExceeded && <span className="text-red-500 font-bold">Budget übergelaufen!</span>}
        </div>
      </div>
    );
  };

  // Ist values matching selected year JKEYS
  // Real personal entries
  const actualPersonalCost = personal
    .filter((p) => {
      if (activeYear === 'gesamt25') return p.jahr === 2025 && p.monat >= 4;
      if (activeYear === 'mrz29') return p.jahr === 2029 && p.monat <= 3;
      return !activeYear ? true : String(p.jahr) === String(activeYear);
    })
    .reduce((s, p) => s + p.agKosten, 0);

  // Invoices categorised as Vergabe/Marketing/Veranstaltung
  const getActualInvoicesUnderCats = (cats: string[]) => {
    return rechnungen
      .filter((r) => {
        if (!r.foerderfaehig) return false;
        // matching categories
        if (!cats.includes(r.kostenkategorie)) return false;
        // year filter
        if (activeYear) {
          const { von, bis } = (() => {
            if (activeYear === 'gesamt25') return { von: '2025-04-01', bis: '2025-12-31' };
            if (activeYear === 'mrz29') return { von: '2029-01-01', bis: '2029-03-31' };
            return { von: `${activeYear}-01-01`, bis: `${activeYear}-12-31` };
          })();
          if (r.rechnungsdatum < von || r.rechnungsdatum > bis) return false;
        }
        return true;
      })
      .reduce((s, r) => s + r.betragNetto, 0);
  };

  const actualAuftraegeCost = getActualInvoicesUnderCats(['Vergabeaufträge', 'Marketing', 'Workshops', 'Juristische Beratung']);
  const actualOverheadCost = actualPersonalCost * 0.10; // 10% overhead claims
  const actualSonstigeCost = getActualInvoicesUnderCats(['Veranstaltungen', 'Hosting/Web', 'Gegenstände <800€']);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bDatum) { alert('Datum fehlt'); return; }
    const betragNum = parseFloat(bBetrag);
    if (isNaN(betragNum) || betragNum <= 0) { alert('Betrag ungültig'); return; }
    if (!bBeschr.trim()) { alert('Beschreibung fehlt'); return; }

    onAddBuchung({
      datum: bDatum,
      betrag: betragNum,
      kategorie: bKat,
      beschreibung: bBeschr.trim(),
      foerderfaehig: bFoerd,
      arbeitspaket: bAp,
      foerderjahr: new Date(bDatum).getFullYear(),
      status: bStatus,
    });

    setBDatum('');
    setBBetrag('');
    setBBeschr('');
    setShowAddBookingModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
            Budget &amp; <span className="bg-zs-signal-gelb px-1 py-0.5 rounded">Planung (AZA)</span>
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Systemische Erfassungen des Gesamtbugets &middot; {activeYearLabel} &middot; AZA-Förderplan
          </p>
        </div>
        <button
          onClick={() => setShowAddBookingModal(true)}
          className="px-5 py-2 text-xs font-bold rounded-full bg-zs-signal-gelb text-zs-blau-schwarz hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-all shadow-xs cursor-pointer align-self-start sm:align-self-auto"
        >
          + Buchung erfassen
        </button>
      </div>

      {/* Internal Budget selection tabs row */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200/80 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => onSetGlobalYear(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium border cursor-pointer transition-all ${
              activeYear === null ? 'bg-zs-blau-schwarz border-zs-blau-schwarz text-zs-signal-gelb' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-300'
            }`}
          >
            Gesamtzeitraum
          </button>
          {AZA_JAHRE.map((y) => (
            <button
              key={y.key}
              onClick={() => onSetGlobalYear(y.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium border cursor-pointer transition-all ${
                activeYear === y.key ? 'bg-zs-blau-schwarz border-zs-blau-schwarz text-zs-signal-gelb' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-300'
              }`}
            >
              {y.short}
            </button>
          ))}
        </div>
        <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest text-right">
          Scope-Budget: <strong className="text-zs-blau-schwarz">{formatEuro(totBudgetValAvailable)}</strong>
        </p>
      </div>

      {/* KPI Cards of Budget Period */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-400">PLAN BUDGET PERIODE</div>
          <div className="text-2xl font-mono font-bold text-zs-blau-schwarz mt-1">
            {formatEuro(totBudgetValAvailable, 2)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-400">BAFA ANTEIL PLAN (90%)</div>
          <div className="text-2xl font-mono font-bold text-zs-blau-schwarz mt-1">
            {formatEuro(bafaAnteilGlobal, 2)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-400 text-zs-textil-gruen font-semibold">LHO NRW ANTEIL PLAN (7,5%)</div>
          <div className="text-2xl font-mono font-bold text-zs-textil-gruen mt-1">
            {formatEuro(lhoAnteilGlobal, 2)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-400 text-[#5a5a00] font-semibold">EIGENANTEIL PLAN (2,5%)</div>
          <div className="text-2xl font-mono font-bold text-[#5a5a00] mt-1">
            {formatEuro(eigenAnteilGlobal, 2)}
          </div>
        </div>
      </div>

      {/* Progress tracking bars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs lg:col-span-2 space-y-4">
          <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase mb-2">Budgetauslastung in Periode (Plan vs. Ist)</h3>
          {renderProgressBar('Personalbudget (F0824)', totPersonalVal, actualPersonalCost, 'bg-zs-blau-schwarz')}
          {renderProgressBar('Overheads (F0839)', totOverheadVal, actualOverheadCost, 'bg-zs-papier-braun')}
          {renderProgressBar('Vergaben & Aufträge (F0835)', totAuftraegeVal, actualAuftraegeCost, 'bg-[#58B49D]')}
          {renderProgressBar('Sonstige Sachkosten (Reisen/Renting)', totMieteVal + totGegVal + totReisenVal, actualSonstigeCost, 'bg-[#7F6DBA]')}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs flex flex-col justify-center items-center">
          <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase mb-4 text-center">Plan-Förderaufteilung</h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2 w-full text-xs font-mono text-[10px]">
            {pieData.map((e, index) => (
              <div key={index} className="flex justify-between items-center bg-zinc-50 px-2 py-1 rounded border border-zinc-100">
                <span className="flex items-center gap-1.5 text-zinc-500">
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: e.color }} />
                  {e.name}
                </span>
                <span className="font-bold text-zs-blau-schwarz">{formatEuro(e.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed tabs inside parent */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden pb-1">
        <div className="flex border-b border-zinc-200 px-5 bg-zinc-50/50">
          <button
            onClick={() => setActiveTab('kategorie')}
            className={`py-3.5 px-4 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'kategorie' ? 'border-zs-signal-gelb text-zs-blau-schwarz' : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            Kostenpositionen
          </button>
          <button
            onClick={() => setActiveTab('jahre')}
            className={`py-3.5 px-4 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'jahre' ? 'border-zs-signal-gelb text-zs-blau-schwarz' : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            Jahresplan
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`py-3.5 px-4 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'personal' ? 'border-zs-signal-gelb text-zs-blau-schwarz' : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            Personal (F0824)
          </button>
          <button
            onClick={() => setActiveTab('vergaben')}
            className={`py-3.5 px-4 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'vergaben' ? 'border-zs-signal-gelb text-zs-blau-schwarz' : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            Aufträge (F0835)
          </button>
          <button
            onClick={() => setActiveTab('buchungen')}
            className={`py-3.5 px-4 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'buchungen' ? 'border-zs-signal-gelb text-zs-blau-schwarz' : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            Manuelle Buchungen ({buchungen.length})
          </button>
        </div>

        <div className="p-3">
          {/* TAB: Kostenpositionen */}
          {activeTab === 'kategorie' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[9px] text-zinc-400 tracking-wider">
                    <th className="p-2.5">Förderkategorie / Position</th>
                    {JKEYS.map((k) => (
                      <th key={k} className="p-2.5 text-right">{JLABELS[k] || k}</th>
                    ))}
                    {showGesamtColumn && <th className="p-2.5 text-right border-l border-zinc-200">Gesamt</th>}
                  </tr>
                </thead>
                <tbody>
                  {/* Category Personal Group */}
                  <tr className="bg-zinc-100 font-semibold font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
                    <td className="p-2.5 pl-4" colSpan={1}>F0824 PERSONAL (ANSTELLUNGEN)</td>
                    {JKEYS.map((k) => (
                      <td key={k} className="p-2.5 text-right font-mono">{formatEuro(sumPlan(planPersonal, k))}</td>
                    ))}
                    {showGesamtColumn && <td className="p-2.5 text-right border-l border-zinc-200 font-bold">{formatEuro(totPersonalVal)}</td>}
                  </tr>
                  {/* Sub personal rows */}
                  {planPersonal.map((p, idx) => (
                    <tr key={idx} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                      <td className="p-2 pl-8 text-zinc-700 font-medium italic">&mdash; {p.pos}</td>
                      {JKEYS.map((k) => (
                        <td key={k} className="p-2 text-right text-zinc-500 font-mono">{formatEuro((p as any)[k] || 0)}</td>
                      ))}
                      {showGesamtColumn && <td className="p-2 text-right border-l border-zinc-100 text-zinc-800 font-mono font-semibold">{formatEuro(JKEYS.reduce((s, k) => s + ((p as any)[k] || 0), 0))}</td>}
                    </tr>
                  ))}

                  {/* Overhead Group */}
                  <tr className="bg-zinc-100 border-t border-zinc-200 font-semibold font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
                    <td className="p-2.5 pl-4" colSpan={1}>F0839 GESCHÄFTSBEDARF (OVERHEADS 10%)</td>
                    {JKEYS.map((k) => (
                      <td key={k} className="p-2.5 text-right font-mono">{formatEuro(planOverhead[k] || 0)}</td>
                    ))}
                    {showGesamtColumn && <td className="p-2.5 text-right border-l border-zinc-200 font-bold">{formatEuro(totOverheadVal)}</td>}
                  </tr>

                  {/* Autraege Group */}
                  <tr className="bg-zinc-100 border-t border-zinc-200 font-semibold font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
                    <td className="p-2.5 pl-4" colSpan={1}>F0835 VERGABE VON AUFTRÄGEN (AUSSCHREIBUNGEN)</td>
                    {JKEYS.map((k) => (
                      <td key={k} className="p-2.5 text-right font-mono">{formatEuro(sumPlan(planAuftraege, k))}</td>
                    ))}
                    {showGesamtColumn && <td className="p-2.5 text-right border-l border-zinc-200 font-bold">{formatEuro(totAuftraegeVal)}</td>}
                  </tr>
                  {/* Sub Autraege rows */}
                  {planAuftraege.map((a, idx) => (
                    <tr key={idx} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                      <td className="p-2 pl-8 text-zinc-700 font-medium italic">&mdash; {a.pos}</td>
                      {JKEYS.map((k) => (
                        <td key={k} className="p-2 text-right text-zinc-500 font-mono">{formatEuro((a as any)[k] || 0)}</td>
                      ))}
                      {showGesamtColumn && <td className="p-2 text-right border-l border-zinc-100 text-zinc-800 font-mono font-semibold">{formatEuro(JKEYS.reduce((s, k) => s + ((a as any)[k] || 0), 0))}</td>}
                    </tr>
                  ))}

                  {/* Rentals Printer Overhead */}
                  <tr className="bg-zinc-150 font-semibold font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
                    <td className="p-2.5 pl-4" colSpan={1}>F0832 INVENTAR-MIETEN / RENTINGS</td>
                    {JKEYS.map((k) => (
                      <td key={k} className="p-2.5 text-right font-mono">{formatEuro(planMiete[k] || 0)}</td>
                    ))}
                    {showGesamtColumn && <td className="p-2.5 text-right border-l border-zinc-200 font-bold">{formatEuro(totMieteVal)}</td>}
                  </tr>

                  {/* Travel Expenses */}
                  <tr className="bg-zinc-100 font-semibold font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
                    <td className="p-2.5 pl-4" colSpan={1}>F0844 REISEKOSTEN (INLANDE)</td>
                    {JKEYS.map((k) => (
                      <td key={k} className="p-2.5 text-right font-mono">{formatEuro(planReisen[k] || 0)}</td>
                    ))}
                    {showGesamtColumn && <td className="p-2.5 text-right border-l border-zinc-200 font-bold">{formatEuro(totReisenVal)}</td>}
                  </tr>

                  {/* Cumulative Total projects Row */}
                  <tr className="border-t-2 border-zs-blau-schwarz bg-zs-signal-gelb/10 font-bold text-xs text-zs-blau-schwarz">
                    <td className="p-3 pl-4">GESAMT VOLUMEN PROJEKTKOSTEN</td>
                    {JKEYS.map((k) => (
                      <td key={k} className="p-3 text-right font-mono text-sm">{formatEuro(AZA_PLAN.foerder[k].gesamt)}</td>
                    ))}
                    {showGesamtColumn && <td className="p-3 text-right border-l border-zs-blau-schwarz text-sm font-black font-mono bg-zs-signal-gelb/20">{formatEuro(totBudgetValAvailable)}</td>}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: Jahresplan */}
          {activeTab === 'jahre' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[9px] text-zinc-400 tracking-wider">
                    <th className="p-2.5 pl-4">Jahr</th>
                    <th className="p-2.5 text-right">Projektkosten gesamt €</th>
                    <th className="p-2.5 text-right">Förderfähiger Anteil (AZA) €</th>
                    <th className="p-2.5 text-right text-zs-blau-schwarz">BAFA Bund (90%) €</th>
                    <th className="p-2.5 text-right text-zs-textil-gruen">LHO NRW (7,5%) €</th>
                    <th className="p-2.5 text-right text-amber-700">Eigenanteil WIN.DN (2,5%) €</th>
                  </tr>
                </thead>
                <tbody>
                  {JKEYS.map((k) => {
                    const yearData = AZA_PLAN.foerder[k];
                    return (
                      <tr key={k} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                        <td className="p-3 pl-4 font-bold text-zs-blau-schwarz">{JLABELS[k] || k}</td>
                        <td className="p-3 text-right font-mono">{formatEuro(yearData.gesamt, 2)}</td>
                        <td className="p-3 text-right font-mono text-zinc-650">{formatEuro(yearData.foerderbar, 2)}</td>
                        <td className="p-3 text-right font-mono font-bold text-zs-blau-schwarz">{formatEuro(yearData.bafa, 2)}</td>
                        <td className="p-3 text-right font-mono font-bold text-zs-textil-gruen">{formatEuro(yearData.lho, 2)}</td>
                        <td className="p-3 text-right font-mono text-[#5a5a00]">{formatEuro(yearData.eigen, 2)}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-zs-signal-gelb/10 font-bold border-t-2 border-zinc-300">
                    <td className="p-3 pl-4">GESAMT SUMMEN</td>
                    <td className="p-3 text-right font-mono">{formatEuro(JKEYS.reduce((s, k) => s + AZA_PLAN.foerder[k].gesamt, 0), 2)}</td>
                    <td className="p-3 text-right font-mono">{formatEuro(JKEYS.reduce((s, k) => s + AZA_PLAN.foerder[k].foerderbar, 0), 2)}</td>
                    <td className="p-3 text-right font-mono text-zs-blau-schwarz">{formatEuro(bafaAnteilGlobal, 2)}</td>
                    <td className="p-3 text-right font-mono text-zs-textil-gruen">{formatEuro(lhoAnteilGlobal, 2)}</td>
                    <td className="p-3 text-right font-mono text-[#5a5a00]">{formatEuro(eigenAnteilGlobal, 2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: Personal F0824 */}
          {activeTab === 'personal' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs animate-fade-in">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[9px] text-zinc-400 tracking-wider">
                    <th className="p-2.5 pl-4">Personalstelle (F0824)</th>
                    {JKEYS.map((k) => (
                      <th key={k} className="p-2.5 text-right">{JLABELS[k] || k}</th>
                    ))}
                    {showGesamtColumn && <th className="p-2.5 text-right border-l border-zinc-200">Gesamt Plan</th>}
                  </tr>
                </thead>
                <tbody>
                  {planPersonal.map((p, idx) => (
                    <tr key={idx} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                      <td className="p-3 pl-4 font-medium text-zinc-700">{p.pos}</td>
                      {JKEYS.map((k) => (
                        <td key={k} className="p-3 text-right font-mono text-zinc-500">{formatEuro((p as any)[k] || 0)}</td>
                      ))}
                      {showGesamtColumn && (
                        <td className="p-3 text-right border-l border-zinc-200 font-mono font-bold text-zs-blau-schwarz">
                          {formatEuro(JKEYS.reduce((s, k) => s + ((p as any)[k] || 0), 0))}
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-zinc-50 font-semibold border-t border-zinc-200">
                    <td className="p-3 pl-4 uppercase">Gesamtsummen F0824</td>
                    {JKEYS.map((k) => (
                      <td key={k} className="p-3 text-right font-mono">{formatEuro(sumPlan(planPersonal, k))}</td>
                    ))}
                    {showGesamtColumn && (
                      <td className="p-3 text-right border-l border-zinc-200 font-mono font-bold text-zs-blau-schwarz">
                        {formatEuro(totPersonalVal)}
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: Vergaben F0835 */}
          {activeTab === 'vergaben' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[9px] text-zinc-400 tracking-wider">
                    <th className="p-2.5 pl-4">Ausschreibungen &amp; Werkverträge (F0835)</th>
                    {JKEYS.map((k) => (
                      <th key={k} className="p-2.5 text-right">{JLABELS[k] || k}</th>
                    ))}
                    {showGesamtColumn && <th className="p-2.5 text-right border-l border-zinc-200">Gesamt Plan</th>}
                  </tr>
                </thead>
                <tbody>
                  {planAuftraege.map((a, idx) => {
                    const isBooster = a.pos.startsWith('Transformations-Booster');
                    return (
                      <tr key={idx} className={`border-b border-zinc-100 hover:bg-zinc-50/50 ${
                        isBooster ? 'bg-[#58B49D]/5 hover:bg-[#58B49D]/10' : ''
                      }`}>
                        <td className="p-3 pl-4">
                          <span className={`font-medium ${isBooster ? 'text-[#2a7060] font-semibold' : 'text-zinc-700'}`}>
                            {a.pos}
                          </span>
                        </td>
                        {JKEYS.map((k) => (
                          <td key={k} className={`p-3 text-right font-mono ${isBooster ? 'text-[#2a7060]' : 'text-zinc-500'}`}>
                            {formatEuro((a as any)[k] || 0)}
                          </td>
                        ))}
                        {showGesamtColumn && (
                          <td className={`p-3 text-right border-l border-zinc-200 font-mono font-bold ${
                            isBooster ? 'text-[#2a7060]' : 'text-zs-blau-schwarz'
                          }`}>
                            {formatEuro(JKEYS.reduce((s, k) => s + ((a as any)[k] || 0), 0))}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  <tr className="bg-zinc-50 font-semibold border-t border-zinc-200">
                    <td className="p-3 pl-4 uppercase">Gesamtsummen F0835</td>
                    {JKEYS.map((k) => (
                      <td key={k} className="p-3 text-right font-mono">{formatEuro(sumPlan(planAuftraege, k))}</td>
                    ))}
                    {showGesamtColumn && (
                      <td className="p-3 text-right border-l border-zinc-200 font-mono font-bold text-zs-blau-schwarz">
                        {formatEuro(totAuftraegeVal)}
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: Manual bookings log */}
          {activeTab === 'buchungen' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[9px] text-zinc-400 tracking-wider">
                      <th className="p-2.5 pl-4">Datum</th>
                      <th className="p-2.5">Kategorie</th>
                      <th className="p-2.5">Kontoaparaht / Beschreibung</th>
                      <th className="p-2.5">Arbeitspaket</th>
                      <th className="p-2.5 text-right">Betrag (€)</th>
                      <th className="p-2.5 text-center">Ausr.</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buchungen.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-xs text-zinc-400 font-mono">
                          Keine manuellen Buchungen erfasst. Nutzen Sie "Buchung erfassen" oben rechts.
                        </td>
                      </tr>
                    ) : (
                      buchungen.map((b) => (
                        <tr key={b.id} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                          <td className="p-3 pl-4 font-mono text-zinc-650">{b.datum}</td>
                          <td className="p-3 font-semibold text-zinc-700">{b.kategorie}</td>
                          <td className="p-3 text-zinc-600 font-medium">{b.beschreibung}</td>
                          <td className="p-3 font-mono text-zinc-400">{b.arbeitspaket.split(' ')[0]}</td>
                          <td className="p-3 text-right font-mono font-semibold">{formatEuro(b.betrag, 2)}</td>
                          <td className="p-3 text-center text-emerald-600 font-bold">{b.foerderfaehig ? '✓' : '✗'}</td>
                          <td className="p-3 text-center text-xs relative">
                            <button
                              onClick={() => setActiveDropdownId(activeDropdownId === b.id ? null : b.id)}
                              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider transition-all border cursor-pointer bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                            >
                              {b.status} &nbsp;▾
                            </button>

                            {activeDropdownId === b.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setActiveDropdownId(null)}></div>
                                <div className="absolute right-1/2 translate-x-1/2 mt-1 w-32 bg-white rounded-lg border border-zinc-200 shadow-lg z-20 overflow-hidden font-mono text-xs text-left">
                                  {(['geplant', 'reserviert', 'gebucht', 'geprüft', 'freigegeben'] as Buchung['status'][]).map((st) => (
                                    <button
                                      key={st}
                                      onClick={() => {
                                        onUpdateBuchungStatus(b.id, st);
                                        setActiveDropdownId(null);
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-zs-signal-gelb/30 transition-all cursor-pointer"
                                    >
                                      {st}
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
          )}
        </div>
      </div>

      {/* ── MODAL: SAVE MANUAL BOOKING ── */}
      {showAddBookingModal && (
        <div className="fixed inset-0 bg-zs-blau-schwarz/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/30">
              <h3 className="font-display font-bold text-lg text-zs-blau-schwarz">Manuelle Buchung registrieren</h3>
              <button onClick={() => setShowAddBookingModal(false)} className="text-zinc-400 hover:text-zs-blau-schwarz transition-all text-xl font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleBookingSubmit}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Datum</label>
                    <input
                      type="date"
                      value={bDatum}
                      onChange={(e) => setBDatum(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Betrag (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={bBetrag}
                      onChange={(e) => setBBetrag(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Kategorie</label>
                    <select
                      value={bKat}
                      onChange={(e) => setBKat(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    >
                      <option>Personalkosten</option>
                      <option>Sachkosten</option>
                      <option>Vergabeaufträge</option>
                      <option>Marketing</option>
                      <option>Reisen</option>
                      <option>IT</option>
                      <option>Sonstiges</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Arbeitspaket</label>
                    <select
                      value={bAp}
                      onChange={(e) => setBAp(e.target.value)}
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

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Beschreibung</label>
                  <input
                    type="text"
                    placeholder="Verwendungsnachweis..."
                    value={bBeschr}
                    onChange={(e) => setBBeschr(e.target.value)}
                    className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Buchungsstatus</label>
                    <select
                      value={bStatus}
                      onChange={(e) => setBStatus(e.target.value as Buchung['status'])}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    >
                      <option value="geplant">geplant</option>
                      <option value="reserviert">reserviert</option>
                      <option value="gebucht">gebucht</option>
                      <option value="geprüft">geprüft</option>
                      <option value="freigegeben">freigegeben</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="b-foerd"
                      checked={bFoerd}
                      onChange={(e) => setBFoerd(e.target.checked)}
                      className="w-4 h-4 accent-zs-blau-schwarz"
                    />
                    <label htmlFor="b-foerd" className="text-xs font-semibold text-zs-blau-schwarz cursor-pointer">Förderfähig</label>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-zinc-100 flex justify-end gap-2 bg-zinc-50/50">
                <button
                  type="button"
                  onClick={() => setShowAddBookingModal(false)}
                  className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-zs-signal-gelb text-zs-blau-schwarz font-bold text-xs hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-all cursor-pointer"
                >
                  Buchung speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
