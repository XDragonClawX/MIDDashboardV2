import React, { useState, useEffect, useMemo } from 'react';
import { formatEuro, subEuro } from '../../utils';
import { SystemSettings } from '../../types';
import { DEFAULT_SETTINGS, AZA_VERSION_META, getAzaPlan } from '../../data';
import { TVOED_VKA_TABLE } from './PersonalkostenPage';
import { 
  Calculator, 
  Sparkles, 
  Info, 
  Plus, 
  Trash2, 
  Layers, 
  HelpCircle, 
  CheckCircle2, 
  ChevronRight, 
  Users, 
  Sliders, 
  FileText,
  BadgeAlert,
  Scale,
} from 'lucide-react';

interface Scenario {
  id: string;
  name: string;
  group: string;
  step: number;
  weeklyHours: number;
  workingPercentage: number;
  hourlyRate?: number;
  baseBruttoAnteilig: number;
  svRate: number;
  employerSV: number;
  monthlyWithoutJSZ: number;
  jszRate: number;
  jszContribution: number;
  totalMonthly: number;
  totalYearly: number;
}

interface TVoDRechnerPageProps {
  settings?: SystemSettings;
}

export default function TVoDRechnerPage({ settings = DEFAULT_SETTINGS }: TVoDRechnerPageProps) {
  const [compareYear, setCompareYear] = useState<'2026' | '2027' | '2028'>('2026');
  const activePlan = useMemo(() => getAzaPlan(settings.azaVersion), [settings.azaVersion]);
  const azaMeta = AZA_VERSION_META[settings.azaVersion];
  const azaYearlyPersonnelBudget = useMemo(
    () =>
      activePlan.personal.reduce(
        (sum, row) => sum + Number((row as Record<string, any>)[compareYear] || 0),
        0
      ),
    [activePlan, compareYear]
  );

  // Input states
  const [selectedGroup, setSelectedGroup] = useState<string>('E 11');
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const [weeklyHours, setWeeklyHours] = useState<number>(39);
  const [workingPercentage, setWorkingPercentage] = useState<number>(100);
  const [inputMode, setInputMode] = useState<'hours' | 'percent'>('percent');
  
  // Custom formula adjustment parameters (customization drawer/panel)
  const [customSVRate, setCustomSVRate] = useState<number>(22);
  const [customJSZRate, setCustomJSZRate] = useState<number>(50);
  const [overheadPercent, setOverheadPercent] = useState<number>(0);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // SHK Custom inputs
  const [shkHours, setShkHours] = useState<number>(15);
  const [shkHourlyRate, setShkHourlyRate] = useState<number>(15);
  const [shkWeeksPerMonth, setShkWeeksPerMonth] = useState<number>(4.25);

  // Scenarios Comparison List
  const [scenarios, setScenarios] = useState<Scenario[]>(() => {
    const saved = localStorage.getItem('midpct_tvoed_scenarios');
    return saved ? JSON.parse(saved) : [];
  });
  const [newScenarioName, setNewScenarioName] = useState<string>('');

  // Persist comparisons
  useEffect(() => {
    localStorage.setItem('midpct_tvoed_scenarios', JSON.stringify(scenarios));
  }, [scenarios]);

  // Synchronize hours <--> percentage for standard groups
  useEffect(() => {
    if (selectedGroup === 'SHK') return;
    if (inputMode === 'percent') {
      const hours = Math.round((workingPercentage / 100) * 39 * 10) / 10;
      setWeeklyHours(hours);
    } else {
      const pct = Math.round((weeklyHours / 39) * 100 * 10) / 10;
      setWorkingPercentage(pct);
    }
  }, [workingPercentage, weeklyHours, inputMode, selectedGroup]);

  // Automatically reset preset rates when Group switches to SHK
  useEffect(() => {
    if (selectedGroup === 'SHK') {
      setCustomSVRate(9.5); // standard studentische helper AG contribution (Knappschaft-Bahn-See approx.)
    } else {
      setCustomSVRate(22.0); // standard TVöD VKA rate
    }
  }, [selectedGroup]);

  // Math engine
  const runCalculation = () => {
    const isSHK = selectedGroup === 'SHK';
    let baseBruttoAnteilig = 0;
    let actualWeeklyHours = isSHK ? shkHours : weeklyHours;
    let actualPercentage = isSHK ? (shkHours / 39) * 100 : workingPercentage;

    if (isSHK) {
      baseBruttoAnteilig = shkHourlyRate * shkHours * shkWeeksPerMonth;
    } else {
      const fullValue = TVOED_VKA_TABLE[selectedGroup]?.[selectedStep - 1] || 0;
      baseBruttoAnteilig = fullValue * (actualPercentage / 100);
    }

    const svRateDecimal = customSVRate / 100;
    const jszRateDecimal = customJSZRate / 100;
    const overheadFactor = 1 + (overheadPercent / 100);

    const employerSV = baseBruttoAnteilig * svRateDecimal;
    const monthlyWithoutJSZ = baseBruttoAnteilig + employerSV;
    const jszContribution = (monthlyWithoutJSZ * jszRateDecimal) / 12;
    const totalMonthlyRaw = monthlyWithoutJSZ + jszContribution;
    const totalMonthly = totalMonthlyRaw * overheadFactor;
    const totalYearly = totalMonthly * 12;

    return {
      baseBruttoAnteilig,
      weeklyHours: actualWeeklyHours,
      workingPercentage: actualPercentage,
      employerSV,
      monthlyWithoutJSZ,
      jszContribution,
      totalMonthly,
      totalYearly,
      fulltimeBaseValue: isSHK ? 956.25 : (TVOED_VKA_TABLE[selectedGroup]?.[selectedStep - 1] || 0),
    };
  };

  const {
    baseBruttoAnteilig,
    weeklyHours: computedHours,
    workingPercentage: computedPercentage,
    employerSV,
    monthlyWithoutJSZ,
    jszContribution,
    totalMonthly,
    totalYearly,
    fulltimeBaseValue,
  } = runCalculation();

  // Quick preset selector
  const applyPreset = (group: string, step: number, pct: number, label: string) => {
    setSelectedGroup(group);
    setSelectedStep(step);
    setInputMode('percent');
    setWorkingPercentage(pct);
    setWeeklyHours(Math.round((pct / 100) * 39 * 10) / 10);
    setNewScenarioName(label);
  };

  // Add current calculation to comparison scenarios
  const handleAddScenario = () => {
    const nameToUse = newScenarioName.trim() || `${selectedGroup}/${selectedStep} - ${computedPercentage.toFixed(0)}%`;
    const newScenario: Scenario = {
      id: Date.now().toString(),
      name: nameToUse,
      group: selectedGroup,
      step: selectedStep,
      weeklyHours: computedHours,
      workingPercentage: computedPercentage,
      hourlyRate: selectedGroup === 'SHK' ? shkHourlyRate : undefined,
      baseBruttoAnteilig,
      svRate: customSVRate,
      employerSV,
      monthlyWithoutJSZ,
      jszRate: customJSZRate,
      jszContribution,
      totalMonthly,
      totalYearly,
    };

    setScenarios(prev => [...prev, newScenario]);
    setNewScenarioName('');
  };

  // Remove comparison scenario
  const handleRemoveScenario = (id: string) => {
    setScenarios(prev => prev.filter(sc => sc.id !== id));
  };

  // Clear all comparisons
  const handleClearScenarios = () => {
    setScenarios([]);
  };

  return (
    <div className="space-y-6">
      
      {/* ── HEADER BANNERS ── */}
      <div className="bg-gradient-to-r from-[#041422] to-[#122e47] text-white p-6 rounded-2xl border border-zinc-200/50 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 bg-zs-signal-gelb text-zs-blau-schwarz rounded text-[10px] font-bold tracking-wider uppercase font-mono shadow-sm">
                DYNAMIC ENGINE
              </span>
              <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono tracking-widest">• Tarife 2025 - 2028</span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight font-sans text-white">
              TVöD-VKA Arbeitgeber-Kalkulator
            </h1>
            <p className="text-zinc-300 text-xs max-w-2xl">
              Dynamische Berechnung von Arbeitnehmer-Bruttogehältern sowie den realen Arbeitgeber-Personalkosten (Tarifvertrag für den öffentlichen Dienst - VKA) inklusive Jahressonderzahlung und Sozialabgaben.
            </p>
          </div>
          <div className="p-3 bg-white/10 rounded-xl border border-white/15 self-start md:self-auto flex items-center gap-3">
            <div className="p-2 bg-zs-signal-gelb rounded-lg">
              <Calculator className="w-5 h-5 text-zs-blau-schwarz" />
            </div>
            <div className="text-right">
              <span className="block text-[9px] uppercase font-bold text-zinc-400 font-mono leading-none">Vollzeit-Basiswert</span>
              <span className="text-md font-extrabold text-zs-signal-gelb font-mono transition-all">
                {formatEuro(fulltimeBaseValue, 2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN TWO COLUMN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CONTROLS & SETTINGS (Lg: 5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-zs-blau-schwarz" />
                <h3 className="font-bold text-[#041422] text-sm">Berechnungsparameter</h3>
              </div>
              <span className="text-[10px] font-mono bg-zinc-100 text-zinc-650 px-2.5 py-0.5 rounded font-bold uppercase">
                {selectedGroup === 'SHK' ? 'Hilfskraft' : 'VKA Tarif'}
              </span>
            </div>

            {/* QUICK PRESETS */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-450 font-bold font-mono">WIN.DN Projekt-Schlüssel</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => applyPreset('E 12', 2, 100, 'Innovations-Manager/in 100%')}
                  className={`text-[10.5px] p-2 text-left rounded-lg border transition-all flex flex-col justify-between ${
                    selectedGroup === 'E 12' && workingPercentage === 100
                      ? 'border-[#58B49D] bg-[#58B49D]/5 text-[#0a483a] font-bold'
                      : 'border-zinc-200 hover:border-zinc-300 text-zinc-650 bg-zinc-50'
                  }`}
                >
                  <span className="font-semibold truncate">Innovations-Manager</span>
                  <span className="text-[9px] font-mono text-zinc-400 font-bold mt-0.5">EG 12 / Stufe 2 • 100%</span>
                </button>

                <button
                  onClick={() => applyPreset('E 11', 1, 100, 'Netzwerk-Manager/in 100%')}
                  className={`text-[10.5px] p-2 text-left rounded-lg border transition-all flex flex-col justify-between ${
                    selectedGroup === 'E 11' && workingPercentage === 100
                      ? 'border-[#58B49D] bg-[#58B49D]/5 text-[#0a483a] font-bold'
                      : 'border-zinc-200 hover:border-zinc-300 text-zinc-650 bg-zinc-50'
                  }`}
                >
                  <span className="font-semibold truncate">Netzwerk-Manager</span>
                  <span className="text-[9px] font-mono text-zinc-400 font-bold mt-0.5">EG 11 / Stufe 1 • 100%</span>
                </button>

                <button
                  onClick={() => applyPreset('E 10', 1, 50, 'Vergabe-Manager/in 50%')}
                  className={`text-[10.5px] p-2 text-left rounded-lg border transition-all flex flex-col justify-between ${
                    selectedGroup === 'E 10' && workingPercentage === 50
                      ? 'border-[#58B49D] bg-[#58B49D]/5 text-[#0a483a] font-bold'
                      : 'border-zinc-200 hover:border-zinc-300 text-zinc-650 bg-zinc-50'
                  }`}
                >
                  <span className="font-semibold truncate">Vergabe-Manager (50%)</span>
                  <span className="text-[9px] font-mono text-zinc-400 font-bold mt-0.5">EG 10 / Stufe 1 • 50%</span>
                </button>

                <button
                  onClick={() => applyPreset('SHK', 1, 38.5, 'Stud. Hilfskraft 15h')}
                  className={`text-[10.5px] p-2 text-left rounded-lg border transition-all flex flex-col justify-between ${
                    selectedGroup === 'SHK'
                      ? 'border-[#58B49D] bg-[#58B49D]/5 text-[#0a483a] font-bold'
                      : 'border-zinc-200 hover:border-zinc-300 text-zinc-650 bg-zinc-50'
                  }`}
                >
                  <span className="font-semibold truncate">Stud. Hilfskraft</span>
                  <span className="text-[9px] font-mono text-zinc-400 font-bold mt-0.5">SHK Presets • 15h @ 15€</span>
                </button>
              </div>
            </div>

            {/* SELECT ENTGETGRUPPE */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-450 font-mono flex items-center justify-between">
                <span>Entgeltgruppe &amp; Stufe</span>
                <span className="text-zinc-400 normal-case font-sans">VKA Tabelle</span>
              </label>
              <div className="grid grid-cols-12 gap-2">
                <select
                  value={selectedGroup}
                  onChange={(e) => {
                    setSelectedGroup(e.target.value);
                    setSelectedStep(1); // reset step
                  }}
                  className="col-span-8 bg-zinc-50 border border-zinc-300 text-xs rounded-lg p-2.5 outline-none font-bold text-zs-blau-schwarz focus:border-zs-blau-schwarz"
                >
                  {Object.keys(TVOED_VKA_TABLE).map((g) => (
                    <option key={g} value={g}>
                      {g === 'SHK' ? 'SHK (Studentische Hilfskraft)' : `Entgeltgruppe ${g}`}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStep}
                  disabled={selectedGroup === 'SHK'}
                  onChange={(e) => setSelectedStep(parseInt(e.target.value))}
                  className="col-span-4 bg-zinc-50 border border-zinc-300 text-xs rounded-lg p-2.5 outline-none font-bold text-zs-blau-schwarz focus:border-zs-blau-schwarz disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {[1, 2, 3, 4, 5, 6].map((st) => (
                    <option key={st} value={st}>
                      Stufe {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* STANDARD GROUPS: WORKING HOURS OR PERCENTAGE */}
            {selectedGroup !== 'SHK' ? (
              <div className="space-y-4">
                
                {/* Mode Select Buttons */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-zinc-450 font-mono">Arbeitszeit-Modus</span>
                    <div className="bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 flex">
                      <button
                        onClick={() => setInputMode('percent')}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                          inputMode === 'percent'
                            ? 'bg-white shadow-xs text-zs-blau-schwarz'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        PROZENT
                      </button>
                      <button
                        onClick={() => setInputMode('hours')}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                          inputMode === 'hours'
                            ? 'bg-white shadow-xs text-zs-blau-schwarz'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        STUNDEN
                      </button>
                    </div>
                  </div>

                  {inputMode === 'percent' ? (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center font-mono">
                        <span className="text-xs text-zinc-600 font-semibold">{workingPercentage}% von Vollzeit</span>
                        <span className="text-[10px] text-zinc-400 font-bold">({weeklyHours.toFixed(1)} Std.)</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={workingPercentage}
                        onChange={(e) => setWorkingPercentage(parseFloat(e.target.value))}
                        className="w-full accent-[#041422] h-1 bg-zinc-200 rounded-lg cursor-pointer"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center font-mono">
                        <span className="text-xs text-zinc-600 font-semibold">{weeklyHours} Std. / Woche</span>
                        <span className="text-[10px] text-zinc-400 font-bold">({workingPercentage.toFixed(1)}%)</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="39"
                          step="0.5"
                          value={weeklyHours}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setWeeklyHours(isNaN(val) ? 0 : Math.min(39, Math.max(0, val)));
                          }}
                          className="w-full bg-zinc-50 border border-zinc-300 text-xs rounded-lg p-2 pr-12 font-bold font-mono text-zs-blau-schwarz"
                        />
                        <div className="absolute right-3 top-2.5 text-[10px] font-bold font-mono text-zinc-400 pointer-events-none">
                          STD / 39
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-[10px] bg-sky-50 text-sky-800 p-2.5 rounded-lg border border-sky-100 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <p className="leading-relaxed">
                    <strong>Tarif-Arbeitszeit:</strong> Im Bereich der VKA entspricht eine Vollzeitbeschäftigung exakt <strong>39.0 wöchentlichen Arbeitsstunden</strong>.
                  </p>
                </div>

              </div>
            ) : (
              // SHK CUSTOM INPUTS
              <div className="space-y-3 pt-1 border-t border-zinc-200">
                <span className="text-[10px] uppercase tracking-wider text-zinc-450 font-bold font-mono block">
                  SHK Parameter-Optimierung
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-semibold text-zinc-600">Arbeitsstunden / Woche</label>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={shkHours}
                      onChange={(e) => setShkHours(parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-50 border border-zinc-300 text-xs rounded-lg p-2 font-bold font-mono text-zs-blau-schwarz"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9.5px] font-semibold text-zinc-600">Stundenlohn (€/h)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="12"
                        max="50"
                        step="0.5"
                        value={shkHourlyRate}
                        onChange={(e) => setShkHourlyRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-zinc-50 border border-zinc-300 text-xs rounded-lg p-2 pr-6 font-bold font-mono text-zs-blau-schwarz"
                      />
                      <span className="absolute right-2 top-2 text-[10px] font-bold text-zinc-400">€</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9.5px] font-semibold text-zinc-600 flex justify-between">
                    <span>Wochen pro Monat (Schnitt)</span>
                    <span className="font-mono text-[9px] text-[#58B49D] font-bold">4.25 Standard</span>
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="4.0"
                    max="4.5"
                    value={shkWeeksPerMonth}
                    onChange={(e) => setShkWeeksPerMonth(parseFloat(e.target.value) || 4.25)}
                    className="w-full bg-zinc-50 border border-zinc-300 text-xs rounded-lg p-2 font-bold font-mono text-zs-blau-schwarz"
                  />
                </div>
              </div>
            )}

            {/* OTHER ADVANCED RATES PANEL */}
            <div className="pt-2 border-t border-zinc-200">
              <button
                onClick={() => setIsCustomMode(!isCustomMode)}
                className="w-full flex items-center justify-between text-xs text-zinc-600 hover:text-zs-blau-schwarz font-semibold font-mono"
              >
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  {isCustomMode ? 'Sonderregelungen ausblenden' : 'Sonderregelungen & Raten anpassen'}
                </div>
                <span className="text-[10px] text-[#58B49D] font-bold px-1.5 py-0.2 bg-[#58B49D]/10 rounded">
                  {isCustomMode ? 'Geöffnet' : 'Anpassen'}
                </span>
              </button>

              {isCustomMode && (
                <div className="mt-4 p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-4 animate-fade-in">
                  
                  {/* SV contribution rate */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] text-zinc-650 font-bold flex justify-between font-mono">
                      <span>AG-Anteil SV-Beiträge (%)</span>
                      <span className="font-bold text-[#041422]">{customSVRate.toFixed(1)}%</span>
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="0.5"
                      value={customSVRate}
                      onChange={(e) => setCustomSVRate(parseFloat(e.target.value))}
                      className="w-full accent-[#041422] h-1 bg-zinc-200 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-zinc-400">
                      <span>9.5% (Stud. Hilfskraft)</span>
                      <span>22.0% (TVöD VKA Standard)</span>
                    </div>
                  </div>

                  {/* Jahressonderzahlung rate */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] text-zinc-650 font-bold flex justify-between font-mono">
                      <span>Jahressonderzahlung Rate (%)</span>
                      <span className="font-bold text-[#041422]">{customJSZRate.toFixed(1)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={customJSZRate}
                      onChange={(e) => setCustomJSZRate(parseFloat(e.target.value))}
                      className="w-full accent-[#041422] h-1 bg-zinc-200 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-zinc-400">
                      <span>0.0% (Keine)</span>
                      <span>50.0% (Standard)</span>
                      <span>100.0% (Volles 13. Gehalt)</span>
                    </div>
                  </div>

                  {/* Optional overhead rate */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] text-zinc-650 font-bold flex justify-between font-mono">
                      <span>Overhead / Gemeinkostenzuschlag (%)</span>
                      <span className="font-bold text-[#041422]">{overheadPercent}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="2"
                      value={overheadPercent}
                      onChange={(e) => setOverheadPercent(parseInt(e.target.value))}
                      className="w-full accent-[#041422] h-1 bg-zinc-200 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-zinc-400">
                      <span>0.0% (Realistischer Netto-Satz)</span>
                      <span>20% (Pauschal-Zuschlag)</span>
                      <span>40% (Max)</span>
                    </div>
                  </div>

                  <div className="bg-white p-2 text-[9px] font-mono leading-relaxed text-zinc-500 rounded border border-zinc-200">
                    Sonderregelung: Der Standard-Arbeitgeberanteil zur Sozialversicherung liegt bei <strong>22,00%</strong> für TVöD-Vollkräfte und <strong>9,50%</strong> für studentische Hilfskräfte. Die Jahressonderzahlung (Weihnachtsgeld) beträgt laut Förderprojekt-Vorgaben pauschal <strong>50,00%</strong> des mittleren Monatsgehalts.
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* ADD TO SAVED COMPARISONS FORM CARD */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-3.5">
            <h4 className="font-bold text-sm text-[#041422] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#58B49D]" />
              Szenario im Vergleich festhalten
            </h4>
            <p className="text-zinc-500 text-xs">
              Sichern Sie diese Kalkulation unter einem Namen, um sie im unteren Tabellensegment direkt mit anderen Entgeltstufen zu vergleichen.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="z.B. Vergabe-Manager 20h"
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                className="flex-grow bg-zinc-50 border border-zinc-300 text-xs rounded-lg p-2.5 font-sans outline-none focus:border-zs-blau-schwarz text-zinc-800"
              />
              <button
                onClick={handleAddScenario}
                className="bg-zs-blau-schwarz hover:bg-zinc-800 text-white px-4 py-2 text-xs rounded-lg font-bold flex items-center gap-1.5 transition-all shrink-0 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Sichern
              </button>
            </div>
            {scenarios.length > 0 && (
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1">
                <span>Gesicherte Szenarien: <strong>{scenarios.length}</strong></span>
                <button 
                  onClick={handleClearScenarios}
                  className="hover:text-red-600 transition-colors uppercase font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Alle löschen
                </button>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: COST VISUALIZER & EQUATIONS (Lg: 7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* PRIMARY DETAILED CALCULATOR OUTPUTS CARDS */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col justify-between">
            
            {/* Header portion */}
            <div className="p-5 border-b border-zinc-200 bg-zinc-50/70 flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase tracking-widest font-extrabold font-mono text-[#58B49D]">
                  ERGEBNIS-SYNTHESE (Monatlich)
                </span>
                <h3 className="font-extrabold text-[#041422] text-sm leading-tight mt-0.5">
                  Anteilige Personalausgaben
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs bg-[#041422] text-white font-extrabold font-mono px-3 py-1 rounded-full">
                  {selectedGroup} / St {selectedGroup === 'SHK' ? '1' : selectedStep}
                </span>
              </div>
            </div>

            {/* Calculations Breakdown Row/Card Grid */}
            <div className="p-6 space-y-5 flex-1">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* CARD 1: BASE GROSS (EMPLOYEE) */}
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col justify-between transition-all hover:bg-zinc-50/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-zinc-400 font-mono tracking-wider">
                        Bruttogehalt (AN)
                      </span>
                      <h4 className="text-[10px] font-sans text-zinc-500 leading-tight">
                        Arbeitnehmer-Brutto mtl.
                      </h4>
                    </div>
                    <span className="p-1.5 bg-zinc-200 text-zinc-700 rounded-lg text-[9px] font-extrabold">
                      {computedPercentage.toFixed(1)}% LZ
                    </span>
                  </div>
                  <div className="mt-4">
                    <span className="text-[22px] font-extrabold text-zs-blau-schwarz font-mono select-all">
                      {formatEuro(baseBruttoAnteilig, 2)}
                    </span>
                    <span className="block text-[8.5px] text-zinc-450 mt-1 font-mono">
                      {selectedGroup === 'SHK' 
                        ? `${shkHours}h * ${shkHourlyRate}€ * ${shkWeeksPerMonth}` 
                        : `${formatEuro(fulltimeBaseValue, 2)} * ${computedPercentage.toFixed(1)}%`}
                    </span>
                  </div>
                </div>

                {/* CARD 2: AG SV SHARE */}
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col justify-between transition-all hover:bg-zinc-50/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-zinc-400 font-mono tracking-wider">
                        AG-Anteil SV ({customSVRate.toFixed(1)}%)
                      </span>
                      <h4 className="text-[10px] font-sans text-zinc-500 leading-tight">
                        Sozialversicherungsabgaben
                      </h4>
                    </div>
                    <span className="p-1.5 bg-zinc-200 text-zinc-700 rounded-lg text-[9px] font-extrabold">
                      Zusatzkosten
                    </span>
                  </div>
                  <div className="mt-4">
                    <span className="text-[22px] font-extrabold text-[#BA8B68] font-mono select-all">
                      + {formatEuro(employerSV, 2)}
                    </span>
                    <span className="block text-[8.5px] text-zinc-450 mt-1 font-mono">
                      berechnet: Bruttogehalt * {customSVRate.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* CARD 3: MID TOTAL WITHOUT JSZ */}
                <div className="p-4 rounded-xl bg-zinc-100/60 border border-zinc-200 flex flex-col justify-between transition-all hover:bg-zinc-100/40 md:col-span-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-zinc-500 font-mono tracking-wider">
                        AG-Brutto ohne JSZ
                      </span>
                      <h4 className="text-[10px] font-sans text-zinc-500 leading-tight">
                        Arbeitgeberbrutto mtl. exkl. Sonderzahlung
                      </h4>
                    </div>
                    <span className="p-1 px-2.5 bg-zinc-200 text-zinc-800 rounded font-bold text-[9px] font-mono">
                      Subtotal
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-xl font-extrabold text-zs-blau-schwarz font-mono">
                      {formatEuro(monthlyWithoutJSZ, 2)}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-450">
                      Bruttogehalt + SV-Anteil
                    </span>
                  </div>
                </div>

                {/* CARD 4: JAHRESSONDERZAHLUNG SHARE */}
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col justify-between transition-all hover:bg-zinc-50/50 md:col-span-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-zinc-400 font-mono tracking-wider">
                        1/12 Jahressonderzahlung ({customJSZRate.toFixed(1)}%)
                      </span>
                      <h4 className="text-[10px] font-sans text-zinc-500 leading-tight">
                        Anteilige Rücklage mtl. für Weihnachts-/Sonderzahlung
                      </h4>
                    </div>
                    <span className="p-1.5 bg-[#BA8B68]/15 text-[#6c482b] rounded-lg text-[9px] font-extrabold">
                      Pauschal 50%
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between pt-1 border-t border-dashed border-zinc-200">
                    <span className="text-xl font-mono font-extrabold text-amber-800">
                      + {formatEuro(jszContribution, 2)}
                    </span>
                    <span className="text-[8.5px] font-mono text-zinc-400 text-right leading-none max-w-[190px]">
                      (AG-Brutto {formatEuro(monthlyWithoutJSZ, 2)} * {customJSZRate}%) / 12 Mom.
                    </span>
                  </div>
                </div>

              </div>

              {/* OVERALL SUMMARY STATS HERO DIV */}
              <div className="mt-5 p-5 bg-[#041422] rounded-2xl border border-zinc-800 text-white relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-15">
                  <Sparkles className="w-32 h-32 text-zs-signal-gelb" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zs-signal-gelb font-mono tracking-wider">
                      Arbeitgeber-Gesamtkosten (Real)
                    </span>
                    <h4 className="text-[28px] font-extrabold font-mono text-white leading-none">
                      {formatEuro(totalMonthly, 2)}
                      <span className="text-xs text-zinc-400 font-sans font-normal ml-1">/ Monat</span>
                    </h4>
                    {overheadPercent > 0 && (
                      <span className="text-[9px] font-mono text-red-500 block leading-tight">
                        *Inkl. {overheadPercent}% Overhead-Gemeinkostenteuerung (+{formatEuro(totalMonthly - (monthlyWithoutJSZ + jszContribution), 2)})
                      </span>
                    )}
                  </div>
                  
                  <div className="h-px md:h-12 w-full md:w-px bg-zinc-700/80 my-1 md:my-0" />

                  <div className="space-y-1 text-left md:text-right">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono tracking-wider">
                      Jahresbudget Gesamt
                    </span>
                    <h4 className="text-2xl font-extrabold font-mono text-[#58B49D] leading-none">
                      {formatEuro(totalYearly, 2)}
                      <span className="text-xs text-zinc-400 font-sans font-normal ml-1">/ Jahr</span>
                    </h4>
                    <span className="text-[8px] font-mono text-zinc-500 uppercase block">12 berechnete Betriebsmonate</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Equation Panel */}
            <div className="bg-zinc-50 p-5 border-t border-zinc-200 text-xs text-zinc-600 space-y-3.5">
              <h4 className="font-extrabold text-[#041422] text-xs flex items-center gap-1.5 font-mono">
                <FileText className="w-3.5 h-3.5" />
                DOKUMENTATION &amp; TRANSFERGLEICHUNG (TVöD VKA)
              </h4>
              <p className="leading-relaxed text-zinc-500 text-[11px]">
                Diese mathematische Formel repräsentiert die offizielle Prüfungsgrundlage von Bewilligungsstellen bei Bundesprojekten (z.B. BAFA/ZukunftStoff).
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 font-mono text-[10px] text-zinc-700">
                <div className="p-3 bg-white rounded border border-zinc-200 space-y-1">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase leading-none block">Formel Standardkraft:</span>
                  <div className="font-semibold text-zs-blau-schwarz leading-relaxed">
                    AG-Kosten = (T × W) × (1 + SV) × (1 + JSZ/12)
                  </div>
                  <div className="text-[8.5px] text-zinc-400 leading-snug">
                    T: Tabellenwert EG/Ststufe • W: Arbeitszeit % • SV: {customSVRate}% • JSZ: {customJSZRate}%
                  </div>
                </div>

                <div className="p-3 bg-white rounded border border-zinc-200 space-y-1">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase leading-none block">Formel Hilfskraft (SHK):</span>
                  <div className="font-semibold text-zs-blau-schwarz leading-relaxed">
                    AG-Kosten = (H × L × WM) × (1 + SV) × (1 + JSZ/12)
                  </div>
                  <div className="text-[8.5px] text-zinc-400 leading-snug">
                    H: Stunden • L: Lohn • WM: {shkWeeksPerMonth} Wochen • SV: {customSVRate}% • JSZ: {customJSZRate}%
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ── BOTTOM AREA: DETAILED SCENARIOS COMPARISON TABLE ── */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-3.5">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-[#041422] text-sm flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-zs-signal-gelb" />
              Szenarien-Vergleich &amp; Personalkosten-Auswirkung
            </h3>
            <p className="text-zinc-500 text-xs">
              Mithilfe dieser Grid-Schnittstelle können Sie unterschiedliche Personalbesetzungen und Anstellungsgrade im Vergleich gegenüberstellen.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Add common project default template snap
                setScenarios([
                  {
                    id: '1',
                    name: 'Innovations-Manager (100%)',
                    group: 'E 12',
                    step: 2,
                    weeklyHours: 39,
                    workingPercentage: 100,
                    baseBruttoAnteilig: 4581.34,
                    svRate: 22,
                    employerSV: 1007.89,
                    monthlyWithoutJSZ: 5589.23,
                    jszRate: 50,
                    jszContribution: 232.88,
                    totalMonthly: 5822.11,
                    totalYearly: 69865.32,
                  },
                  {
                    id: '2',
                    name: 'Netzwerk-Manager (100%)',
                    group: 'E 11',
                    step: 1,
                    weeklyHours: 39,
                    workingPercentage: 100,
                    baseBruttoAnteilig: 4032.38,
                    svRate: 22,
                    employerSV: 887.12,
                    monthlyWithoutJSZ: 4919.50,
                    jszRate: 50,
                    jszContribution: 204.98,
                    totalMonthly: 5124.48,
                    totalYearly: 61493.76,
                  },
                  {
                    id: '3',
                    name: 'Vergabe-Manager (50%)',
                    group: 'E 10',
                    step: 1,
                    weeklyHours: 19.5,
                    workingPercentage: 50,
                    baseBruttoAnteilig: 1947.67,
                    svRate: 22,
                    employerSV: 428.48,
                    monthlyWithoutJSZ: 2376.15,
                    jszRate: 50,
                    jszContribution: 99.01,
                    totalMonthly: 2475.16,
                    totalYearly: 29701.92,
                  },
                  {
                    id: '4',
                    name: 'Stud. Hilfskraft Lea Fischöder',
                    group: 'SHK',
                    step: 1,
                    weeklyHours: 15,
                    workingPercentage: 38.5,
                    baseBruttoAnteilig: 956.25,
                    svRate: 9.5,
                    employerSV: 90.84,
                    monthlyWithoutJSZ: 1047.09,
                    jszRate: 50,
                    jszContribution: 43.63,
                    totalMonthly: 1090.72,
                    totalYearly: 13088.64,
                  }
                ]);
              }}
              className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3 py-1.5 text-xs rounded-lg font-bold transition-all border border-zinc-200"
            >
              Seed Standard-Team
            </button>
            {scenarios.length > 0 && (
              <button
                onClick={handleClearScenarios}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 text-xs rounded-lg font-bold transition-all border border-red-200"
              >
                Tabelle leeren
              </button>
            )}
          </div>
        </div>

        {scenarios.length === 0 ? (
          <div className="py-12 text-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/40">
            <BadgeAlert className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <h4 className="font-bold text-zinc-700 text-xs">Keine Szenarien erfasst</h4>
            <p className="text-zinc-400 text-[11px] max-w-sm mx-auto mt-0.5 leading-relaxed">
              Tragen Sie oben Namen ein und klicken Sie "Sichern" oder laden Sie das standardmäßige Referenzteam, um die Gegenüberstellung zu aktivieren.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto pr-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-400 font-mono uppercase text-[9.5px]">
                  <th className="py-2.5 font-bold">Bezeichnung</th>
                  <th className="py-2.5 font-bold">EG / Stufe</th>
                  <th className="py-2.5 font-bold text-center">Arbeitszeit</th>
                  <th className="py-2.5 font-bold text-right">Gehalt (AN)</th>
                  <th className="py-2.5 font-bold text-right">AG SV</th>
                  <th className="py-2.5 font-bold text-right">1/12 JSZ</th>
                  <th className="py-2.5 font-bold text-right bg-zinc-50 font-sans text-zs-blau-schwarz">AG mtl. Gesamt</th>
                  <th className="py-2.5 font-bold text-right text-emerald-800 font-sans">AG jhrl. Gesamt</th>
                  <th className="py-2.5 text-center">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-150 font-sans text-zinc-700">
                {scenarios.map((sc) => {
                  const isSHK = sc.group === 'SHK';
                  return (
                    <tr key={sc.id} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="py-3 font-semibold text-[#041422]">
                        {sc.name}
                      </td>
                      <td className="py-3 font-mono text-[11px]">
                        {isSHK ? 'SHK Hilfskraft' : `${sc.group} (St. ${sc.step})`}
                      </td>
                      <td className="py-3 text-center font-mono text-[11px]">
                        {sc.weeklyHours.toFixed(1)} Std. ({sc.workingPercentage.toFixed(0)}%)
                      </td>
                      <td className="py-3 text-right font-mono text-[11px]">
                        {formatEuro(sc.baseBruttoAnteilig, 2)}
                      </td>
                      <td className="py-3 text-right font-mono text-[11px] text-zinc-500">
                        {formatEuro(sc.employerSV, 2)} <span className="text-[9px] text-zinc-400">({sc.svRate}%)</span>
                      </td>
                      <td className="py-3 text-right font-mono text-[11px] text-[#BA8B68]">
                        {formatEuro(sc.jszContribution, 2)} <span className="text-[9px] text-zinc-400">({sc.jszRate}%)</span>
                      </td>
                      <td className="py-3 text-right font-mono text-[11px] font-extrabold bg-zinc-50 text-zs-blau-schwarz select-all group-hover:bg-[#041422]/5">
                        {formatEuro(sc.totalMonthly, 2)}
                      </td>
                      <td className="py-3 text-right font-mono text-[11px] font-extrabold text-emerald-800 select-all">
                        {formatEuro(sc.totalYearly, 2)}
                      </td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => handleRemoveScenario(sc.id)}
                          className="p-1 text-zinc-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                          title="Szenario entfernen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-200 font-extrabold text-[#041422] bg-zinc-50">
                  <td className="py-3 px-2">KUMULATIVE INVESTITION (Summe)</td>
                  <td colSpan={2}></td>
                  <td className="py-3 text-right font-mono text-[11px]">
                    {formatEuro(scenarios.reduce((sum, sc) => sum + sc.baseBruttoAnteilig, 0), 2)}
                  </td>
                  <td className="py-3 text-right font-mono text-[11px] text-zinc-500">
                    {formatEuro(scenarios.reduce((sum, sc) => sum + sc.employerSV, 0), 2)}
                  </td>
                  <td className="py-3 text-right font-mono text-[11px] text-[#BA8B68]">
                    {formatEuro(scenarios.reduce((sum, sc) => sum + sc.jszContribution, 0), 2)}
                  </td>
                  <td className="py-3 text-right font-mono text-[11px] text-zs-blau-schwarz bg-zinc-100">
                    {formatEuro(scenarios.reduce((sum, sc) => sum + sc.totalMonthly, 0), 2)}
                  </td>
                  <td className="py-3 text-right font-mono text-[11px] text-emerald-800">
                    {formatEuro(scenarios.reduce((sum, sc) => sum + sc.totalYearly, 0), 2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* BAFA-Budgetneutralitäts-Waage */}
        {(() => {
          const scenariosTotalYearly = scenarios.reduce((sum, sc) => sum + sc.totalYearly, 0);
          const diff = subEuro(scenariosTotalYearly, azaYearlyPersonnelBudget);
          const absDiff = Math.abs(diff);
          const isExactNeutral = scenarios.length > 0 && absDiff <= 50;
          const isNearNeutral = scenarios.length > 0 && absDiff <= 2500;
          const fillPct =
            azaYearlyPersonnelBudget > 0
              ? Math.min(100, Math.round((scenariosTotalYearly / azaYearlyPersonnelBudget) * 100))
              : 0;

          return (
            <div className="mt-4 p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#58B49D]" />
                  <div>
                    <div className="text-xs font-bold text-[#041422]">
                      BAFA-Budgetneutralitäts-Waage ({azaMeta.shortLabel})
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Vergleicht die Summe der gesicherten Teamszenarien mit dem jährlichen AZA-Personalsoll ({compareYear}).
                    </div>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-0.5 text-[11px] font-mono">
                  {(['2026', '2027', '2028'] as const).map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setCompareYear(yr)}
                      className={`px-2.5 py-1 rounded font-bold cursor-pointer ${
                        compareYear === yr ? 'bg-zs-blau-schwarz text-white' : 'text-zinc-600 hover:text-zs-blau-schwarz'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white border border-zinc-200">
                  <div className="text-[10px] font-mono uppercase text-zinc-500">AZA-Personalsoll ({compareYear})</div>
                  <div className="text-base font-mono font-extrabold text-zs-blau-schwarz tabular-nums mt-0.5">
                    {formatEuro(azaYearlyPersonnelBudget, 2)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white border border-zinc-200">
                  <div className="text-[10px] font-mono uppercase text-zinc-500">Szenarien-Jahressumme</div>
                  <div className="text-base font-mono font-extrabold text-zs-blau-schwarz tabular-nums mt-0.5">
                    {formatEuro(scenariosTotalYearly, 2)}
                  </div>
                </div>
                <div
                  className={`p-3 rounded-lg border ${
                    scenarios.length === 0
                      ? 'bg-white border-zinc-200 text-zinc-600'
                      : isExactNeutral
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : isNearNeutral
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-red-50 border-red-300 text-red-900'
                  }`}
                >
                  <div className="text-[10px] font-mono uppercase font-bold">
                    {scenarios.length === 0
                      ? 'Abweichung'
                      : isExactNeutral
                      ? 'Budgetneutral für BAFA-Änderungsantrag'
                      : isNearNeutral
                      ? 'Geringfügige Abweichung (±2.500 €)'
                      : diff > 0
                      ? 'Budgetüberschreitung'
                      : 'Restspielraum Personal'}
                  </div>
                  <div className="text-base font-mono font-extrabold tabular-nums mt-0.5">
                    {diff > 0 ? `+${formatEuro(diff, 2)}` : formatEuro(diff, 2)}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isExactNeutral
                        ? 'bg-emerald-500'
                        : isNearNeutral
                        ? 'bg-amber-500'
                        : diff > 0
                        ? 'bg-red-500'
                        : 'bg-[#58B49D]'
                    }`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-zinc-500 tabular-nums">
                  <span>0 %</span>
                  <span>Ausschöpfung AZA-Personalkosten {compareYear}: {fillPct} %</span>
                  <span>100 %</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

    </div>
  );
}
