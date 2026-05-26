import React, { useState } from 'react';
import { Partner, PartnerMatch } from '../../types';

interface PartnerPageProps {
  partners: Partner[];
  matches: PartnerMatch[];
  onAddPartner: (partner: Omit<Partner, 'id'>) => void;
  onUpdatePartner: (id: number, partner: Partial<Partner>) => void;
  onDeletePartner: (id: number) => void;
  onToggleMatch: (industryId: number, providerId: number, type: string) => void;
}

export default function PartnerPage({
  partners,
  matches,
  onAddPartner,
  onUpdatePartner,
  onDeletePartner,
  onToggleMatch,
}: PartnerPageProps) {
  // Views: card, table, matrix
  const [activeView, setActiveView] = useState<'card' | 'table' | 'matrix'>('card');
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

  // Classify Partners
  const industries = partners.filter((p) => p.typ === 'Industrieunternehmen');
  const providers = partners.filter((p) => p.typ === 'Startup / Lösungspartner' || p.typ === 'Dienstleister');

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

  const handleDeleteClick = (id: number, name: string) => {
    if (confirm(`Soll der Partner "${name}" unwiderruflich gelöscht werden?`)) {
      onDeletePartner(id);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) { alert('Name fehlt'); return; }

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
      useCase: ''
    };

    if (editingId) {
      onUpdatePartner(editingId, payload);
    } else {
      onAddPartner(payload);
    }

    setEditingId(null);
    setShowFormModal(false);
  };

  // Find match helper
  const getMatch = (indId: number, provId: number): string => {
    const m = matches.find((x) => x.industryId === indId && x.providerId === provId);
    return m ? m.type : 'NONE';
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
            setShowFormModal(true);
          }}
          className="px-5 py-2 text-xs font-bold rounded-full bg-zs-signal-gelb text-zs-blau-schwarz hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          + Neuer Partner eintragen
        </button>
      </div>

      {/* Sub Views Toggler */}
      <div className="bg-white p-3 rounded-xl border border-zinc-200/80 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveView('card')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeView === 'card' ? 'bg-zs-blau-schwarz text-white' : 'hover:bg-zinc-50 text-zinc-600'
            }`}
          >
            📇 Ökosystem-Karten
          </button>
          <button
            onClick={() => setActiveView('table')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeView === 'table' ? 'bg-zs-blau-schwarz text-white' : 'hover:bg-zinc-50 text-zinc-600'
            }`}
          >
            📋 Partnerverzeichnis
          </button>
          <button
            onClick={() => setActiveView('matrix')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeView === 'matrix' ? 'bg-zs-blau-schwarz text-white' : 'hover:bg-zinc-50 text-zinc-600'
            }`}
          >
            ⚡ Matchmaking-Matrix
          </button>
        </div>

        {/* Filters */}
        {activeView !== 'matrix' && (
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

      {/* ── VIEW 1: CARDS ── */}
      {activeView === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {filteredPartners.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-zinc-400 font-mono">
              Keine Partner für diese Filterkombination gefunden.
            </div>
          ) : (
            filteredPartners.map((p) => {
              const isKMU = p.typ === 'Industrieunternehmen';
              const isStartup = p.typ === 'Startup / Lösungspartner';
              return (
                <div key={p.id} className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                        isKMU ? 'bg-[#041422]/10 text-zs-blau-schwarz' :
                        isStartup ? 'bg-[#58B49D]/10 text-[#2a7060]' :
                        'bg-[#BA8B68]/10 text-zs-papier-braun'
                      }`}>
                        {p.typ}
                      </span>
                      <span className={`px-1.5 py-0.5 text-[8px] font-mono rounded font-bold uppercase bg-zinc-100 text-zinc-650`}>
                        ● {p.status}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-base text-zs-blau-schwarz mt-3">{p.name}</h3>
                    <p className="text-[11px] font-mono text-zinc-400 mt-0.5">Sektor: {p.branche} &middot; {p.ort}</p>

                    {p.ap && (
                      <div className="mt-4 p-2.5 rounded-lg bg-zinc-50 border border-zinc-150 text-xs text-zinc-650 space-y-1">
                        <div>🗣 <strong>{p.ap}</strong></div>
                        {p.email && <div className="truncate">✉ {p.email}</div>}
                        {p.tel && <div>📞 {p.tel}</div>}
                      </div>
                    )}

                    {p.notizen && (
                      <p className="text-xs text-zinc-500 font-sans mt-3 leading-relaxed limit-rows line-clamp-2">
                        {p.notizen}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-100 text-[10px] font-mono w-full">
                    <button
                      onClick={() => handleEditClick(p)}
                      className="px-3 py-1 border border-zinc-200 rounded-lg hover:bg-zs-blau-schwarz hover:text-white hover:border-zs-blau-schwarz transition-all cursor-pointer flex-1"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleDeleteClick(p.id, p.name)}
                      className="px-2 py-1 text-red-500 rounded hover:bg-red-50 transition-all cursor-pointer"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── VIEW 2: TABLE ── */}
      {activeView === 'table' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden animate-fade-in">
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
                    <td colSpan={7} className="p-8 text-center text-xs text-zinc-400 font-mono">Keine Partner registriert.</td>
                  </tr>
                ) : (
                  filteredPartners.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <td className="p-3 pl-5">
                        <div className="font-bold text-zs-blau-schwarz text-xs">{p.name}</div>
                        {p.notizen && <div className="text-[10px] text-zinc-450 truncate max-w-[220px]" title={p.notizen}>{p.notizen}</div>}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 text-zinc-605 font-bold">
                          {p.typ}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-zinc-700">{p.branche}</td>
                      <td className="p-3 text-xs text-zinc-650 space-y-0.5">
                        <div className="font-medium">{p.ap || '–'}</div>
                        {p.email && <div className="text-[10px] font-mono text-zinc-450">{p.email}</div>}
                      </td>
                      <td className="p-3 text-xs text-zinc-500">{p.ort || 'Düren'}</td>
                      <td className="p-3 uppercase text-[10px] font-mono font-bold text-emerald-600">
                        {p.status}
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap pl-4">
                        <button
                          onClick={() => handleEditClick(p)}
                          className="px-2 py-1 rounded bg-zinc-100 hover:bg-zs-blau-schwarz hover:text-white transition-all text-[11px] font-semibold text-zinc-800 cursor-pointer"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDeleteClick(p.id, p.name)}
                          className="px-2 py-1 rounded text-red-500 hover:bg-red-50 transition-all text-[11px] font-semibold cursor-pointer"
                        >
                          Löschen
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW 3: MATCHING MATRIX ── */}
      {activeView === 'matrix' && (
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4 animate-fade-in">
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
                    <th key={pr.id} className="p-3 text-center border-b border-r border-zinc-200 font-bold text-zs-blau-schwarz min-w-[120px]">
                      {pr.name}
                      <div className="text-[9px] font-mono font-normal text-zinc-400 uppercase mt-0.5">{pr.typ}</div>
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
                        return (
                          <td
                             key={pr.id}
                             onClick={() => {
                               const nextType =
                                 mType === 'NONE' ? 'POTENTIAL' :
                                 mType === 'POTENTIAL' ? 'LINKED' :
                                 mType === 'LINKED' ? 'ACTIVE_PILOT' : 'NONE';
                               onToggleMatch(ind.id, pr.id, nextType);
                             }}
                             className={`p-4 border-r border-zinc-200 text-center transition-all cursor-pointer group hover:bg-[#F9FF00]/10 ${
                               mType === 'ACTIVE_PILOT' ? 'bg-[#58B49D]/20 hover:bg-[#58B49D]/30' :
                               mType === 'LINKED' ? 'bg-amber-100 hover:bg-amber-150' :
                               mType === 'POTENTIAL' ? 'bg-[#BA8B68]/15 hover:bg-[#BA8B68]/25' :
                               'bg-white'
                             }`}
                          >
                            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                              mType === 'ACTIVE_PILOT' ? 'text-[#1c5548]' :
                              mType === 'LINKED' ? 'text-amber-805' :
                              mType === 'POTENTIAL' ? 'text-[#7a4a1e]' :
                              'text-zinc-300 group-hover:text-zinc-500'
                            }`}>
                              {mType === 'ACTIVE_PILOT' ? '★ PILOT' :
                               mType === 'LINKED' ? '⚡ LINKED' :
                               mType === 'POTENTIAL' ? '⚙️ POTENTIAL' : 'Click to Match'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-4 pt-2 text-[10px] font-mono text-zinc-450 justify-end">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#58B49D]" /> ★ PILOT (Active Use Case)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-300" /> ⚡ LINKED (Cooperation)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#BA8B68]" /> ⚙️ POTENTIAL (Evaluations-Phase)</span>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT PARTNER ── */}
      {showFormModal && (
        <div className="fixed inset-0 bg-zs-blau-schwarz/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in animate-scale-up">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/30">
              <h3 className="font-display font-bold text-lg text-zs-blau-schwarz">
                {editingId ? 'Partner bearbeiten' : 'Ökosystem-Partner anlegen'}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="text-zinc-400 hover:text-zs-blau-schwarz transition-all text-xl font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Partner-/Firmenname <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="z.B. Sihl GmbH oder RWTH Aachen"
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Klassifikation</label>
                    <select
                      value={pTyp}
                      onChange={(e) => setPTyp(e.target.value as Partner['typ'])}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    >
                      <option value="Industrieunternehmen">Industrieunternehmen</option>
                      <option value="Startup / Lösungspartner">Startup / Lösungspartner</option>
                      <option value="Dienstleister">Dienstleister</option>
                      <option value="Kooperationspartner">Kooperationspartner</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Fokusbranche / Sektor</label>
                    <input
                      type="text"
                      placeholder="z.B. Papiertechnik, Kreislaufchemie"
                      value={pBranche}
                      onChange={(e) => setPBranche(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Ansprechpartner</label>
                    <input
                      type="text"
                      placeholder="z.B. Dr. Christiane S."
                      value={pAp}
                      onChange={(e) => setPAp(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Standort (Stadt)</label>
                    <input
                      type="text"
                      placeholder="Düren"
                      value={pOrt}
                      onChange={(e) => setPOrt(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">E-Mail</label>
                    <input
                      type="email"
                      placeholder="name@firma.de"
                      value={pEmail}
                      onChange={(e) => setPEmail(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Telefon</label>
                    <input
                      type="tel"
                      placeholder="+49 (0) ..."
                      value={pPhone}
                      onChange={(e) => setPPhone(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Mitgliedschaftsstatus</label>
                    <select
                      value={pStatus}
                      onChange={(e) => setPStatus(e.target.value as any)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
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
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Interne Notizen / Kompetenzen</label>
                  <textarea
                    rows={2}
                    placeholder="Wichtige Kernkompetenzen, Kooperationsvereinbarungen, nächste Schritte..."
                    value={pNotizen}
                    onChange={(e) => setPNotizen(e.target.value)}
                    className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-zinc-100 flex justify-end gap-2 bg-zinc-50/50">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
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
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
