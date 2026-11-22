import React, { useState } from 'react';
import { ResourcePipelineState, formatEuro } from '../utils';
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Layers,
} from 'lucide-react';

interface ResourceSankeyPipelineProps {
  pipeline: ResourcePipelineState;
  activeYearLabel: string;
  onNavigateDetail: (page: string, filters: Record<string, any>) => void;
}

type PipelineStageId = 'aza' | 'obligo' | 'ist' | 'za';

function sankeyRibbonPath(
  x1: number,
  y1Top: number,
  h1: number,
  x2: number,
  y2Top: number,
  h2: number
): string {
  const cx = (x1 + x2) / 2;
  const y1Bot = y1Top + h1;
  const y2Bot = y2Top + h2;
  return [
    `M ${x1} ${y1Top}`,
    `C ${cx} ${y1Top}, ${cx} ${y2Top}, ${x2} ${y2Top}`,
    `L ${x2} ${y2Bot}`,
    `C ${cx} ${y2Bot}, ${cx} ${y1Bot}, ${x1} ${y1Bot}`,
    `Z`,
  ].join(' ');
}

export default function ResourceSankeyPipeline({
  pipeline,
  activeYearLabel,
  onNavigateDetail,
}: ResourceSankeyPipelineProps) {
  const [selectedStage, setSelectedStage] = useState<PipelineStageId>('ist');
  const [hoveredStage, setHoveredStage] = useState<PipelineStageId | null>(null);

  const {
    stage1AzaPotenzial,
    stage2GebundenesObligo,
    stage3BelegtesIst,
    stage3Bund90,
    stage3Eigen10Katalysator,
    stage4LiquideBundesmittel,
    stage4OffeneForderungen,
    positionBreakdown,
    bottlenecks,
    primaryBottleneck,
  } = pipeline;

  const focusStage = hoveredStage ?? selectedStage;
  const maxBarH = 128;
  const base = Math.max(1, stage1AzaPotenzial);

  const hAza = maxBarH;
  const hObligo = Math.max(18, Math.min(maxBarH, (stage2GebundenesObligo / base) * maxBarH));
  const hIst = Math.max(18, Math.min(maxBarH, (stage3BelegtesIst / base) * maxBarH));
  const hIstBund90 = Math.max(12, hIst * 0.9);
  const hIstEigen10 = Math.max(6, hIst - hIstBund90);
  const hZa = Math.max(16, Math.min(maxBarH, (stage4LiquideBundesmittel / base) * maxBarH));

  const yTopBase = 44;
  const hasStau0835 = Boolean(primaryBottleneck && primaryBottleneck.stauBetrag > 1);

  const stageMeta: Record<
    PipelineStageId,
    {
      step: string;
      title: string;
      subtitle: string;
      amount: number;
      conversionPct: number;
      note: string;
      ctaLabel: string;
      targetPage: string;
      filters: Record<string, any>;
    }
  > = {
    aza: {
      step: 'Stufe 1 · Rohstoff',
      title: 'Bewilligtes AZA-Budget',
      subtitle: 'Silos 0812–0843 im Bescheid',
      amount: stage1AzaPotenzial,
      conversionPct: 100,
      note: 'Gesamtes bewilligtes Förderpotenzial (90 % Bund / 10 % Eigenanteil WIN.DN) über alle profi-online Positionen.',
      ctaLabel: 'AZA-Plan & Silos öffnen',
      targetPage: 'budget',
      filters: { budgetTab: 'kategorie' },
    },
    obligo: {
      step: 'Stufe 2 · Veredelung 1',
      title: 'Gebundenes Obligo',
      subtitle: 'Personalverträge + Vergaben (0835)',
      amount: stage2GebundenesObligo,
      conversionPct: (stage2GebundenesObligo / base) * 100,
      note: hasStau0835
        ? `Davon warten ${formatEuro(primaryBottleneck!.stauBetrag, 2)} in Pos. 0835 als offenes Zuschlags-Obligo auf Rechnungsabruf.`
        : 'Alle vergebenen Aufträge und erfassten Personalverträge sind durch das AZA-Budget gedeckt.',
      ctaLabel: 'Vergaben & Obligo prüfen',
      targetPage: 'vergaben',
      filters: {},
    },
    ist: {
      step: 'Stufe 3 · 90/10-Katalysator',
      title: 'Belegtes Ist & Eigenanteil',
      subtitle: '90 % BAFA + 10 % WIN.DN-Katalysator',
      amount: stage3BelegtesIst,
      conversionPct: (stage3BelegtesIst / base) * 100,
      note: `Jede 90 € Bundesförderung (${formatEuro(stage3Bund90, 2)}) erfordert zwingend 10 € Eigenanteil (${formatEuro(stage3Eigen10Katalysator, 2)}) als Reaktionsstoff.`,
      ctaLabel: 'Sachbelege & Ist prüfen',
      targetPage: 'rechnungen',
      filters: {},
    },
    za: {
      step: 'Stufe 4 · Endprodukt',
      title: 'Abgerufene BAFA-Mittel (ZA)',
      subtitle: 'profi-online Zeile 19 & Kasse',
      amount: stage4LiquideBundesmittel,
      conversionPct: (stage4LiquideBundesmittel / base) * 100,
      note: `Bereits ausgezahlt: ${formatEuro(stage4LiquideBundesmittel, 2)} · Offen beantragt im Abruf: ${formatEuro(stage4OffeneForderungen, 2)}.`,
      ctaLabel: 'ZA-Rechner (Zeile 19) öffnen',
      targetPage: 'mittelabrufe',
      filters: { mittelabrufeSubTab: 'za-rechner' },
    },
  };

  const activeMeta = stageMeta[focusStage];

  return (
    <section className="bg-white rounded-xl border border-zinc-200 cardstock overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="font-display font-bold text-base text-zs-deep-teal flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00B4D8]" />
            <span>4-Stufen Fördermittel-Fluss &amp; Sankey-Pipeline</span>
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            AZA-Budget &rarr; Gebundenes Obligo &rarr; Belegtes Ist (inkl. 10-%-Eigenanteil-Katalysator) &rarr; Abgerufene BAFA-Mittel ({activeYearLabel})
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-600 tabular-nums">
          <FlaskConical className="w-3.5 h-3.5 text-[#BA8B68]" />
          <span>
            Katalysator: <strong className="text-zs-blau-schwarz">90 € Bund</strong> +{' '}
            <strong className="text-[#BA8B68]">10 € Eigenanteil</strong>
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Bottleneck Warnings (Engpass-Detektor) */}
        {bottlenecks.length > 0 ? (
          <div className="space-y-2">
            {bottlenecks.map((bn) => (
              <button
                key={`${bn.position}-${bn.label}`}
                type="button"
                onClick={() => onNavigateDetail(bn.targetPage, {})}
                className="w-full text-left bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-500 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-950">
                    <div className="font-bold">Engpass-Detektor · {bn.label}</div>
                    <div className="text-[11px] text-amber-800 mt-0.5 tabular-nums">
                      {bn.message}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-amber-900 inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                  <span>Rückstau auflösen</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
            <span>
              <strong>Pipeline im Gleichgewicht:</strong> Keine offenen Rückstaus zwischen gebundenem Obligo (0835) und erfassten Sachbelegen.
            </span>
          </div>
        )}

        {/* Interactive SVG Sankey Stream Diagram */}
        <div className="rounded-xl border border-zinc-200 bg-[#041422] p-3.5 text-white overflow-x-auto">
          <svg
            viewBox="0 0 880 215"
            className="w-full min-w-[660px] h-auto block select-none"
            role="img"
            aria-label="Interaktives Sankey-Flussdiagramm vom AZA-Budget bis zu den abgerufenen BAFA-Mitteln"
          >
            <defs>
              <linearGradient id="flowAzaObligo" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0e7490" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#00B4D8" stopOpacity="0.78" />
              </linearGradient>
              <linearGradient id="flowObligoIst" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={hasStau0835 ? '#f59e0b' : '#00B4D8'} stopOpacity="0.75" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="flowIstZa" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.72" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.88" />
              </linearGradient>
              <linearGradient id="flowEigenCat" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#BA8B68" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#BA8B68" stopOpacity="0.92" />
              </linearGradient>
            </defs>

            {/* Background guide lines */}
            <g stroke="#163554" strokeWidth="0.7" strokeDasharray="3 4" opacity="0.5">
              <line x1="120" y1="36" x2="120" y2="195" />
              <line x1="360" y1="36" x2="360" y2="195" />
              <line x1="600" y1="36" x2="600" y2="195" />
              <line x1="840" y1="36" x2="840" y2="195" />
            </g>

            {/* Ribbon 1 -> 2: AZA-Budget -> Gebundenes Obligo */}
            <path
              d={sankeyRibbonPath(96, yTopBase, hObligo, 268, yTopBase, hObligo)}
              fill="url(#flowAzaObligo)"
              opacity={focusStage === 'aza' || focusStage === 'obligo' ? 0.95 : 0.62}
            />
            {/* Unbound reserve ribbon hint */}
            {hAza > hObligo + 4 && (
              <path
                d={sankeyRibbonPath(
                  96,
                  yTopBase + hObligo,
                  hAza - hObligo,
                  268,
                  yTopBase + hObligo,
                  Math.max(4, (hAza - hObligo) * 0.45)
                )}
                fill="#1e3a5f"
                opacity="0.32"
              />
            )}

            {/* Ribbon 2 -> 3: Obligo -> Belegtes Ist (90% Bund stream) */}
            <path
              d={sankeyRibbonPath(336, yTopBase, hIstBund90, 508, yTopBase, hIstBund90)}
              fill="url(#flowObligoIst)"
              opacity={focusStage === 'obligo' || focusStage === 'ist' ? 0.95 : 0.68}
            />

            {/* Catalyst stream into Stage 3 bottom (10% Eigenanteil WIN.DN) */}
            <path
              d={sankeyRibbonPath(
                420,
                yTopBase + maxBarH + 14,
                Math.max(8, hIstEigen10),
                508,
                yTopBase + hIstBund90,
                hIstEigen10
              )}
              fill="url(#flowEigenCat)"
              opacity={focusStage === 'ist' ? 1 : 0.85}
            />
            <text
              x="418"
              y={yTopBase + maxBarH + 25}
              textAnchor="end"
              fontSize="9.5"
              fontFamily="monospace"
              fontWeight="700"
              fill="#e2c2a8"
            >
              +10 % Eigenanteil-Katalysator ({formatEuro(stage3Eigen10Katalysator, 0)})
            </text>

            {/* Bottleneck Valve Badge on Pipe 2 -> 3 if Stau exists */}
            {hasStau0835 && primaryBottleneck && (
              <g
                transform="translate(422, 68)"
                className="cursor-pointer"
                onClick={() => onNavigateDetail(primaryBottleneck.targetPage, {})}
              >
                <rect
                  x="-54"
                  y="-14"
                  width="108"
                  height="26"
                  rx="5"
                  fill="#451a03"
                  stroke="#f59e0b"
                  strokeWidth="1.3"
                />
                <text
                  x="0"
                  y="-2"
                  textAnchor="middle"
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="700"
                  fill="#fcd34d"
                >
                  ENGPASS 0835
                </text>
                <text
                  x="0"
                  y="8"
                  textAnchor="middle"
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="700"
                  fill="#ffffff"
                >
                  {formatEuro(primaryBottleneck.stauBetrag, 0)} Stau
                </text>
              </g>
            )}

            {/* Ribbon 3 -> 4: Belegtes Ist -> Abgerufene BAFA-Mittel (ZA) */}
            <path
              d={sankeyRibbonPath(576, yTopBase, hZa, 748, yTopBase, hZa)}
              fill="url(#flowIstZa)"
              opacity={focusStage === 'ist' || focusStage === 'za' ? 0.96 : 0.72}
            />

            {/* Stage 1 Node: AZA-Budget */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedStage('aza')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedStage('aza')}
              onMouseEnter={() => setHoveredStage('aza')}
              onMouseLeave={() => setHoveredStage(null)}
              className="cursor-pointer outline-none"
            >
              <text x="28" y="20" fontSize="9.5" fontFamily="monospace" fontWeight="700" fill="#94a3b8">
                1. AZA-BUDGET
              </text>
              <text x="28" y="33" fontSize="11" fontFamily="monospace" fontWeight="700" fill="#ffffff">
                {formatEuro(stage1AzaPotenzial, 0)}
              </text>
              <rect
                x="28"
                y={yTopBase}
                width="68"
                height={hAza}
                rx="4"
                fill="#0A2B32"
                stroke={focusStage === 'aza' ? '#F9FF00' : '#38bdf8'}
                strokeWidth={focusStage === 'aza' ? '2' : '1'}
              />
              <text x="62" y={yTopBase + hAza / 2 + 3} textAnchor="middle" fontSize="9.5" fontFamily="monospace" fontWeight="700" fill="#e2e8f0">
                100 %
              </text>
            </g>

            {/* Stage 2 Node: Gebundenes Obligo */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedStage('obligo')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedStage('obligo')}
              onMouseEnter={() => setHoveredStage('obligo')}
              onMouseLeave={() => setHoveredStage(null)}
              className="cursor-pointer outline-none"
            >
              <text x="268" y="20" fontSize="9.5" fontFamily="monospace" fontWeight="700" fill="#67e8f9">
                2. OBLIGO
              </text>
              <text x="268" y="33" fontSize="11" fontFamily="monospace" fontWeight="700" fill="#ffffff">
                {formatEuro(stage2GebundenesObligo, 0)}
              </text>
              <rect
                x="268"
                y={yTopBase}
                width="68"
                height={hObligo}
                rx="4"
                fill="#0284c7"
                stroke={focusStage === 'obligo' ? '#F9FF00' : '#67e8f9'}
                strokeWidth={focusStage === 'obligo' ? '2' : '1'}
              />
              <text x="302" y={yTopBase + hObligo / 2 + 3} textAnchor="middle" fontSize="9" fontFamily="monospace" fontWeight="700" fill="#ffffff">
                {((stage2GebundenesObligo / base) * 100).toFixed(0)} %
              </text>
            </g>

            {/* Stage 3 Node: Belegtes Ist (90% Bund + 10% Eigenanteil) */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedStage('ist')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedStage('ist')}
              onMouseEnter={() => setHoveredStage('ist')}
              onMouseLeave={() => setHoveredStage(null)}
              className="cursor-pointer outline-none"
            >
              <text x="508" y="20" fontSize="9.5" fontFamily="monospace" fontWeight="700" fill="#bae6fd">
                3. BELEGTES IST
              </text>
              <text x="508" y="33" fontSize="11" fontFamily="monospace" fontWeight="700" fill="#ffffff">
                {formatEuro(stage3BelegtesIst, 0)}
              </text>
              <rect
                x="508"
                y={yTopBase}
                width="68"
                height={hIstBund90}
                rx="3"
                fill="#00B4D8"
                stroke={focusStage === 'ist' ? '#F9FF00' : '#bae6fd'}
                strokeWidth={focusStage === 'ist' ? '1.8' : '0.9'}
              />
              <rect
                x="508"
                y={yTopBase + hIstBund90}
                width="68"
                height={hIstEigen10}
                rx="2"
                fill="#BA8B68"
                stroke={focusStage === 'ist' ? '#F9FF00' : '#e2c2a8'}
                strokeWidth="0.9"
              />
              <text x="542" y={yTopBase + hIstBund90 / 2 + 3} textAnchor="middle" fontSize="9" fontFamily="monospace" fontWeight="700" fill="#041422">
                {((stage3BelegtesIst / base) * 100).toFixed(0)} %
              </text>
            </g>

            {/* Stage 4 Node: Abgerufene BAFA-Mittel (ZA) */}
            <g
              role="button"
              tabIndex={0}
              onClick={() => setSelectedStage('za')}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedStage('za')}
              onMouseEnter={() => setHoveredStage('za')}
              onMouseLeave={() => setHoveredStage(null)}
              className="cursor-pointer outline-none"
            >
              <text x="748" y="20" fontSize="9.5" fontFamily="monospace" fontWeight="700" fill="#6ee7b7">
                4. ZA-ABRUF (BUND)
              </text>
              <text x="748" y="33" fontSize="11" fontFamily="monospace" fontWeight="700" fill="#ffffff">
                {formatEuro(stage4LiquideBundesmittel, 0)}
              </text>
              <rect
                x="748"
                y={yTopBase}
                width="68"
                height={hZa}
                rx="4"
                fill="#10B981"
                stroke={focusStage === 'za' ? '#F9FF00' : '#a7f3d0'}
                strokeWidth={focusStage === 'za' ? '2' : '1'}
              />
              <text x="782" y={yTopBase + hZa / 2 + 3} textAnchor="middle" fontSize="9" fontFamily="monospace" fontWeight="700" fill="#041422">
                {((stage4LiquideBundesmittel / base) * 100).toFixed(0)} %
              </text>
            </g>
          </svg>

          {/* Interactive Stage Inspector Strip inside dark Sankey frame */}
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-[#00B4D8] uppercase font-bold">
                <span>{activeMeta.step}</span>
                <span aria-hidden="true">&middot;</span>
                <span className="text-zinc-300 tabular-nums">
                  {activeMeta.conversionPct.toFixed(1)} % des AZA-Budgets
                </span>
              </div>
              <div className="font-bold text-white">
                {activeMeta.title}: <span className="font-mono text-zs-signal-gelb tabular-nums">{formatEuro(activeMeta.amount, 2)}</span>
              </div>
              <p className="text-[11px] text-zinc-300">{activeMeta.note}</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateDetail(activeMeta.targetPage, activeMeta.filters)}
              className="px-3.5 py-2 rounded-lg bg-[#00B4D8] text-[#041422] font-bold text-xs hover:bg-[#38bdf8] transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 self-start md:self-center"
            >
              <span>{activeMeta.ctaLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Clickable Stage Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-stretch">
          {(
            [
              { id: 'aza', meta: stageMeta.aza, accentBorder: 'border-[#0A2B32]', barColor: 'bg-[#0A2B32]' },
              { id: 'obligo', meta: stageMeta.obligo, accentBorder: 'border-[#00B4D8]', barColor: 'bg-[#00B4D8]' },
              { id: 'ist', meta: stageMeta.ist, accentBorder: 'border-[#BA8B68]', barColor: 'bg-[#BA8B68]' },
              { id: 'za', meta: stageMeta.za, accentBorder: 'border-[#10B981]', barColor: 'bg-[#10B981]' },
            ] as { id: PipelineStageId; meta: typeof stageMeta.aza; accentBorder: string; barColor: string }[]
          ).map(({ id, meta, accentBorder, barColor }) => {
            const isSelected = focusStage === id;
            const barWidth = Math.max(6, Math.min(100, meta.conversionPct));
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedStage(id)}
                className={`text-left rounded-xl border p-3.5 flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? `${accentBorder} bg-zinc-50`
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase text-zinc-500">
                    {meta.step}
                  </div>
                  <div className="font-display font-bold text-sm text-zs-blau-schwarz mt-0.5">
                    {meta.title}
                  </div>
                  <div className="font-mono text-lg font-bold text-zs-blau-schwarz tabular-nums mt-1.5">
                    {formatEuro(meta.amount, 2)}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{meta.subtitle}</p>
                </div>
                <div className="mt-3 w-full h-1.5 rounded-full bg-zinc-200 overflow-hidden">
                  <div className={`h-full ${barColor}`} style={{ width: `${barWidth}%` }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* profi-online Silos Breakdown (0812–0843) */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 mb-2.5">
            <span className="font-bold uppercase text-zs-deep-teal">
              Silo-Durchfluss je profi-online Position (0812–0843)
            </span>
            <span>Plan &rarr; Obligo &rarr; Ist</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {positionBreakdown.map((pos) => {
              const hasStau = pos.stau > 1;
              const pct = pos.azaPlan > 0 ? Math.min(100, (pos.ist / pos.azaPlan) * 100) : 0;
              return (
                <button
                  key={pos.code}
                  type="button"
                  onClick={() =>
                    onNavigateDetail(
                      pos.code === '0812' || pos.code === '0817' || pos.code === '0820'
                        ? 'personal'
                        : 'rechnungen',
                      {
                        rechnungenProfiPos:
                          pos.code === '0831' || pos.code === '0835' || pos.code === '0843'
                            ? pos.code
                            : '',
                      }
                    )
                  }
                  className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                    hasStau
                      ? 'bg-amber-50/90 border-amber-300 hover:border-amber-500'
                      : 'bg-white border-zinc-200 hover:border-[#0A2B32]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <strong className="text-zs-blau-schwarz">{pos.displayCode}</strong>
                    <span className={hasStau ? 'text-amber-700 font-bold' : 'text-[#10B981] font-bold'}>
                      {pct.toFixed(0)} %
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-zinc-700 truncate mt-0.5">
                    {pos.label}
                  </div>
                  <div className="mt-1.5 w-full h-1.5 rounded-full bg-zinc-200 overflow-hidden">
                    <div
                      className={`h-full ${hasStau ? 'bg-amber-500' : 'bg-[#00B4D8]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 mt-1 tabular-nums">
                    {hasStau ? `Stau: ${formatEuro(pos.stau, 0)}` : `Ist: ${formatEuro(pos.ist, 0)}`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
