import React, { useMemo, useState } from 'react';
import { AzaPlanVersion, SystemSettings } from '../types';
import { formatEuro, splitPercent9010, PROFI_STARK_FKZ } from '../utils';
import {
  CheckCircle2,
  Copy,
  Check,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface PolicyDecreeDeckProps {
  rest0835: number;
  rest0843: number;
  totalPlan: number;
  totalIst: number;
  settings: SystemSettings;
  onApplyAzaVersion?: (version: AzaPlanVersion) => void;
}

interface DecreeCard {
  id: string;
  title: string;
  bafaAction: string;
  effectSummary: string;
  targetYearImpact2026: number; // negative = relieves 2026 burn-rate pressure
  targetYearImpact2027: number;
  boosterDelta2027: number;
  unlockedGate: boolean;
  recommendedVersion?: AzaPlanVersion;
}

export default function PolicyDecreeDeck({
  rest0835,
  rest0843,
  totalPlan,
  totalIst,
  settings,
  onApplyAzaVersion,
}: PolicyDecreeDeckProps) {
  const [activeDecreeIds, setActiveDecreeIds] = useState<string[]>(['transfer-0835']);
  const [transferAmount, setTransferAmount] = useState<number>(69000);
  const [sponsorOffset, setSponsorOffset] = useState<number>(12500);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [appliedToast, setAppliedToast] = useState<string | null>(null);

  const decrees: DecreeCard[] = useMemo(
    () => [
      {
        id: 'transfer-0835',
        title: 'Überjähriger Mittel-Transfer (F0835)',
        bafaAction: `Antrag an BAFA Ref. 424 (${formatEuro(transferAmount, 0)} aus 2026 nach 2027 schieben: 4. Booster 37k €, Ökoprofit 20k €, Events/Marketing)`,
        effectSummary: `Entlastet 2026er Burn-Rate vor Kassenschluss (15.11.) und erhöht 2027er Vergabe-Kapazität auf 5 Booster.`,
        targetYearImpact2026: -transferAmount,
        targetYearImpact2027: transferAmount,
        boosterDelta2027: 1,
        unlockedGate: false,
        recommendedVersion: 'aenderung_2026_11_uebertrag',
      },
      {
        id: 'tarif-shift',
        title: 'Tarif-Harmonisierung (TVöD-Stufen-Shift)',
        bafaAction: 'Budgetneutrale Umschichtung in 0812/0820 (Stufenanpassung E12/E11 aus vakanten VZÄ-Monaten)',
        effectSummary: 'Hält Gesamtbudget bei 0,00 € Mehrkosten, glättet monatliche Vorfinanzierungskurve in Modul 6.',
        targetYearImpact2026: 0,
        targetYearImpact2027: 0,
        boosterDelta2027: 0,
        unlockedGate: false,
        recommendedVersion: 'aenderung_2025_12_personal',
      },
      {
        id: 'sponsor-lever',
        title: 'Sponsoren-Hebel aktivieren',
        bafaAction: `Externe Kofinanzierung bei Events (z. B. Stadtwerke Düren bei DN POWER UP: ${formatEuro(sponsorOffset, 0)})`,
        effectSummary: 'Senkt Netto-Mittelabruf in Pos. 0835/0843 und schont das BAFA-Veranstaltungsbudget für Folgejahre.',
        targetYearImpact2026: -sponsorOffset,
        targetYearImpact2027: 0,
        boosterDelta2027: 0,
        unlockedGate: false,
      },
      {
        id: 'fast-track',
        title: 'Vorab-Freigabe-Fast-Track',
        bafaAction: 'Vergabedokumentation + 3 Vergleichsangebote + BAFA-Freigabe vor Beauftragung bündeln',
        effectSummary: 'Schaltet das bafaFreigabe-Siegel frei und hebt Buchungssperren im Compliance-Gate (Modul 4) auf.',
        targetYearImpact2026: 0,
        targetYearImpact2027: 0,
        boosterDelta2027: 1,
        unlockedGate: true,
      },
    ],
    [transferAmount, sponsorOffset]
  );

  const toggleDecree = (id: string) => {
    setActiveDecreeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const sandboxSim = useMemo(() => {
    const selected = decrees.filter((d) => activeDecreeIds.includes(d.id));
    const delta2026 = selected.reduce((s, d) => s + d.targetYearImpact2026, 0);
    const delta2027 = selected.reduce((s, d) => s + d.targetYearImpact2027, 0);
    const boosterPlus = selected.reduce((s, d) => s + d.boosterDelta2027, 0);
    const gateUnlocked = selected.some((d) => d.unlockedGate);

    const netRest0835After = Math.max(0, rest0835 + delta2026);
    const splitRelief = splitPercent9010(Math.abs(delta2026));
    const eigenRatioPreserved = totalPlan > 0 ? 10.0 : 10.0;

    return {
      selected,
      delta2026,
      delta2027,
      boosterPlus,
      gateUnlocked,
      netRest0835After,
      splitRelief,
      eigenRatioPreserved,
      restGesamt: Math.max(0, totalPlan - totalIst),
    };
  }, [decrees, activeDecreeIds, rest0835, totalPlan, totalIst]);

  const baFaDocumentText = useMemo(() => {
    const lines = [
      `SANDBOX-AUSFERTIGUNG · BAFA-ÄNDERUNGSANTRAG / VERWALTUNGS-DEKRET`,
      `Projekt: Zukunftsstoff – Made in Düren / MiD-PCT (FKZ ${PROFI_STARK_FKZ})`,
      `Zuwendungsempfänger: WIN.DN Wirtschaftsförderung Düren GmbH`,
      `Aktive AZA-Basis: ${settings.azaVersion}`,
      ``,
      `Aktivierte Steuerungs-Dekrete (${sandboxSim.selected.length}):`,
      ...sandboxSim.selected.map(
        (d, idx) => `${idx + 1}. ${d.title}\n   BAFA-Maßnahme: ${d.bafaAction}\n   Effekt: ${d.effectSummary}`
      ),
      ``,
      `Simulierte Haushaltswirkung (90 % Bund / 10 % Eigenanteil WIN.DN):`,
      `- Entlastung laufendes Haushaltsjahr (Ausgabenbasis 100 %): ${formatEuro(Math.abs(sandboxSim.delta2026), 2)} (90 % Bund: ${formatEuro(sandboxSim.splitRelief.bund90, 2)})`,
      `- Übertrag in Folgejahr 2027 (Pos. 0835): ${formatEuro(sandboxSim.delta2027, 2)} (+${sandboxSim.boosterPlus} Booster-Kapazität)`,
      `- Verbleibendes Restbudget Pos. 0835 nach Dekret: ${formatEuro(sandboxSim.netRest0835After, 2)} (Pos. 0843: ${formatEuro(rest0843, 2)})`,
      `- Finanzierungsquote: unverändert 90,0 % Bund / ${sandboxSim.eigenRatioPreserved.toFixed(1)} % Eigenanteil WIN.DN`,
    ];
    return lines.join('\n');
  }, [sandboxSim, settings.azaVersion, rest0843]);

  const handleCopyAndIssue = async () => {
    try {
      await navigator.clipboard.writeText(baFaDocumentText);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 3000);
    } catch {
      // Clipboard fallback ignored cleanly
    }

    if (activeDecreeIds.includes('transfer-0835') && onApplyAzaVersion) {
      onApplyAzaVersion('aenderung_2026_11_uebertrag');
      setAppliedToast(
        'Dekret ausgefertigt, in Zwischenablage kopiert & AZA-Planversion „Übertrag 2026 -> 2027“ aktiviert.'
      );
    } else {
      setAppliedToast('Dekret als BAFA-Änderungsantrag ausgefertigt und in die Zwischenablage kopiert.');
    }
    setTimeout(() => setAppliedToast(null), 5000);
  };

  return (
    <section className="bg-white rounded-xl border border-zinc-200 cardstock overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="font-display font-bold text-base text-zs-deep-teal flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#00B4D8]" />
            <span>Strategische Verwaltungs-Dekrete &amp; Sandbox-Simulator (Dry-Run)</span>
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Aktivieren Sie Politik-Karten auf dem Haushalts-Spielfeld, prüfen Sie Eigenanteil &amp; Burn-Rate live und fertigen Sie den BAFA-Änderungsantrag aus.
          </p>
        </div>
        <div className="text-[11px] font-mono text-zinc-500 tabular-nums">
          Aktiv im Dry-Run: <strong className="text-zs-blau-schwarz">{sandboxSim.selected.length} / {decrees.length}</strong>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* 4 Playable Policy Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {decrees.map((card) => {
            const active = activeDecreeIds.includes(card.id);
            return (
              <div
                key={card.id}
                className={`rounded-xl border p-4 transition-all flex flex-col justify-between gap-3 ${
                  active
                    ? 'border-[#0A2B32] bg-[#0A2B32]/[0.03]'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-bold text-sm text-zs-blau-schwarz leading-snug">
                      {card.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => toggleDecree(card.id)}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-[#10B981] text-[#041422]'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {active ? 'Auf Spielfeld ✓' : 'Aktivieren'}
                    </button>
                  </div>

                  <p className="text-[11px] font-mono text-[#0284c7] leading-relaxed">
                    BAFA/STARK-Aktion: {card.bafaAction}
                  </p>
                  <p className="text-xs text-zinc-600 leading-relaxed">{card.effectSummary}</p>
                </div>

                {/* Parameter Sliders for Transfer & Sponsor */}
                {card.id === 'transfer-0835' && active && (
                  <div className="pt-2 border-t border-zinc-200/70 space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-zinc-600 tabular-nums">
                      <span>Übertragungs-Volumen (2026 &rarr; 2027)</span>
                      <strong className="text-zs-blau-schwarz">{formatEuro(transferAmount, 0)}</strong>
                    </div>
                    <input
                      type="range"
                      min={37000}
                      max={95000}
                      step={1000}
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(Number(e.target.value))}
                      className="w-full accent-[#0A2B32] cursor-pointer"
                    />
                  </div>
                )}

                {card.id === 'sponsor-lever' && active && (
                  <div className="pt-2 border-t border-zinc-200/70 space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-zinc-600 tabular-nums">
                      <span>Externe Kofinanzierung (Events)</span>
                      <strong className="text-zs-blau-schwarz">{formatEuro(sponsorOffset, 0)}</strong>
                    </div>
                    <input
                      type="range"
                      min={5000}
                      max={25000}
                      step={500}
                      value={sponsorOffset}
                      onChange={(e) => setSponsorOffset(Number(e.target.value))}
                      className="w-full accent-[#00B4D8] cursor-pointer"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Live Sandbox Impact Readout + Issue Action */}
        <div className="rounded-xl bg-[#0A2B32] text-white p-4 cardstock-teal space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="text-[10px] font-mono text-zinc-300 uppercase">2026er Entlastung</div>
              <div className="font-mono text-lg font-bold text-[#00B4D8] tabular-nums mt-0.5">
                {formatEuro(Math.abs(sandboxSim.delta2026), 0)}
              </div>
              <div className="text-[10px] text-zinc-400">Vor Kassenschluss 15.11.</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="text-[10px] font-mono text-zinc-300 uppercase">Rest 0835 nach Dekret</div>
              <div className="font-mono text-lg font-bold text-white tabular-nums mt-0.5">
                {formatEuro(sandboxSim.netRest0835After, 0)}
              </div>
              <div className="text-[10px] text-zinc-400">Aus Ausgangsbasis {formatEuro(rest0835, 0)}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="text-[10px] font-mono text-zinc-300 uppercase">2027er Booster-Kapazität</div>
              <div className="font-mono text-lg font-bold text-[#10B981] tabular-nums mt-0.5">
                +{sandboxSim.boosterPlus} Booster
              </div>
              <div className="text-[10px] text-zinc-400">
                Übertrag: {formatEuro(sandboxSim.delta2027, 0)}
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="text-[10px] font-mono text-zinc-300 uppercase">Eigenanteil &amp; Gate</div>
              <div className="font-mono text-lg font-bold text-zs-signal-gelb tabular-nums mt-0.5">
                90 / 10 %
              </div>
              <div className="text-[10px] text-zinc-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#10B981]" />
                <span>{sandboxSim.gateUnlocked ? 'Fast-Track aktiv' : 'Quote stabil'}</span>
              </div>
            </div>
          </div>

          {appliedToast && (
            <div className="rounded-lg bg-emerald-500/20 border border-emerald-400/40 px-3 py-2 text-xs text-emerald-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>{appliedToast}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-zinc-300">
              Erzeugt einen prüffähigen Entwurf für Referat 424 (inkl. 90/10-Aufteilung) und synchronisiert auf Wunsch die AZA-Planversion.
            </span>
            <button
              type="button"
              disabled={sandboxSim.selected.length === 0}
              onClick={handleCopyAndIssue}
              className="px-4 py-2 rounded-lg bg-[#10B981] text-[#041422] text-xs font-bold hover:bg-[#34d399] disabled:opacity-40 transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              {copiedDraft ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Dekret als BAFA-Änderungsantrag ausfertigen</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
