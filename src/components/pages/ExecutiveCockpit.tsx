import React from 'react';
import { PersonalEintrag, Rechnungsbeleg, Mittelabruf, UseCase, Vergabe } from '../../types';
import { formatEuro } from '../../utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

interface ExecutiveCockpitProps {
  personal: PersonalEintrag[];
  rechnungen: Rechnungsbeleg[];
  mittelabrufe: Mittelabruf[];
  usecases: UseCase[];
  vergaben: Vergabe[];
  activeYear: string | null;
  activeYearLabel: string;
}

export default function ExecutiveCockpit({
  personal,
  rechnungen,
  mittelabrufe,
  usecases,
  vergaben,
  activeYear,
  activeYearLabel,
}: ExecutiveCockpitProps) {
  // 1. Gather filtered data
  const agGesamt = personal.reduce((s, p) => s + p.agKosten, 0);
  const sachkosten = agGesamt * 0.10;
  const foerderfaehig = agGesamt + sachkosten;
  const bafaAnteil = foerderfaehig * 0.90;
  const lhoAnteil = foerderfaehig * 0.075;
  const eigenAnteil = foerderfaehig * 0.025;

  const totalBafaEingegangen = mittelabrufe
    .filter((a) => a.mittelgeber === 'BAFA_BUND')
    .reduce((s, a) => s + (a.eingegangen || 0), 0);

  const totalLhoEingegangen = mittelabrufe
    .filter((a) => a.mittelgeber === 'LHO_LAND')
    .reduce((s, a) => s + (a.eingegangen || 0), 0);

  const activeUseCasesCount = usecases.filter((u) => u.status === 'aktiv').length;
  const activeVergabenCount = vergaben.filter((v) => v.status !== 'abgeschlossen').length;

  // 2. Prepare Chart Data (Quarterly Breakdown for Personal)
  const quarterData = [1, 2, 3, 4].map((q) => {
    const qPersonal = personal.filter((p) => p.quartal === q);
    const ag = qPersonal.reduce((s, p) => s + p.agKosten, 0);
    const ff = qPersonal.reduce((s, p) => s + p.foerderfaehig, 0);
    return {
      name: `Q${q}`,
      'AG-Kosten': ag,
      'Förderfähig': ff,
    };
  });

  // Prepare Chart Data (Quarterly Fund Drawings)
  const fundData = [1, 2, 3, 4].map((q) => {
    const bafaQ = mittelabrufe
      .filter((a) => a.quartal === q && a.mittelgeber === 'BAFA_BUND')
      .reduce((s, a) => s + a.beantragt, 0);
    const lhoQ = mittelabrufe
      .filter((a) => a.quartal === q && a.mittelgeber === 'LHO_LAND')
      .reduce((s, a) => s + a.beantragt, 0);
    return {
      name: `Q${q}`,
      'BAFA (Bund)': bafaQ,
      'LHO (Land)': lhoQ,
    };
  });

  // Doughnut data for invoice categories inside this filtered scope
  const invoiceCats = rechnungen.reduce((acc: { [key: string]: number }, r) => {
    const cat = r.kostenkategorie || 'Sonstiges';
    acc[cat] = (acc[cat] || 0) + r.betragNetto;
    return acc;
  }, {});

  const catChartData = Object.entries(invoiceCats).map(([key, value]) => ({
    name: key,
    value,
  }));

  const COLORS = ['#041422', '#58B49D', '#BA8B68', '#7F6DBA', '#E8B34A', '#D04C3D', '#467B9B', '#489B65'];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
          Executive <span className="bg-zs-signal-gelb px-1 py-0.5 rounded">Cockpit</span>
        </h1>
        <p className="text-xs font-mono text-zinc-500 mt-1">
          Förderprojekt MiD-PCT &middot; {activeYearLabel} &middot; WIN.DN GmbH Düren
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div id="kpi-bafa" className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
          <div className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
            BAFA EINGEGANGEN
          </div>
          <div className="text-2xl font-mono font-bold text-zs-blau-schwarz mt-2">
            {formatEuro(totalBafaEingegangen, 2)}
          </div>
          <div className="text-xs font-mono text-emerald-600 mt-1 flex items-center gap-1">
            <span>▲</span> 90% Fördersatz
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zs-signal-gelb"></div>
        </div>

        <div id="kpi-lho" className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
          <div className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
            LHO EINGEGANGEN
          </div>
          <div className="text-2xl font-mono font-bold text-zs-textil-gruen mt-2">
            {formatEuro(totalLhoEingegangen, 2)}
          </div>
          <div className="text-xs font-mono text-emerald-600 mt-1 flex items-center gap-1">
            <span>▲</span> 7,5% Kofinanzierung
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zs-textil-gruen"></div>
        </div>

        <div id="kpi-volume" className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
          <div className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
            GESAMTVOLUMEN (FÖRDERUNG)
          </div>
          <div className="text-2xl font-mono font-bold text-zs-papier-braun mt-2">
            1.545.876,29 €
          </div>
          <div className="text-xs font-mono text-zinc-400 mt-1 flex items-center gap-1">
            <span>◆</span> April 2025 – März 2029
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zs-papier-braun"></div>
        </div>

        <div id="kpi-usecases" className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
          <div className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
            AKTIVE USE CASES
          </div>
          <div className="text-2xl font-mono font-bold text-zs-chemie-violett mt-2">
            {activeUseCasesCount} / 3
          </div>
          <div className="text-xs font-mono text-zinc-400 mt-1 flex items-center gap-1">
            <span>●</span> {activeVergabenCount} aktive Ausschreibungen
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zs-chemie-violett"></div>
        </div>
      </div>

      {/* Kumulierte Förderberechnung */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
        <h2 className="text-xs font-mono font-semibold tracking-wider text-zinc-400 uppercase mb-4">
          FÖRDERBERECHNUNG (KUMULIERT AUS RECHTSVERBINDLICHER SCHABLONE)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100/80 text-center">
            <div className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">AG-Kosten</div>
            <div className="text-lg font-mono font-bold text-zs-blau-schwarz mt-1">{formatEuro(agGesamt)}</div>
            <div className="text-[10px] text-zinc-400 font-mono mt-1">Lohnbasis</div>
          </div>
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100/80 text-center">
            <div className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">Sachkosten (10%)</div>
            <div className="text-lg font-mono font-bold text-zinc-500 mt-1">{formatEuro(sachkosten)}</div>
            <div className="text-[10px] text-zinc-400 font-mono mt-1">Lohn × 10%</div>
          </div>
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100/80 text-center">
            <div className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">Förderfähig</div>
            <div className="text-lg font-mono font-bold text-zinc-800 mt-1">{formatEuro(foerderfaehig)}</div>
            <div className="text-[10px] text-zinc-400 font-mono mt-1">100% Volumen</div>
          </div>
          <div className="bg-[#041422]/5 p-4 rounded-xl border border-zs-blau-schwarz/10 text-center relative">
            <div className="text-[9px] font-mono text-zs-blau-schwarz/60 uppercase tracking-wider">BAFA Bund</div>
            <div className="text-lg font-mono font-bold text-zs-blau-schwarz mt-1">{formatEuro(bafaAnteil)}</div>
            <div className="text-[10px] text-zinc-400 font-mono mt-1">90% Bund</div>
          </div>
          <div className="bg-[#58B49D]/10 p-4 rounded-xl border border-zs-textil-gruen/20 text-center">
            <div className="text-[9px] font-mono text-zs-textil-gruen/80 uppercase tracking-wider">LHO NRW</div>
            <div className="text-lg font-mono font-bold text-emerald-800 mt-1">{formatEuro(lhoAnteil)}</div>
            <div className="text-[10px] text-zinc-400 font-mono mt-1">7,5% Land</div>
          </div>
          <div className="bg-zs-signal-gelb/10 p-4 rounded-xl border border-zs-signal-gelb/30 text-center">
            <div className="text-[9px] font-mono text-[#5a5a00] uppercase tracking-wider">Eigenanteil</div>
            <div className="text-lg font-mono font-bold text-[#5a5a00] mt-1">{formatEuro(eigenAnteil)}</div>
            <div className="text-[10px] text-zinc-400 font-mono mt-1">2,5% WIN.DN</div>
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personalkosten chart */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
          <h2 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase mb-4">
            PERSONALKOSTEN NACH QUARTAL (IST)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} fontClassName="font-mono" tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={10} fontClassName="font-mono" tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k €` : `${v} €`} />
                <Tooltip formatter={(v: number) => [formatEuro(v, 2), '']} labelFormatter={(l) => `Quartal: ${l}`} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="AG-Kosten" fill="#041422" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Förderfähig" fill="#58B49D" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mittelabrufe chart */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
          <h2 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase mb-4">
            MITTELABRUFE NACH QUARTAL (PLAN/SOLL)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fundData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} fontClassName="font-mono" tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={10} fontClassName="font-mono" tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k €` : `${v} €`} />
                <Tooltip formatter={(v: number) => [formatEuro(v, 2), '']} labelFormatter={(l) => `Quartal: ${l}`} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="BAFA (Bund)" fill="#041422" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="LHO (Land)" fill="#BA8B68" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Invoice category breakdown */}
      {catChartData.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
          <h2 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase mb-4">
            KOSTENSPLIT AUSGABEN NACH BELEG-KATEGORIEN (KUMULIERT)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="h-56 col-span-1 md:col-span-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catChartData.sort((a,b)=>b.value-a.value)} layout="vertical" margin={{ top: 5, right: 10, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={10} tickLine={false} tickFormatter={(v) => `${v} €`} />
                  <YAxis type="category" dataKey="name" stroke="#041422" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: number) => [formatEuro(v, 2), '']} />
                  <Bar dataKey="value" fill="#7F6DBA" radius={[0, 4, 4, 0]} maxBarSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 col-span-1">
              <h3 className="font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Top-Kostenbelege</h3>
              <div className="space-y-1.5 overflow-y-auto max-h-48 pr-2">
                {catChartData.sort((a,b)=>b.value-a.value).map((cat, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-mono py-1 border-b border-zinc-50">
                    <span className="truncate text-zinc-600 max-w-[130px]">{cat.name}</span>
                    <span className="font-bold text-zs-blau-schwarz">{formatEuro(cat.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
