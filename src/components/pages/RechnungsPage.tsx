import React, { useState, useMemo, useEffect } from 'react';
import {
  Rechnungsbeleg,
  ProfiPositionCode,
  Vergabe,
  UseCase,
  SystemSettings,
} from '../../types';
import { DEFAULT_SETTINGS } from '../../data';
import {
  formatEuro,
  formatDate,
  downloadCSV,
  mapKategorieToProfiPosition,
  getFoerderfaehigerRechnungsBetrag,
  sumEuro,
  splitPercent9010,
  roundEuro,
  PROFI_POSITIONEN,
} from '../../utils';
import {
  Plus,
  Download,
  ArrowLeft,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface RechnungsPageProps {
  rechnungen: Rechnungsbeleg[];
  vergaben?: Vergabe[];
  usecases?: UseCase[];
  settings?: SystemSettings;
  activeYear: string | null;
  activeYearLabel: string;
  onAddRechnung: (beleg: Omit<Rechnungsbeleg, 'id'>) => { ok: boolean; error?: string } | void;
  onUpdateRechnungStatus: (
    id: number,
    status: Rechnungsbeleg['status']
  ) => { ok: boolean; error?: string } | void;
  initialCategory?: string;
  onCategoryChange?: (cat: string) => void;
  initialProfiPos?: ProfiPositionCode | '';
  onProfiPosChange?: (pos: ProfiPositionCode | '') => void;
  onBackToCockpit?: () => void;
}

export default function RechnungsPage({
  rechnungen,
  vergaben = [],
  usecases = [],
  settings = DEFAULT_SETTINGS,
  activeYear,
  activeYearLabel,
  onAddRechnung,
  onUpdateRechnungStatus,
  initialCategory = 'all',
  onCategoryChange,
  initialProfiPos = '',
  onProfiPosChange,
  onBackToCockpit,
}: RechnungsPageProps) {
  const [catFilter, setCatFilter] = useState(initialCategory);
  const [profiFilter, setProfiFilter] = useState<ProfiPositionCode | ''>(initialProfiPos);
  const [gateError, setGateError] = useState<string | null>(null);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [rNum, setRNum] = useState('');
  const [rSteller, setRSteller] = useState('');
  const [rDesc, setRDesc] = useState('');
  const [rKat, setRKat] = useState('Vergabeaufträge');
  const [rPos, setRPos] = useState<ProfiPositionCode>('0835');
  const [rDat, setRDat] = useState(new Date().toISOString().slice(0, 10));
  const [rZahl, setRZahl] = useState('');
  const [rNetto, setRNetto] = useState('');
  const [rMwstSatz, setRMwstSatz] = useState<0 | 7 | 19 | 'brutto'>(19);
  const [rAp, setRAp] = useState('AP2 – Technologietransfer');
  const [rFoerd, setRFoerd] = useState(true);
  const [rVergabeId, setRVergabeId] = useState<string>('');
  const [rUseCaseId, setRUseCaseId] = useState<string>('');
  const [rStatus, setRStatus] = useState<Rechnungsbeleg['status']>('ENTWURF');
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    setCatFilter(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setProfiFilter(initialProfiPos);
  }, [initialProfiPos]);

  const filtered = useMemo(() => {
    return rechnungen.filter((r) => {
      if (activeYear) {
        if (activeYear === 'gesamt25' && r.foerderjahr !== 2025) return false;
        if (activeYear === 'mrz29' && r.foerderjahr !== 2029) return false;
        if (activeYear !== 'gesamt25' && activeYear !== 'mrz29' && String(r.foerderjahr) !== activeYear)
          return false;
      }
      if (catFilter !== 'all' && r.kostenkategorie !== catFilter) return false;
      if (profiFilter) {
        const effPos = mapKategorieToProfiPosition(r.kostenkategorie, r.profiPosition);
        if (effPos !== profiFilter) return false;
      }
      return true;
    });
  }, [rechnungen, activeYear, catFilter, profiFilter]);

  const totalFoerderfaehig = useMemo(
    () =>
      sumEuro(
        filtered.map((r) =>
          getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt)
        )
      ),
    [filtered, settings.vorsteuerabzugsberechtigt]
  );

  const totalSplit = useMemo(() => splitPercent9010(totalFoerderfaehig), [totalFoerderfaehig]);

  const previewNetto = parseFloat(rNetto) || 0;
  const previewBrutto =
    rMwstSatz === 'brutto'
      ? roundEuro(previewNetto)
      : roundEuro(previewNetto * (1 + rMwstSatz / 100));
  const previewFoerder = rFoerd
    ? settings.vorsteuerabzugsberechtigt && rMwstSatz !== 'brutto'
      ? roundEuro(previewNetto)
      : previewBrutto
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    const yr = parseInt(rDat.slice(0, 4), 10) || 2026;
    const month = parseInt(rDat.slice(5, 7), 10) || 1;
    const q = Math.ceil(month / 3);

    const res = onAddRechnung({
      rechnungsnummer: rNum.trim() || `RE-${Date.now().toString().slice(-4)}`,
      rechnungssteller: rSteller.trim() || 'Lieferant',
      leistungsbeschreibung: rDesc.trim() || 'Sachbeleg',
      rechnungsdatum: rDat,
      zahlungsdatum: rZahl || null,
      kostenkategorie: rKat,
      profiPosition: rPos,
      foerderjahr: yr,
      quartal: q,
      arbeitspaket: rAp,
      betragNetto: roundEuro(previewNetto),
      betragBrutto: previewBrutto,
      mwstSatz: rMwstSatz,
      foerderfaehigerBetrag: previewFoerder,
      foerderfaehig: rFoerd,
      vergabeId: rVergabeId ? parseInt(rVergabeId, 10) : null,
      useCaseId: rUseCaseId ? parseInt(rUseCaseId, 10) : null,
      status: rStatus,
    });

    if (res && res.ok === false) {
      setModalError(res.error || 'Compliance-Gate: Buchung abgelehnt.');
      return;
    }

    setShowAddModal(false);
    setRNum('');
    setRSteller('');
    setRDesc('');
    setRNetto('');
    setRZahl('');
    setRVergabeId('');
    setRUseCaseId('');
    setRStatus('ENTWURF');
  };

  const handleStatusChange = (id: number, nextStatus: Rechnungsbeleg['status']) => {
    setGateError(null);
    const res = onUpdateRechnungStatus(id, nextStatus);
    if (res && res.ok === false) {
      setGateError(res.error || 'Compliance-Gate: Statusänderung blockiert.');
    }
  };

  const uniqueCats = useMemo(
    () => Array.from(new Set(rechnungen.map((r) => r.kostenkategorie))).filter(Boolean),
    [rechnungen]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {onBackToCockpit && (
            <button
              onClick={onBackToCockpit}
              className="text-xs font-mono text-zinc-500 hover:text-zs-blau-schwarz flex items-center gap-1 mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Zurück zum Cockpit</span>
            </button>
          )}
          <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
            Sachbelege 0831–0843
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            {activeYearLabel} &middot; § 15 UStG Modus:{' '}
            <strong className="text-zs-blau-schwarz">
              {settings.vorsteuerabzugsberechtigt
                ? 'Vorsteuerabzugsberechtigt (Netto förderfähig)'
                : 'Nicht vorsteuerabzugsberechtigt (Brutto förderfähig)'}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() =>
              downloadCSV(
                'Sachbelege_0831_0843.csv',
                [
                  ['Belegnr', 'Kreditor', 'Pos.', 'Kategorie', 'Jahr', 'Netto', 'Brutto', 'Förderfähig', 'Status'],
                  ...filtered.map((r) => [
                    r.rechnungsnummer,
                    r.rechnungssteller,
                    mapKategorieToProfiPosition(r.kostenkategorie, r.profiPosition),
                    r.kostenkategorie,
                    r.foerderjahr,
                    r.betragNetto,
                    r.betragBrutto,
                    getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt),
                    r.status,
                  ]),
                ]
              )
            }
            className="px-3.5 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-semibold hover:bg-zinc-50 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => {
              setModalError(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-lg bg-zs-blau-schwarz text-white text-xs font-bold hover:bg-[#08243d] flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-zs-signal-gelb" />
            <span>Sachbeleg erfassen</span>
          </button>
        </div>
      </div>

      {/* Inline Compliance-Gate Error Banner */}
      {gateError && (
        <div className="bg-red-50 border border-red-300 text-red-900 rounded-xl p-4 flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
            <div>
              <strong>Compliance-Gate blockiert Einreichung:</strong> {gateError}
            </div>
          </div>
          <button
            onClick={() => setGateError(null)}
            className="text-red-700 font-bold hover:underline cursor-pointer shrink-0"
          >
            Schließen
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-[11px] font-mono text-zinc-500 uppercase">Förderfähige Ausgaben (gefiltert)</div>
          <div className="text-2xl font-mono font-bold text-zs-blau-schwarz tabular-nums mt-1">
            {formatEuro(totalFoerderfaehig, 2)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-[11px] font-mono text-zinc-500 uppercase">90 % Bundesanteil (BAFA)</div>
          <div className="text-2xl font-mono font-bold text-[#58B49D] tabular-nums mt-1">
            {formatEuro(totalSplit.bund90, 2)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-[11px] font-mono text-zinc-500 uppercase">10 % Eigenanteil (WIN.DN)</div>
          <div className="text-2xl font-mono font-bold text-[#BA8B68] tabular-nums mt-1">
            {formatEuro(totalSplit.eigen10, 2)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={profiFilter}
          onChange={(e) => {
            const val = e.target.value as ProfiPositionCode | '';
            setProfiFilter(val);
            onProfiPosChange?.(val);
          }}
          className="px-3 py-1.5 border border-zinc-200 rounded-lg bg-white text-xs font-mono font-semibold text-zs-blau-schwarz"
        >
          <option value="">Alle profi-Positionen (0831–0843)</option>
          {PROFI_POSITIONEN.filter((p) => ['0831', '0835', '0843'].includes(p.code)).map((p) => (
            <option key={p.code} value={p.code}>
              Pos. {p.displayCode} · {p.kurzBezeichnung}
            </option>
          ))}
        </select>

        <select
          value={catFilter}
          onChange={(e) => {
            setCatFilter(e.target.value);
            onCategoryChange?.(e.target.value);
          }}
          className="px-3 py-1.5 border border-zinc-200 rounded-lg bg-white text-xs font-semibold text-zs-blau-schwarz"
        >
          <option value="all">Alle Kostenkategorien</option>
          {uniqueCats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Tabelle */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] text-zinc-500 uppercase">
                <th className="p-3 pl-5">Beleg / Kreditor</th>
                <th className="p-3">Pos. / Kat.</th>
                <th className="p-3">Datum / Zahlung</th>
                <th className="p-3 text-right">Netto</th>
                <th className="p-3 text-right">Brutto</th>
                <th className="p-3 text-right">Förderfähig</th>
                <th className="p-3 pr-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-zinc-400 font-mono">
                    Keine Sachbelege im aktuellen Filter gefunden.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const pos = mapKategorieToProfiPosition(r.kostenkategorie, r.profiPosition);
                  const ff = getFoerderfaehigerRechnungsBetrag(r, settings.vorsteuerabzugsberechtigt);
                  const linkedVergabe = r.vergabeId
                    ? vergaben.find((v) => v.id === r.vergabeId)
                    : null;
                  const linkedUc = r.useCaseId
                    ? usecases.find((u) => u.id === r.useCaseId)
                    : null;
                  return (
                    <tr key={r.id} className="hover:bg-zinc-50/70">
                      <td className="p-3 pl-5">
                        <div className="font-bold text-zs-blau-schwarz">
                          {r.rechnungsnummer} &middot; {r.rechnungssteller}
                        </div>
                        <div className="text-[11px] text-zinc-500">{r.leistungsbeschreibung}</div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {linkedVergabe && (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                                linkedVergabe.bafaFreigabe
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              Vergabe: {linkedVergabe.titel} (
                              {linkedVergabe.bafaFreigabe ? 'BAFA OK' : 'BAFA fehlt'})
                            </span>
                          )}
                          {linkedUc && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700">
                              Use-Case: {linkedUc.unternehmen}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 font-mono font-bold text-zs-blau-schwarz text-[11px]">
                          {pos}
                        </span>
                        <div className="text-[11px] text-zinc-500 mt-0.5">{r.kostenkategorie}</div>
                      </td>
                      <td className="p-3 font-mono text-zinc-600 text-[11px] tabular-nums">
                        <div>Re: {formatDate(r.rechnungsdatum)}</div>
                        <div>Za: {r.zahlungsdatum ? formatDate(r.zahlungsdatum) : 'offen'}</div>
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-zinc-600">
                        {formatEuro(r.betragNetto, 2)}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-zinc-600">
                        {formatEuro(r.betragBrutto, 2)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold tabular-nums text-zs-blau-schwarz">
                        {r.foerderfaehig ? formatEuro(ff, 2) : '0,00 € (n.f.)'}
                      </td>
                      <td className="p-3 pr-5 text-center">
                        <select
                          value={r.status}
                          onChange={(e) =>
                            handleStatusChange(r.id, e.target.value as Rechnungsbeleg['status'])
                          }
                          className="px-2 py-1 border border-zinc-200 rounded text-xs font-mono bg-white cursor-pointer"
                        >
                          <option value="ENTWURF">ENTWURF</option>
                          <option value="IN_PRUEFUNG">IN_PRUEFUNG</option>
                          <option value="EINGEREICHT">EINGEREICHT</option>
                          <option value="ARCHIVIERT">ARCHIVIERT</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Sachbeleg erfassen */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-[#041422]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddModal(false)}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-zinc-200 max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-display font-bold text-lg text-zs-blau-schwarz">
              Neuen Sachbeleg erfassen (0831–0843)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Rechnungsnummer</label>
                <input
                  type="text"
                  required
                  value={rNum}
                  onChange={(e) => setRNum(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Kreditor / Aussteller</label>
                <input
                  type="text"
                  required
                  value={rSteller}
                  onChange={(e) => setRSteller(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Leistungsbeschreibung</label>
                <input
                  type="text"
                  required
                  value={rDesc}
                  onChange={(e) => setRDesc(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">profi-Position</label>
                <select
                  value={rPos}
                  onChange={(e) => setRPos(e.target.value as ProfiPositionCode)}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white font-mono"
                >
                  <option value="0831">0831 · Dienstreisen</option>
                  <option value="0835">0835 · Vergabe / Fremdleistung</option>
                  <option value="0843">0843 · Sächl. Verwaltungsausgaben</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Kategorie</label>
                <input
                  type="text"
                  value={rKat}
                  onChange={(e) => setRKat(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Rechnungsdatum</label>
                <input
                  type="date"
                  value={rDat}
                  onChange={(e) => setRDat(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Zahlungsdatum (optional)</label>
                <input
                  type="date"
                  value={rZahl}
                  onChange={(e) => setRZahl(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
                  Basisbetrag (€ {rMwstSatz === 'brutto' ? 'Brutto' : 'Netto'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={rNetto}
                  onChange={(e) => setRNetto(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Steuersatz (§ 15 UStG)</label>
                <select
                  value={String(rMwstSatz)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRMwstSatz(v === 'brutto' ? 'brutto' : (parseInt(v, 10) as 0 | 7 | 19));
                  }}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white font-mono"
                >
                  <option value="19">19 % USt (Regelsatz)</option>
                  <option value="7">7 % USt (ermäßigt)</option>
                  <option value="0">0 % (steuerfrei / § 13b)</option>
                  <option value="brutto">Brutto = Förderfähig</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
                  Verknüpfte Vergabe (Compliance-Gate)
                </label>
                <select
                  value={rVergabeId}
                  onChange={(e) => setRVergabeId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white"
                >
                  <option value="">– Keine Vergabe verknüpft –</option>
                  {vergaben.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.titel} ({v.bafaFreigabe ? 'BAFA OK' : 'BAFA fehlt!'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
                  Verknüpfter Use-Case (optional)
                </label>
                <select
                  value={rUseCaseId}
                  onChange={(e) => setRUseCaseId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white"
                >
                  <option value="">– Kein Use-Case –</option>
                  {usecases.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.titel} ({u.unternehmen})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Arbeitspaket</label>
                <input
                  type="text"
                  value={rAp}
                  onChange={(e) => setRAp(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Status</label>
                <select
                  value={rStatus}
                  onChange={(e) => setRStatus(e.target.value as Rechnungsbeleg['status'])}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white font-mono"
                >
                  <option value="ENTWURF">ENTWURF</option>
                  <option value="IN_PRUEFUNG">IN_PRUEFUNG</option>
                  <option value="EINGEREICHT">EINGEREICHT</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="r-foerd"
                  checked={rFoerd}
                  onChange={(e) => setRFoerd(e.target.checked)}
                  className="w-4 h-4 accent-zs-blau-schwarz"
                />
                <label htmlFor="r-foerd" className="font-semibold text-zs-blau-schwarz cursor-pointer">
                  Förderfähig
                </label>
              </div>
              <div className="text-zinc-600 tabular-nums">
                Brutto: <strong>{formatEuro(previewBrutto, 2)}</strong> &middot; Förderbasis (§ 15 UStG):{' '}
                <strong className="text-zs-blau-schwarz">{formatEuro(previewFoerder, 2)}</strong>
              </div>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-zs-signal-gelb text-zs-blau-schwarz text-xs font-bold cursor-pointer"
              >
                Beleg speichern
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
