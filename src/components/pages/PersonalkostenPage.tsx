import React, { useState, useMemo, useEffect } from 'react';
import { PersonalEintrag, MitarbeiterStamm, SystemSettings } from '../../types';
import { AZA_JAHRE, DEFAULT_SETTINGS, getAzaPlan } from '../../data';
import {
  formatEuro,
  downloadCSV,
  splitPersonalToProfi,
  anonymizeEmployeeName,
  mulPercent,
  subEuro,
  addEuro,
  sumEuro,
  roundEuro,
} from '../../utils';
import {
  Plus,
  Download,
  UserPlus,
  Edit3,
  EyeOff,
  Users,
} from 'lucide-react';

export const TVOED_VKA_TABLE: Record<string, number[]> = {
  'E 9b': [3509.76, 3765.81, 3934.04, 4399.83, 4778.18, 5055.34],
  'E 9c': [3645.14, 3918.25, 4189.18, 4570.39, 4969.29, 5279.64],
  'E 10': [3895.34, 4195.88, 4496.51, 4815.65, 5392.41, 5539.75],
  'E 11': [4032.38, 4424.94, 4749.26, 5234.16, 5816.84, 6113.06],
  'E 12': [4175.64, 4581.34, 5131.65, 5672.18, 6365.40, 6670.40],
  'E 13': [4628.76, 4985.56, 5249.49, 5762.80, 6461.42, 6741.80],
  SHK: [956.25, 956.25, 956.25, 956.25, 956.25, 956.25],
};

interface PersonalkostenPageProps {
  personal: PersonalEintrag[];
  mitarbeiterList: string[];
  mitarbeiterStamm?: MitarbeiterStamm[];
  settings?: SystemSettings;
  onUpdateMitarbeiterStamm?: React.Dispatch<React.SetStateAction<MitarbeiterStamm[]>>;
  activeYear: string | null;
  activeYearLabel: string;
  onAddEintrag: (eintrag: Omit<PersonalEintrag, 'id'>) => void;
  onUpdateEintragStatus: (id: number, status: PersonalEintrag['status']) => void;
  onUpdateMitarbeiterList: (list: string[]) => void;
  onRenameMitarbeiterGlobal: (oldName: string, newName: string) => void;
  onRenameSingleMitarbeiter: (id: number, newName: string) => void;
  initialQuarter?: string;
  onQuarterChange?: (q: string) => void;
  onUpdateEintrag?: (id: number, data: Partial<PersonalEintrag>) => void;
}

export default function PersonalkostenPage({
  personal,
  mitarbeiterList,
  mitarbeiterStamm = [],
  settings = DEFAULT_SETTINGS,
  onUpdateMitarbeiterStamm,
  activeYear,
  activeYearLabel,
  onAddEintrag,
  onUpdateEintragStatus,
  onUpdateMitarbeiterList,
  initialQuarter = 'all',
  onQuarterChange,
  onUpdateEintrag,
}: PersonalkostenPageProps) {
  const [quarterFilter, setQuarterFilter] = useState(initialQuarter);
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [showStammPanel, setShowStammPanel] = useState(false);

  // Add / Edit Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [fMitarbeiter, setFMitarbeiter] = useState(mitarbeiterList[0] || '');
  const [fMonat, setFMonat] = useState(new Date().getMonth() + 1);
  const [fJahr, setFJahr] = useState(2026);
  const [fAgKosten, setFAgKosten] = useState('');
  const [fUseExactDatev, setFUseExactDatev] = useState(false);
  const [fBrutto0812, setFBrutto0812] = useState('');
  const [fBrutto0817, setFBrutto0817] = useState('');
  const [fSv0820, setFSv0820] = useState('');
  const [fBemerkung, setFBemerkung] = useState('');

  // Quick Add Mitarbeiter
  const [newMitarbeiterName, setNewMitarbeiterName] = useState('');

  useEffect(() => {
    setQuarterFilter(initialQuarter);
  }, [initialQuarter]);

  const activePlan = useMemo(() => getAzaPlan(settings.azaVersion), [settings.azaVersion]);
  const yearKeys = useMemo(
    () => (activeYear ? [activeYear] : AZA_JAHRE.map((y) => y.key)),
    [activeYear]
  );

  const filteredPersonal = useMemo(() => {
    return personal.filter((p) => {
      if (activeYear) {
        if (activeYear === 'gesamt25' && p.foerderjahr !== 2025) return false;
        if (activeYear === 'mrz29' && p.foerderjahr !== 2029) return false;
        if (activeYear !== 'gesamt25' && activeYear !== 'mrz29' && String(p.foerderjahr) !== activeYear)
          return false;
      }
      if (quarterFilter !== 'all' && String(p.quartal) !== quarterFilter) return false;
      if (employeeFilter !== 'all' && p.mitarbeiter !== employeeFilter) return false;
      return true;
    });
  }, [personal, activeYear, quarterFilter, employeeFilter]);

  // Summen & strikte 0812 / 0817 / 0820 / 0843 Aufschlüsselung
  const profiSplit = useMemo(
    () => splitPersonalToProfi(filteredPersonal, 0.18, mitarbeiterStamm),
    [filteredPersonal, mitarbeiterStamm]
  );

  const totalFoerderfaehig = useMemo(
    () => sumEuro(filteredPersonal.map((p) => p.foerderfaehig || 0)),
    [filteredPersonal]
  );

  const totalBund = useMemo(() => mulPercent(totalFoerderfaehig, 90), [totalFoerderfaehig]);
  const totalEigen = useMemo(() => subEuro(totalFoerderfaehig, totalBund), [totalFoerderfaehig, totalBund]);

  const azaPlanPersonalSum = useMemo(() => {
    let sum = 0;
    activePlan.personal.forEach((row) => {
      sum = addEuro(
        sum,
        sumEuro(yearKeys.map((yk) => Number((row as Record<string, any>)[yk] || 0)))
      );
    });
    const ov = sumEuro(yearKeys.map((yk) => Number((activePlan.overhead as Record<string, any>)[yk] || 0)));
    return addEuro(sum, ov);
  }, [activePlan, yearKeys]);

  const openNewModal = () => {
    setEditingEntryId(null);
    setFMitarbeiter(mitarbeiterList[0] || 'von Styp-Rekowski');
    setFMonat(new Date().getMonth() + 1);
    setFJahr(2026);
    setFAgKosten('');
    setFUseExactDatev(false);
    setFBrutto0812('');
    setFBrutto0817('');
    setFSv0820('');
    setFBemerkung('');
    setShowAddModal(true);
  };

  const openEditModal = (p: PersonalEintrag) => {
    setEditingEntryId(p.id);
    setFMitarbeiter(p.mitarbeiter);
    setFMonat(p.monat);
    setFJahr(p.jahr);
    setFAgKosten(String(p.agKosten));
    const hasExact =
      p.brutto0812 !== undefined || p.brutto0817 !== undefined || p.sv0820 !== undefined;
    setFUseExactDatev(hasExact);
    setFBrutto0812(p.brutto0812 !== undefined ? String(p.brutto0812) : '');
    setFBrutto0817(p.brutto0817 !== undefined ? String(p.brutto0817) : '');
    setFSv0820(p.sv0820 !== undefined ? String(p.sv0820) : '');
    setFBemerkung(p.bemerkung || '');
    setShowAddModal(true);
  };

  const handleSubmitEintrag = (e: React.FormEvent) => {
    e.preventDefault();
    const b0812 = fUseExactDatev ? roundEuro(parseFloat(fBrutto0812) || 0) : undefined;
    const b0817 = fUseExactDatev ? roundEuro(parseFloat(fBrutto0817) || 0) : undefined;
    const sv20 = fUseExactDatev ? roundEuro(parseFloat(fSv0820) || 0) : undefined;

    const agKosten = fUseExactDatev
      ? sumEuro([b0812 || 0, b0817 || 0, sv20 || 0])
      : roundEuro(parseFloat(fAgKosten) || 0);
    if (agKosten <= 0) return;

    const sachkosten = roundEuro(agKosten * 0.1);
    const foerderfaehig = addEuro(agKosten, sachkosten);
    const bafaAnteil = mulPercent(foerderfaehig, 90);
    const eigenaufwand = subEuro(foerderfaehig, bafaAnteil);
    const quartal = Math.ceil(fMonat / 3);

    const payload: Omit<PersonalEintrag, 'id'> = {
      mitarbeiter: fMitarbeiter,
      monat: fMonat,
      jahr: fJahr,
      quartal,
      agKosten,
      sachkosten,
      foerderfaehig,
      bafaAnteil,
      lhoAnteil: 0,
      eigenaufwand,
      foerderjahr: fJahr,
      brutto0812: b0812,
      brutto0817: b0817,
      sv0820: sv20,
      status: 'ENTWURF',
      bemerkung: fBemerkung.trim(),
    };

    if (editingEntryId && onUpdateEintrag) {
      onUpdateEintrag(editingEntryId, payload);
    } else {
      onAddEintrag(payload);
    }
    setShowAddModal(false);
  };

  const handleUpdateStammField = (id: number, patch: Partial<MitarbeiterStamm>) => {
    onUpdateMitarbeiterStamm?.((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  };

  const handleAddNewMitarbeiter = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newMitarbeiterName.trim();
    if (!cleaned || mitarbeiterList.includes(cleaned)) return;
    onUpdateMitarbeiterList([...mitarbeiterList, cleaned]);
    setNewMitarbeiterName('');
  };

  const getEmployeePosBadge = (name: string): '0812' | '0817' => {
    const stamm = mitarbeiterStamm.find(
      (s) => s.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (stamm) return stamm.primaerePosition;
    const low = name.toLowerCase();
    return low.includes('fischöder') || low.includes('fischoeder') || low.includes('shk')
      ? '0817'
      : '0812';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
            Personalkosten 0812 / 0817 / 0820
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1 flex flex-wrap items-center gap-2">
            <span>Strikte profi-online Trennung + 10 % Geschäftsbedarf (0843) &middot; {activeYearLabel}</span>
            {settings.privacyMode && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zs-blau-schwarz text-zs-signal-gelb font-bold text-[10px]">
                <EyeOff className="w-3 h-3" />
                Individualgehälter maskiert
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowStammPanel((prev) => !prev)}
            className="px-3.5 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-semibold hover:bg-zinc-50 flex items-center gap-1.5 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-[#58B49D]" />
            <span>Mitarbeitenden-Stamm ({mitarbeiterStamm.length})</span>
          </button>
          <button
            onClick={() =>
              downloadCSV(
                'Personalkosten_0812_0817_0820.csv',
                [
                  ['Mitarbeiter', 'Jahr', 'Monat', 'AG-Kosten', '0843 Pauschale', 'Förderfähig', '90% Bund', '10% Eigen', 'Status'],
                  ...filteredPersonal.map((p, idx) => [
                    anonymizeEmployeeName(p.mitarbeiter, idx + 1, settings.privacyMode),
                    p.jahr,
                    p.monat,
                    settings.privacyMode ? '***' : p.agKosten,
                    settings.privacyMode ? '***' : p.sachkosten,
                    settings.privacyMode ? '***' : p.foerderfaehig,
                    settings.privacyMode ? '***' : p.bafaAnteil,
                    settings.privacyMode ? '***' : p.eigenaufwand,
                    p.status,
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
            onClick={openNewModal}
            className="px-4 py-2 rounded-lg bg-zs-blau-schwarz text-white text-xs font-bold hover:bg-[#08243d] flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-zs-signal-gelb" />
            <span>Lohnbeleg erfassen</span>
          </button>
        </div>
      </div>

      {/* Mitarbeitenden-Stamm Zuordnung 0812 vs 0817 */}
      {showStammPanel && (
        <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
            <div>
              <h2 className="font-display font-bold text-base text-zs-blau-schwarz">
                Mitarbeitenden-Stamm &amp; profi-online Kontierung (0812 vs. 0817)
              </h2>
              <p className="text-xs text-zinc-500">
                Steuert die exakte Aufteilung zwischen Angestellten (0812), Aushilfen/SHK (0817) und Sozialabgaben (0820).
              </p>
            </div>

            <form onSubmit={handleAddNewMitarbeiter} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Neue/r Mitarbeiter/in..."
                value={newMitarbeiterName}
                onChange={(e) => setNewMitarbeiterName(e.target.value)}
                className="px-3 py-1.5 border border-zinc-300 rounded-lg text-xs"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-zs-blau-schwarz text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Hinzufügen</span>
              </button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] text-zinc-500 uppercase">
                  <th className="p-2.5 pl-4">Name / Stelle</th>
                  <th className="p-2.5">TVöD-Einstufung</th>
                  <th className="p-2.5">Primäre profi-Pos.</th>
                  <th className="p-2.5 text-right">SV-Quote (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {mitarbeiterStamm.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-zinc-50">
                    <td className="p-2.5 pl-4 font-semibold text-zs-blau-schwarz">
                      {anonymizeEmployeeName(m.name, idx + 1, settings.privacyMode)}
                      <div className="text-[11px] font-normal text-zinc-500">{m.rolle}</div>
                    </td>
                    <td className="p-2.5 font-mono text-zinc-600">
                      {m.tvoedGruppe} &middot; {m.tvoedStufe}
                    </td>
                    <td className="p-2.5">
                      <select
                        value={m.primaerePosition}
                        onChange={(e) =>
                          handleUpdateStammField(m.id, {
                            primaerePosition: e.target.value as '0812' | '0817',
                          })
                        }
                        className="px-2 py-1 border border-zinc-300 rounded text-xs font-mono bg-white cursor-pointer"
                      >
                        <option value="0812">0812 (Angestellte)</option>
                        <option value="0817">0817 (Aushilfen / SHK)</option>
                      </select>
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="35"
                        value={roundEuro(m.svQuote * 100)}
                        onChange={(e) =>
                          handleUpdateStammField(m.id, {
                            svQuote: Math.max(0, Math.min(0.45, (parseFloat(e.target.value) || 0) / 100)),
                          })
                        }
                        className="w-20 px-2 py-1 text-right border border-zinc-300 rounded font-mono text-xs tabular-nums"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4 KPI-Karten (strikte 0812 / 0817 / 0820 / 0843 + Förderquoten) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-500 uppercase">Pos. 0812 (Angestellte)</div>
          <div className="text-xl font-mono font-bold text-zs-blau-schwarz tabular-nums mt-1">
            {formatEuro(profiSplit.pos0812, 2)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-500 uppercase">Pos. 0817 (Aushilfen/SHK)</div>
          <div className="text-xl font-mono font-bold text-zs-blau-schwarz tabular-nums mt-1">
            {formatEuro(profiSplit.pos0817, 2)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-500 uppercase">Pos. 0820 (Sozialabgaben)</div>
          <div className="text-xl font-mono font-bold text-[#58B49D] tabular-nums mt-1">
            {formatEuro(profiSplit.pos0820, 2)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-500 uppercase">Pos. 0843 (10 % Pauschale)</div>
          <div className="text-xl font-mono font-bold text-[#BA8B68] tabular-nums mt-1">
            {formatEuro(profiSplit.pos0843Overhead, 2)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-500 uppercase">Gesamt (90 % / 10 %) vs Plan</div>
          <div className="text-xl font-mono font-bold text-zs-blau-schwarz tabular-nums mt-1">
            {formatEuro(totalFoerderfaehig, 2)}
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-0.5 tabular-nums">
            Bund: {formatEuro(totalBund, 2)} | Plan: {formatEuro(azaPlanPersonalSum, 0)}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
          className="px-3 py-1.5 border border-zinc-200 rounded-lg bg-white text-xs font-semibold text-zs-blau-schwarz"
        >
          <option value="all">Alle Mitarbeitenden</option>
          {mitarbeiterList.map((m, idx) => (
            <option key={m} value={m}>
              {anonymizeEmployeeName(m, idx + 1, settings.privacyMode)}
            </option>
          ))}
        </select>

        <select
          value={quarterFilter}
          onChange={(e) => {
            setQuarterFilter(e.target.value);
            onQuarterChange?.(e.target.value);
          }}
          className="px-3 py-1.5 border border-zinc-200 rounded-lg bg-white text-xs font-semibold text-zs-blau-schwarz"
        >
          <option value="all">Alle Quartale</option>
          <option value="1">Q1</option>
          <option value="2">Q2</option>
          <option value="3">Q3</option>
          <option value="4">Q4</option>
        </select>
      </div>

      {/* Tabelle */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] text-zinc-500 uppercase">
                <th className="p-3 pl-5">Mitarbeiter/in</th>
                <th className="p-3">Zeitraum</th>
                <th className="p-3">profi</th>
                <th className="p-3 text-right">AG-Kosten</th>
                <th className="p-3 text-right">0843 (10 %)</th>
                <th className="p-3 text-right">Förderfähig</th>
                <th className="p-3 text-right">90 % Bund</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 pr-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredPersonal.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-zinc-400 font-mono">
                    Keine Lohnbelege im gewählten Filter.
                  </td>
                </tr>
              ) : (
                filteredPersonal.map((p, idx) => {
                  const posCode = getEmployeePosBadge(p.mitarbeiter);
                  const hasExactDatev =
                    p.brutto0812 !== undefined || p.brutto0817 !== undefined || p.sv0820 !== undefined;
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/70">
                      <td className="p-3 pl-5 font-semibold text-zs-blau-schwarz">
                        <div>{anonymizeEmployeeName(p.mitarbeiter, idx + 1, settings.privacyMode)}</div>
                        {p.bemerkung && (
                          <div className="text-[11px] font-normal text-zinc-400">{p.bemerkung}</div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-zinc-600 tabular-nums">
                        {String(p.monat).padStart(2, '0')}/{p.jahr} (Q{p.quartal})
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zs-blau-schwarz font-bold">
                          {posCode}/0820
                        </span>
                        {hasExactDatev && (
                          <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                            DATEV
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums">
                        {settings.privacyMode ? '•••• €' : formatEuro(p.agKosten, 2)}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-zinc-500">
                        {settings.privacyMode ? '•••• €' : formatEuro(p.sachkosten, 2)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold tabular-nums text-zs-blau-schwarz">
                        {settings.privacyMode ? '•••• €' : formatEuro(p.foerderfaehig, 2)}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-[#58B49D] font-semibold">
                        {settings.privacyMode ? '•••• €' : formatEuro(p.bafaAnteil, 2)}
                      </td>
                      <td className="p-3 text-center">
                        <select
                          value={p.status}
                          onChange={(e) =>
                            onUpdateEintragStatus(p.id, e.target.value as PersonalEintrag['status'])
                          }
                          className="px-2 py-1 border border-zinc-200 rounded text-xs font-mono bg-white cursor-pointer"
                        >
                          <option value="ENTWURF">ENTWURF</option>
                          <option value="IN_PRUEFUNG">IN_PRUEFUNG</option>
                          <option value="EINGEREICHT">EINGEREICHT</option>
                          <option value="ARCHIVIERT">ARCHIVIERT</option>
                        </select>
                      </td>
                      <td className="p-3 pr-5 text-right">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded border border-zinc-200 hover:bg-zinc-100 text-zinc-600 cursor-pointer"
                          title="Bearbeiten / DATEV-Split pflegen"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Lohnbeleg erfassen / bearbeiten inkl. DATEV-Splits */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-[#041422]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddModal(false)}
        >
          <form
            onSubmit={handleSubmitEintrag}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-zinc-200 max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <h3 className="font-display font-bold text-lg text-zs-blau-schwarz">
              {editingEntryId ? 'Lohnbeleg bearbeiten' : 'Neuen Lohnbeleg erfassen'}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Mitarbeiter/in</label>
                <select
                  value={fMitarbeiter}
                  onChange={(e) => setFMitarbeiter(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white"
                >
                  {mitarbeiterList.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Monat</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={fMonat}
                    onChange={(e) => setFMonat(parseInt(e.target.value, 10) || 1)}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Jahr</label>
                  <input
                    type="number"
                    min={2025}
                    max={2029}
                    value={fJahr}
                    onChange={(e) => setFJahr(parseInt(e.target.value, 10) || 2026)}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-2.5">
                <label className="flex items-center gap-2 font-semibold text-zs-blau-schwarz cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fUseExactDatev}
                    onChange={(e) => setFUseExactDatev(e.target.checked)}
                    className="w-4 h-4 accent-zs-blau-schwarz"
                  />
                  <span>Exakten DATEV-Split (0812 / 0817 / 0820) angeben</span>
                </label>

                {fUseExactDatev ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500">0812 Brutto (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fBrutto0812}
                        onChange={(e) => setFBrutto0812(e.target.value)}
                        className="mt-1 w-full px-2.5 py-1.5 border border-zinc-300 rounded font-mono bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500">0817 SHK (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fBrutto0817}
                        onChange={(e) => setFBrutto0817(e.target.value)}
                        className="mt-1 w-full px-2.5 py-1.5 border border-zinc-300 rounded font-mono bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500">0820 SV/ZVK (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fSv0820}
                        onChange={(e) => setFSv0820(e.target.value)}
                        className="mt-1 w-full px-2.5 py-1.5 border border-zinc-300 rounded font-mono bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
                      Arbeitgeberkosten gesamt (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required={!fUseExactDatev}
                      value={fAgKosten}
                      onChange={(e) => setFAgKosten(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono font-bold bg-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Bemerkung</label>
                <input
                  type="text"
                  value={fBemerkung}
                  onChange={(e) => setFBemerkung(e.target.value)}
                  placeholder="z. B. DATEV-Journal 08/2026"
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-lg"
                />
              </div>
            </div>

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
                Speichern
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
