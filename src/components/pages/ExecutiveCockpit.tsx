import React from 'react';
import { PersonalEintrag, Rechnungsbeleg, Mittelabruf, UseCase, Vergabe, Task } from '../../types';
import { formatEuro } from '../../utils';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Coins, 
  ArrowDownCircle, 
  Award, 
  BookOpen, 
  CheckSquare, 
  FileText, 
  AlertCircle, 
  Calendar, 
  ArrowRight, 
  Activity, 
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  PieChart as PieIcon,
  Layers,
  Percent,
  CheckCircle2,
  ListTodo,
  TrendingDown,
  Lock,
  Compass,
  Briefcase
} from 'lucide-react';

interface ExecutiveCockpitProps {
  personal: PersonalEintrag[];
  rechnungen: Rechnungsbeleg[];
  mittelabrufe: Mittelabruf[];
  usecases: UseCase[];
  vergaben: Vergabe[];
  activeYear: string | null;
  activeYearLabel: string;
  tasks?: Task[];
  onUpdateTask?: (id: number, task: Partial<Task>) => void;
}

export default function ExecutiveCockpit({
  personal,
  rechnungen,
  mittelabrufe,
  usecases,
  vergaben,
  activeYear,
  activeYearLabel,
  tasks = [],
  onUpdateTask,
}: ExecutiveCockpitProps) {
  
  const [isFlowCollapsed, setIsFlowCollapsed] = React.useState(false);

  // 1. Core financial metrics in scope
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

  const totalFuerderungEingegangen = totalBafaEingegangen + totalLhoEingegangen;
  const totalFoerderungPlanSoll = bafaAnteil + lhoAnteil;
  const targetReachingPercentage = totalFoerderungPlanSoll > 0 
    ? (totalFuerderungEingegangen / totalFoerderungPlanSoll) * 100 
    : 0;

  const bafaBeantragt = mittelabrufe
    .filter((a) => a.mittelgeber === 'BAFA_BUND')
    .reduce((s, a) => s + a.beantragt, 0);

  const lhoBeantragt = mittelabrufe
    .filter((a) => a.mittelgeber === 'LHO_LAND')
    .reduce((s, a) => s + a.beantragt, 0);

  const totalFuerderungBeantragt = bafaBeantragt + lhoBeantragt;

  const activeUseCasesCount = usecases.filter((u) => u.status === 'aktiv').length;
  const activeVergabenCount = vergaben.filter((v) => v.status !== 'abgeschlossen').length;

  // Actual invoice expenses compared with the 10% allowance
  const actualInvoicesSum = rechnungen.reduce((s, r) => s + r.betragNetto, 0);
  const allowanceUtilizationRate = sachkosten > 0 ? (actualInvoicesSum / sachkosten) * 100 : 0;

  // 2. Chart Prep
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

  const fundData = [1, 2, 3, 4].map((q) => {
    const bafaQ = mittelabrufe
      .filter((a) => a.quartal === q && a.mittelgeber === 'BAFA_BUND')
      .reduce((s, a) => s + a.beantragt, 0);
    const lhoQ = mittelabrufe
      .filter((a) => a.quartal === q && a.mittelgeber === 'LHO_LAND')
      .reduce((s, a) => s + a.beantragt, 0);
    return {
      name: `Q${q}`,
      'Beantragt BAFA': bafaQ,
      'Beantragt LHO': lhoQ,
    };
  });

  // Category breakdown for invoices
  const invoiceCats = rechnungen.reduce((acc: { [key: string]: number }, r) => {
    const cat = r.kostenkategorie || 'Sonstiges';
    acc[cat] = (acc[cat] || 0) + r.betragNetto;
    return acc;
  }, {});

  const catChartData = Object.entries(invoiceCats).map(([key, value]) => ({
    name: key,
    value,
  }));

  // Budget Breakdown donut data
  const budgetSplitData = [
    { name: 'BAFA Bund (90%)', value: bafaAnteil, color: '#041422' },
    { name: 'LHO NRW (7.5%)', value: lhoAnteil, color: '#BA8B68' },
    { name: 'Eigenanteil (2.5%)', value: eigenAnteil, color: '#58B49D' }
  ].filter(item => item.value > 0);

  // Task Status overview
  const tasksCompletedCount = tasks.filter(t => t.status === 'erledigt').length;
  const tasksOpenCount = tasks.filter(t => t.status !== 'erledigt').length;
  const taskStatusData = [
    { name: 'Erledigt', value: tasksCompletedCount, color: '#58B49D' },
    { name: 'Offen', value: tasksOpenCount, color: '#D04C3D' }
  ].filter(item => item.value > 0);

  // Vergabe Status statistics
  const vergabeStatusData = [
    { name: 'Vorbereitung', value: vergaben.filter(v => v.status === 'Vorbereitung').length, color: '#94A3B8' },
    { name: 'Aktiv', value: vergaben.filter(v => v.status !== 'Vorbereitung' && v.status !== 'abgeschlossen').length, color: '#BA8B68' },
    { name: 'Beendet', value: vergaben.filter(v => v.status === 'abgeschlossen').length, color: '#041422' }
  ].filter(item => item.value > 0);

  const COLORS = ['#041422', '#BA8B68', '#58B49D', '#7F6DBA', '#E8B34A', '#D04C3D', '#467B9B', '#489B65'];

  // Custom visual glassmorphic tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zs-blau-schwarz text-white p-3 rounded-lg border border-white/10 shadow-xl font-mono text-[11px] space-y-1">
          <p className="font-bold border-b border-white/15 pb-1 select-none">{`Eintrag: ${label}`}</p>
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex justify-between gap-6">
              <span className="opacity-80" style={{ color: entry.color || entry.payload.fill || '#fff' }}>● {entry.name}:</span>
              <span className="font-bold">{formatEuro(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Safe execution handler for task toggle
  const handleToggleTask = (id: number, currentStatus: Task['status']) => {
    if (onUpdateTask) {
      const nextStatus: Task['status'] = currentStatus === 'erledigt' ? 'offen' : 'erledigt';
      onUpdateTask(id, { status: nextStatus });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-full">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flowHorizontal {
          0% { left: -30%; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { left: 120%; }
        }
        @keyframes flowVertical {
          0% { top: -30%; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 120%; }
        }
        .flow-line-h {
          position: relative;
          width: 100%;
          height: 4px;
          background-color: #e4e4e7;
          border-radius: 9999px;
          overflow: hidden;
        }
        .flow-line-h::after {
          content: '';
          position: absolute;
          top: 0;
          height: 100%;
          width: 50px;
          background: linear-gradient(90deg, transparent, #58B49D, #041422, transparent);
          animation: flowHorizontal 2s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }
        .flow-line-v {
          position: relative;
          height: 50px;
          width: 4px;
          background-color: #e4e4e7;
          border-radius: 9999px;
          overflow: hidden;
        }
        .flow-line-v::after {
          content: '';
          position: absolute;
          left: 0;
          width: 100%;
          height: 25px;
          background: linear-gradient(180deg, transparent, #58B49D, #041422, transparent);
          animation: flowVertical 1.6s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}} />
      
      {/* 1. Stately Modern Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-zs-blau-schwarz text-white p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-lg border border-white/5">
        <div className="absolute top-0 right-0 w-80 h-80 bg-zs-textil-gruen/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-zs-chemie-violett/10 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="space-y-2 z-10 w-full md:w-3/4">
          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono tracking-widest text-[#58B49D] font-bold uppercase border border-white/5">
            <span className="w-2 h-2 rounded-full bg-[#58B49D] bubble-pulse"></span>
            IT-Projektsteuerung &middot; MiD-PCT
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">
            Executive <span className="bg-zs-signal-gelb text-zs-blau-schwarz px-1.5 py-0.5 rounded-xs skew-x-3 inline-block">Cockpit</span>
          </h1>
          
          {/* Main streamlined status bar - Responsive row */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3 w-full text-xs">
            {/* Stat 1 */}
            <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10 flex-1 sm:flex-none">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#58B49D]"></span>
                <span className="text-zinc-400 font-mono text-[9px] uppercase tracking-wider">Mittelzufluss:</span>
                <span className="font-mono font-bold text-white">{formatEuro(totalFuerderungEingegangen, 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-500 font-mono text-[10px]">/ {formatEuro(totalFoerderungPlanSoll, 0)}</span>
                <span className="text-[#58B49D] font-mono text-[10px] font-bold">({targetReachingPercentage.toFixed(1)}%)</span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10 flex-1 sm:flex-none">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zs-signal-gelb"></span>
                <span className="text-zinc-400 font-mono text-[9px] uppercase tracking-wider">Sachkosten:</span>
                <span className="font-mono font-bold text-white">{formatEuro(actualInvoicesSum, 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-500 font-mono text-[10px]">/ {formatEuro(sachkosten, 0)}</span>
                <span className={`font-mono text-[10px] font-bold ${allowanceUtilizationRate > 100 ? 'text-red-400' : 'text-zs-signal-gelb'}`}>({allowanceUtilizationRate.toFixed(1)}%)</span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10 flex-1 sm:flex-none">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#BA8B68]"></span>
                <span className="text-zinc-400 font-mono text-[9px] uppercase tracking-wider">Lohnkosten:</span>
                <span className="font-mono font-bold text-white">{formatEuro(agGesamt, 0)}</span>
              </div>
              <span className="text-[8px] bg-emerald-500/10 text-emerald-400 font-mono px-1 rounded uppercase font-bold border border-emerald-500/20">REVISION</span>
            </div>
          </div>
        </div>

        <div className="mt-6 md:mt-0 flex flex-col items-start md:items-end gap-1.5 z-10 border-t border-white/10 pt-4 md:pt-0 md:border-0 font-mono text-xs text-zinc-400 self-stretch md:self-auto justify-between md:justify-start">
          <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 px-4 text-right">
            <span className="text-[10px] uppercase text-zinc-400 block tracking-wider">Ausgewähltes Jahr</span>
            <span className="text-lg font-bold text-zs-signal-gelb font-mono block">{activeYearLabel}</span>
          </div>
          <span className="text-[10px] italic mt-auto">WIN.DN GmbH &middot; Revisionskonform</span>
        </div>
      </div>

      {/* 2. Bento Grid KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: BAFA eingegangen */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-zinc-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
              BAFA EINGEGANGEN (IST)
            </span>
            <div className="p-2 bg-yellow-50 rounded-xl">
              <Coins className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          
          <div className="mt-4">
            <span className="text-2xl font-mono font-extrabold text-zs-blau-schwarz block">
              {formatEuro(totalBafaEingegangen, 2)}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
              Soll Bund (90%): <strong className="text-zinc-800">{formatEuro(bafaAnteil)}</strong>
            </span>
          </div>

          {/* Mini progress bar of payouts received */}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-zinc-400">
              <span>Auszahlungsgrad</span>
              <span>{bafaAnteil > 0 ? ((totalBafaEingegangen / bafaAnteil) * 100).toFixed(1) : 0}%</span>
            </div>
            <div className="w-full bg-zinc-100 h-1 rounded-full overflow-hidden">
              <div 
                className="bg-zs-blau-schwarz h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, bafaAnteil > 0 ? (totalBafaEingegangen / bafaAnteil) * 100 : 0)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* KPI 2: LHO NRW eingegangen */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-zinc-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
              LHO NRW EINGEGANGEN
            </span>
            <div className="p-2 bg-[#58B49D]/10 rounded-xl">
              <ArrowDownCircle className="w-4 h-4 text-zs-textil-gruen" />
            </div>
          </div>

          <div className="mt-4">
            <span className="text-2xl font-mono font-extrabold text-zs-textil-gruen block">
              {formatEuro(totalLhoEingegangen, 2)}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
              Soll NRW (7.5%): <strong className="text-zinc-800">{formatEuro(lhoAnteil)}</strong>
            </span>
          </div>

          {/* Mini progress bar of payouts received */}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-zinc-400">
              <span>Zuweisungsgrad</span>
              <span>{lhoAnteil > 0 ? ((totalLhoEingegangen / lhoAnteil) * 100).toFixed(1) : 0}%</span>
            </div>
            <div className="w-full bg-zinc-100 h-1 rounded-full overflow-hidden">
              <div 
                className="bg-zs-textil-gruen h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, lhoAnteil > 0 ? (totalLhoEingegangen / lhoAnteil) * 100 : 0)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* KPI 3: Global project volume */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-zinc-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
              PROJEKTVOLUMEN GESAMT
            </span>
            <div className="p-2 bg-amber-50 rounded-xl">
              <TrendingUp className="w-4 h-4 text-zs-papier-braun" />
            </div>
          </div>

          <div className="mt-4">
            <span className="text-2xl font-mono font-extrabold text-zs-papier-braun block">
              1.545.876,29 €
            </span>
            <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
              Rechtsverbindlicher Planwert
            </span>
          </div>

          <div className="mt-4 pt-1.5 border-t border-zinc-100 flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span>Projektzeitraum:</span>
            <span className="font-bold text-zinc-600">04/2025 – 03/2029</span>
          </div>
        </div>

        {/* KPI 4: Active entities */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-zinc-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
              STRUKTURELLE AKTIVITÄT
            </span>
            <div className="p-2 bg-purple-50 rounded-xl">
              <Layers className="w-4 h-4 text-zs-chemie-violett" />
            </div>
          </div>

          <div className="mt-4">
            <span className="text-2xl font-mono font-extrabold text-[#7F6DBA] block">
              {activeUseCasesCount} Use Cases
            </span>
            <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
              {activeVergabenCount} Ausschreibungen im Lauf
            </span>
          </div>

          <div className="mt-4 pt-1.5 border-t border-zinc-100 flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span>To-Dos Pending:</span>
            <span className="font-bold text-red-650 bg-red-50 px-1.5 rounded border border-red-100">
              {tasks.filter(t => t.status !== 'erledigt').length} offen
            </span>
          </div>
        </div>

      </div>

      {/* 3. Relational Flow Schematics: Cumulative flow calculation */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 p-3 text-zinc-200 pointer-events-none font-bold font-mono tracking-widest text-[50px] opacity-10 select-none">
          FLOW
        </div>
        
        <div 
          onClick={() => setIsFlowCollapsed(!isFlowCollapsed)}
          className="flex items-center gap-2 cursor-pointer select-none group focus:outline-none"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsFlowCollapsed(!isFlowCollapsed);
            }
          }}
        >
          <Activity className="w-4 h-4 text-zs-blau-schwarz group-hover:scale-115 transition-transform duration-200" />
          <h2 className="text-xs font-mono font-bold tracking-wider text-zs-blau-schwarz uppercase group-hover:text-zinc-650 transition-colors">
            Kaskadierendes Finanz-Zuordnungsmodell (Kumuliert)
          </h2>
          
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[9px] bg-zinc-100 font-mono px-2 py-0.5 rounded border border-zinc-250 text-zinc-500 font-bold uppercase hidden sm:inline-block">
              Rechtsverbindliche Schablone
            </span>
            <div className="p-1 hover:bg-zinc-100 rounded-md transition-colors">
              {isFlowCollapsed ? (
                <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zs-blau-schwarz transition-colors" />
              ) : (
                <ChevronUp className="w-4 h-4 text-zinc-500 group-hover:text-zs-blau-schwarz transition-colors" />
              )}
            </div>
          </div>
        </div>

        {!isFlowCollapsed && (
          <div className="animate-fade-in pt-4 mt-4 border-t border-zinc-100">
            {/* Desktop Cascading Schematic */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              
              {/* Step 1: Base Wages Inputs */}
              <div className="md:col-span-3 space-y-3">
                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/60 relative">
                  <div className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">A. Arbeitgeber-Kosten</div>
                  <div className="text-base font-mono font-black text-zs-blau-schwarz mt-1">{formatEuro(agGesamt)}</div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-1">Lohnkosten Projektpartner</div>
                  <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 bg-zinc-200 rounded-full p-0.5 hidden md:block">
                    <ChevronRight className="w-3 h-3 text-zinc-400" />
                  </div>
                </div>
                
                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/60 relative">
                  <div className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">B. Sachkostenpauschale</div>
                  <div className="text-base font-mono font-black text-zinc-500 mt-1">{formatEuro(sachkosten)}</div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-1">Flat-Rate (10% von A)</div>
                  <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 bg-zinc-200 rounded-full p-0.5 hidden md:block">
                    <ChevronRight className="w-3 h-3 text-zinc-400" />
                  </div>
                </div>
              </div>

              {/* Connector Column for Mobile / visual separator */}
              <div className="md:col-span-1 flex justify-center items-center py-4 md:py-0 w-full px-2">
                <div className="flow-line-v md:hidden" />
                <div className="flow-line-h hidden md:block" />
              </div>

              {/* Step 2: Summed Eligible volume */}
              <div className="md:col-span-3">
                <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 p-5 rounded-2xl border-2 border-zs-blau-schwarz/25 relative text-center">
                  <div className="text-[9px] font-mono text-zs-blau-schwarz/70 uppercase tracking-wider font-bold">C. Gesamt Förderfähig (A + B)</div>
                  <div className="text-xl font-mono font-black text-zs-blau-schwarz mt-1.5">{formatEuro(foerderfaehig)}</div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-1">100% veranschlagte Summe</div>
                  
                  {/* Receipt validation metrics */}
                  <div className="mt-3 pt-2 border-t border-zinc-250 text-left">
                    <div className="flex justify-between text-[9px] font-mono text-zinc-600 font-semibold">
                      <span>Rechnungen Ist:</span>
                      <span>{formatEuro(actualInvoicesSum)}</span>
                    </div>
                    <div className="w-full bg-zinc-200 h-1 rounded-full mt-1 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${allowanceUtilizationRate > 100 ? 'bg-red-500' : 'bg-[#58B49D]'}`}
                        style={{ width: `${Math.min(100, allowanceUtilizationRate)}%` }}
                      ></div>
                    </div>
                    <span className="text-[8px] text-zinc-450 block text-right mt-0.5 font-mono">
                      Sachbeleg-Ausschöpfung: {allowanceUtilizationRate.toFixed(1)}%
                    </span>
                  </div>

                  <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 bg-zinc-200 rounded-full p-0.5 hidden md:block">
                    <ChevronRight className="w-3 h-3 text-zinc-400" />
                  </div>
                </div>
              </div>

              {/* Connector */}
              <div className="md:col-span-1 flex justify-center items-center py-4 md:py-0 w-full px-2">
                <div className="flow-line-v md:hidden" />
                <div className="flow-line-h hidden md:block" />
              </div>

              {/* Step 3: Breakdown Splits */}
              <div className="md:col-span-4 space-y-2">
                
                <div className="bg-[#041422]/5 p-3 rounded-xl border border-zs-blau-schwarz/15 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-[#041422]/70 uppercase font-semibold">BAFA Bund (90%)</span>
                    <span className="text-sm font-mono font-black text-zs-blau-schwarz block mt-0.5">{formatEuro(bafaAnteil)}</span>
                  </div>
                  <div className="text-[10px] font-mono font-bold bg-white p-1 px-1.5 rounded border border-zinc-200">
                    Bund
                  </div>
                </div>

                <div className="bg-[#58B49D]/10 p-3 rounded-xl border border-zs-textil-gruen/20 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-zs-textil-gruen/80 uppercase font-semibold">LHO NRW (7.5%)</span>
                    <span className="text-sm font-mono font-black text-emerald-800 block mt-0.5">{formatEuro(lhoAnteil)}</span>
                  </div>
                  <div className="text-[10px] font-mono font-bold bg-white text-zs-textil-gruen p-1 px-1.5 rounded border border-[#58B49D]/20">
                    Land
                  </div>
                </div>

                <div className="bg-[#F9FF00]/10 p-3 rounded-xl border border-amber-300/30 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-amber-800 uppercase font-semibold">Eigenanteil WIN.DN (2.5%)</span>
                    <span className="text-sm font-mono font-black text-amber-700 block mt-0.5">{formatEuro(eigenAnteil)}</span>
                  </div>
                  <div className="text-[10px] font-mono font-bold bg-white text-amber-600 p-1 px-1.5 rounded border border-amber-100">
                    Eigen
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}
      </div>

      {/* 4. MAIN THREE-COLUMN WORKSPACE - Elegant Side-By-Side Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* ========================================================= */}
        {/* WINDOW 1: FINANZ-CONTROLLING & BUDGETIERUNG (SPALTE 1)    */}
        {/* ========================================================= */}
        <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 mb-4">
              <div className="p-1.5 bg-zinc-950 text-white rounded-lg">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] text-zinc-400 font-mono block tracking-wider uppercase">Fördermittel-Steuerung</span>
                <h3 className="font-display font-black text-xs text-zs-blau-schwarz uppercase">1. Budget &amp; Fördersplit</h3>
              </div>
            </div>

            {/* NEW GRAPH: Budget splits donut chart */}
            <div className="bg-zinc-50/50 p-3.5 rounded-xl border border-zinc-150 mb-5 text-center">
              <span className="text-[10px] font-mono font-bold text-zinc-500 block mb-2 uppercase">Soll-Förderquote Anteilig</span>
              <div className="h-40 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={budgetSplitData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {budgetSplitData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatEuro(value, 2), 'Planbetrag']} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text on donut chart */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase">Förderung</span>
                  <span className="text-xs font-mono font-black text-zs-blau-schwarz mt-0.5">97.5%</span>
                </div>
              </div>

              {/* Donut Legend */}
              <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-zinc-200/60 font-mono text-[9px]">
                {budgetSplitData.map((item, i) => (
                  <div key={i} className="flex flex-col items-center p-1 rounded hover:bg-zinc-100 transition-colors">
                    <span className="w-2.5 h-1.5 rounded-xs" style={{ backgroundColor: item.color }}></span>
                    <span className="text-[10px] font-bold text-zinc-800 mt-1 block truncate max-w-full" title={item.name}>{item.name.split(' ')[0]}</span>
                    <span className="text-zinc-500 font-semibold">{((item.value / foerderfaehig) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* QUARTERLY PERSONNEL SPENT */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-mono font-extrabold text-zinc-400 uppercase">Laufende Lohnkosten (Quartal)</span>
                <span className="text-[9px] font-mono bg-zinc-100 p-0.5 px-1.5 rounded border border-zinc-200 text-zinc-650">AG-Ist</span>
              </div>
              <div className="h-44 bg-zinc-50/50 p-2.5 rounded-xl border border-zinc-150">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quarterData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" fontSize={9} fontClassName="font-mono" stroke="#94A3B8" tickLine={false} />
                    <YAxis fontSize={8} fontClassName="font-mono" stroke="#94A3B8" tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar name="Lohnkosten IST" dataKey="AG-Kosten" fill="#041422" radius={[3, 3, 0, 0]} maxBarSize={18} />
                    <Bar name="Zuwendungsfähig" dataKey="Förderfähig" fill="#58B49D" radius={[3, 3, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between font-mono text-[9px] text-zinc-500">
            <span>Finanzierungsplan:</span>
            <span className="font-bold text-zs-blau-schwarz text-[10px]">Maximalrechnung gesichert</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* WINDOW 2: FÖRDERABRUF & SACHKOSTEN-PRÜFUNG (SPALTE 2)      */}
        {/* ========================================================= */}
        <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 mb-4">
              <div className="p-1.5 bg-zs-textil-gruen text-white rounded-lg">
                <ArrowDownCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] text-zinc-400 font-mono block tracking-wider uppercase">Fördertranche &amp; Liquidität</span>
                <h3 className="font-display font-black text-xs text-zs-blau-schwarz uppercase">2. Abruf vs. Inflow</h3>
              </div>
            </div>

            {/* NEW GRAPH: Inflow performance Comparison Line / Area chart */}
            <div className="bg-zinc-50/50 p-3.5 rounded-xl border border-zinc-150 mb-5">
              <span className="text-[10px] font-mono font-bold text-zinc-500 block mb-2 text-center uppercase">Beantragung vs. Auszahlung (Ist)</span>
              
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Bund', Beantragt: bafaBeantragt, Eingegangen: totalBafaEingegangen },
                      { name: 'Land', Beantragt: lhoBeantragt, Eingegangen: totalLhoEingegangen }
                    ]}
                    margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" fontSize={9} fontClassName="font-mono" stroke="#94A3B8" tickLine={false} />
                    <YAxis fontSize={8} fontClassName="font-mono" stroke="#94A3B8" tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k €` : `${v} €`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 9, fontFamily: 'monospace', paddingTop: 8 }} />
                    <Bar name="Soll Beantragt" dataKey="Beantragt" fill="#94A3B8" radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Bar name="Ist Eingegangen" dataKey="Eingegangen" fill="#58B49D" radius={[3, 3, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Analytical KPI feedback */}
              <div className="mt-2.5 pt-2 border-t border-zinc-200/65 flex justify-between items-center text-[10px] font-mono">
                <span className="text-zinc-500">Mittelrückstand gesamt:</span>
                <span className="font-bold text-amber-700">
                  {formatEuro(Math.max(0, totalFuerderungBeantragt - totalFuerderungEingegangen))}
                </span>
              </div>
            </div>

            {/* PHYSICAL INVOICE ALLOCATION BREAKDOWN */}
            {catChartData.length > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-mono font-extrabold text-zinc-400 uppercase">Beleg-Zuschüsse (Kategorie)</span>
                  <span className="text-[9px] font-mono text-zinc-500">Max: {formatEuro(sachkosten, 0)}</span>
                </div>
                <div className="h-44 bg-zinc-50/50 p-2.5 rounded-xl border border-zinc-150">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={catChartData.slice(0, 4)} layout="vertical" margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <XAxis type="number" fontSize={8} stroke="#94A3B8" tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" stroke="#041422" fontSize={8} tickLine={false} width={60} />
                      <Tooltip formatter={(v: number) => [formatEuro(v, 2), 'Betrag']} />
                      <Bar dataKey="value" fill="#BA8B68" radius={[0, 3, 3, 0]} maxBarSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 rounded-xl border border-dashed border-zinc-200 text-center text-xs text-zinc-400">
                <FileText className="w-8 h-8 text-zinc-300 mb-1.5" />
                Noch keine Sachkostenrechnungen für diese Periode hinterlegt.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-zinc-100 flex justify-between items-center font-mono text-[9px]">
            <span className="text-zinc-500">Liquiditätsprognose:</span>
            <span className="font-bold text-[#58B49D] uppercase">Valide</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* WINDOW 3: PROJEKTSTEUERUNG & OPERATIVE TO-DOS (SPALTE 3)   */}
        {/* ========================================================= */}
        <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs flex flex-col justify-between space-y-6 md:col-span-2 lg:col-span-1">
          <div>
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 mb-4">
              <div className="p-1.5 bg-amber-500 text-zs-blau-schwarz rounded-lg">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] text-zinc-400 font-mono block tracking-wider uppercase">Operatives Controlling</span>
                <h3 className="font-display font-black text-xs text-zs-blau-schwarz uppercase">3. Meilensteine &amp; Tasks</h3>
              </div>
            </div>

            {/* NEW GRAPH: Task completion progress or Vergabe states */}
            {tasks.length > 0 ? (
              <div className="bg-zinc-50/50 p-3.5 rounded-xl border border-zinc-150 mb-5 text-center">
                <span className="text-[10px] font-mono font-bold text-zinc-500 block mb-2 uppercase">Aufgaben-Reisegrad</span>
                
                <div className="h-28 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={45}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {taskStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center percentage label */}
                  <div className="absolute flex flex-col items-center">
                    <span className="text-sm font-mono font-black text-zs-blau-schwarz">
                      {tasks.length > 0 ? ((tasksCompletedCount / tasks.length) * 100).toFixed(0) : 0}%
                    </span>
                    <span className="text-[7px] text-zinc-400 font-mono uppercase font-bold">Erfüllt</span>
                  </div>
                </div>

                <div className="flex justify-center gap-4 mt-2.5 text-[10px] font-mono">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-[#58B49D]"></span> Erledigt ({tasksCompletedCount})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-[#D04C3D]"></span> Offen ({tasksOpenCount})
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-150 mb-5 text-center text-xs text-zinc-400">
                <ListTodo className="w-6 h-6 text-zinc-300 mx-auto mb-1.5" />
                Übergeordnetes Steuerungsorgan: Keine Aufgaben definiert.
              </div>
            )}

            {/* LIVE EDITABLE URGENT TO-DO ACTION COMPONENT */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-extrabold text-[#D04C3D] uppercase block px-1">Dringende Handlungsaufforderungen</span>
              
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {tasks.filter(t => t.status !== 'erledigt').slice(0, 3).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 bg-zinc-50 border border-zinc-200/80 rounded-xl text-zinc-400 font-mono text-[10px] text-center italic">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1" />
                    Revisionsfreigaben erfolgt &amp; alle Tasks erledigt!
                  </div>
                ) : (
                  tasks.filter(t => t.status !== 'erledigt').slice(0, 3).map((t) => (
                    <div 
                      key={t.id} 
                      className="p-2 bg-zinc-50/70 border border-zinc-200 rounded-lg hover:border-zinc-300 transition-all flex items-start justify-between gap-2.5 text-xs"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <button 
                          onClick={() => handleToggleTask(t.id, t.status)}
                          className="mt-0.5 text-zinc-400 hover:text-zs-blau-schwarz transition cursor-pointer"
                          title="Als erledigt kennzeichnen"
                        >
                          <div className="w-3.5 h-3.5 rounded-sm border border-zinc-300 hover:border-zs-blau-schwarz bg-white flex items-center justify-center">
                            <span className="text-[8px] font-black scale-75 opacity-0 hover:opacity-80">✓</span>
                          </div>
                        </button>
                        <div className="min-w-0">
                          <span className="font-bold text-zinc-800 truncate line-clamp-1 block leading-tight">{t.title}</span>
                          {t.dueDate && (
                            <span className="text-[9px] text-[#D04C3D] font-mono flex items-center gap-1 mt-0.5 font-semibold">
                              <Calendar className="w-2.5 h-2.5 text-[#D04C3D]/60" />
                              Frist: {t.dueDate}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Priority badge */}
                      <span className={`text-[8px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border leading-none shrink-0 ${
                        t.priority === 'hoch' ? 'bg-red-50 text-red-650 border-red-150' :
                        t.priority === 'mittel' ? 'bg-amber-50 text-amber-600 border-amber-105' :
                        'bg-slate-50 text-slate-500 border-slate-105'
                      }`}>
                        {t.priority}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between font-mono text-[9px] text-zinc-500">
            <span>Meilensteine gesamt (WIN.DN):</span>
            <span className="font-bold text-zs-blau-schwarz">{activeUseCasesCount} Use-Cases aktiv</span>
          </div>
        </div>

      </div>

    </div>
  );
}
