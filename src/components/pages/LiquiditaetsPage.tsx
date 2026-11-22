import React, { useMemo } from 'react';
import {
  PersonalEintrag,
  Rechnungsbeleg,
  Mittelabruf,
  Buchung,
  SystemSettings,
} from '../../types';
import { DEFAULT_SETTINGS } from '../../data';
import {
  formatEuro,
  getFoerderfaehigerRechnungsBetrag,
  addEuro,
  subEuro,
  sumEuro,
  mulPercent,
} from '../../utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface LiquiditaetsPageProps {
  personal: PersonalEintrag[];
  rechnungen: Rechnungsbeleg[];
  mittelabrufe: Mittelabruf[];
  buchungen: Buchung[];
  settings?: SystemSettings;
  activeYear: string | null;
  activeYearLabel: string;
}

export default function LiquiditaetsPage({
  personal,
  rechnungen,
  mittelabrufe,
  settings = DEFAULT_SETTINGS,
  activeYear,
  activeYearLabel,
}: LiquiditaetsPageProps) {
  const scopeMatches = (foerderjahr: number) => {
    if (!activeYear) return true;
    if (activeYear === 'gesamt25') return foerderjahr === 2025;
    if (activeYear === 'mrz29') return foerderjahr === 2029;
    return String(foerderjahr) === activeYear;
  };

  const fPers = useMemo(
    () => personal.filter((p) => scopeMatches(p.foerderjahr)),
    [personal, activeYear]
  );
  const fRech = useMemo(
    () => rechnungen.filter((r) => scopeMatches(r.foerderjahr)),
    [rechnungen, activeYear]
  );
  const fAbr = useMemo(
    () => mittelabrufe.filter((a) => scopeMatches(a.foerderjahr)),
    [mittelabrufe, activeYear]
  );

  const totalAbfluesse = useMemo(() => {
    const pSum = sumEuro(fPers.map((p) => p.foerderfaehig || 0));
    const rSum = sumEuro(
      fRech.map((r) =>
        getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt)
      )
    );
    return addEuro(pSum, rSum);
  }, [fPers, fRech, settings.vorsteuerabzugsberechtigt]);

  const totalZufluesse = useMemo(
    () => sumEuro(fAbr.map((a) => a.eingegangen || 0)),
    [fAbr]
  );

  const bundAnspruch = useMemo(() => mulPercent(totalAbfluesse, 90), [totalAbfluesse]);
  const vorfinanzierungsDelta = useMemo(
    () => subEuro(bundAnspruch, totalZufluesse),
    [bundAnspruch, totalZufluesse]
  );

  const chartData = useMemo(() => {
    const buckets: Record<string, { label: string; abfluss: number; zufluss: number }> = {};
    const ensure = (k: string) => {
      if (!buckets[k]) buckets[k] = { label: k, abfluss: 0, zufluss: 0 };
    };

    fPers.forEach((p) => {
      const k = `${p.jahr}-Q${p.quartal}`;
      ensure(k);
      buckets[k].abfluss = addEuro(buckets[k].abfluss, p.foerderfaehig || 0);
    });
    fRech.forEach((r) => {
      const k = `${r.foerderjahr}-Q${r.quartal}`;
      ensure(k);
      const ff = getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt);
      buckets[k].abfluss = addEuro(buckets[k].abfluss, ff);
    });
    fAbr.forEach((a) => {
      const k = `${a.foerderjahr}-Q${a.quartal}`;
      ensure(k);
      buckets[k].zufluss = addEuro(buckets[k].zufluss, a.eingegangen || 0);
    });

    const keys = Object.keys(buckets).sort();
    let cumAbfluss = 0;
    let cumZufluss = 0;
    return keys.map((k) => {
      cumAbfluss = addEuro(cumAbfluss, buckets[k].abfluss);
      cumZufluss = addEuro(cumZufluss, buckets[k].zufluss);
      return {
        quartal: k,
        AbflussKumuliert: cumAbfluss,
        ZuflussKumuliert: cumZufluss,
        Vorfinanzierung: subEuro(mulPercent(cumAbfluss, 90), cumZufluss),
      };
    });
  }, [fPers, fRech, fAbr, settings.vorsteuerabzugsberechtigt]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
          Liquiditätsüberwachung
        </h1>
        <p className="text-xs font-mono text-zinc-500 mt-1">
          Vorfinanzierungssaldo WIN.DN GmbH &middot; 90 % Bundesanteil vs. Kassenabflüsse &middot; {activeYearLabel}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-zinc-200">
          <div className="text-[11px] font-mono text-zinc-500 uppercase">Förderfähige Kassenabflüsse</div>
          <div className="text-2xl font-mono font-bold text-zs-blau-schwarz tabular-nums mt-1">
            {formatEuro(totalAbfluesse, 2)}
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            90 % Erstattungsanspruch: {formatEuro(bundAnspruch, 2)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-zinc-200">
          <div className="text-[11px] font-mono text-zinc-500 uppercase">Eingegangene Bundesmittel</div>
          <div className="text-2xl font-mono font-bold text-[#58B49D] tabular-nums mt-1">
            {formatEuro(totalZufluesse, 2)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-zinc-200">
          <div className="text-[11px] font-mono text-zinc-500 uppercase">Vorfinanzierungs-Delta</div>
          <div
            className={`text-2xl font-mono font-bold tabular-nums mt-1 ${
              vorfinanzierungsDelta > 0 ? 'text-amber-700' : 'text-[#58B49D]'
            }`}
          >
            {formatEuro(vorfinanzierungsDelta, 2)}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-zinc-200">
        <h2 className="font-display font-bold text-base text-zs-blau-schwarz mb-4">
          Kumulierte Mittelabflüsse vs. BAFA-Erstattungen (Quartalsverlauf)
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="quartal" tick={{ fontSize: 11, fill: '#52525b' }} />
              <YAxis
                tick={{ fontSize: 10, fill: '#71717a' }}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                width={45}
              />
              <Tooltip formatter={(val: any) => formatEuro(Number(val), 2)} />
              <Area
                type="monotone"
                dataKey="AbflussKumuliert"
                name="Ausgaben kumuliert (100 %)"
                stroke="#041422"
                fill="#041422"
                fillOpacity={0.12}
              />
              <Area
                type="monotone"
                dataKey="ZuflussKumuliert"
                name="BAFA Zuflüsse kumuliert"
                stroke="#58B49D"
                fill="#58B49D"
                fillOpacity={0.25}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
