import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { motion } from 'motion/react';
import { Partner, PartnerMatch, OekoprofitCheckup, UseCase } from '../../types';
import PartnerFogOfWar from '../PartnerFogOfWar';
import { Rocket, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

interface PartnerPageProps {
  partners: Partner[];
  matches: PartnerMatch[];
  oekoprofitCheckups?: OekoprofitCheckup[];
  usecases?: UseCase[];
  onAddPartner: (partner: Omit<Partner, 'id'>) => void;
  onUpdatePartner: (id: number, partner: Partial<Partner>) => void;
  onDeletePartner: (id: number) => void;
  onToggleMatch: (industryId: number, providerId: number, type: string) => void;
  onCreateBoosterPipeline?: (
    industryPartner: Partner,
    providerPartner: Partner
  ) => { ok: boolean; useCaseId: number; vergabeId: number };
  onNavigateToVergaben?: () => void;
}

export default function PartnerPage({
  partners,
  matches,
  oekoprofitCheckups = [],
  usecases = [],
  onAddPartner,
  onUpdatePartner,
  onDeletePartner,
  onToggleMatch,
  onCreateBoosterPipeline,
  onNavigateToVergaben,
}: PartnerPageProps) {
  const [activeView, setActiveView] = useState<'card' | 'table' | 'matrix' | 'fog'>('card');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTyp, setFilterTyp] = useState('');

  // Form Fields
  const [pName, setPName] = useState('');
  const [pTyp, setPTyp] = useState<Partner['typ']>('Industrieunternehmen');
  const [pBranche, setPBranche] = useState('Textil');
  const [pAp, setPAp] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pOrt, setPOrt] = useState('Düren');
  const [pStatus, setPStatus] = useState<Partner['status']>('aktiv');
  const [pNotizen, setPNotizen] = useState('');
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [pipelineFeedback, setPipelineFeedback] = useState<string | null>(null);
  const [lastBoostCell, setLastBoostCell] = useState<string | null>(null);
  const [synergyMessage, setSynergyMessage] = useState<string | null>(null);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

          if (rawData.length < 2) {
            setImportError(
              'Die hochgeladene Datei enthält keine ausreichenden Daten (mindestens eine Kopf- und eine Datenzeile notwendig).'
            );
            return;
          }
          setImportError(null);

          const headers = (rawData[0] || []).map((h) => String(h).trim().toLowerCase());
          const rows = rawData.slice(1);

          let count = 0;
          rows.forEach((row) => {
            if (!row || row.length === 0) return;

            const getVal = (keywords: string[]): any => {
              const idx = headers.findIndex((h) => keywords.some((kw) => h === kw || h.includes(kw)));
              return idx !== -1 ? row[idx] : undefined;
            };

            const nameValue = getVal(['name', 'firma', 'partner', 'organisation', 'unternehmen']) || '';
            if (!nameValue || String(nameValue).trim() === '') return;

            const rawTyp = String(
              getVal(['typ', 'klassifikation', 'kategorie', 'art', 'partnertyp', 'typ des partners']) || ''
            ).trim();
            let finalTyp: Partner['typ'] = 'Startup / Lösungspartner';
            if (
              rawTyp.toLowerCase().includes('industrie') ||
              rawTyp.toLowerCase().includes('kmu') ||
              rawTyp.toLowerCase().includes('unternehmen')
            ) {
              finalTyp = 'Industrieunternehmen';
            } else if (
              rawTyp.toLowerCase().includes('koordination') ||
              rawTyp.toLowerCase().includes('kooperation') ||
              rawTyp.toLowerCase().includes('träger') ||
              rawTyp.toLowerCase().includes('partner')
            ) {
              finalTyp = 'Kooperationspartner';
            } else if (
              rawTyp.toLowerCase().includes('dienstleister') ||
              rawTyp.toLowerCase().includes('beratung') ||
              rawTyp.toLowerCase().includes('agentur')
            ) {
              finalTyp = 'Dienstleister';
            }

            const rawStatus = String(getVal(['status', 'phase']) || '').trim();
            let finalStatus: Partner['status'] = 'aktiv';
            if (rawStatus.toLowerCase().includes('kontakt')) {
              finalStatus = 'in Kontakt';
            } else if (rawStatus.toLowerCase().includes('lauf') || rawStatus.toLowerCase().includes('pilot')) {
              finalStatus = 'Pilot läuft';
            } else if (rawStatus.toLowerCase().includes('abgeschlossen') || rawStatus.toLowerCase().includes('beendet')) {
              finalStatus = 'abgeschlossen';
            } else if (rawStatus.toLowerCase().includes('abgelehnt') || rawStatus.toLowerCase().includes('storniert')) {
              finalStatus = 'abgelehnt';
            }

            const rawBewertung = getVal(['bewertung', 'rating', 'score']);
            let finalBewertung = 3;
            if (typeof rawBewertung === 'number') {
              finalBewertung = Math.max(1, Math.min(5, Math.round(rawBewertung)));
            } else if (rawBewertung) {
              finalBewertung = Math.max(1, Math.min(5, parseInt(String(rawBewertung)) || 3));
            }

            const payload: Omit<Partner, 'id'> = {
              name: String(nameValue).trim(),
              typ: finalTyp,
              branche: String(getVal(['branche', 'sektor', 'industrie', 'bereich']) || 'Übergreifend').trim(),
              status: finalStatus,
              rolle: String(getVal(['rolle', 'aufgabe', 'funktion', 'tätigkeit']) || 'Projektpartner').trim(),
              useCase: String(getVal(['usecase', 'use case', 'pilot', 'projekt']) || '').trim(),
              ap: String(getVal(['ap', 'ansprechpartner', 'kontaktperson', 'person', 'kontakt']) || '').trim(),
              funktion: String(getVal(['funktion', 'abteilung', 'stelle']) || '').trim(),
              email: String(getVal(['email', 'e-mail', 'mail', 'adresse email']) || '').trim(),
              tel: String(getVal(['tel', 'telefon', 'mobil', 'phone']) || '').trim(),
              web: String(getVal(['web', 'website', 'url']) || '').trim(),
              ort: String(getVal(['ort', 'stadt', 'sitz', 'firmensitz', 'standort']) || 'Düren').trim(),
              bewertung: finalBewertung,
              gruendung: String(getVal(['gründung', 'gruendung', 'founding', 'jahr']) || '').trim(),
              tech: String(getVal(['tech', 'technologie', 'kompetenz']) || '').trim(),
              beschr: String(getVal(['beschr', 'beschreibung', 'description', 'infos']) || '').trim(),
              notizen: String(getVal(['notizen', 'kommentar', 'bemerkung']) || 'Importiert aus Excel.').trim(),
              datum: String(getVal(['datum', 'date', 'erstellt']) || new Date().toISOString().slice(0, 10)).trim(),
              sharepoint: String(getVal(['sharepoint', 'link microsoft', 'ordner']) || '').trim(),
            };

            onAddPartner(payload);
            count++;
          });

          setImportMessage(`Erfolgreich ${count} Partner aus der Excel-Tabelle in die Partnerdatenbank eingepflegt!`);
          setTimeout(() => {
            setImportMessage(null);
          }, 6500);
        } catch (err: any) {
          setImportError('Fehler beim Importieren des Excel-Dokuments: ' + (err?.message || 'Unbekannter Fehler'));
        }
      };
      reader.readAsBinaryString(file);
      e.target.value = '';
    }
  };

  const industries = partners.filter((p) => p.typ === 'Industrieunternehmen');
  const providers = partners.filter((p) => p.typ === 'Startup / Lösungspartner' || p.typ === 'Dienstleister');

  const activePilotMatches = matches
    .filter((m) => m.type === 'ACTIVE_PILOT')
    .map((m) => ({
      match: m,
      ind: partners.find((p) => p.id === m.industryId),
      prov: partners.find((p) => p.id === m.providerId),
    }))
    .filter((item): item is { match: PartnerMatch; ind: Partner; prov: Partner } => Boolean(item.ind && item.prov));

  const filteredPartners = partners.filter((p) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = p.name.toLowerCase().includes(q) || (p.notizen && p.notizen.toLowerCase().includes(q));
    const sectorMatch = p.branche.toLowerCase().includes(q);
    const typeMatch = filterTyp ? p.typ === filterTyp : true;
    return (nameMatch || sectorMatch) && typeMatch;
  });

  const handleEditClick = (p: Partner) => {
    setEditingId(p.id);
    setPName(p.name);
    setPTyp(p.typ);
    setPBranche(p.branche);
    setPAp(p.ap || '');
    setPEmail(p.email || '');
    setPPhone(p.tel || '');
    setPOrt(p.ort || 'Düren');
    setPStatus(p.status);
    setPNotizen(p.notizen || '');
    setShowFormModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) {
      setFormError('Bitte geben Sie einen Partner-/Firmennamen ein.');
      return;
    }
    setFormError(null);

    const payload: Omit<Partner, 'id'> = {
      name: pName.trim(),
      typ: pTyp,
      branche: pBranche.trim(),
      ap: pAp.trim(),
      email: pEmail.trim(),
      tel: pPhone.trim(),
      ort: pOrt.trim(),
      status: pStatus,
      notizen: pNotizen.trim() || 'Keine Angabe.',
      rolle: 'Projektpartner',
      useCase: '',
    };

    if (editingId) {
      onUpdatePartner(editingId, payload);
    } else {
      onAddPartner(payload);
    }

    setEditingId(null);
    setShowFormModal(false);
  };

  const getMatch = (indId: number, provId: number): string => {
    const m = matches.find((x) => x.industryId === indId && x.providerId === provId);
    return m ? m.type : 'NONE';
  };

  const handleTriggerBooster = (ind: Partner, prov: Partner) => {
    if (!onCreateBoosterPipeline) return;
    const res = onCreateBoosterPipeline(ind, prov);
    if (res.ok) {
      setPipelineFeedback(
        `Booster-Pipeline erstellt: Use-Case #${res.useCaseId} und 37.000-€-Vergabe #${res.vergabeId} (${ind.name} × ${prov.name}) angelegt.`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
            Partner<span className="bg-zs-signal-gelb px-1 py-0.5 rounded text-zs-blau-schwarz">datenbank</span>
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Recherchen und Matchmaking des Dürener Industrie-Netzwerks (WIN.DN)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <label className="px-5 py-2 text-xs font-bold rounded-full bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-200 cursor-pointer flex items-center justify-center gap-1.5 transition-all">
            <span>Excel / CSV importieren</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} className="hidden" />
          </label>
          <button
            onClick={() => {
              setEditingId(null);
              setPName('');
              setPTyp('Industrieunternehmen');
              setPBranche('Textil');
              setPAp('');
              setPEmail('');
              setPPhone('');
              setPOrt('Düren');
              setPStatus('aktiv');
              setPNotizen('');
              setFormError(null);
              setShowFormModal(true);
            }}
            className="px-5 py-2 text-xs font-bold rounded-full bg-zs-signal-gelb text-zs-blau-schwarz hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-all shadow-xs cursor-pointer self-start sm:self-auto"
          >
            + Neuer Partner eintragen
          </button>
        </div>
      </div>

      {importError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold">
          <div>{importError}</div>
          <button onClick={() => setImportError(null)} className="text-red-500 hover:text-red-700 font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {importMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 text-xs font-semibold">
          <div>{importMessage}</div>
        </div>
      )}

      {/* Sub Views Toggler */}
      <div className="bg-white p-3 rounded-xl border border-zinc-200/80 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveView('card')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeView === 'card' ? 'bg-zs-blau-schwarz text-white' : 'hover:bg-zinc-50 text-zinc-600'
            }`}
          >
            Ökosystem-Karten
          </button>
          <button
            onClick={() => setActiveView('table')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeView === 'table' ? 'bg-zs-blau-schwarz text-white' : 'hover:bg-zinc-50 text-zinc-600'
            }`}
          >
            Partnerverzeichnis
          </button>
          <button
            onClick={() => setActiveView('matrix')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeView === 'matrix' ? 'bg-zs-blau-schwarz text-white' : 'hover:bg-zinc-50 text-zinc-600'
            }`}
          >
            Matchmaking-Matrix ({activePilotMatches.length} Piloten)
          </button>
          <button
            onClick={() => setActiveView('fog')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeView === 'fog' ? 'bg-[#0A2B32] text-white' : 'hover:bg-zinc-50 text-zinc-600'
            }`}
          >
            Nebel des Wissens (Aufklärung)
          </button>
        </div>

        {activeView !== 'matrix' && activeView !== 'fog' && (
          <div className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="Partner suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs border border-zinc-300 rounded-md px-3 py-1.5 outline-none focus:border-zs-blau-schwarz flex-grow md:flex-initial"
            />
            <select
              value={filterTyp}
              onChange={(e) => setFilterTyp(e.target.value)}
              className="text-xs border border-zinc-300 rounded-md px-2 py-1.5 cursor-pointer focus:border-zs-blau-schwarz"
            >
              <option value="">Alle Klassifikationen</option>
              <option value="Industrieunternehmen">Industrieunternehmen</option>
              <option value="Startup / Lösungspartner">Startup / Lösungspartner</option>
              <option value="Dienstleister">Dienstleister</option>
              <option value="Kooperationspartner">Kooperationspartner</option>
            </select>
          </div>
        )}
      </div>

      {/* VIEW 0: NEBEL DES WISSENS (3-STUFEN-AUFKLÄRUNG) */}
      {activeView === 'fog' && (
        <PartnerFogOfWar
          partners={partners}
          matches={matches}
          oekoprofitCheckups={oekoprofitCheckups}
          usecases={usecases}
          onUpdatePartner={onUpdatePartner}
          onOpenMatrix={() => setActiveView('matrix')}
        />
      )}

      {/* VIEW 1: CARDS */}
      {activeView === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartners.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-zinc-400 font-mono">
              Keine Partner für diese Filterkombination gefunden.
            </div>
          ) : (
            filteredPartners.map((p) => {
              const isKMU = p.typ === 'Industrieunternehmen';
              const isStartup = p.typ === 'Startup / Lösungspartner';
              return (
                <div
                  key={p.id}
                  className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                          isKMU
                            ? 'bg-[#041422]/10 text-zs-blau-schwarz'
                            : isStartup
                            ? 'bg-[#58B49D]/10 text-[#2a7060]'
                            : 'bg-[#BA8B68]/10 text-zs-papier-braun'
                        }`}
                      >
                        {p.typ}
                      </span>
                      <span className="px-1.5 py-0.5 text-[9px] font-mono rounded font-bold uppercase bg-zinc-100 text-zinc-600">
                        {p.status}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-base text-zs-blau-schwarz mt-3">{p.name}</h3>
                    <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                      Sektor: {p.branche} &middot; {p.ort}
                    </p>

                    {p.ap && (
                      <div className="mt-4 p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-1">
                        <div>
                          <strong>{p.ap}</strong>
                        </div>
                        {p.email && <div className="truncate">{p.email}</div>}
                        {p.tel && <div>{p.tel}</div>}
                      </div>
                    )}

                    {p.notizen && (
                      <p className="text-xs text-zinc-500 font-sans mt-3 leading-relaxed line-clamp-2">
                        {p.notizen}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-100 text-[10px] font-mono w-full">
                    {deleteConfirmId === p.id ? (
                      <>
                        <button
                          onClick={() => {
                            onDeletePartner(p.id);
                            setDeleteConfirmId(null);
                          }}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition-all cursor-pointer flex-1"
                        >
                          Wirklich löschen?
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1 border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 transition-all cursor-pointer"
                        >
                          Abbrechen
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditClick(p)}
                          className="px-3 py-1 border border-zinc-200 rounded-lg hover:bg-zs-blau-schwarz hover:text-white hover:border-zs-blau-schwarz transition-all cursor-pointer flex-1"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(p.id)}
                          className="px-2 py-1 text-red-500 rounded hover:bg-red-50 transition-all cursor-pointer"
                        >
                          Löschen
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: TABLE */}
      {activeView === 'table' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[9px] text-zinc-400 tracking-wider">
                  <th className="p-3 pl-5">Partner / Firma</th>
                  <th className="p-3">Klassifikation</th>
                  <th className="p-3">Branche/Sektor</th>
                  <th className="p-3">Ansprechpartner</th>
                  <th className="p-3">Standort</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filteredPartners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-zinc-400 font-mono">
                      Keine Partner registriert.
                    </td>
                  </tr>
                ) : (
                  filteredPartners.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <td className="p-3 pl-5">
                        <div className="font-bold text-zs-blau-schwarz text-xs">{p.name}</div>
                        {p.notizen && (
                          <div className="text-[10px] text-zinc-400 truncate max-w-[220px]" title={p.notizen}>
                            {p.notizen}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 text-zinc-600 font-bold">
                          {p.typ}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-zinc-700">{p.branche}</td>
                      <td className="p-3 text-xs text-zinc-600 space-y-0.5">
                        <div className="font-medium">{p.ap || '–'}</div>
                        {p.email && <div className="text-[10px] font-mono text-zinc-400">{p.email}</div>}
                      </td>
                      <td className="p-3 text-xs text-zinc-500">{p.ort || 'Düren'}</td>
                      <td className="p-3 uppercase text-[10px] font-mono font-bold text-emerald-600">
                        {p.status}
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap pl-4">
                        {deleteConfirmId === p.id ? (
                          <>
                            <button
                              onClick={() => {
                                onDeletePartner(p.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition-all text-[11px] font-semibold cursor-pointer"
                            >
                              Bestätigen
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 rounded bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-all text-[11px] font-semibold cursor-pointer"
                            >
                              Abbruch
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditClick(p)}
                              className="px-2 py-1 rounded bg-zinc-100 hover:bg-zs-blau-schwarz hover:text-white transition-all text-[11px] font-semibold text-zinc-800 cursor-pointer"
                            >
                              Bearbeiten
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(p.id)}
                              className="px-2 py-1 rounded text-red-500 hover:bg-red-50 transition-all text-[11px] font-semibold cursor-pointer"
                            >
                              Löschen
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: MATCHING MATRIX + BOOSTER-PIPELINE */}
      {activeView === 'matrix' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <div>
              <h3 className="font-display font-bold text-base text-zs-blau-schwarz">Ecosystem Matchmaking Matrix</h3>
              <p className="text-xs text-zinc-500 font-sans mt-0.5">
                Kreuzen Sie die lokalen Industrie-KMUs der Papier/Chemie/Textil-Branchen mit Forschungs-Instituten und Start-up-Lösungsanbietern.
              </p>
            </div>

            <div className="overflow-x-auto border border-zinc-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-zinc-50">
                    <th className="p-3 font-mono text-[10px] text-zinc-400 uppercase tracking-wider border-b border-r border-zinc-200 w-44">
                      Industriepartner ⇄
                    </th>
                    {providers.map((pr) => (
                      <th
                        key={pr.id}
                        className="p-3 text-center border-b border-r border-zinc-200 font-bold text-zs-blau-schwarz min-w-[120px]"
                      >
                        {pr.name}
                        <div className="text-[9px] font-mono font-normal text-zinc-400 uppercase mt-0.5">
                          {pr.typ}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {industries.length === 0 ? (
                    <tr>
                      <td colSpan={providers.length + 1} className="p-8 text-center text-xs text-zinc-400 font-mono">
                        Keine Industriepartner eingetragen.
                      </td>
                    </tr>
                  ) : (
                    industries.map((ind) => (
                      <tr key={ind.id} className="border-b border-zinc-200 hover:bg-zinc-50/20">
                        <td className="p-3 border-r border-zinc-200 bg-zinc-50 font-bold text-zs-blau-schwarz text-xs whitespace-nowrap">
                          {ind.name}
                          <div className="text-[9px] font-mono font-normal text-zinc-400">{ind.branche}</div>
                        </td>
                        {providers.map((pr) => {
                          const mType = getMatch(ind.id, pr.id);
                          const cellKey = `${ind.id}-${pr.id}`;
                          const isJustBoosted = lastBoostCell === cellKey;
                          return (
                            <td
                              key={pr.id}
                              onClick={() => {
                                const nextType =
                                  mType === 'NONE'
                                    ? 'POTENTIAL'
                                    : mType === 'POTENTIAL'
                                    ? 'LINKED'
                                    : mType === 'LINKED'
                                    ? 'ACTIVE_PILOT'
                                    : 'NONE';
                                onToggleMatch(ind.id, pr.id, nextType);
                                setLastBoostCell(cellKey);
                                setTimeout(() => setLastBoostCell((cur) => (cur === cellKey ? null : cur)), 700);
                                if (nextType === 'ACTIVE_PILOT') {
                                  setSynergyMessage(
                                    `Synergie-Bonus aktiviert: ${ind.name} × ${pr.name} ist jetzt PILOT-Match — 6-Schritte-Booster-Checkliste im Use-Case-Modul bereit zur Initialisierung!`
                                  );
                                }
                              }}
                              className={`p-4 border-r border-zinc-200 text-center transition-all cursor-pointer group hover:bg-[#F9FF00]/10 ${
                                mType === 'ACTIVE_PILOT'
                                  ? 'bg-[#58B49D]/20 hover:bg-[#58B49D]/30'
                                  : mType === 'LINKED'
                                  ? 'bg-amber-100 hover:bg-amber-200'
                                  : mType === 'POTENTIAL'
                                  ? 'bg-[#BA8B68]/15 hover:bg-[#BA8B68]/25'
                                  : 'bg-white'
                              }`}
                            >
                              <motion.span
                                key={`${cellKey}-${mType}`}
                                initial={isJustBoosted ? { scale: 1.22 } : false}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                                className={`inline-block text-[10px] font-mono font-bold uppercase tracking-wider ${
                                  mType === 'ACTIVE_PILOT'
                                    ? 'text-[#1c5548]'
                                    : mType === 'LINKED'
                                    ? 'text-amber-800'
                                    : mType === 'POTENTIAL'
                                    ? 'text-[#7a4a1e]'
                                    : 'text-zinc-300 group-hover:text-zinc-500'
                                }`}
                              >
                                {mType === 'ACTIVE_PILOT'
                                  ? '★ PILOT'
                                  : mType === 'LINKED'
                                  ? '⚡ LINKED'
                                  : mType === 'POTENTIAL'
                                  ? '⚙️ POTENTIAL'
                                  : 'Click to Match'}
                              </motion.span>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-4 pt-2 text-[10px] font-mono text-zinc-400 justify-end">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#58B49D]" /> ★ PILOT (Active Use Case)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-300" /> ⚡ LINKED (Cooperation)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#BA8B68]" /> ⚙️ POTENTIAL (Evaluations-Phase)
              </span>
            </div>
          </div>

          {/* End-to-End Booster-Pipeline Panel */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display font-bold text-base text-zs-blau-schwarz flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-[#58B49D]" />
                  <span>Booster-Pipeline: Aktive Pilot-Matches (37.000 € / Pos. 0835)</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Initialisieren Sie aus einem als ★ PILOT markierten Match direkt einen Use-Case sowie die zugehörige 37.000-€-Vergabe (mit BAFA Compliance-Gate).
                </p>
              </div>
            </div>

            {synergyMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-[#041422] text-white text-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles className="w-4 h-4 text-zs-signal-gelb shrink-0" />
                  <span>{synergyMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSynergyMessage(null)}
                  className="text-zinc-400 hover:text-white font-bold cursor-pointer"
                >
                  ✕
                </button>
              </motion.div>
            )}

            {pipelineFeedback && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{pipelineFeedback}</span>
                </div>
                {onNavigateToVergaben && (
                  <button
                    onClick={onNavigateToVergaben}
                    className="px-3 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Zu Vergabevorgängen wechseln</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {activePilotMatches.length === 0 ? (
              <div className="p-6 rounded-xl bg-zinc-50 border border-dashed border-zinc-200 text-center text-xs text-zinc-500 font-mono">
                Klicken Sie in der Matrix auf ein Feld bis Status „★ PILOT“, um die Booster-Pipeline hier 1-Klick-fähig anzuzeigen.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activePilotMatches.map(({ match, ind, prov }) => (
                  <div
                    key={`${ind.id}-${prov.id}-${match.id || 0}`}
                    className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="text-xs">
                      <div className="font-bold text-zs-blau-schwarz">
                        {ind.name} × {prov.name}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                        {ind.branche} &middot; {prov.tech || 'Transformations-Booster (0835)'}
                      </div>
                    </div>
                    {onCreateBoosterPipeline && (
                      <button
                        onClick={() => handleTriggerBooster(ind, prov)}
                        className="px-3.5 py-2 rounded-lg bg-zs-blau-schwarz text-white text-xs font-bold hover:bg-[#08243d] flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Rocket className="w-3.5 h-3.5 text-zs-signal-gelb" />
                        <span>Als Use-Case &amp; 37.000-€-Vergabe initialisieren</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT PARTNER */}
      {showFormModal && (
        <div className="fixed inset-0 bg-zs-blau-schwarz/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/30">
              <h3 className="font-display font-bold text-lg text-zs-blau-schwarz">
                {editingId ? 'Partner bearbeiten' : 'Ökosystem-Partner anlegen'}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-zinc-400 hover:text-zs-blau-schwarz transition-all text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                    Partner-/Firmenname <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. Sihl GmbH oder RWTH Aachen"
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    className="px-3 py-2 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      Klassifikation
                    </label>
                    <select
                      value={pTyp}
                      onChange={(e) => setPTyp(e.target.value as Partner['typ'])}
                      className="px-3 py-2 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    >
                      <option value="Industrieunternehmen">Industrieunternehmen</option>
                      <option value="Startup / Lösungspartner">Startup / Lösungspartner</option>
                      <option value="Dienstleister">Dienstleister</option>
                      <option value="Kooperationspartner">Kooperationspartner</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      Fokusbranche / Sektor
                    </label>
                    <input
                      type="text"
                      placeholder="z.B. Papiertechnik, Kreislaufchemie"
                      value={pBranche}
                      onChange={(e) => setPBranche(e.target.value)}
                      className="px-3 py-2 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      Ansprechpartner
                    </label>
                    <input
                      type="text"
                      placeholder="z.B. Dr. Christiane S."
                      value={pAp}
                      onChange={(e) => setPAp(e.target.value)}
                      className="px-3 py-2 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      Standort (Stadt)
                    </label>
                    <input
                      type="text"
                      placeholder="Düren"
                      value={pOrt}
                      onChange={(e) => setPOrt(e.target.value)}
                      className="px-3 py-2 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      E-Mail
                    </label>
                    <input
                      type="email"
                      placeholder="name@firma.de"
                      value={pEmail}
                      onChange={(e) => setPEmail(e.target.value)}
                      className="px-3 py-2 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      placeholder="+49 (0) ..."
                      value={pPhone}
                      onChange={(e) => setPPhone(e.target.value)}
                      className="px-3 py-2 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      Mitgliedschaftsstatus
                    </label>
                    <select
                      value={pStatus}
                      onChange={(e) => setPStatus(e.target.value as any)}
                      className="px-3 py-2 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    >
                      <option value="aktiv">aktiv</option>
                      <option value="in Kontakt">in Kontakt</option>
                      <option value="Pilot läuft">Pilot läuft</option>
                      <option value="abgeschlossen">abgeschlossen</option>
                      <option value="abgelehnt">abgelehnt</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                    Interne Notizen / Kompetenzen
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Wichtige Kernkompetenzen, Kooperationsvereinbarungen, nächste Schritte..."
                    value={pNotizen}
                    onChange={(e) => setPNotizen(e.target.value)}
                    className="px-3 py-2 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-zinc-100 flex flex-col gap-2 bg-zinc-50/50">
                {formError && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    {formError}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormError(null);
                      setShowFormModal(false);
                    }}
                    className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 transition-all cursor-pointer"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-zs-signal-gelb text-zs-blau-schwarz font-bold text-xs hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-all cursor-pointer"
                  >
                    {editingId ? 'Änderungen speichern' : 'Partner anlegen'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
