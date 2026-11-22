import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { UseCase, Vergabe, OekoprofitCheckup } from '../types';
import { computeTransformationIndex, formatEuro } from '../utils';
import {
  DuerenTopographyLayer,
  IsometricStartupBeacon,
  IsometricUseCaseLandmark,
} from './MapBuildings25D';
import { ArrowRight, MapPin, CheckCircle2, Layers } from 'lucide-react';

export interface HexTransformationMapProps {
  usecases: UseCase[];
  vergaben?: Vergabe[];
  oekoprofitCheckups?: OekoprofitCheckup[];
  setSelectedUseCaseId?: (useCaseId: number | null) => void;
  onSelectUseCase?: (useCaseId: number) => void;
  onUpdateUseCase?: (id: number, patch: Partial<UseCase>) => void;
  showProgress?: boolean; // Ausbau-Fortschritt (nur in Projekt-Steuerung)
}

export type HexPilotStage = 'vorbereitung' | 'pilotbetrieb' | 'abgeschlossen';

interface HexCoord {
  x: number;
  y: number;
  ort: string;
  startupOffset: { dx: number; dy: number };
}

// 11 regional coordinates along Kreis Düren / Rur-Korridor (740 x 450 canvas)
const DUEREN_HEX_COORDS: HexCoord[] = [
  { x: 195, y: 155, ort: 'Düren-Mariaweiler', startupOffset: { dx: -68, dy: -36 } }, // 1. GKD Group
  { x: 345, y: 155, ort: 'Düren-Nord', startupOffset: { dx: 64, dy: -38 } }, // 2. Sihl GmbH
  { x: 295, y: 245, ort: 'Düren-Zentrum (WIN.DN)', startupOffset: { dx: -66, dy: 38 } }, // 3. Leitungspartner
  { x: 155, y: 245, ort: 'Düren-West', startupOffset: { dx: -64, dy: 34 } }, // 4. Heimbach
  { x: 445, y: 225, ort: 'Düren-Lendersdorf', startupOffset: { dx: 66, dy: 32 } }, // 5. Schoellershammer
  { x: 480, y: 130, ort: 'Düren-Arnoldsweiler', startupOffset: { dx: 64, dy: -32 } }, // 6. Kanzan
  { x: 135, y: 345, ort: 'Kreuzau (Rur-Süd)', startupOffset: { dx: 66, dy: 34 } }, // 7. Metsä Tissue
  { x: 315, y: 350, ort: 'Düren-Süd', startupOffset: { dx: 68, dy: 32 } }, // 8. Carl Krafft
  { x: 475, y: 325, ort: 'Düren-Niederau', startupOffset: { dx: 68, dy: 34 } }, // 9. Neenah Gessner
  { x: 590, y: 95, ort: 'Industriepark Rütgers', startupOffset: { dx: -68, dy: -26 } }, // 10. AkzoNobel
  { x: 615, y: 205, ort: 'Jülich / Rur-Korridor', startupOffset: { dx: 62, dy: -36 } }, // 11. Mondi / Kanzan
];

function mapUseCaseToCoord(uc: UseCase, idx: number): HexCoord {
  const txt = `${uc.unternehmen} ${uc.titel}`.toLowerCase();
  if (txt.includes('gkd')) return DUEREN_HEX_COORDS[0];
  if (txt.includes('sihl')) return DUEREN_HEX_COORDS[1];
  if (txt.includes('leitungspartner')) return DUEREN_HEX_COORDS[2];
  if (txt.includes('heimbach')) return DUEREN_HEX_COORDS[3];
  if (txt.includes('schoellershammer')) return DUEREN_HEX_COORDS[4];
  if (txt.includes('kanzan') && !txt.includes('mondi')) return DUEREN_HEX_COORDS[5];
  if (txt.includes('metsä') || txt.includes('metsa') || txt.includes('kreuzau')) return DUEREN_HEX_COORDS[6];
  if (txt.includes('krafft')) return DUEREN_HEX_COORDS[7];
  if (txt.includes('neenah') || txt.includes('gessner')) return DUEREN_HEX_COORDS[8];
  if (txt.includes('akzo') || txt.includes('rütgers')) return DUEREN_HEX_COORDS[9];
  if (txt.includes('mondi')) return DUEREN_HEX_COORDS[10];

  const base = DUEREN_HEX_COORDS[idx % DUEREN_HEX_COORDS.length];
  const ring = Math.floor(idx / DUEREN_HEX_COORDS.length);
  return {
    x: base.x + ring * 38,
    y: base.y - ring * 26,
    ort: 'Kreis Düren',
    startupOffset: base.startupOffset,
  };
}

/**
 * Classifies each UseCase based on `reifegrad` or `status`:
 * - Mint: 'abgeschlossen' (or reifegrad 'Produktiv' / 'Skalierung')
 * - Cyan: 'Pilotbetrieb' (or status 'aktiv')
 * - Grey: 'in Vorbereitung' / 'Pipeline' / 'Idee' / 'Konzept' / 'Prototyp'
 */
export function getHexTileStage(uc: UseCase): HexPilotStage {
  const statusLower = String(uc.status || '').toLowerCase().trim();
  const reifeLower = String(uc.reifegrad || '').toLowerCase().trim();

  if (
    statusLower === 'abgeschlossen' ||
    reifeLower === 'abgeschlossen' ||
    reifeLower === 'produktiv' ||
    reifeLower === 'skalierung'
  ) {
    return 'abgeschlossen';
  }

  if (reifeLower === 'pilotbetrieb' || statusLower === 'pilotbetrieb' || statusLower === 'aktiv') {
    return 'pilotbetrieb';
  }

  return 'vorbereitung';
}

const STAGE_STYLE: Record<
  HexPilotStage,
  {
    label: string;
    shortLabel: string;
    topFill: string;
    innerPadFill: string;
    leftFace: string;
    rightFace: string;
    stroke: string;
    rimHighlight: string;
    badgeText: string;
    accentHex: string;
    tailwindTopClass: string;
    depth: number;
    liftY: number;
  }
> = {
  vorbereitung: {
    label: 'in Vorbereitung',
    shortLabel: 'in Vorbereitung',
    topFill: 'url(#hexPrepSlate)',
    innerPadFill: 'url(#blueprintHatch)',
    leftFace: '#334155',
    rightFace: '#1e293b',
    stroke: '#64748b',
    rimHighlight: '#94a3b8',
    badgeText: 'text-slate-600',
    accentHex: '#64748b',
    tailwindTopClass: 'fill-slate-600 stroke-slate-400',
    depth: 7,
    liftY: 0,
  },
  pilotbetrieb: {
    label: 'Pilotbetrieb',
    shortLabel: 'Pilotbetrieb',
    topFill: 'url(#hexPilotCyan)',
    innerPadFill: '#0e7490',
    leftFace: '#0284c7',
    rightFace: '#075985',
    stroke: '#67e8f9',
    rimHighlight: '#cffafe',
    badgeText: 'text-[#0284c7]',
    accentHex: '#00B4D8',
    tailwindTopClass: 'fill-[#00B4D8] stroke-cyan-300',
    depth: 13,
    liftY: -5,
  },
  abgeschlossen: {
    label: 'Abgeschlossen',
    shortLabel: 'abgeschlossen',
    topFill: 'url(#hexCompletedMint)',
    innerPadFill: '#047857',
    leftFace: '#059669',
    rightFace: '#065f46',
    stroke: '#a7f3d0',
    rimHighlight: '#ecfdf5',
    badgeText: 'text-[#10B981]',
    accentHex: '#10B981',
    tailwindTopClass: 'fill-[#10B981] stroke-emerald-200',
    depth: 19,
    liftY: -10,
  },
};

function isoHexTopPoints(cx: number, cy: number, rx = 35, ry = 19.5): string {
  const pts = [
    [cx, cy - ry],
    [cx + rx, cy - ry * 0.48],
    [cx + rx, cy + ry * 0.48],
    [cx, cy + ry],
    [cx - rx, cy + ry * 0.48],
    [cx - rx, cy - ry * 0.48],
  ];
  return pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
}

function isoHexExtrusionPaths(cx: number, cy: number, rx = 35, ry = 19.5, depth = 12) {
  const p1 = [cx + rx, cy - ry * 0.48];
  const p2 = [cx + rx, cy + ry * 0.48];
  const p3 = [cx, cy + ry];
  const p4 = [cx - rx, cy + ry * 0.48];
  const p5 = [cx - rx, cy - ry * 0.48];
  const rightUpper = `${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p2[0]},${p2[1] + depth} ${p1[0]},${p1[1] + depth}`;
  const rightFront = `${p2[0]},${p2[1]} ${p3[0]},${p3[1]} ${p3[0]},${p3[1] + depth} ${p2[0]},${p2[1] + depth}`;
  const leftFront = `${p4[0]},${p4[1]} ${p3[0]},${p3[1]} ${p3[0]},${p3[1] + depth} ${p4[0]},${p4[1] + depth}`;
  const leftUpper = `${p5[0]},${p5[1]} ${p4[0]},${p4[1]} ${p4[0]},${p4[1] + depth} ${p5[0]},${p5[1] + depth}`;
  return { rightUpper, rightFront, leftFront, leftUpper };
}

export default function HexTransformationMap({
  usecases,
  vergaben = [],
  oekoprofitCheckups = [],
  setSelectedUseCaseId,
  onSelectUseCase,
  onUpdateUseCase,
  showProgress = false,
}: HexTransformationMapProps) {
  const [previewId, setPreviewId] = useState<number>(() => usecases[0]?.id || 1);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [stageFilter, setStageFilter] = useState<'all' | HexPilotStage>('all');

  const indexMetrics = useMemo(
    () => computeTransformationIndex({ usecases, vergaben, oekoprofitCheckups }),
    [usecases, vergaben, oekoprofitCheckups]
  );

  const mappedTiles = useMemo(
    () =>
      usecases
        .map((uc, idx) => {
          const coord = mapUseCaseToCoord(uc, idx);
          const stage = getHexTileStage(uc);
          const linkedVergabe = vergaben.find((v) => v.useCaseId === uc.id) || null;
          return { uc, coord, stage, linkedVergabe };
        })
        // Back-to-front painter's sort so southern 2.5D structures cleanly overlap northern tiles
        .sort((a, b) => a.coord.y - b.coord.y),
    [usecases, vergaben]
  );

  const counts = useMemo(
    () => ({
      vorbereitung: mappedTiles.filter((t) => t.stage === 'vorbereitung').length,
      pilotbetrieb: mappedTiles.filter((t) => t.stage === 'pilotbetrieb').length,
      abgeschlossen: mappedTiles.filter((t) => t.stage === 'abgeschlossen').length,
    }),
    [mappedTiles]
  );

  // Ausbau-Fortschritt: Vorbereitung 0 %, Pilotbetrieb 50 %, abgeschlossen 100 % je Kachel
  const buildProgress = useMemo(() => {
    const total = mappedTiles.length;
    const pct =
      total === 0 ? 0 : Math.round(((counts.pilotbetrieb * 0.5 + counts.abgeschlossen) / total) * 100);
    const next = mappedTiles
      .filter((t) => t.stage !== 'abgeschlossen' && t.uc.deadline)
      .sort((a, b) => a.uc.deadline.localeCompare(b.uc.deadline))[0];
    return { total, pct, next: next ?? null };
  }, [mappedTiles, counts]);

  const activePreview = useMemo(() => {
    const targetId = hoveredId ?? previewId;
    return mappedTiles.find((t) => t.uc.id === targetId) || mappedTiles[0] || null;
  }, [mappedTiles, hoveredId, previewId]);

  const handleTileClick = (uc: UseCase) => {
    setPreviewId(uc.id);
    if (setSelectedUseCaseId) {
      setSelectedUseCaseId(uc.id);
    } else {
      onSelectUseCase?.(uc.id);
    }
  };

  const handleStageUpdate = (uc: UseCase, target: HexPilotStage) => {
    if (!onUpdateUseCase) return;
    if (target === 'vorbereitung') {
      onUpdateUseCase(uc.id, { status: 'in Vorbereitung', reifegrad: 'Konzept' });
    } else if (target === 'pilotbetrieb') {
      onUpdateUseCase(uc.id, { status: 'aktiv', reifegrad: 'Pilotbetrieb' });
    } else {
      onUpdateUseCase(uc.id, { status: 'abgeschlossen', reifegrad: 'Produktiv' });
    }
  };

  return (
    <section className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      {/* Header strip with Regional Transformation Index */}
      <div className="px-5 py-4 border-b border-zinc-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-base text-zs-blau-schwarz">
            Dürener Transformations-Karte (Rur-Korridor)
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Interaktive 2.5D-Hex-Topologie der {usecases.length} Pilotprojekte &middot; Kachel anklicken für Use-Case-Details
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono tabular-nums">
          <div>
            <span className="text-zinc-400">Transformations-Index: </span>
            <strong className="text-zs-blau-schwarz">{indexMetrics.score}</strong>
            <span className="text-zinc-400"> / 1.000</span>
          </div>
          <span className="text-zinc-300" aria-hidden="true">&middot;</span>
          <div>
            <span className="text-zinc-400">Booster: </span>
            <strong className="text-[#10B981]">{indexMetrics.boosterCount} / {indexMetrics.boosterMax}</strong>
          </div>
          <span className="text-zinc-300" aria-hidden="true">&middot;</span>
          <div>
            <span className="text-zinc-400">Ökoprofit: </span>
            <strong className="text-[#00B4D8]">{indexMetrics.oekoCount} / {indexMetrics.oekoMax}</strong>
          </div>
          <span className="text-zinc-300" aria-hidden="true">&middot;</span>
          <div className="text-zinc-500">
            Restlaufzeit: <strong className="text-zs-blau-schwarz">{indexMetrics.daysToProjectEnd} d</strong>
          </div>
        </div>
      </div>

      {showProgress && buildProgress.total > 0 && (
        <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/60 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <span className="font-bold text-zs-blau-schwarz">Ausbau-Fortschritt der Karte: {buildProgress.pct} %</span>
            <span className="text-zinc-500">
              {counts.abgeschlossen} fertig &middot; {counts.pilotbetrieb} im Pilot &middot; {counts.vorbereitung} in Vorbereitung
            </span>
          </div>
          <div
            className="flex w-full h-2 rounded-full overflow-hidden bg-zinc-200"
            role="img"
            aria-label={`${counts.abgeschlossen} von ${buildProgress.total} Kacheln abgeschlossen, ${counts.pilotbetrieb} im Pilotbetrieb`}
          >
            <div className="bg-[#10B981]" style={{ width: `${(counts.abgeschlossen / buildProgress.total) * 100}%` }} />
            <div className="bg-[#00B4D8]" style={{ width: `${(counts.pilotbetrieb / buildProgress.total) * 100}%` }} />
          </div>
          {buildProgress.next && (
            <p className="text-[10px] text-zinc-500">
              Nächster Ausbauschritt: <strong>{buildProgress.next.uc.titel}</strong> (Frist{' '}
              {new Date(buildProgress.next.uc.deadline + 'T12:00:00').toLocaleDateString('de-DE')}) &rarr; Kachel anklicken
            </p>
          )}
        </div>
      )}

      {/* Main 2-column split: 2.5D Isometric Hex Map + Inspector / Quick Drilldown */}
      <div className="grid grid-cols-1 xl:grid-cols-12">
        {/* Left: 2.5D Hex Map */}
        <div className="xl:col-span-7 bg-[#f8fafc] p-4 border-b xl:border-b-0 xl:border-r border-zinc-100 flex flex-col justify-between">
          {/* Status filter bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="inline-flex flex-wrap items-center gap-1 bg-white p-1 rounded-lg border border-zinc-200 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setStageFilter('all')}
                className={`px-2.5 py-1 rounded font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  stageFilter === 'all'
                    ? 'bg-zs-blau-schwarz text-white'
                    : 'text-zinc-600 hover:text-zs-blau-schwarz'
                }`}
              >
                Alle ({usecases.length})
              </button>
              <button
                type="button"
                onClick={() => setStageFilter('vorbereitung')}
                className={`px-2.5 py-1 rounded font-semibold cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  stageFilter === 'vorbereitung'
                    ? 'bg-slate-600 text-white'
                    : 'text-zinc-600 hover:text-zs-blau-schwarz'
                }`}
              >
                <span className="w-2 h-2 rounded-xs bg-[#475569] inline-block" />
                in Vorbereitung ({counts.vorbereitung})
              </button>
              <button
                type="button"
                onClick={() => setStageFilter('pilotbetrieb')}
                className={`px-2.5 py-1 rounded font-semibold cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  stageFilter === 'pilotbetrieb'
                    ? 'bg-[#00B4D8] text-[#041422]'
                    : 'text-zinc-600 hover:text-zs-blau-schwarz'
                }`}
              >
                <span className="w-2 h-2 rounded-xs bg-[#00B4D8] inline-block" />
                Pilotbetrieb ({counts.pilotbetrieb})
              </button>
              <button
                type="button"
                onClick={() => setStageFilter('abgeschlossen')}
                className={`px-2.5 py-1 rounded font-semibold cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  stageFilter === 'abgeschlossen'
                    ? 'bg-[#10B981] text-[#041422]'
                    : 'text-zinc-600 hover:text-zs-blau-schwarz'
                }`}
              >
                <span className="w-2 h-2 rounded-xs bg-[#10B981] inline-block" />
                abgeschlossen ({counts.abgeschlossen})
              </button>
            </div>
          </div>

          <div className="w-full overflow-hidden rounded-lg border border-zinc-200/80 bg-[#041422] relative">
            <svg
              viewBox="0 0 740 450"
              className="w-full h-auto block select-none"
              role="img"
              aria-label="Isometrische 2.5D Hex-Tile Transformations-Karte der Region Düren"
            >
              <defs>
                {/* Radial atmospheric depth for terrain */}
                <radialGradient id="mapAtmosphere" cx="50%" cy="48%" r="65%">
                  <stop offset="0%" stopColor="#0a2842" />
                  <stop offset="65%" stopColor="#041422" />
                  <stop offset="100%" stopColor="#020b14" />
                </radialGradient>

                <linearGradient id="rurKorridorGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.65" />
                  <stop offset="50%" stopColor="#00B4D8" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.7" />
                </linearGradient>

                {/* Grey: in Vorbereitung */}
                <linearGradient id="hexPrepSlate" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>

                {/* Cyan: Pilotbetrieb */}
                <linearGradient id="hexPilotCyan" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#00B4D8" />
                  <stop offset="100%" stopColor="#0891b2" />
                </linearGradient>

                {/* Mint: abgeschlossen */}
                <linearGradient id="hexCompletedMint" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6ee7b7" />
                  <stop offset="50%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>

                {/* Architectural blueprint hatching for planning sites */}
                <pattern
                  id="blueprintHatch"
                  width="6"
                  height="6"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(30)"
                >
                  <rect width="6" height="6" fill="#1e293b" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#475569" strokeWidth="1" />
                </pattern>
              </defs>

              {/* Topographical Düren / Rur-Korridor Base Layer */}
              <DuerenTopographyLayer />

              {/* 11 Interactive 2.5D Hex Tiles (back-to-front sorted) */}
              {mappedTiles.map(({ uc, coord, stage }) => {
                const isActive = activePreview?.uc.id === uc.id;
                const isHovered = hoveredId === uc.id;
                const isDimmed = stageFilter !== 'all' && stage !== stageFilter;
                const style = STAGE_STYLE[stage];
                const cy = coord.y + style.liftY;
                const cx = coord.x;
                const sx = cx + coord.startupOffset.dx;
                const sy = cy + coord.startupOffset.dy;
                const { rightFront, leftFront } = isoHexExtrusionPaths(
                  cx,
                  cy,
                  35,
                  19.5,
                  style.depth
                );

                // Curved isometric conduit control point between plant and startup beacon
                const mx = (cx + sx) / 2;
                const my = Math.min(cy, sy) - 12;
                const shortCompany = uc.unternehmen.split(' ')[0].replace(',', '');
                const labelWidth = Math.max(46, shortCompany.length * 5.6 + 14);

                return (
                  <g
                    key={uc.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${uc.unternehmen}: ${uc.titel} (${style.shortLabel}) – Details öffnen`}
                    onClick={() => handleTileClick(uc)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTileClick(uc);
                      }
                    }}
                    onMouseEnter={() => {
                      setHoveredId(uc.id);
                      setPreviewId(uc.id);
                    }}
                    onMouseLeave={() => setHoveredId((prev) => (prev === uc.id ? null : prev))}
                    className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-zs-signal-gelb"
                    style={{ opacity: isDimmed ? 0.22 : 1, transition: 'opacity 180ms ease' }}
                  >
                    {/* Startup / Lösungspartner Conduit & 3D Isometric Beacon */}
                    {stage !== 'vorbereitung' && (
                      <g>
                        {/* Ambient conduit glow */}
                        <path
                          d={`M ${cx} ${cy} Q ${mx} ${my} ${sx} ${sy}`}
                          fill="none"
                          stroke={style.accentHex}
                          strokeWidth={isHovered || isActive ? '4.5' : '3'}
                          opacity={isHovered || isActive ? 0.3 : 0.14}
                        />
                        {/* Crisp dashed isometric link */}
                        <path
                          d={`M ${cx} ${cy} Q ${mx} ${my} ${sx} ${sy}`}
                          fill="none"
                          stroke={stage === 'abgeschlossen' ? '#6ee7b7' : '#67e8f9'}
                          strokeWidth={isHovered || isActive ? '1.8' : '1.2'}
                          strokeDasharray="4 3"
                          opacity={isHovered || isActive ? 1 : 0.85}
                        />
                        <IsometricStartupBeacon
                          sx={sx}
                          sy={sy}
                          stage={stage}
                          highlighted={isHovered || isActive}
                          label={uc.startupPartner || uc.loesung || ''}
                        />
                      </g>
                    )}

                    {/* Isometric 2.5D Hex Tile + Architectural Landmark */}
                    <motion.g
                      initial={false}
                      animate={{ y: isHovered ? -5 : isActive ? -3 : 0 }}
                      transition={{ duration: 0.16 }}
                    >
                      {/* Offset sun-vector cast ground shadow */}
                      <polygon
                        points={isoHexTopPoints(cx + 3, coord.y + style.depth + 5, 34, 18.5)}
                        fill="#01060d"
                        opacity={isHovered || isActive ? 0.58 : 0.4}
                      />

                      {/* Active/Hover Outer Selection Halo */}
                      {(isHovered || isActive) && (
                        <polygon
                          points={isoHexTopPoints(cx, cy, 38.5, 21.5)}
                          fill="none"
                          stroke="#F9FF00"
                          strokeWidth="1.2"
                          strokeDasharray={isHovered ? undefined : '4 2'}
                          opacity="0.9"
                        />
                      )}

                      {/* Left & Right 2.5D Extrusion Faces */}
                      <polygon
                        points={leftFront}
                        fill={style.leftFace}
                        stroke={isHovered || isActive ? '#F9FF00' : '#09192b'}
                        strokeWidth={isHovered || isActive ? '1.1' : '0.8'}
                        strokeLinejoin="round"
                      />
                      <polygon
                        points={rightFront}
                        fill={style.rightFace}
                        stroke={isHovered || isActive ? '#F9FF00' : '#09192b'}
                        strokeWidth={isHovered || isActive ? '1.1' : '0.8'}
                        strokeLinejoin="round"
                      />

                      {/* Outer Beveled Top Hex Surface */}
                      <polygon
                        points={isoHexTopPoints(cx, cy, 35, 19.5)}
                        className={`transition-all duration-150 ${style.tailwindTopClass}`}
                        fill={style.topFill}
                        stroke={isHovered || isActive ? '#F9FF00' : style.stroke}
                        strokeWidth={isHovered ? '2.1' : isActive ? '1.8' : '1.1'}
                        strokeDasharray={stage === 'vorbereitung' && !isHovered && !isActive ? '4 2' : undefined}
                        strokeLinejoin="round"
                      />

                      {/* Inner Recessed Platform Pad */}
                      <polygon
                        points={isoHexTopPoints(cx, cy, 28, 15.2)}
                        fill={style.innerPadFill}
                        fillOpacity={stage === 'vorbereitung' ? 0.9 : 0.35}
                        stroke={style.rimHighlight}
                        strokeWidth="0.6"
                        strokeOpacity={stage === 'vorbereitung' ? 0.45 : 0.65}
                      />

                      {/* Sector-specific 2.5D Isometric Architectural Building */}
                      <IsometricUseCaseLandmark cx={cx} cy={cy - 1} uc={uc} stage={stage} />

                      {/* Crisp Architectural Label Plate beneath tile */}
                      <g transform={`translate(${cx}, ${cy + style.depth + 14})`}>
                        <rect
                          x={-labelWidth / 2}
                          y="-7.5"
                          width={labelWidth}
                          height="13.5"
                          rx="2.5"
                          fill="#041422"
                          fillOpacity="0.9"
                          stroke={isHovered || isActive ? '#F9FF00' : style.accentHex}
                          strokeWidth={isHovered || isActive ? '1.1' : '0.7'}
                        />
                        {/* Stage indicator tick on left edge of label plate */}
                        <rect
                          x={-labelWidth / 2}
                          y="-7.5"
                          width="3"
                          height="13.5"
                          rx="1"
                          fill={style.accentHex}
                        />
                        <text
                          x="1.5"
                          y="1.5"
                          textAnchor="middle"
                          fontSize="8.2"
                          fontFamily="sans-serif"
                          fontWeight={isHovered || isActive ? '700' : '600'}
                          fill={isHovered || isActive ? '#F9FF00' : '#f1f5f9'}
                        >
                          {shortCompany}
                        </text>
                      </g>
                    </motion.g>
                  </g>
                );
              })}
            </svg>

            {/* Floating Hover Tooltip HUD (top-right, clear of compass rose & scale bar) */}
            {hoveredId && activePreview && (
              <div className="absolute top-3 right-3 left-3 sm:left-auto sm:w-72 bg-[#041422]/95 border border-white/15 rounded-lg px-3.5 py-2.5 text-white pointer-events-none shadow-lg">
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                  <span className="text-zinc-300 truncate">{activePreview.coord.ort}</span>
                  <span
                    className={`font-bold shrink-0 ${
                      activePreview.stage === 'abgeschlossen'
                        ? 'text-[#10B981]'
                        : activePreview.stage === 'pilotbetrieb'
                        ? 'text-[#00B4D8]'
                        : 'text-zinc-300'
                    }`}
                  >
                    {STAGE_STYLE[activePreview.stage].shortLabel}
                  </span>
                </div>
                <div className="text-xs font-bold truncate mt-0.5">{activePreview.uc.titel}</div>
                <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                  {activePreview.uc.unternehmen} &times; {activePreview.uc.startupPartner || activePreview.uc.loesung}
                </div>
                <div className="text-[10px] font-mono text-zs-signal-gelb mt-1.5">
                  Klicken für Detail-Drilldown &rarr;
                </div>
              </div>
            )}
          </div>

          {/* Color Legend */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-600">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#475569] border border-dashed border-slate-400 inline-block" />
                Grau: in Vorbereitung ({counts.vorbereitung})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#00B4D8] inline-block" />
                Cyan: Pilotbetrieb ({counts.pilotbetrieb})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#10B981] inline-block" />
                Mint: abgeschlossen ({counts.abgeschlossen})
              </span>
            </div>
            <span className="text-zinc-400">Kachel anklicken = Detailansicht</span>
          </div>
        </div>

        {/* Right: Active Tile Inspector & Quick Drilldown */}
        <div className="xl:col-span-5 p-5 flex flex-col justify-between space-y-4">
          {activePreview ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#58B49D]" />
                    {activePreview.coord.ort}
                  </span>
                  <span>
                    {activePreview.uc.batch} &middot; {activePreview.uc.branche}
                  </span>
                </div>

                <div>
                  <h3 className="font-display font-bold text-base text-zs-blau-schwarz leading-snug">
                    {activePreview.uc.titel}
                  </h3>
                  <div className="text-xs text-zinc-600 mt-1 font-medium">
                    {activePreview.uc.unternehmen}{' '}
                    <span className="text-zinc-400">&times;</span>{' '}
                    <span className="text-[#041422] font-semibold">
                      {activePreview.uc.startupPartner || activePreview.uc.loesung || 'Lösungspartner in Anbahnung'}
                    </span>
                  </div>
                </div>

                {/* Status / Reifegrad Selector */}
                <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-zinc-500 uppercase font-bold">
                      Reifegrad / Status
                    </span>
                    <span className={`font-mono font-bold text-xs ${STAGE_STYLE[activePreview.stage].badgeText}`}>
                      {activePreview.uc.reifegrad} &middot; {activePreview.uc.status}
                    </span>
                  </div>

                  {onUpdateUseCase ? (
                    <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                      <button
                        type="button"
                        onClick={() => handleStageUpdate(activePreview.uc, 'vorbereitung')}
                        className={`py-1.5 px-2 rounded font-bold border transition-colors cursor-pointer ${
                          activePreview.stage === 'vorbereitung'
                            ? 'bg-[#475569] text-white border-[#475569]'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-slate-400'
                        }`}
                      >
                        in Vorb.
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStageUpdate(activePreview.uc, 'pilotbetrieb')}
                        className={`py-1.5 px-2 rounded font-bold border transition-colors cursor-pointer ${
                          activePreview.stage === 'pilotbetrieb'
                            ? 'bg-[#00B4D8] text-[#041422] border-[#00B4D8]'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-[#00B4D8]'
                        }`}
                      >
                        Pilotbetrieb
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStageUpdate(activePreview.uc, 'abgeschlossen')}
                        className={`py-1.5 px-2 rounded font-bold border transition-colors cursor-pointer ${
                          activePreview.stage === 'abgeschlossen'
                            ? 'bg-[#10B981] text-[#041422] border-[#10B981]'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-[#10B981]'
                        }`}
                      >
                        abgeschl.
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5 h-1.5">
                      <div className="rounded-full bg-[#475569]" />
                      <div
                        className={`rounded-full ${
                          activePreview.stage !== 'vorbereitung' ? 'bg-[#00B4D8]' : 'bg-zinc-200'
                        }`}
                      />
                      <div
                        className={`rounded-full ${
                          activePreview.stage === 'abgeschlossen' ? 'bg-[#10B981]' : 'bg-zinc-200'
                        }`}
                      />
                    </div>
                  )}
                </div>

                {/* 6-Fields Extract */}
                <div className="space-y-2 text-xs text-zinc-600 leading-relaxed">
                  {activePreview.uc.problemstellung && (
                    <div>
                      <span className="font-mono text-[10px] uppercase font-bold text-zinc-400 block">
                        Problemstellung
                      </span>
                      <p className="line-clamp-2">{activePreview.uc.problemstellung}</p>
                    </div>
                  )}
                  {activePreview.uc.standortMehrwert && (
                    <div>
                      <span className="font-mono text-[10px] uppercase font-bold text-zinc-400 block">
                        Standort-Mehrwert Düren
                      </span>
                      <p className="line-clamp-2">{activePreview.uc.standortMehrwert}</p>
                    </div>
                  )}
                </div>

                {/* Linked Vergabe & Todos */}
                <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                  <div className="p-2.5 rounded-lg border border-zinc-200 bg-white">
                    <div className="text-[10px] font-mono text-zinc-400 uppercase">Booster-Vergabe (0835)</div>
                    <div className="font-mono font-bold text-zs-blau-schwarz mt-0.5 tabular-nums">
                      {activePreview.linkedVergabe
                        ? `${formatEuro(activePreview.linkedVergabe.auftragswert, 0)} (${
                            activePreview.linkedVergabe.bafaFreigabe ? 'Freigabe ✓' : 'Offen'
                          })`
                        : 'Noch nicht verknüpft'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-zinc-200 bg-white">
                    <div className="text-[10px] font-mono text-zinc-400 uppercase">Meilensteine</div>
                    <div className="font-mono font-bold text-zs-blau-schwarz mt-0.5 tabular-nums flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#58B49D]" />
                      {(activePreview.uc.todos || []).filter((t) => t.completed).length} /{' '}
                      {(activePreview.uc.todos || []).length} erledigt
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1 tabular-nums">
                  <Layers className="w-3.5 h-3.5" /> Erfolgswahrscheinlichkeit: {activePreview.uc.erfolgswahrscheinlichkeit} %
                </span>
                <button
                  type="button"
                  onClick={() => handleTileClick(activePreview.uc)}
                  className="px-3.5 py-2 rounded-lg bg-zs-blau-schwarz text-white text-xs font-bold hover:bg-[#08243d] transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Use-Case Details öffnen</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zs-signal-gelb" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-xs text-zinc-400 font-mono text-center py-12">
              Keine Use-Cases vorhanden.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
