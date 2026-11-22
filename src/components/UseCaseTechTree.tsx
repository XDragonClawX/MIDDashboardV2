import React, { useMemo, useState } from 'react';
import { UseCase, Vergabe, OekoprofitCheckup } from '../types';
import { computeClusterSynergies } from '../utils';
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
  Plus,
  Building2,
  Layers,
  Award,
} from 'lucide-react';

interface UseCaseTechTreeProps {
  usecases: UseCase[];
  vergaben: Vergabe[];
  oekoprofitCheckups?: OekoprofitCheckup[];
  onSelectUseCase: (id: number) => void;
  onUpdateUseCase: (id: number, patch: Partial<UseCase>) => void;
  onAddUseCase: (uc: Omit<UseCase, 'id'>) => void;
}

type InnovationPathId = 'ki-retrofit' | 'energie-waerme' | 'wasser-chemie' | 'biooekonomie';

interface PathMeta {
  id: InnovationPathId;
  title: string;
  subtitle: string;
  accent: string;
  match: (uc: UseCase) => boolean;
}

const INNOVATION_PATHS: PathMeta[] = [
  {
    id: 'ki-retrofit',
    title: 'Legacy-Retrofit & KI',
    subtitle: 'Schichtwissen, Computer Vision & Robotik',
    accent: '#00B4D8',
    match: (u) => {
      const t = `${u.titel} ${u.thema}`.toLowerCase();
      return t.includes('chatbot') || t.includes('vision') || t.includes('robot') || t.includes('sensor') || t.includes('walzen');
    },
  },
  {
    id: 'energie-waerme',
    title: 'Energie & Abwärme',
    subtitle: 'Peak-Shaving, H₂-Wärme & Hochtemperatur-Speicher',
    accent: '#BA8B68',
    match: (u) => {
      const t = `${u.titel} ${u.thema}`.toLowerCase();
      return t.includes('batterie') || t.includes('peak-shaving') || t.includes('wasserstoff') || t.includes('abwärme');
    },
  },
  {
    id: 'wasser-chemie',
    title: 'Wasserkreisläufe & Chemie',
    subtitle: 'Chemisches Recycling & zirkuläre Rohstoffe',
    accent: '#7F6DBA',
    match: (u) => {
      const t = `${u.titel} ${u.thema} ${u.branche}`.toLowerCase();
      return t.includes('recycling') || t.includes('beton') || t.includes('kreislaufwasser');
    },
  },
  {
    id: 'biooekonomie',
    title: 'Bioökonomie & Neue Materialien',
    subtitle: 'Chitosan-Barrieren, Graspapier & BioökonomieREVIER',
    accent: '#10B981',
    match: (u) => {
      const t = `${u.titel} ${u.thema}`.toLowerCase();
      return t.includes('bio') || t.includes('barriere') || t.includes('gras') || t.includes('chitosan');
    },
  },
];

interface PotentialCandidate {
  id: string;
  pathId: InnovationPathId;
  titel: string;
  unternehmen: string;
  startupPartner: string;
  branche: string;
  thema: string;
  problemstellung: string;
  loesungsansatz: string;
  standortMehrwert: string;
}

const TIER3_CANDIDATES: PotentialCandidate[] = [
  {
    id: 'cand-creapaper',
    pathId: 'biooekonomie',
    titel: 'Graspapier-Barrierebeschichtungen für kreislauffähige Verpackungen',
    unternehmen: 'Creapaper GmbH / Papiercluster Düren',
    startupPartner: 'BioCoat / RWTH Bioökonomie-Ausgründung',
    branche: 'Papier',
    thema: 'Bioökonomie, Graspapier, Faser-Innovation, Barrierebeschichtung',
    problemstellung: 'Fett- und Feuchtigkeitsschutz bei Graspapier-Verpackungen ohne synthetische Kunststoffe.',
    loesungsansatz: 'Kombination von Grasfaser-Substraten mit biogenen Chitosan-/Stärke-Dispersionen.',
    standortMehrwert: 'Verstärkt Dürens Position als Vorreiter für biobasierte Verpackungslösungen bis 2029+.',
  },
  {
    id: 'cand-fertigbeton',
    pathId: 'wasser-chemie',
    titel: 'CO₂-reduzierter Recyclingbeton & geschlossene Kreislaufwasser-Nutzung',
    unternehmen: 'Fertigbeton Rheinland / Baustoff-Cluster Kreis Düren',
    startupPartner: 'CemTech / CircularWater Analytics',
    branche: 'Chemie',
    thema: 'CO2-Reduktion, Kreislaufwasser, Sekundärrohstoffe, Baustoffe',
    problemstellung: 'Hoher Klinker-CO₂-Fußabdruck und Frischwasserverbrauch bei regionalen Betonwerken.',
    loesungsansatz: 'Sensorische Wasseraufbereitung und karbonatisierte Recycling-Gesteinskörnung.',
    standortMehrwert: 'Öffnet den MiD-PCT-Transferkorridor über Papier/Textil hinaus in die Bau- & Grundstoffindustrie.',
  },
];

export default function UseCaseTechTree({
  usecases,
  vergaben,
  onSelectUseCase,
  onUpdateUseCase,
  onAddUseCase,
}: UseCaseTechTreeProps) {
  const [blueprintFeedback, setBlueprintFeedback] = useState<string | null>(null);

  const { synergies, hubs } = useMemo(() => computeClusterSynergies(usecases), [usecases]);

  // Tier 1 unlock check: at least one Batch 1 milestone or 0835 vergabe exists
  const tier1Progress = useMemo(() => {
    const b1 = usecases.filter((u) => u.batch === 'Batch 1');
    const doneTodos = b1.reduce(
      (s, u) => s + (u.todos || []).filter((t) => t.completed).length,
      0
    );
    const has0835 = vergaben.some((v) => v.bafaFreigabe || v.auftragswert >= 30000);
    return {
      unlockedTier2: doneTodos >= 2 || has0835,
      doneTodos,
      has0835,
    };
  }, [usecases, vergaben]);

  // Endgame Wonder: Paper & Process Valley Düren (2029–2032)
  const endgame = useMemo(() => {
    const boosterCount = Math.min(
      12,
      vergaben.filter(
        (v) => v.auftragswert >= 30000 || v.titel.toLowerCase().includes('booster') || v.useCaseId != null
      ).length
    );
    const activeBranches = new Set(
      usecases
        .filter((u) => u.status === 'aktiv' || u.status === 'abgeschlossen' || u.batch === 'Batch 2')
        .map((u) => u.branche)
    );
    const branchCount = Math.min(3, ['Papier', 'Textil', 'Chemie'].filter((b) => activeBranches.has(b)).length);
    const bioActive = usecases.some(
      (u) => `${u.thema} ${u.notizen}`.toLowerCase().includes('bioökonomie')
    );
    const readinessPct = Math.min(
      100,
      Math.round((boosterCount / 12) * 50 + (branchCount / 3) * 30 + (bioActive ? 20 : 0))
    );
    return { boosterCount, branchCount, bioActive, readinessPct };
  }, [usecases, vergaben]);

  const handleApplyBlueprint = (blueprintId: number | null, targetIds: number[], clusterName: string) => {
    if (!targetIds.length) return;
    let updatedCount = 0;
    targetIds.forEach((tid) => {
      const target = usecases.find((u) => u.id === tid);
      if (!target) return;
      const todos = target.todos || [];
      // Mark ~40% of uncompleted todos (minimum 1) as expedited via blueprint
      const uncompleted = todos.filter((t) => !t.completed);
      if (uncompleted.length === 0) return;
      const countToComplete = Math.max(1, Math.round(todos.length * 0.4));
      let marked = 0;
      const nextTodos = todos.map((t) => {
        if (!t.completed && marked < countToComplete) {
          marked++;
          return { ...t, completed: true };
        }
        return t;
      });
      const sourceUc = usecases.find((u) => u.id === blueprintId);
      const blueprintNote = sourceUc
        ? `Blaupause aus „${sourceUc.unternehmen}“ (${clusterName}) angewendet: -40 % Vorbereitungszeit.`
        : `Cluster-Blaupause (${clusterName}) angewendet.`;
      onUpdateUseCase(target.id, {
        todos: nextTodos,
        erfolgswahrscheinlichkeit: Math.min(95, (target.erfolgswahrscheinlichkeit || 75) + 5),
        notizen: target.notizen?.includes('Blaupause')
          ? target.notizen
          : `${target.notizen || ''} ${blueprintNote}`.trim(),
      });
      updatedCount++;
    });
    setBlueprintFeedback(
      updatedCount > 0
        ? `Blaupause „${clusterName}“ auf ${updatedCount} Partner-Use-Case(s) übertragen (40 % Vorbereitungs-Checklisten vorab erledigt).`
        : `Alle verknüpften Checklisten in „${clusterName}“ sind bereits durch Blaupausen vorbereitet.`
    );
  };

  const handleAddCandidate = (cand: PotentialCandidate) => {
    const exists = usecases.some((u) =>
      u.unternehmen.toLowerCase().includes(cand.unternehmen.split('/')[0].trim().toLowerCase())
    );
    if (exists) {
      const found = usecases.find((u) =>
        u.unternehmen.toLowerCase().includes(cand.unternehmen.split('/')[0].trim().toLowerCase())
      );
      if (found) onSelectUseCase(found.id);
      return;
    }
    onAddUseCase({
      titel: cand.titel,
      unternehmen: cand.unternehmen,
      startupPartner: cand.startupPartner,
      ansprechpartner: 'WIN.DN Scouting / Potenzial-Pipeline',
      branche: cand.branche,
      reifegrad: 'Idee',
      batch: 'Batch 3',
      thema: cand.thema,
      risiken: 'Konsortial- und Fördervorprüfung noch offen.',
      politischeRelevanz: 4,
      deadline: '2028-09-30',
      erfolgswahrscheinlichkeit: 68,
      status: 'Pipeline',
      notizen: 'Über Tier-3 Tech-Tree-Kandidaten in Batch 3 übernommen.',
      sharepointUrl: '',
      websiteUrl: '',
      loesung: cand.startupPartner,
      projektbeschreibung: cand.loesungsansatz,
      problemstellung: cand.problemstellung,
      loesungsansatz: cand.loesungsansatz,
      statusNextSteps: 'Erstgespräch und Bedarfs-Check im Rahmen der Batch-3-Pipeline.',
      standortMehrwert: cand.standortMehrwert,
      todos: [
        { id: `${cand.id}-1`, text: 'Scouting-Erstgespräch & Bedarfsanalyse führen', completed: false, dueDate: '2027-03-31' },
        { id: `${cand.id}-2`, text: 'Lösungspartner-Match prüfen', completed: false, dueDate: '2027-06-30' },
      ],
    });
    setBlueprintFeedback(`Potenzial-Knoten „${cand.unternehmen}“ in Tier 3 (Batch 3) aktiviert.`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Horizontal Tech-Tree & Endgame Wonder */}
      <section className="bg-white rounded-xl border border-zinc-200 cardstock overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-base text-zs-deep-teal">
              Dürener Transformations-Tech-Tree (Ära 2025 &rarr; 2029+)
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Technologische Abhängigkeiten von Batch 1 über Skalierungs-Knoten bis zum Folgeprojekt „Paper &amp; Process Valley Düren“
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
            <span className="inline-flex items-center gap-1.5 text-[#00B4D8] font-bold">
              Tier 1 (Batch 1) &rarr;
            </span>
            <span className={`inline-flex items-center gap-1.5 font-bold ${tier1Progress.unlockedTier2 ? 'text-[#10B981]' : 'text-zinc-400'}`}>
              Tier 2 ({tier1Progress.unlockedTier2 ? 'erforscht / freigeschaltet' : 'gesperrt'}) &rarr;
            </span>
            <span className="inline-flex items-center gap-1.5 text-zs-deep-teal font-bold">
              Tier 3 &amp; Folgeantrag 2029+
            </span>
          </div>
        </div>

        <div className="p-5 overflow-x-auto">
          <div className="min-w-[920px] grid grid-cols-12 gap-4 items-stretch">
            {/* 4 Innovation Lanes spanning Cols 1-9 */}
            <div className="col-span-9 space-y-3">
              {/* Tier Column Headers */}
              <div className="grid grid-cols-12 gap-3 text-[10px] font-mono font-bold uppercase text-zinc-400 px-1">
                <div className="col-span-3">Innovationspfad</div>
                <div className="col-span-3">Tier 1 · Batch 1 (Aktiv)</div>
                <div className="col-span-3">Tier 2 · Batch 2 (Skalierung)</div>
                <div className="col-span-3">Tier 3 · Batch 3 &amp; Potenziale</div>
              </div>

              {INNOVATION_PATHS.map((path) => {
                const pathUcs = usecases.filter(path.match);
                const tier1 = pathUcs.filter((u) => u.batch === 'Batch 1');
                const tier2 = pathUcs.filter((u) => u.batch === 'Batch 2');
                const tier3 = pathUcs.filter((u) => u.batch === 'Batch 3' || u.batch === 'Batch 4');
                const candidates = TIER3_CANDIDATES.filter((c) => c.pathId === path.id);

                const renderNode = (u: UseCase, locked = false) => {
                  const isActive = u.status === 'aktiv' || u.status === 'abgeschlossen';
                  const isDone = u.status === 'abgeschlossen' || u.reifegrad === 'Produktiv';
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => onSelectUseCase(u.id)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                        isDone
                          ? 'bg-emerald-50/70 border-[#10B981] hover:bg-emerald-50'
                          : isActive
                          ? 'bg-cyan-50/60 border-[#00B4D8] hover:bg-cyan-50'
                          : locked
                          ? 'bg-zinc-50 border-zinc-200 opacity-75 hover:opacity-100'
                          : 'bg-white border-zinc-200 hover:border-[#0A2B32]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                        <span className="font-bold text-zs-blau-schwarz truncate">
                          {u.unternehmen.split('/')[0].trim()}
                        </span>
                        {locked ? (
                          <Lock className="w-3 h-3 text-zinc-400 shrink-0" />
                        ) : isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                        ) : (
                          <span className="text-[9px] text-zinc-500 shrink-0">{u.reifegrad}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-700 font-medium line-clamp-1 mt-0.5">
                        {u.startupPartner || u.loesung || u.titel}
                      </div>
                    </button>
                  );
                };

                return (
                  <div
                    key={path.id}
                    className="grid grid-cols-12 gap-3 items-center bg-zinc-50/60 border border-zinc-200/80 rounded-xl p-3"
                  >
                    {/* Path Label */}
                    <div className="col-span-3 pr-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: path.accent }}
                        />
                        <span className="font-display font-bold text-xs text-zs-blau-schwarz">
                          {path.title}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug">
                        {path.subtitle}
                      </p>
                    </div>

                    {/* Tier 1 */}
                    <div className="col-span-3 space-y-1.5">
                      {tier1.length > 0 ? (
                        tier1.map((u) => renderNode(u, false))
                      ) : (
                        <div className="text-[10px] font-mono text-zinc-400 italic px-2 py-2 border border-dashed border-zinc-200 rounded-lg">
                          Direktstart über Tier 2
                        </div>
                      )}
                    </div>

                    {/* Tier 2 */}
                    <div className="col-span-3 space-y-1.5">
                      {tier2.length > 0 ? (
                        tier2.map((u) => renderNode(u, !tier1Progress.unlockedTier2))
                      ) : (
                        <div className="text-[10px] font-mono text-zinc-400 italic px-2 py-2 border border-dashed border-zinc-200 rounded-lg">
                          Kein Tier-2-Knoten
                        </div>
                      )}
                    </div>

                    {/* Tier 3 & Candidates */}
                    <div className="col-span-3 space-y-1.5">
                      {tier3.map((u) => renderNode(u, false))}
                      {candidates.map((cand) => {
                        const already = usecases.some((u) =>
                          u.unternehmen
                            .toLowerCase()
                            .includes(cand.unternehmen.split('/')[0].trim().toLowerCase())
                        );
                        if (already) return null;
                        return (
                          <button
                            key={cand.id}
                            type="button"
                            onClick={() => handleAddCandidate(cand)}
                            className="w-full text-left p-2.5 rounded-lg border border-dashed border-zinc-300 bg-white/80 hover:border-[#0A2B32] hover:bg-white transition-all cursor-pointer"
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                              <span className="font-bold text-zs-deep-teal truncate">
                                {cand.unternehmen.split('/')[0].trim()}
                              </span>
                              <Plus className="w-3 h-3 text-[#10B981] shrink-0" />
                            </div>
                            <div className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                              Kandidat: {cand.thema.split(',')[1] || cand.titel}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cols 10-12: Endgame-Wonder / Epochen-Ziel 2029–2032 */}
            <div className="col-span-3 bg-[#0A2B32] text-white rounded-xl p-4 cardstock-teal flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#00B4D8] uppercase font-bold">
                  <span>Epochen-Ziel 2029–2032</span>
                  <Award className="w-4 h-4 text-zs-signal-gelb" />
                </div>
                <h3 className="font-display font-bold text-base leading-snug">
                  Paper &amp; Process Valley Düren
                </h3>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Konsortial-Piloten ab 04/2029: Jedes abgeschlossene Arbeitspaket in MiD-PCT füllt die Anschlussfähigkeits-Leiste für den Folgeantrag.
                </p>

                <div className="pt-1">
                  <div className="flex items-center justify-between text-xs font-mono mb-1 tabular-nums">
                    <span className="text-zinc-300">Anschlussfähigkeit</span>
                    <strong className="text-[#10B981]">{endgame.readinessPct} %</strong>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#00B4D8] to-[#10B981] transition-all duration-300"
                      style={{ width: `${endgame.readinessPct}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10 text-[11px] font-mono tabular-nums">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Booster vergeben</span>
                    <strong className="text-white">{endgame.boosterCount} / 12</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Branchen vernetzt</span>
                    <strong className="text-[#00B4D8]">{endgame.branchCount} / 3</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">BioökonomieREVIER</span>
                    <strong className={endgame.bioActive ? 'text-[#10B981]' : 'text-amber-300'}>
                      {endgame.bioActive ? 'Aktiv' : 'Offen'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 text-[10px] font-mono text-zinc-400">
                Meilensteine &amp; 0835-Vergaben schalten Tier-2-Knoten frei.
              </div>
            </div>
          </div>
        </div>
      </section>

      {blueprintFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-xs font-medium flex items-center justify-between gap-2">
          <span>{blueprintFeedback}</span>
          <button
            type="button"
            onClick={() => setBlueprintFeedback(null)}
            className="text-emerald-700 font-bold cursor-pointer"
          >
            Schließen
          </button>
        </div>
      )}

      {/* 2. Adjacencies, Blaupausen & Infrastruktur-Hubs (Pillar 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cluster-Synergien & Blaupausen */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-zinc-200 cardstock p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-sm text-zs-deep-teal flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#00B4D8]" />
                <span>Cluster-Synergien &amp; Transfer-Blaupausen</span>
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Nachbarschafts-Bonus: Geteilte Lösungsansätze und Redeker-Vergabemuster sparen 40 % Checklisten-Vorlauf
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {synergies.map((syn) => (
              <div
                key={syn.id}
                className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="text-xs font-bold text-zs-blau-schwarz">{syn.clusterName}</div>
                  <div className="text-[11px] text-zinc-600">{syn.sharedChallenge}</div>
                  <div className="text-[10px] font-mono text-[#0284c7]">
                    Blaupause: {syn.blueprintTitle} &middot; {syn.benefitLabel}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyBlueprint(syn.blueprintUseCaseId, syn.targetUseCaseIds, syn.clusterName)
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#0A2B32] text-white text-[11px] font-bold hover:bg-[#041422] transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center"
                >
                  <span>Blaupause übertragen</span>
                  <ArrowRight className="w-3 h-3 text-zs-signal-gelb" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Infrastruktur-Hubs als Spezial-Bezirke */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-zinc-200 cardstock p-5 space-y-4">
          <div>
            <h3 className="font-display font-bold text-sm text-zs-deep-teal flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#10B981]" />
              <span>Infrastruktur-Hubs (Spezial-Bezirke)</span>
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Multiplikatoren, die angedockte Use-Cases im Kreis Düren beschleunigen
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
            {hubs.map((hub) => (
              <div
                key={hub.id}
                className="p-3 rounded-lg border border-zinc-200 bg-white flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-bold text-xs text-zs-blau-schwarz">{hub.name}</div>
                  <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{hub.role}</div>
                  <div className="text-[11px] text-[#047857] mt-1 font-medium">
                    {hub.bonusEffect}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-zs-deep-teal tabular-nums">
                    <Layers className="w-3.5 h-3.5 text-[#00B4D8]" />
                    {hub.dockedUseCaseIds.length}
                  </span>
                  <div className="text-[9px] font-mono text-zinc-400">Use-Cases</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
