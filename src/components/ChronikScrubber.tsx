import React, { useEffect, useState } from 'react';
import { ChronikFrame, formatEuro, formatDate } from '../utils';
import { Play, Pause, RotateCcw, Calendar, MapPin } from 'lucide-react';

interface ChronikScrubberProps {
  frames: ChronikFrame[];
}

export default function ChronikScrubber({ frames }: ChronikScrubberProps) {
  const todayMonth = new Date().toISOString().slice(0, 7);
  const initialIndex = Math.max(
    0,
    frames.findIndex((f) => f.monthKey >= todayMonth)
  );
  const [cursor, setCursor] = useState<number>(initialIndex >= 0 ? initialIndex : 15);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setCursor((prev) => {
        if (prev >= frames.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 420);
    return () => window.clearInterval(timer);
  }, [playing, frames.length]);

  const current = frames[cursor] || frames[0];
  if (!current) return null;

  // Gather all milestone events up to current cursor month
  const unlockedEvents = frames
    .slice(0, cursor + 1)
    .flatMap((f) => f.milestoneEvents);

  const budgetProgressPct =
    frames[frames.length - 1]?.cumPlan > 0
      ? Math.min(100, (current.cumPlan / frames[frames.length - 1].cumPlan) * 100)
      : 0;

  return (
    <section className="bg-[#0A2B32] text-white rounded-xl cardstock-teal overflow-hidden border border-[#124550]">
      <div className="px-5 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-base text-white">
            Jahres-Chronik &amp; 48-Monate-Replay (04/2025 – 03/2029)
          </h2>
          <p className="text-[11px] text-zinc-300 mt-0.5">
            Zeitreise durch die 5 AZA-Perioden, Budget-Transformation und regionale Netzwerk-Entwicklung für Beirat &amp; Lenkungskreis
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (!playing && cursor >= frames.length - 1) {
                setCursor(0);
              }
              setPlaying((p) => !p);
            }}
            className="px-3.5 py-2 rounded-lg bg-[#00B4D8] text-[#041422] text-xs font-bold hover:bg-[#38bdf8] transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{playing ? 'Pause' : 'Play Chronik'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setCursor(0);
            }}
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
            title="Zurück auf Projektstart 04/2025"
            aria-label="Zurück auf Projektstart 04/2025"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Scrubber Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono tabular-nums">
            <span className="text-[#00B4D8] font-bold">
              Monat {current.index + 1} / {frames.length}: {current.label}
            </span>
            <span className="text-[#10B981] font-bold">{current.azaPeriod}</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, frames.length - 1)}
            value={cursor}
            onChange={(e) => {
              setPlaying(false);
              setCursor(Number(e.target.value));
            }}
            aria-label="48-Monate Zeitstrahl-Scrubber"
            className="w-full accent-[#00B4D8] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-zinc-400">
            <span>04/2025 · Kickoff</span>
            <span>2026 · Pilotjahr</span>
            <span>2027 · Batch 2</span>
            <span>2028 · Skalierung</span>
            <span>03/2029 · Folgeantrag</span>
          </div>
        </div>

        {/* KPI Snapshot for selected month */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="rounded-lg bg-white/5 border border-white/10 p-3">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">AZA-Plan kumuliert</div>
            <div className="font-mono text-base font-bold text-white tabular-nums mt-0.5">
              {formatEuro(current.cumPlan, 0)}
            </div>
            <div className="mt-1.5 w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#00B4D8]" style={{ width: `${budgetProgressPct}%` }} />
            </div>
          </div>

          <div className="rounded-lg bg-white/5 border border-white/10 p-3">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Ist-Transformation</div>
            <div className="font-mono text-base font-bold text-[#10B981] tabular-nums mt-0.5">
              {formatEuro(current.cumIst, 0)}
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Belegte Projektausgaben</div>
          </div>

          <div className="rounded-lg bg-white/5 border border-white/10 p-3">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Aktive Pilot-Knoten</div>
            <div className="font-mono text-base font-bold text-[#00B4D8] tabular-nums mt-0.5">
              {current.activePilots} aktiv &middot; {current.pipelinePilots} Pipeline
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Dürener Industrie-Netzwerk</div>
          </div>

          <div className="rounded-lg bg-white/5 border border-white/10 p-3">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Transformations-Booster</div>
            <div className="font-mono text-base font-bold text-zs-signal-gelb tabular-nums mt-0.5">
              {current.boostersReleased} / 12
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Vergaben im Zeitfenster</div>
          </div>
        </div>

        {/* Regional Milestone Events unlocked up to cursor */}
        <div className="rounded-lg bg-[#041422]/70 border border-white/10 p-3.5">
          <div className="text-[10px] font-mono uppercase font-bold text-zinc-400 mb-2">
            Meilensteine &amp; Gremien-Ereignisse bis {current.label} ({unlockedEvents.length})
          </div>
          {unlockedEvents.length === 0 ? (
            <p className="text-xs text-zinc-400 font-mono">
              Projektvorbereitung &amp; Bescheid-Aktivierung (04/2025). Bewegen Sie den Regler weiter nach rechts.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {unlockedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-start justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{ev.titel}</div>
                    <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 text-[#58B49D] shrink-0" />
                      <span className="truncate">{ev.ort}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#00B4D8] shrink-0 inline-flex items-center gap-1 tabular-nums">
                    <Calendar className="w-3 h-3" />
                    {formatDate(ev.datum)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
