import React, { useState } from 'react';
import { PersonalEintrag } from '../../types';
import { formatEuro, formatDate, getQuarterFromMonth } from '../../utils';

interface PersonalkostenPageProps {
  personal: PersonalEintrag[];
  mitarbeiterList: string[];
  activeYear: string | null;
  activeYearLabel: string;
  onAddEintrag: (entry: Omit<PersonalEintrag, 'id'>) => void;
  onUpdateEintragStatus: (id: number, newStatus: PersonalEintrag['status']) => void;
  onUpdateMitarbeiterList: (newList: string[]) => void;
  onRenameMitarbeiterGlobal: (oldName: string, newName: string) => void;
  onRenameSingleMitarbeiter: (id: number, newName: string) => void;
}

export default function PersonalkostenPage({
  personal,
  mitarbeiterList,
  activeYear,
  activeYearLabel,
  onAddEintrag,
  onUpdateEintragStatus,
  onUpdateMitarbeiterList,
  onRenameMitarbeiterGlobal,
  onRenameSingleMitarbeiter,
}: PersonalkostenPageProps) {
  // Local states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageNamesModal, setShowManageNamesModal] = useState(false);
  
  // Status dropdowns state
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  // Form states to Add Entry
  const [formMitarbeiter, setFormMitarbeiter] = useState(mitarbeiterList[0] || '');
  const [formAgKosten, setFormAgKosten] = useState('');
  const [formMonat, setFormMonat] = useState(1);
  const [formJahr, setFormJahr] = useState(2025);
  const [formBemerkung, setFormBemerkung] = useState('');
  const [formStatus, setFormStatus] = useState<PersonalEintrag['status']>('ENTWURF');

  // Form states to Manage Names
  const [newMitarbeiterName, setNewMitarbeiterName] = useState('');
  const [editingNameIndex, setEditingNameIndex] = useState<number | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');

  // Auto-derived variables for preview
  const agKostenNum = parseFloat(formAgKosten) || 0;
  const sachkostenPreview = agKostenNum * 0.10;
  const foerderfaehigPreview = agKostenNum + sachkostenPreview;
  const bafaPreview = foerderfaehigPreview * 0.90;
  const lhoPreview = foerderfaehigPreview * 0.075;

  // Yearly filtration
  const filteredPersonal = personal.filter((p) => {
    if (!activeYear) return true;
    if (activeYear === 'gesamt25') return p.jahr === 2025 && p.monat >= 4;
    if (activeYear === 'mrz29') return p.jahr === 2029 && p.monat <= 3;
    return String(p.jahr) === String(activeYear);
  });

  const totAgKosten = filteredPersonal.reduce((s, p) => s + p.agKosten, 0);
  const totFoerderbar = filteredPersonal.reduce((s, p) => s + p.foerderfaehig, 0);
  const totBafa = filteredPersonal.reduce((s, p) => s + p.bafaAnteil, 0);

  const MONATE = [
    '', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  // Renaming triggers
  const handleNameClick = (p: PersonalEintrag) => {
    const newName = prompt(`Namen für "${p.mitarbeiter}" bearbeiten:\n\nWelcher neue Name soll eingetragen werden?`, p.mitarbeiter);
    if (!newName || newName.trim() === p.mitarbeiter) return;
    const cleanName = newName.trim();

    // Ask if global or single rename
    const choice = confirm(
      `Soll der Name "${p.mitarbeiter}" GLOBAL in allen Monaten umbenannt werden?\n\n` +
      `OK = GLOBAL für alle Monate umbenennen\n` +
      `Abbrechen = Nur diesen einzelnen Eintrag ändern`
    );

    if (choice) {
      onRenameMitarbeiterGlobal(p.mitarbeiter, cleanName);
    } else {
      onRenameSingleMitarbeiter(p.id, cleanName);
    }
  };

  const handleAddEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMitarbeiter) {
      alert('Bitte wählen Sie einen Mitarbeiter aus.');
      return;
    }
    if (agKostenNum <= 0) {
      alert('Die Arbeitgeberkosten müssen größer als 0 sein.');
      return;
    }

    const sk = agKostenNum * 0.10;
    const ff = agKostenNum + sk;

    onAddEintrag({
      mitarbeiter: formMitarbeiter,
      monat: Number(formMonat),
      jahr: Number(formJahr),
      quartal: getQuarterFromMonth(Number(formMonat)),
      agKosten: agKostenNum,
      sachkosten: sk,
      foerderfaehig: ff,
      bafaAnteil: ff * 0.90,
      lhoAnteil: ff * 0.075,
      eigenaufwand: ff * 0.025,
      foerderjahr: Number(formJahr),
      status: formStatus,
      bemerkung: formBemerkung,
    });

    // Reset Form & Close
    setFormAgKosten('');
    setFormBemerkung('');
    setShowAddModal(false);
  };

  const handleAddNewMitarbeiterName = () => {
    const name = newMitarbeiterName.trim();
    if (!name) return;
    if (mitarbeiterList.includes(name)) {
      alert('Dieser Name existiert bereits.');
      return;
    }
    const updated = [...mitarbeiterList, name];
    onUpdateMitarbeiterList(updated);
    setFormMitarbeiter(name);
    setNewMitarbeiterName('');
  };

  const handleRemoveMitarbeiterName = (name: string) => {
    const isUsed = personal.some((p) => p.mitarbeiter === name);
    const msg = isUsed 
      ? `Achtung: "${name}" wird in ${personal.filter(p=>p.mitarbeiter===name).length} aktiven Personallohn-Datensätzen verwendet! Auswahlliste trotzdem anpassen? (Bestehende Datensätze bleiben erhalten)`
      : `Möchten Sie "${name}" aus der Auswahlliste löschen?`;
    
    if (confirm(msg)) {
      const updated = mitarbeiterList.filter((n) => n !== name);
      onUpdateMitarbeiterList(updated);
      if (formMitarbeiter === name) {
        setFormMitarbeiter(updated[0] || '');
      }
    }
  };

  const handleConfirmRenameMitarbeiter = (oldName: string, newName: string) => {
    if (!newName.trim() || newName.trim() === oldName) {
      setEditingNameIndex(null);
      return;
    }
    const clean = newName.trim();
    // Update selection list
    const updated = mitarbeiterList.map((n) => n === oldName ? clean : n);
    onUpdateMitarbeiterList(updated);
    // Rename database entries
    onRenameMitarbeiterGlobal(oldName, clean);
    setEditingNameIndex(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
            Personal<span className="bg-zs-signal-gelb px-1 py-0.5 rounded">kosten</span>
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            AG-Lohnabrechnungen &middot; {activeYearLabel} &middot; Automatisierte 10% Sachkosten-Overheads
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setShowManageNamesModal(true)}
            className="px-4 py-2 text-xs font-semibold rounded-full border-1.5 border-zs-blau-schwarz/20 font-mono text-zs-blau-schwarz transition-all hover:bg-zs-blau-schwarz hover:text-white cursor-pointer"
          >
            ✏️ Namen verwalten
          </button>
          <button
            onClick={() => {
              if (mitarbeiterList.length === 0) {
                alert('Bitte legen Sie zuerst Mitarbeiternamen über "Namen verwalten" an.');
                return;
              }
              setFormMitarbeiter(mitarbeiterList[0]);
              setShowAddModal(true);
            }}
            className="px-5 py-2 text-xs font-bold rounded-full bg-zs-signal-gelb text-zs-blau-schwarz hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-all shadow-xs cursor-pointer"
          >
            + Eintrag erfassen
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-400">EINTRÄGE IN PERIODE</div>
          <div className="text-2xl font-mono font-bold text-zs-blau-schwarz mt-1">
            {filteredPersonal.length} Belege
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-400 font-semibold text-zs-papier-braun">PLAN-AG-KOSTEN GESAMT</div>
          <div className="text-2xl font-mono font-bold text-zs-blau-schwarz mt-1">
            {formatEuro(totAgKosten, 2)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-400 font-semibold text-emerald-600">INCL. OVERHEAD FÖRDERBAR</div>
          <div className="text-2xl font-mono font-bold text-zs-textil-gruen mt-1">
            {formatEuro(totFoerderbar, 2)}
          </div>
        </div>
      </div>

      {/* Main personal table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <span className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-wider">Plan &amp; Ist Lohnabrechnung</span>
          <span className="text-xs text-zinc-500 font-mono">Scope: {filteredPersonal.length} Sätze</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] text-zinc-400 tracking-wider">
                <th className="p-3 pl-5">Mitarbeiter/in</th>
                <th className="p-3">Monat Wh.</th>
                <th className="p-3">Jahr</th>
                <th className="p-3 text-center">Quartal</th>
                <th className="p-3 text-right">AG-Basis</th>
                <th className="p-3 text-right">Sachkosten (10%)</th>
                <th className="p-3 text-right">Förderfähig</th>
                <th className="p-3 text-right text-zs-blau-schwarz">BAFA (90%)</th>
                <th className="p-3 text-right text-zs-textil-gruen">LHO (7,5%)</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPersonal.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-xs text-zinc-400 font-mono">
                    Keine Lohnkosten-Einträge für diesen Zeitraum gefunden.
                  </td>
                </tr>
              ) : (
                filteredPersonal.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                    <td className="p-3 pl-5 font-semibold text-zs-blau-schwarz text-xs">
                      <span 
                        onClick={() => handleNameClick(p)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 text-zinc-800 rounded-full text-[11px] font-medium border border-zinc-200 cursor-pointer hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb hover:border-zs-blau-schwarz transition-all"
                        title="Namen ändern (Global/Einzelfall)"
                      >
                        {p.mitarbeiter}
                        <span className="text-[9px] opacity-40">&#9998;</span>
                      </span>
                    </td>
                    <td className="p-3 text-xs text-zinc-600">{MONATE[p.monat]}</td>
                    <td className="p-3 text-xs text-zinc-600">{p.jahr}</td>
                    <td className="p-3 text-xs text-center font-mono text-zinc-500">Q{p.quartal}</td>
                    <td className="p-3 text-xs text-right font-mono font-medium">{formatEuro(p.agKosten, 2)}</td>
                    <td className="p-3 text-xs text-right font-mono text-zinc-400">{formatEuro(p.sachkosten, 2)}</td>
                    <td className="p-3 text-xs text-right font-mono font-bold text-zinc-800">{formatEuro(p.foerderfaehig, 2)}</td>
                    <td className="p-3 text-xs text-right font-mono font-bold text-zs-blau-schwarz">{formatEuro(p.bafaAnteil, 2)}</td>
                    <td className="p-3 text-xs text-right font-mono font-bold text-zs-textil-gruen">{formatEuro(p.lhoAnteil, 2)}</td>
                    <td className="p-3 text-center text-xs relative">
                      <button
                        onClick={() => setActiveDropdownId(activeDropdownId === p.id ? null : p.id)}
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider transition-all border cursor-pointer ${
                          p.status === 'EINGEREICHT' ? 'bg-[#58B49D]/10 text-[#2a7060] border-[#58B49D]/35' :
                          p.status === 'IN_PRUEFUNG' ? 'bg-[#7F6DBA]/10 text-[#54468f] border-[#7F6DBA]/35' :
                          p.status === 'ARCHIVIERT' ? 'bg-zinc-100 text-zinc-600 border-zinc-200' :
                          'bg-amber-100 text-amber-700 border-amber-200'
                        }`}
                      >
                        {p.status} &nbsp;▾
                      </button>

                      {/* Dropdown overlay */}
                      {activeDropdownId === p.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveDropdownId(null)}></div>
                          <div className="absolute right-1/2 translate-x-1/2 mt-1 w-32 bg-white rounded-lg border border-zinc-200 shadow-lg z-20 overflow-hidden font-mono text-xs">
                            {(['ENTWURF', 'IN_PRUEFUNG', 'EINGEREICHT', 'ARCHIVIERT'] as PersonalEintrag['status'][]).map((status) => (
                              <button
                                key={status}
                                onClick={() => {
                                  onUpdateEintragStatus(p.id, status);
                                  setActiveDropdownId(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-zs-signal-gelb/30 transition-all cursor-pointer"
                              >
                                {status}
                              </button>
                            ))}
                          </div>
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

      {/* ── MODAL: ADD PERSONAL ENTRY ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-zs-blau-schwarz/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="font-display font-bold text-lg text-zs-blau-schwarz">Lohnkostensatz erfassen</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zs-blau-schwarz transition-all text-xl font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleAddEntrySubmit}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Mitarbeiter/in</label>
                    <select
                      value={formMitarbeiter}
                      onChange={(e) => setFormMitarbeiter(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    >
                      {mitarbeiterList.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Arbeitgeber-Kosten (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="z.B. 5675.31"
                      value={formAgKosten}
                      onChange={(e) => setFormAgKosten(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Abrechnungsmonat</label>
                    <select
                      value={formMonat}
                      onChange={(e) => setFormMonat(Number(e.target.value))}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    >
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                        <option key={m} value={m}>{MONATE[m]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Projektjahr</label>
                    <select
                      value={formJahr}
                      onChange={(e) => setFormJahr(Number(e.target.value))}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    >
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                      <option value="2028">2028</option>
                      <option value="2029">2029</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as PersonalEintrag['status'])}
                    className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                  >
                    <option value="ENTWURF">ENTWURF</option>
                    <option value="IN_PRUEFUNG">IN PRÜFUNG</option>
                    <option value="EINGEREICHT">EINGEREICHT</option>
                    <option value="ARCHIVIERT">ARCHIVIERT</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Bemerkung / Begründung</label>
                  <input
                    type="text"
                    value={formBemerkung}
                    onChange={(e) => setFormBemerkung(e.target.value)}
                    placeholder="z.B. Jahressonderzahlung"
                    className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                  />
                </div>

                {/* Sub Calculation Preview Block */}
                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-150/80">
                  <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase tracking-widest block mb-2">
                    Berechnungen nach STARK-Schablone (90%/7.5%/2.5%)
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="border-r border-zinc-200">
                      <div className="text-[8px] text-zinc-400 font-mono">MÖGL. OVERHEAD (10%)</div>
                      <div className="font-mono font-bold text-zinc-700 mt-0.5">{formatEuro(sachkostenPreview, 2)}</div>
                    </div>
                    <div className="border-r border-zinc-200">
                      <div className="text-[8px] text-zinc-400 font-mono">FÖRDERFÄHIG</div>
                      <div className="font-mono font-bold text-zinc-800 mt-0.5">{formatEuro(foerderfaehigPreview, 2)}</div>
                    </div>
                    <div className="border-r border-zinc-200">
                      <div className="text-[8px] text-zs-blau-schwarz/60 font-mono">BAFA (90%)</div>
                      <div className="font-mono font-bold text-zs-blau-schwarz mt-0.5">{formatEuro(bafaPreview, 2)}</div>
                    </div>
                    <div>
                      <div className="text-[8px] text-zs-textil-gruen/80 font-mono">LHO (7,5%)</div>
                      <div className="font-mono font-bold text-zs-textil-gruen mt-0.5">{formatEuro(lhoPreview, 2)}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-zinc-100 flex justify-end gap-2 bg-zinc-50/50">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-zs-signal-gelb text-zs-blau-schwarz font-bold text-xs hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-all cursor-pointer"
                >
                  Eintrag speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: MANAGE NAMES ── */}
      {showManageNamesModal && (
        <div className="fixed inset-0 bg-zs-blau-schwarz/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/30">
              <h3 className="font-display font-bold text-ash-deep text-zs-blau-schwarz">Projektmitarbeiter verwalten</h3>
              <button onClick={() => setShowManageNamesModal(false)} className="text-zinc-400 hover:text-zs-blau-schwarz transition-all text-xl font-bold cursor-pointer">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                Namen ändern wirkt sich global auf alle zugehörigen Personaleinträge aus.
                Das Löschen entfernt den Name lediglich aus dem Dropdown, historische Lohnbelege bleiben unverändert.
              </p>

              {/* Lists of employees */}
              <div className="space-y-2 border border-zinc-150 rounded-xl max-h-56 overflow-y-auto p-2 bg-zinc-50/50">
                {mitarbeiterList.length === 0 ? (
                  <div className="text-center p-4 text-xs font-mono text-zinc-400">Keine Mitarbeiter eingetragen.</div>
                ) : (
                  mitarbeiterList.map((m, index) => {
                    const count = personal.filter((p) => p.mitarbeiter === m).length;
                    return (
                      <div key={m} className="flex justify-between items-center bg-white p-2 rounded-lg border border-zinc-100 hover:border-zinc-200 transition-all">
                        {editingNameIndex === index ? (
                          <input
                            type="text"
                            value={editingNameValue}
                            onChange={(e) => setEditingNameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleConfirmRenameMitarbeiter(m, editingNameValue);
                              if (e.key === 'Escape') setEditingNameIndex(null);
                            }}
                            className="text-xs font-semibold px-2 py-1 border border-zs-blau-schwarz rounded-sm outline-none w-2/3"
                            autoFocus
                          />
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-zs-blau-schwarz">{m}</span>
                            <span className="text-[9px] font-mono text-zinc-400">{count} Belege verknüpft</span>
                          </div>
                        )}

                        <div className="flex gap-1">
                          {editingNameIndex === index ? (
                            <>
                              <button
                                onClick={() => handleConfirmRenameMitarbeiter(m, editingNameValue)}
                                className="px-2 py-1 bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setEditingNameIndex(null)}
                                className="px-2 py-1 bg-zinc-200 text-zinc-600 rounded text-[10px] font-bold cursor-pointer"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingNameIndex(index);
                                  setEditingNameValue(m);
                                }}
                                className="px-2 py-1 rounded bg-zinc-100 hover:bg-zs-blau-schwarz hover:text-white transition-all text-[10px] font-semibold text-zinc-600 cursor-pointer"
                              >
                                Rumpf
                              </button>
                              <button
                                onClick={() => handleRemoveMitarbeiterName(m)}
                                className="px-1.5 py-1 text-[11px] font-semibold text-red-500 rounded hover:bg-red-50 transition-all cursor-pointer"
                                title="Aus Liste löschen"
                              >
                                &#10005;
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add employee name input */}
              <div className="pt-4 border-t border-zinc-100 flex gap-2">
                <input
                  type="text"
                  placeholder="Voller Name (z.B. Dr. Peter Becker)"
                  value={newMitarbeiterName}
                  onChange={(e) => setNewMitarbeiterName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddNewMitarbeiterName();
                  }}
                  className="flex-grow px-3 py-2 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                />
                <button
                  type="button"
                  onClick={handleAddNewMitarbeiterName}
                  className="px-4 py-2 font-bold text-xs rounded-lg bg-zs-blau-schwarz text-zs-signal-gelb hover:opacity-95 transition-all cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-zinc-100 flex justify-end bg-zinc-50/50">
              <button
                onClick={() => setShowManageNamesModal(false)}
                className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 transition-all cursor-pointer"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
