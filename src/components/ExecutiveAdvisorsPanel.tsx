import React from 'react';
import { ExecutiveAdvisor } from '../utils';
import { ArrowRight } from 'lucide-react';

interface ExecutiveAdvisorsPanelProps {
  advisors: ExecutiveAdvisor[];
  onNavigate: (targetPage: string, filters: Record<string, any>) => void;
}

function AdvisorPapercutAvatar({
  id,
  status,
}: {
  id: ExecutiveAdvisor['id'];
  status: ExecutiveAdvisor['status'];
}) {
  const accent =
    status === 'alert'
      ? '#dc2626'
      : status === 'attention'
      ? '#00B4D8'
      : '#10B981';

  return (
    <svg
      viewBox="0 0 48 48"
      className="w-11 h-11 shrink-0 rounded-lg bg-[#0A2B32] border border-white/10"
      aria-hidden="true"
    >
      {/* Background papercut geometric facet */}
      <polygon points="0,0 48,0 48,28 0,40" fill="#0d3740" />
      <polygon points="24,0 48,0 48,48 16,48" fill="#072026" opacity="0.7" />
      {/* Accent shoulder ribbon */}
      <path d="M 8 48 L 14 34 L 34 34 L 40 48 Z" fill={accent} opacity="0.9" />
      {/* Low-poly head silhouette */}
      <polygon points="24,10 31,15 30,26 24,30 18,26 17,15" fill="#e2e8f0" />
      <polygon points="24,10 31,15 30,26 24,30" fill="#cbd5e1" />
      {/* Advisor-specific distinctive silhouette detail */}
      {id === 'kaemmerer' && (
        <>
          {/* Crisp rectangular glasses & tie */}
          <rect x="19" y="18" width="4" height="3" fill="none" stroke="#041422" strokeWidth="1" />
          <rect x="25" y="18" width="4" height="3" fill="none" stroke="#041422" strokeWidth="1" />
          <polygon points="24,34 26,43 24,46 22,43" fill="#F9FF00" />
        </>
      )}
      {id === 'justiziarin' && (
        <>
          {/* Crisp bob silhouette & collar */}
          <path d="M 16 20 Q 16 8 24 8 Q 32 8 32 20 L 30 14 L 18 14 Z" fill="#041422" />
          <polygon points="20,34 24,39 28,34" fill="#ffffff" />
        </>
      )}
      {id === 'architekt' && (
        <>
          {/* Architectural lapel & geometric badge */}
          <polygon points="17,14 24,9 31,14 24,12" fill="#0A2B32" />
          <circle cx="31" cy="39" r="2.2" fill="#F9FF00" />
        </>
      )}
    </svg>
  );
}

export default function ExecutiveAdvisorsPanel({
  advisors,
  onNavigate,
}: ExecutiveAdvisorsPanelProps) {
  return (
    <section aria-label="Berater-Stab" className="space-y-2.5">
      <div className="flex items-center justify-between px-0.5">
        <div>
          <h2 className="font-display font-bold text-sm text-zs-deep-teal">
            Berater-Stab &amp; Lageeinschätzung
          </h2>
          <p className="text-xs text-zinc-500">
            Live-Diagnose aus Belegen, Zahlungsanforderungen, Fristen und Use-Case-Batches
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {advisors.map((adv) => {
          const statusColor =
            adv.status === 'alert'
              ? 'text-red-700'
              : adv.status === 'attention'
              ? 'text-[#0284c7]'
              : 'text-[#10B981]';
          const statusLabel =
            adv.status === 'alert'
              ? 'Handlungsbedarf'
              : adv.status === 'attention'
              ? 'Prüfen'
              : 'Im Korridor';

          return (
            <div
              key={adv.id}
              className="bg-white rounded-xl border border-zinc-200 cardstock p-4 flex flex-col justify-between gap-3"
            >
              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <AdvisorPapercutAvatar id={adv.id} status={adv.status} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-mono font-bold uppercase ${statusColor}`}>
                        {statusLabel}
                      </span>
                      <span className="text-xs font-mono text-zinc-500 truncate">
                        {adv.role}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-sm text-zs-blau-schwarz leading-tight mt-0.5">
                      {adv.name}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 leading-relaxed">
                  „{adv.message}“
                </p>
              </div>

              <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-zinc-500 tabular-nums truncate">
                  {adv.metricLabel}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate(adv.targetPage, adv.filters)}
                  className="px-3 py-1.5 rounded-lg bg-[#0A2B32] text-white text-xs font-bold hover:bg-[#041422] transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>{adv.actionLabel}</span>
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
