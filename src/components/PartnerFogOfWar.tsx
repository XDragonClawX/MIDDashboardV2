import React, { useMemo, useState } from 'react';
import { Partner, PartnerMatch, OekoprofitCheckup, UseCase } from '../types';
import { Eye, Compass, CheckCircle2, ArrowRight, Layers } from 'lucide-react';

interface PartnerFogOfWarProps {
  partners: Partner[];
  matches: PartnerMatch[];
  oekoprofitCheckups?: OekoprofitCheckup[];
  usecases?: UseCase[];
  onUpdatePartner: (id: number, patch: Partial<Partner>) => void;
  onOpenMatrix: () => void;
}

type ReconStage = 'unaufgedeckt' | 'gescoutet' | 'voll_kartiert';

function classifyReconStage(
  p: Partner,
  matches: PartnerMatch[],
  oekoprofitCheckups: OekoprofitCheckup[]
): { stage: ReconStage; tags: string[]; reason: string } {
  const hasActivePilotMatch = matches.some(
    (m) => (m.industryId === p.id || m.providerId === p.id) && m.type === 'ACTIVE_PILOT'
  );
  const matchedCheckup = oekoprofitCheckups.find(
    (c) =>
      c.startupName.toLowerCase().includes(p.name.split(' ')[0].toLowerCase()) ||
      p.name.toLowerCase().includes(c.startupName.split(' ')[0].toLowerCase())
  );
  const oekoTermin3Done = Boolean(matchedCheckup?.abschlussReportingAbgegeben);
  const oekoTermin1Done = Boolean(matchedCheckup?.protokoll1Abgegeben || matchedCheckup?.termin1Datum);

  const tags: string[] = [];
  if (p.branche) tags.push(p.branche);
  const txt = `${p.tech || ''} ${p.beschr || ''} ${p.notizen || ''} ${p.useCase || ''}`.toLowerCase();
  if (txt.includes('abwärme') || txt.includes('wärme') || txt.includes('energie')) tags.push('Abwärme / Energie');
  if (txt.includes('ki') || txt.includes('vision') || txt.includes('sensor')) tags.push('KI / Vision');
  if (txt.includes('faser') || txt.includes('papier') || txt.includes('bio') || txt.includes('recycling')) tags.push('Faser / Kreislauf');
  if (txt.includes('wasserstoff') || txt.includes('h2')) tags.push('H₂-Prozess');

  if (
    hasActivePilotMatch ||
    oekoTermin3Done ||
    p.status === 'Pilot läuft' ||
    p.status === 'abgeschlossen'
  ) {
    return {
      stage: 'voll_kartiert',
      tags: tags.slice(0, 3),
      reason: oekoTermin3Done
        ? 'Ökoprofit Termin 3 abgeschlossen'
        : hasActivePilotMatch
        ? 'ACTIVE_PILOT in Matchmaking-Matrix'
        : 'Aktiver Pilot / vollständig quantifiziert',
    };
  }

  const hasPotentialMatch = matches.some(
    (m) => (m.industryId === p.id || m.providerId === p.id) && m.type !== 'NONE'
  );
  if (
    oekoTermin1Done ||
    hasPotentialMatch ||
    p.status === 'aktiv' ||
    p.status === 'in Kontakt' ||
    p.status === 'Vorbereitung'
  ) {
    return {
      stage: 'gescoutet',
      tags: tags.slice(0, 3),
      reason: oekoTermin1Done
        ? 'Ökoprofit Termin 1 (Skalierungsanalyse)'
        : 'Erstgespräch / Bedarfs-Tags aufgedeckt',
    };
  }

  return {
    stage: 'unaufgedeckt',
    tags: [p.branche || 'Sektor offen'],
    reason: 'Nur aus Excel-Import bekannt (Schatten-Silhouette)',
  };
}

export default function PartnerFogOfWar({
  partners,
  matches,
  oekoprofitCheckups = [],
  onUpdatePartner,
  onOpenMatrix,
}: PartnerFogOfWarProps) {
  const [stageFilter, setStageFilter] = useState<'all' | ReconStage>('all');

  const classified = useMemo(
    () =>
      partners.map((p) => ({
        partner: p,
        ...classifyReconStage(p, matches, oekoprofitCheckups),
      })),
    [partners, matches, oekoprofitCheckups]
  );

  const counts = useMemo(
    () => ({
      unaufgedeckt: classified.filter((c) => c.stage === 'unaufgedeckt').length,
      gescoutet: classified.filter((c) => c.stage === 'gescoutet').length,
      voll_kartiert: classified.filter((c) => c.stage === 'voll_kartiert').length,
    }),
    [classified]
  );

  const visible = classified.filter((c) => (stageFilter === 'all' ? true : c.stage === stageFilter));

  const handleAdvanceRecon = (p: Partner, current: ReconStage) => {
    if (current === 'unaufgedeckt') {
      onUpdatePartner(p.id, { status: 'in Kontakt' });
    } else if (current === 'gescoutet') {
      onUpdatePartner(p.id, { status: 'Pilot läuft' });
    } else {
      onOpenMatrix();
    }
  };

  return (
    <section className="bg-white rounded-xl border border-zinc-200 cardstock overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-base text-zs-deep-teal">
            Nebel des Wissens (3-Stufen-Ökosystem-Aufklärung)
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Fortschreitende Erkundung regionaler Industrieunternehmen &amp; Startups über Erstgespräche und Ökoprofit-Termine 1–3
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 bg-zinc-100 p-1 rounded-lg text-[11px] font-mono">
          <button
            type="button"
            onClick={() => setStageFilter('all')}
            className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${
              stageFilter === 'all' ? 'bg-[#0A2B32] text-white' : 'text-zinc-600 hover:text-zs-blau-schwarz'
            }`}
          >
            Alle ({partners.length})
          </button>
          <button
            type="button"
            onClick={() => setStageFilter('unaufgedeckt')}
            className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${
              stageFilter === 'unaufgedeckt' ? 'bg-slate-600 text-white' : 'text-zinc-600 hover:text-zs-blau-schwarz'
            }`}
          >
            Unaufgedeckt ({counts.unaufgedeckt})
          </button>
          <button
            type="button"
            onClick={() => setStageFilter('gescoutet')}
            className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${
              stageFilter === 'gescoutet' ? 'bg-[#00B4D8] text-[#041422]' : 'text-zinc-600 hover:text-zs-blau-schwarz'
            }`}
          >
            Gescoutet ({counts.gescoutet})
          </button>
          <button
            type="button"
            onClick={() => setStageFilter('voll_kartiert')}
            className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${
              stageFilter === 'voll_kartiert' ? 'bg-[#10B981] text-[#041422]' : 'text-zinc-600 hover:text-zs-blau-schwarz'
            }`}
          >
            Voll kartiert ({counts.voll_kartiert})
          </button>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {visible.map(({ partner: p, stage, tags, reason }) => {
          const isFog = stage === 'unaufgedeckt';
          const isScouted = stage === 'gescoutet';
          const isMapped = stage === 'voll_kartiert';

          return (
            <div
              key={p.id}
              className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                isMapped
                  ? 'border-[#10B981]/60 bg-emerald-50/35'
                  : isScouted
                  ? 'border-[#00B4D8]/60 bg-cyan-50/30'
                  : 'border-dashed border-slate-300 bg-slate-100/70'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                  <span
                    className={`font-bold uppercase inline-flex items-center gap-1 ${
                      isMapped
                        ? 'text-[#047857]'
                        : isScouted
                        ? 'text-[#0284c7]'
                        : 'text-slate-500'
                    }`}
                  >
                    {isMapped ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isScouted ? (
                      <Compass className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 opacity-60" />
                    )}
                    {isMapped
                      ? 'Voll kartiert · Quelle aktiv'
                      : isScouted
                      ? 'Gescoutet · Terrain sichtbar'
                      : 'Unaufgedeckt · Nebel'}
                  </span>
                  <span className="text-zinc-400 truncate">{p.ort || 'Kreis Düren'}</span>
                </div>

                <div>
                  <h3 className={`font-display font-bold text-sm ${isFog ? 'text-slate-600' : 'text-zs-blau-schwarz'}`}>
                    {p.name}
                  </h3>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {p.typ} &middot; {reason}
                  </div>
                </div>

                <div className="text-[10px] font-mono text-zinc-600">
                  {isFog ? (
                    <span className="italic text-slate-400">
                      Bedarfs-Tags noch im Nebel (Erstgespräch / Ökoprofit Termin 1 ausstehend)
                    </span>
                  ) : (
                    <span>Tags: {tags.join(' · ')}</span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-200/70 flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-zinc-400 inline-flex items-center gap-1">
                  <Layers className="w-3 h-3" /> {p.status}
                </span>
                <button
                  type="button"
                  onClick={() => handleAdvanceRecon(p, stage)}
                  className="px-2.5 py-1 rounded bg-[#0A2B32] text-white text-[10px] font-bold hover:bg-[#041422] transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <span>
                    {isFog
                      ? 'Scouting starten'
                      : isScouted
                      ? 'Voll kartieren'
                      : 'Zum Matchmaking'}
                  </span>
                  <ArrowRight className="w-3 h-3 text-zs-signal-gelb" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
