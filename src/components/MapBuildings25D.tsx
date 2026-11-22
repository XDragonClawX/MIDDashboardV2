import React from 'react';
import { UseCase } from '../types';

export type MapBuildingKind =
  | 'paper-mill'
  | 'textile-hall'
  | 'battery-grid'
  | 'thermal-reactor'
  | 'robotics-bay';

export type MapVisualStage = 'vorbereitung' | 'pilotbetrieb' | 'abgeschlossen';

export function resolveBuildingKind(uc: UseCase): MapBuildingKind {
  const txt = `${uc.unternehmen} ${uc.titel} ${uc.thema}`.toLowerCase();
  if (txt.includes('batterie') || txt.includes('peak-shaving') || txt.includes('leitungspartner')) {
    return 'battery-grid';
  }
  if (txt.includes('abwärmespeicher') || txt.includes('kraftblock') || txt.includes('akzo') || txt.includes('wasserstoff')) {
    return 'thermal-reactor';
  }
  if (txt.includes('walzen') || txt.includes('krafft') || txt.includes('robot') || txt.includes('maschinenbau')) {
    return 'robotics-bay';
  }
  if (uc.branche === 'Textil' || txt.includes('gewebe') || txt.includes('vlies')) {
    return 'textile-hall';
  }
  return 'paper-mill';
}

interface StagePalette {
  wallLeft: string;
  wallRight: string;
  roofLight: string;
  roofMid: string;
  accent: string;
  windowFill: string;
  stroke: string;
  isBlueprint: boolean;
}

function getBuildingPalette(stage: MapVisualStage): StagePalette {
  if (stage === 'abgeschlossen') {
    return {
      wallLeft: '#d1fae5',
      wallRight: '#6ee7b7',
      roofLight: '#ecfdf5',
      roofMid: '#34d399',
      accent: '#10B981',
      windowFill: '#065f46',
      stroke: '#047857',
      isBlueprint: false,
    };
  }
  if (stage === 'pilotbetrieb') {
    return {
      wallLeft: '#cffafe',
      wallRight: '#67e8f9',
      roofLight: '#ecfeff',
      roofMid: '#22d3ee',
      accent: '#00B4D8',
      windowFill: '#0e7490',
      stroke: '#0369a1',
      isBlueprint: false,
    };
  }
  return {
    wallLeft: '#334155',
    wallRight: '#1e293b',
    roofLight: '#475569',
    roofMid: '#334155',
    accent: '#94a3b8',
    windowFill: '#64748b',
    stroke: '#94a3b8',
    isBlueprint: true,
  };
}

/**
 * Renders an isometric 3D box centered horizontally at (0,0) base.
 * dx = half-width along iso X, dy = half-width along iso Y, h = extrusion height.
 */
function IsoBox({
  ox = 0,
  oy = 0,
  w = 10,
  d = 7,
  h = 10,
  palette,
  dashed = false,
}: {
  ox?: number;
  oy?: number;
  w?: number;
  d?: number;
  h?: number;
  palette: StagePalette;
  dashed?: boolean;
}) {
  // Isometric axes projection:
  // right-down: (+w, +w*0.52)
  // left-down: (-d, +d*0.52)
  const wx = w;
  const wy = w * 0.52;
  const dx = d;
  const dy = d * 0.52;

  // Base bottom diamond corners (back, right, front, left)
  const bBack = [ox, oy - wy - dy];
  const bRight = [ox + wx, oy - dy + wy * 0]; // adjust symmetrically
  void bBack;
  void bRight;

  // Compute exact diamond from front-bottom vertex (ox, oy)
  const f = [ox, oy];
  const r = [ox + wx, oy - wy];
  const l = [ox - dx, oy - dy];
  const b = [ox + wx - dx, oy - wy - dy];

  const ft = [f[0], f[1] - h];
  const rt = [r[0], r[1] - h];
  const lt = [l[0], l[1] - h];
  const bt = [b[0], b[1] - h];

  const dashAttr = dashed ? '2.2 1.6' : undefined;
  const fillOpacity = palette.isBlueprint ? 0.35 : 0.96;

  return (
    <g>
      {/* Left face */}
      <polygon
        points={`${l[0]},${l[1]} ${f[0]},${f[1]} ${ft[0]},${ft[1]} ${lt[0]},${lt[1]}`}
        fill={palette.wallLeft}
        fillOpacity={fillOpacity}
        stroke={palette.stroke}
        strokeWidth="0.7"
        strokeDasharray={dashAttr}
        strokeLinejoin="round"
      />
      {/* Right face */}
      <polygon
        points={`${f[0]},${f[1]} ${r[0]},${r[1]} ${rt[0]},${rt[1]} ${ft[0]},${ft[1]}`}
        fill={palette.wallRight}
        fillOpacity={fillOpacity}
        stroke={palette.stroke}
        strokeWidth="0.7"
        strokeDasharray={dashAttr}
        strokeLinejoin="round"
      />
      {/* Top roof face */}
      <polygon
        points={`${bt[0]},${bt[1]} ${rt[0]},${rt[1]} ${ft[0]},${ft[1]} ${lt[0]},${lt[1]}`}
        fill={palette.roofLight}
        fillOpacity={palette.isBlueprint ? 0.25 : 0.98}
        stroke={palette.stroke}
        strokeWidth="0.7"
        strokeDasharray={dashAttr}
        strokeLinejoin="round"
      />
    </g>
  );
}

/**
 * Renders an isometric cylinder (reactor / paper silo / thermal tank)
 */
function IsoCylinder({
  ox = 0,
  oy = 0,
  rx = 4.2,
  ry = 2.4,
  h = 12,
  palette,
  dashed = false,
}: {
  ox?: number;
  oy?: number;
  rx?: number;
  ry?: number;
  h?: number;
  palette: StagePalette;
  dashed?: boolean;
}) {
  const dashAttr = dashed ? '2 1.5' : undefined;
  const opacity = palette.isBlueprint ? 0.35 : 0.96;
  return (
    <g>
      <path
        d={`M ${ox - rx} ${oy - h} L ${ox - rx} ${oy} A ${rx} ${ry} 0 0 0 ${ox + rx} ${oy} L ${ox + rx} ${oy - h} Z`}
        fill={palette.wallRight}
        fillOpacity={opacity}
        stroke={palette.stroke}
        strokeWidth="0.7"
        strokeDasharray={dashAttr}
      />
      {/* Lit left highlight stripe */}
      {!palette.isBlueprint && (
        <path
          d={`M ${ox - rx} ${oy - h} L ${ox - rx} ${oy} A ${rx} ${ry} 0 0 0 ${ox - rx * 0.15} ${oy + ry * 0.92} L ${ox - rx * 0.15} ${oy - h + ry * 0.92} Z`}
          fill={palette.wallLeft}
          fillOpacity="0.85"
        />
      )}
      <ellipse
        cx={ox}
        cy={oy - h}
        rx={rx}
        ry={ry}
        fill={palette.roofLight}
        fillOpacity={palette.isBlueprint ? 0.3 : 1}
        stroke={palette.stroke}
        strokeWidth="0.7"
        strokeDasharray={dashAttr}
      />
    </g>
  );
}

/**
 * High-craft 2.5D isometric architectural landmark placed centered on a hex top at (cx, cy).
 */
export function IsometricUseCaseLandmark({
  cx,
  cy,
  uc,
  stage,
}: {
  cx: number;
  cy: number;
  uc: UseCase;
  stage: MapVisualStage;
}) {
  const kind = resolveBuildingKind(uc);
  const palette = getBuildingPalette(stage);
  const dashed = palette.isBlueprint;

  return (
    <g transform={`translate(${cx}, ${cy})`} pointerEvents="none">
      {/* Subtle architectural pad shadow */}
      <ellipse
        cx="0"
        cy="3"
        rx="18"
        ry="9.5"
        fill="#020617"
        opacity={palette.isBlueprint ? 0.18 : 0.28}
      />

      {kind === 'paper-mill' && (
        <g>
          {/* Twin paper/pulp storage silos */}
          <IsoCylinder ox={-10} oy={0} rx={3.6} ry={2.0} h={13} palette={palette} dashed={dashed} />
          <IsoCylinder ox={-3.5} oy={-3.5} rx={3.6} ry={2.0} h={15} palette={palette} dashed={dashed} />
          {/* Main saw-tooth paper machine hall */}
          <IsoBox ox={4} oy={6.5} w={13} d={9} h={9.5} palette={palette} dashed={dashed} />
          {/* Clerestory roof ridge */}
          <IsoBox ox={3.5} oy={-1.5} w={8.5} d={4.5} h={3.2} palette={palette} dashed={dashed} />
          {/* Exhaust / heat-recovery stack */}
          <IsoCylinder ox={11} oy={-1} rx={1.8} ry={1.0} h={16} palette={palette} dashed={dashed} />
          {stage !== 'vorbereitung' && (
            <path
              d="M 11 -18 C 12 -21, 14 -21, 15 -24"
              fill="none"
              stroke={stage === 'abgeschlossen' ? '#a7f3d0' : '#bae6fd'}
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.75"
            />
          )}
        </g>
      )}

      {kind === 'textile-hall' && (
        <g>
          {/* Long stepped technical weaving hall */}
          <IsoBox ox={2} oy={7} w={14} d={10} h={8.5} palette={palette} dashed={dashed} />
          {/* Upper sensor / inspection cleanroom roof */}
          <IsoBox ox={1} oy={1} w={9} d={6} h={4.5} palette={palette} dashed={dashed} />
          {/* Solar / recycling dome module */}
          <IsoCylinder ox={-9.5} oy={2.5} rx={4.5} ry={2.5} h={7} palette={palette} dashed={dashed} />
          {!palette.isBlueprint && (
            <>
              <line x1="-5" y1="-2" x2="-1" y2="0" stroke={palette.windowFill} strokeWidth="1.1" />
              <line x1="5" y1="-1" x2="11" y2="-4" stroke={palette.windowFill} strokeWidth="1.1" />
            </>
          )}
        </g>
      )}

      {kind === 'battery-grid' && (
        <g>
          {/* Three modular BESS containers + central transformer */}
          <IsoBox ox={-5} oy={4.5} w={8.5} d={4.5} h={6.8} palette={palette} dashed={dashed} />
          <IsoBox ox={2} oy={8} w={8.5} d={4.5} h={6.8} palette={palette} dashed={dashed} />
          <IsoBox ox={9} oy={3.5} w={7.5} d={4.5} h={8.2} palette={palette} dashed={dashed} />
          {/* Active power busbar */}
          {!palette.isBlueprint && (
            <path
              d="M -6 -3 L 3 1.5 L 10 -3"
              fill="none"
              stroke="#F9FF00"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.9"
            />
          )}
        </g>
      )}

      {kind === 'thermal-reactor' && (
        <g>
          {/* High-temp thermal storage twin units */}
          <IsoCylinder ox={-7.5} oy={3} rx={4.8} ry={2.7} h={13.5} palette={palette} dashed={dashed} />
          <IsoCylinder ox={5} oy={5} rx={4.8} ry={2.7} h={11.5} palette={palette} dashed={dashed} />
          {/* Heat exchanger control house */}
          <IsoBox ox={2} oy={-1} w={7} d={5} h={7} palette={palette} dashed={dashed} />
          {/* Overhead pipe bridge */}
          <path
            d="M -7.5 -9.5 L 5 -6.5"
            fill="none"
            stroke={palette.isBlueprint ? '#94a3b8' : '#F9FF00'}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>
      )}

      {kind === 'robotics-bay' && (
        <g>
          {/* High-bay heavy roll & robotics hangar */}
          <IsoBox ox={3} oy={7} w={13} d={10} h={11} palette={palette} dashed={dashed} />
          {/* Precision inspection annex */}
          <IsoBox ox={-8} oy={4} w={6.5} d={5} h={6.5} palette={palette} dashed={dashed} />
          {/* Gantry / sensor beacon on roof */}
          <IsoCylinder ox={3} oy={-7} rx={2.4} ry={1.4} h={3.5} palette={palette} dashed={dashed} />
        </g>
      )}

      {/* Completed solar / green bio-canopy accent */}
      {stage === 'abgeschlossen' && (
        <g transform="translate(-14, 4)">
          <circle cx="0" cy="-2" r="3.1" fill="#34d399" stroke="#065f46" strokeWidth="0.6" />
          <line x1="0" y1="1" x2="0" y2="3.2" stroke="#065f46" strokeWidth="1" />
        </g>
      )}
    </g>
  );
}

/**
 * Isometric startup/solution-partner beacon node connected to active/completed pilot tiles.
 */
export function IsometricStartupBeacon({
  sx,
  sy,
  stage,
  highlighted,
  label,
}: {
  sx: number;
  sy: number;
  stage: 'pilotbetrieb' | 'abgeschlossen';
  highlighted: boolean;
  label: string;
}) {
  const topColor = stage === 'abgeschlossen' ? '#6ee7b7' : '#67e8f9';
  const sideLeft = stage === 'abgeschlossen' ? '#10B981' : '#00B4D8';
  const sideRight = stage === 'abgeschlossen' ? '#047857' : '#0369a1';
  const r = highlighted ? 8.5 : 6.8;
  const ry = r * 0.56;
  const h = highlighted ? 7 : 5.5;

  return (
    <g pointerEvents="none">
      {/* Ground glow ring */}
      <ellipse
        cx={sx}
        cy={sy + 2}
        rx={r + 3.5}
        ry={ry + 2}
        fill={sideLeft}
        opacity={highlighted ? 0.34 : 0.16}
      />
      {/* Left side */}
      <polygon
        points={`${sx - r},${sy} ${sx},${sy + ry} ${sx},${sy + ry - h} ${sx - r},${sy - h}`}
        fill={sideLeft}
        stroke="#041422"
        strokeWidth="0.8"
      />
      {/* Right side */}
      <polygon
        points={`${sx},${sy + ry} ${sx + r},${sy} ${sx + r},${sy - h} ${sx},${sy + ry - h}`}
        fill={sideRight}
        stroke="#041422"
        strokeWidth="0.8"
      />
      {/* Top diamond */}
      <polygon
        points={`${sx},${sy - ry - h} ${sx + r},${sy - h} ${sx},${sy + ry - h} ${sx - r},${sy - h}`}
        fill={topColor}
        stroke={highlighted ? '#F9FF00' : '#ecfeff'}
        strokeWidth={highlighted ? '1.3' : '0.8'}
      />
      {highlighted && label && (
        <g transform={`translate(${sx}, ${sy - h - ry - 6})`}>
          <rect
            x={-Math.min(62, Math.max(36, label.length * 3.1))}
            y="-10"
            width={Math.min(124, Math.max(72, label.length * 6.2))}
            height="13"
            rx="3"
            fill="#041422"
            fillOpacity="0.92"
            stroke={sideLeft}
            strokeWidth="0.7"
          />
          <text
            x="0"
            y="-1.5"
            textAnchor="middle"
            fontSize="7.2"
            fontFamily="monospace"
            fontWeight="700"
            fill="#f8fafc"
          >
            {label.length > 18 ? `${label.slice(0, 17)}…` : label}
          </text>
        </g>
      )}
    </g>
  );
}

/**
 * Topographic contour lines, isometric background lattice, Rur river + bridges, A4/B56 corridors,
 * compass rose, and metric scale bar for the Düren regional map.
 */
export function DuerenTopographyLayer() {
  // Subtle recessed background hex carpet (decorative regional mesh)
  const bgHexCenters = [
    [100, 115], [265, 110], [415, 105], [545, 155],
    [95, 200], [250, 200], [395, 185], [535, 255],
    [225, 295], [375, 290], [565, 315], [645, 275],
    [105, 395], [235, 395], [405, 395], [555, 395],
  ];

  const hexPoints = (cx: number, cy: number, rx = 28, ry = 15.5) =>
    [
      [cx, cy - ry],
      [cx + rx, cy - ry * 0.48],
      [cx + rx, cy + ry * 0.48],
      [cx, cy + ry],
      [cx - rx, cy + ry * 0.48],
      [cx - rx, cy - ry * 0.48],
    ]
      .map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`)
      .join(' ');

  return (
    <g pointerEvents="none">
      {/* Subtle radial atmospheric depth */}
      <rect x="0" y="0" width="740" height="450" fill="url(#mapAtmosphere)" />

      {/* Eifel-Vorland & Rurtal topographic elevation contours */}
      <g fill="none" stroke="#1b4366" strokeWidth="0.8" opacity="0.34">
        <path d="M -20 340 C 80 315, 165 370, 260 395 C 365 420, 495 380, 620 425" />
        <path d="M -10 295 C 105 265, 195 325, 310 345 C 430 365, 540 320, 755 370" />
        <path d="M 15 110 C 125 85, 235 125, 355 95 C 470 65, 595 95, 745 55" />
        <path d="M 0 165 C 145 140, 240 190, 385 160 C 515 132, 620 155, 760 115" />
      </g>

      {/* Isometric architectural coordinate lattice */}
      <g stroke="#173859" strokeWidth="0.55" opacity="0.36">
        {[55, 120, 185, 250, 315, 380, 445].map((y) => (
          <line key={`g-h-${y}`} x1="0" y1={y} x2="740" y2={y - 120} />
        ))}
        {[80, 180, 280, 380, 480, 580, 680].map((x) => (
          <line key={`g-v-${x}`} x1={x} y1="0" x2={x - 180} y2="450" />
        ))}
      </g>

      {/* Recessed background hex grid cells */}
      <g fill="#071e33" fillOpacity="0.32" stroke="#153757" strokeWidth="0.7" opacity="0.65">
        {bgHexCenters.map(([bx, by], i) => (
          <polygon key={`bghex-${i}`} points={hexPoints(bx, by)} />
        ))}
      </g>

      {/* Regional transport corridors (A4 north / B56 & Rurtalbahn) */}
      <g fill="none" opacity="0.38">
        {/* A4 East-West Autobahn corridor north of Düren */}
        <path
          d="M 15 92 C 190 88, 395 72, 725 48"
          stroke="#475569"
          strokeWidth="3.2"
          strokeDasharray="10 4"
        />
        {/* Rurtalbahn / B56 north-south industrial spine */}
        <path
          d="M 215 438 C 255 340, 305 265, 385 180 C 445 118, 520 75, 595 25"
          stroke="#334155"
          strokeWidth="2.2"
          strokeDasharray="5 4"
        />
      </g>

      {/* Multi-layered Rur River Axis (Kreuzau -> Düren -> Mariaweiler -> Jülich) */}
      <g>
        {/* Outer valley ambient glow */}
        <path
          d="M 55 430 C 145 385, 215 315, 295 268 C 380 218, 465 185, 555 128 C 615 90, 670 55, 720 22"
          fill="none"
          stroke="url(#rurKorridorGrad)"
          strokeWidth="26"
          strokeLinecap="round"
          opacity="0.22"
        />
        {/* Deep riverbed */}
        <path
          d="M 55 430 C 145 385, 215 315, 295 268 C 380 218, 465 185, 555 128 C 615 90, 670 55, 720 22"
          fill="none"
          stroke="#062845"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Main illuminated water ribbon */}
        <path
          d="M 55 430 C 145 385, 215 315, 295 268 C 380 218, 465 185, 555 128 C 615 90, 670 55, 720 22"
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.65"
        />
        {/* Specular current flow */}
        <path
          d="M 55 430 C 145 385, 215 315, 295 268 C 380 218, 465 185, 555 128 C 615 90, 670 55, 720 22"
          fill="none"
          stroke="#67e8f9"
          strokeWidth="1.4"
          strokeDasharray="10 12"
          strokeLinecap="round"
          opacity="0.78"
        />

        {/* Bridge crossings over the Rur */}
        {[
          { x: 178, y: 348, angle: -34 },
          { x: 295, y: 268, angle: -30 },
          { x: 465, y: 185, angle: -32 },
        ].map((br, idx) => (
          <g key={`bridge-${idx}`} transform={`translate(${br.x}, ${br.y}) rotate(${br.angle})`}>
            <rect x="-3" y="-8" width="6" height="16" rx="1" fill="#0f2942" stroke="#38bdf8" strokeWidth="0.6" opacity="0.75" />
          </g>
        ))}
      </g>

      {/* Regional Zone Labels */}
      <g fill="#7dd3fc" fontSize="8.8" fontFamily="monospace" fontWeight="700" opacity="0.65" letterSpacing="0.8">
        <text x="58" y="420">KREUZAU · RUR-SÜD</text>
        <text x="48" y="82">A4-KORRIDOR</text>
        <text x="232" y="294">DÜREN-ZENTRUM</text>
        <text x="562" y="42">JÜLICH · RÜTGERS</text>
      </g>

      {/* Architectural Compass Rose (Top-Left) */}
      <g transform="translate(46, 44)" opacity="0.82">
        <circle cx="0" cy="0" r="18" fill="#041422" fillOpacity="0.75" stroke="#1e4976" strokeWidth="0.9" />
        <circle cx="0" cy="0" r="13.5" fill="none" stroke="#00B4D8" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
        {/* North needle */}
        <polygon points="0,-13 3.2,0 0,-2.5 -3.2,0" fill="#00B4D8" />
        {/* South needle */}
        <polygon points="0,13 3.2,0 0,2.5 -3.2,0" fill="#334155" />
        {/* East-West */}
        <line x1="-10" y1="0" x2="10" y2="0" stroke="#475569" strokeWidth="0.8" />
        <text x="0" y="-15.5" textAnchor="middle" fontSize="7" fontFamily="monospace" fontWeight="800" fill="#e2e8f0">
          N
        </text>
      </g>

      {/* Cartographic Scale Bar (Bottom-Right) */}
      <g transform="translate(602, 424)" opacity="0.85">
        <rect x="-8" y="-13" width="132" height="22" rx="4" fill="#041422" fillOpacity="0.8" stroke="#1e3a5f" strokeWidth="0.8" />
        <line x1="0" y1="0" x2="80" y2="0" stroke="#94a3b8" strokeWidth="1.4" />
        <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="#00B4D8" strokeWidth="1.4" />
        <line x1="40" y1="-2.5" x2="40" y2="2.5" stroke="#94a3b8" strokeWidth="1.1" />
        <line x1="80" y1="-3.5" x2="80" y2="3.5" stroke="#10B981" strokeWidth="1.4" />
        <text x="0" y="-5.5" fontSize="7" fontFamily="monospace" fill="#cbd5e1">0</text>
        <text x="36" y="-5.5" fontSize="7" fontFamily="monospace" fill="#cbd5e1">2,5</text>
        <text x="74" y="-5.5" fontSize="7" fontFamily="monospace" fill="#cbd5e1">5 km</text>
        <text x="90" y="2.5" fontSize="7" fontFamily="monospace" fontWeight="700" fill="#58B49D">RUR</text>
      </g>
    </g>
  );
}
