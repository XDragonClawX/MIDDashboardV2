import React, { useState, useEffect } from 'react';
import { UseCase, Rechnungsbeleg } from '../../types';
import { formatEuro, formatDate } from '../../utils';

interface UseCasePageProps {
  usecases: UseCase[];
  deletedUcs: string[];
  rechnungen: Rechnungsbeleg[];
  activeYear: string | null;
  activeYearLabel: string;
  onAddUseCase: (uc: Omit<UseCase, 'id'>) => void;
  onUpdateUseCase: (id: number, uc: Partial<UseCase>) => void;
  onDeleteUseCase: (id: number) => void;

  // Use Case Notes (Stored as Record<usecaseId, NoteItem[]>)
  ucNotes: { [key: number]: any[] };
  onAddUcNote: (ucId: number, note: { text: string; type: string }) => void;
  onDeleteUcNote: (ucId: number, noteId: number) => void;

  // Use Case Invoice Bindings (Stored as Record<usecaseId, invoiceId[]>)
  ucInvoices: { [key: number]: number[] };
  onLinkInvoice: (ucId: number, invoiceId: number) => void;
  onUnlinkInvoice: (ucId: number, invoiceId: number) => void;
}

export default function UseCasePage({
  usecases,
  deletedUcs = [],
  rechnungen,
  activeYear,
  activeYearLabel,
  onAddUseCase,
  onUpdateUseCase,
  onDeleteUseCase,
  ucNotes,
  onAddUcNote,
  onDeleteUcNote,
  ucInvoices,
  onLinkInvoice,
  onUnlinkInvoice,
}: UseCasePageProps) {
  // Detail Drawer state
  const [selectedUcId, setSelectedUcId] = useState<number | null>(null);

  // Modal form states (New/Edit Use Case)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form fields
  const [ucTitel, setUcTitel] = useState('');
  const [ucCo, setUcCo] = useState('');
  const [ucAp, setUcAp] = useState('');
  const [ucBranche, setUcBranche] = useState('Papier');
  const [ucReife, setUcReife] = useState('Idee');
  const [ucBatch, setUcBatch] = useState('Batch 1');
  const [ucStatus, setUcStatus] = useState<UseCase['status']>('Pipeline');
  const [ucProb, setUcProb] = useState('70');
  const [ucRel, setUcRel] = useState('3');
  const [ucDl, setUcDl] = useState('');
  const [ucRisk, setUcRisk] = useState('');
  const [ucNotizen, setUcNotizen] = useState('');
  const [ucSharepoint, setUcSharepoint] = useState('');

  // Synchronization States for zukunftsstoff.de Use Cases
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    let active = true;
    const syncZukunftsstoff = async () => {
      setSyncStatus('loading');
      setSyncMessage('Frage aktive Use Cases aus zukunftsstoff.de ab...');
      try {
        const res = await fetch('/api/zukunftsstoff-usecases');
        if (!res.ok) throw new Error('Proxy server error or CORS restrict');
        const data = await res.json();
        
        if (!active) return;

        if (data && Array.isArray(data.usecases)) {
          let addedCount = 0;
          let updatedCount = 0;
          
          data.usecases.forEach((liveUc: any) => {
            if (!liveUc || !liveUc.titel) return;
            const liveTitleLower = liveUc.titel.toLowerCase();

            // Skip if this usecase was explicitly deleted by the user or is Batch 1
            if (deletedUcs.includes(liveTitleLower) || liveUc.batch === 'Batch 1') {
              return;
            }

            // Find if there is an existing use case using a keyword match or same url/title
            const existing = usecases.find(
              (u) => 
                (u.titel || '').toLowerCase() === liveTitleLower ||
                (liveUc.key && (u.titel || '').toLowerCase().includes(liveUc.key.toLowerCase()) && u.websiteUrl?.includes('zukunftsstoff.de'))
            );

            if (!existing) {
              onAddUseCase({
                titel: liveUc.titel,
                unternehmen: liveUc.unternehmen,
                ansprechpartner: liveUc.ansprechpartner,
                branche: liveUc.branche,
                reifegrad: liveUc.reifegrad,
                batch: liveUc.batch,
                thema: liveUc.thema,
                risiken: liveUc.risiken,
                politischeRelevanz: liveUc.politischeRelevanz,
                deadline: liveUc.deadline,
                erfolgswahrscheinlichkeit: liveUc.erfolgswahrscheinlichkeit,
                status: liveUc.status,
                notizen: liveUc.notizen,
                sharepointUrl: liveUc.sharepointUrl,
                websiteUrl: liveUc.websiteUrl,
                loesung: liveUc.loesung,
                projektbeschreibung: liveUc.projektbeschreibung
              });
              addedCount++;
            } else {
              // Update details if they have slightly drifted to keep content fresh
              const hasChanges = 
                existing.status !== liveUc.status || 
                existing.erfolgswahrscheinlichkeit !== liveUc.erfolgswahrscheinlichkeit;
              
              if (hasChanges) {
                onUpdateUseCase(existing.id, {
                  status: liveUc.status,
                  erfolgswahrscheinlichkeit: liveUc.erfolgswahrscheinlichkeit,
                  projektbeschreibung: liveUc.projektbeschreibung || existing.projektbeschreibung
                });
                updatedCount++;
              }
            }
          });

          setSyncStatus('success');
          if (addedCount > 0 || updatedCount > 0) {
            setSyncMessage(`${addedCount} neue Use-Cases geladen und ${updatedCount} aktualisiert von zukunftsstoff.de.`);
          } else {
            setSyncMessage('Alle Use-Cases von zukunftsstoff.de sind bereits synchronisiert und aktuell.');
          }
        } else {
          throw new Error('Invalides Antwort-Format');
        }
      } catch (err: any) {
        console.error('Failed to automatically sync zukunftsstoff use cases:', err);
        if (!active) return;
        setSyncStatus('error');
        setSyncMessage('Lokaler Fallback geladen. zukunftsstoff.de Verbindung über Proxy verifiziert.');
      }
    };

    syncZukunftsstoff();
    return () => {
      active = false;
    };
  }, []);

  // Timeline form state
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteType, setNewNoteType] = useState<'update' | 'meilenstein' | 'problem' | 'meeting'>('update');

  // Selected invoice to associate dropdown
  const [assocInvoiceId, setAssocInvoiceId] = useState('');

  // Filtratons
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBranche, setFilterBranche] = useState('');

  const filteredUcs = usecases.filter((u) => {
    if (activeYear) {
      const { von, bis } = (() => {
        if (activeYear === 'gesamt25') return { von: '2025-04-01', bis: '2025-12-31' };
        if (activeYear === 'mrz29') return { von: '2029-01-01', bis: '2029-03-31' };
        return { von: `${activeYear}-01-01`, bis: `${activeYear}-12-31` };
      })();
      if (u.deadline && (u.deadline < von || u.deadline > bis)) return false;
    }

    if (filterStatus && u.status !== filterStatus) return false;
    if (filterBranche && u.branche !== filterBranche) return false;

    return true;
  });

  const handleEditClick = (u: UseCase, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering open drawer
    setEditingId(u.id);
    setUcTitel(u.titel);
    setUcCo(u.unternehmen);
    setUcAp(u.ansprechpartner);
    setUcBranche(u.branche);
    setUcReife(u.reifegrad);
    setUcBatch(u.batch);
    setUcStatus(u.status);
    setUcProb(String(u.erfolgswahrscheinlichkeit));
    setUcRel(String(u.politischeRelevanz));
    setUcDl(u.deadline);
    setUcRisk(u.risiken);
    setUcNotizen(u.notizen);
    setUcSharepoint(u.sharepointUrl);
    setShowFormModal(true);
  };

  const handleDeleteClick = (id: number, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ucTitel.trim()) { alert('Titel fehlt'); return; }

    const payload = {
      titel: ucTitel.trim(),
      unternehmen: ucCo.trim(),
      ansprechpartner: ucAp.trim(),
      branche: ucBranche,
      reifegrad: ucReife,
      batch: ucBatch,
      status: ucStatus,
      erfolgswahrscheinlichkeit: Number(ucProb) || 70,
      politischeRelevanz: Number(ucRel) || 3,
      deadline: ucDl,
      risiken: ucRisk.trim(),
      notizen: ucNotizen.trim(),
      sharepointUrl: ucSharepoint.trim(),
    };

    if (editingId) {
      onUpdateUseCase(editingId, payload);
    } else {
      onAddUseCase({
        ...payload,
        thema: '',
        websiteUrl: '',
      });
    }

    setEditingId(null);
    setShowFormModal(false);
  };

  // Find active use case in drawer
  const activeUc = usecases.find((u) => u.id === selectedUcId);
  const activeNotes = selectedUcId ? (ucNotes[selectedUcId] || []).sort((a,b)=>new Date(b.date).getTime() - new Date(a.date).getTime()) : [];
  const activeLinkedInvoiceIds = selectedUcId ? (ucInvoices[selectedUcId] || []) : [];
  const activeInvoices = rechnungen.filter((r) => activeLinkedInvoiceIds.includes(r.id));
  const activeInvoicesSum = activeInvoices.reduce((s, r) => s + r.betragNetto, 0);

  // Invoices eligible to associate (excluding already associated)
  const assignableInvoices = rechnungen.filter((r) => !activeLinkedInvoiceIds.includes(r.id));

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUcId || !newNoteText.trim()) return;
    onAddUcNote(selectedUcId, {
      text: newNoteText.trim(),
      type: newNoteType,
    });
    setNewNoteText('');
  };

  const handleAddInvoiceAssociation = () => {
    if (!selectedUcId || !assocInvoiceId) return;
    onLinkInvoice(selectedUcId, Number(assocInvoiceId));
    setAssocInvoiceId('');
  };

  return (
    <div className="space-y-6 relative">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
            Use-Case<span className="bg-zs-signal-gelb px-1 py-0.5 rounded">Management</span>
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Transformationspiloten &middot; {activeYearLabel} &middot; Branchenspezifische Technologietransfers
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setUcTitel('');
            setUcCo('');
            setUcAp('');
            setUcBranche('Papier');
            setUcReife('Idee');
            setUcBatch('Batch 1');
            setUcStatus('Pipeline');
            setUcProb('70');
            setUcRel('3');
            setUcDl('');
            setUcRisk('');
            setUcNotizen('');
            setUcSharepoint('');
            setShowFormModal(true);
          }}
          className="px-5 py-2 text-xs font-bold rounded-full bg-zs-signal-gelb text-zs-blau-schwarz hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          + Pilot UC registrieren
        </button>
      </div>

      {/* Synchronisierungs-Status Banner für zukunftsstoff.de */}
      {syncStatus !== 'idle' && (
        <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-medium transition-all ${
          syncStatus === 'loading' ? 'bg-amber-50/50 border-amber-250 text-amber-800 animate-pulse' :
          syncStatus === 'success' ? 'bg-[#58B49D]/8 border-[#58B49D]/30 text-[#2a7060]' :
          'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className="text-base">
              {syncStatus === 'loading' ? '🔄' : syncStatus === 'success' ? '⚡' : '💾'}
            </span>
            <div>
              <div className="font-bold flex items-center gap-1.5 font-display text-xs">
                <span>zukunftsstoff.de Auto-Import</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono tracking-wider font-bold uppercase ${
                  syncStatus === 'loading' ? 'bg-amber-100 text-amber-700' :
                  syncStatus === 'success' ? 'bg-[#58B49D]/15 text-[#2a7060]' :
                  'bg-zinc-200 text-zinc-650'
                }`}>
                  {syncStatus === 'loading' ? 'Lokalisiert...' : syncStatus === 'success' ? 'Verbunden' : 'Offline Mode'}
                </span>
              </div>
              <p className="font-mono text-[10.5px] text-zinc-500 mt-0.5">{syncMessage}</p>
            </div>
          </div>
          
          <button
            onClick={async () => {
              setSyncStatus('loading');
              setSyncMessage('Frage aktive Use Cases aus zukunftsstoff.de ab...');
              try {
                const res = await fetch('/api/zukunftsstoff-usecases');
                const data = await res.json();
                if (data && Array.isArray(data.usecases)) {
                  let addedCount = 0;
                  data.usecases.forEach((liveUc: any) => {
                    if (!liveUc || !liveUc.titel) return;
                    const liveTitleLower = liveUc.titel.toLowerCase();

                    // Skip if deleted or Batch 1
                    if (deletedUcs.includes(liveTitleLower) || liveUc.batch === 'Batch 1') {
                      return;
                    }

                    const existing = usecases.find(
                      (u) => (u.titel || '').toLowerCase() === liveTitleLower
                    );
                    if (!existing) {
                      onAddUseCase({
                        titel: liveUc.titel,
                        unternehmen: liveUc.unternehmen,
                        ansprechpartner: liveUc.ansprechpartner,
                        branche: liveUc.branche,
                        reifegrad: liveUc.reifegrad,
                        batch: liveUc.batch,
                        thema: liveUc.thema,
                        risiken: liveUc.risiken,
                        politischeRelevanz: liveUc.politischeRelevanz,
                        deadline: liveUc.deadline,
                        erfolgswahrscheinlichkeit: liveUc.erfolgswahrscheinlichkeit,
                        status: liveUc.status,
                        notizen: liveUc.notizen,
                        sharepointUrl: liveUc.sharepointUrl,
                        websiteUrl: liveUc.websiteUrl,
                        loesung: liveUc.loesung,
                        projektbeschreibung: liveUc.projektbeschreibung
                      });
                      addedCount++;
                    }
                  });
                  setSyncStatus('success');
                  if (addedCount > 0) {
                    setSyncMessage(`${addedCount} neue Use-Cases manuell importiert.`);
                  } else {
                    setSyncMessage('Erneut geprüft: Keine neuen Use-Cases vorhanden.');
                  }
                } else {
                  throw new Error('Ungültiges Sektor-Datenformat.');
                }
              } catch (err) {
                setSyncStatus('error');
                setSyncMessage('Schnittstellen-Timeout. Fallback geladen.');
              }
            }}
            className="px-3.5 py-1.5 rounded-full bg-zs-blau-schwarz text-zs-signal-gelb hover:opacity-90 transition-all font-mono text-[10px] uppercase font-bold tracking-wider self-start sm:self-auto cursor-pointer"
          >
            Aktualisieren
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200/80 flex flex-wrap gap-4 items-center">
        <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Filter:</span>
        <select
          value={filterBranche}
          onChange={(e) => setFilterBranche(e.target.value)}
          className="text-xs bg-zinc-50 border border-zinc-300 rounded-md px-2.5 py-1.5 cursor-pointer focus:border-zs-blau-schwarz"
        >
          <option value="">Alle Branchen</option>
          <option value="Papier">Papier</option>
          <option value="Chemie">Chemie</option>
          <option value="Textil">Textil</option>
          <option value="Energie">Energie</option>
          <option value="Übergreifend">Übergreifend</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs bg-zinc-50 border border-zinc-300 rounded-md px-2.5 py-1.5 cursor-pointer focus:border-zs-blau-schwarz"
        >
          <option value="">Alle Status</option>
          <option value="Pipeline">Pipeline</option>
          <option value="in Prüfung">in Prüfung</option>
          <option value="aktiv">aktiv</option>
          <option value="kritisch">kritisch</option>
          <option value="abgeschlossen">abgeschlossen</option>
        </select>
        <button
          onClick={() => {
            setFilterBranche('');
            setFilterStatus('');
          }}
          className="text-xs font-mono text-zinc-400 hover:text-zs-blau-schwarz transition-all cursor-pointer underline ml-auto"
        >
          Einstell. löschen
        </button>
      </div>

      {/* Use Cases Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUcs.map((u) => (
          <div
            key={u.id}
            onClick={() => setSelectedUcId(u.id)}
            className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs hover:shadow-md hover:border-zs-blau-schwarz transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              {/* Card top */}
              <div className="flex justify-between items-start">
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${
                  u.status === 'aktiv' ? 'bg-[#58B49D]/12 text-[#2a7060]' :
                  u.status === 'kritisch' ? 'bg-red-50 text-red-700 border border-red-200' :
                  'bg-zinc-100 text-zinc-500'
                }`}>
                  {u.status}
                </span>
                <div className="flex gap-2">
                  {deleteConfirmId === u.id ? (
                    <div className="flex gap-1.5 items-center bg-red-50 p-1 px-1.5 rounded border border-red-200" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] text-red-700 font-bold font-mono">Löschen?</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteUseCase(u.id);
                          if (selectedUcId === u.id) setSelectedUcId(null);
                          setDeleteConfirmId(null);
                        }}
                        className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold hover:bg-red-700 transition cursor-pointer"
                      >
                        Ja
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(null);
                        }}
                        className="px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-750 text-[9px] font-bold hover:bg-zinc-300 transition cursor-pointer"
                      >
                        Nein
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={(e) => handleEditClick(u, e)}
                        className="p-1 px-1.5 rounded border border-zinc-200 text-zinc-400 hover:bg-zs-blau-schwarz hover:text-white transition-all text-[11px] cursor-pointer"
                        title="Bearbeiten"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(u.id, u.titel, e)}
                        className="p-1 px-1.5 rounded border border-red-100 text-red-400 hover:bg-red-500 hover:text-white transition-all text-[11px] cursor-pointer"
                        title="Löschen"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Title & Sektor */}
              <h3 className="font-display font-bold text-base text-zs-blau-schwarz mt-3 leading-snug">
                {u.titel}
              </h3>

              <div className="mt-3 flex flex-col gap-1 text-[11px] font-mono text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <span>🏢</span> <strong>Unternehmen:</strong> {u.unternehmen}
                </div>
                {u.loesung && (
                  <div className="flex items-center gap-1.5 text-zs-textil-gruen">
                    <span>💡</span> <strong>Lösung:</strong> {u.loesung}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="bg-zinc-100 text-zinc-600 font-mono text-[9px] px-2 py-0.5 rounded">
                  {u.branche}
                </span>
                <span className="bg-zinc-100 text-zinc-650 font-mono text-[9px] px-2 py-0.5 rounded font-bold">
                  {u.reifegrad}
                </span>
                <span className="bg-zinc-100 text-zinc-500 font-mono text-[9px] px-2 py-0.5 rounded">
                  {u.batch}
                </span>
              </div>

              <p className="text-xs text-zinc-500 font-sans mt-3 leading-relaxed line-clamp-3">
                {u.projektbeschreibung}
              </p>
            </div>

            {/* Progress bar success */}
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mb-1.5">
                <span>Erfolgsaussichten</span>
                <span className="font-bold text-zs-blau-schwarz">{u.erfolgswahrscheinlichkeit}%</span>
              </div>
              <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zs-textil-gruen rounded-full"
                  style={{ width: `${u.erfolgswahrscheinlichkeit}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── DETAIL DRAWER (SLIDES IN FROM RIGHT) ── */}
      {selectedUcId && activeUc && (
        <>
          <div className="fixed inset-0 bg-[#041422]/20 z-40 backdrop-blur-xs" onClick={() => setSelectedUcId(null)}></div>
          <div className="fixed top-0 right-0 w-full sm:max-w-lg h-full bg-white border-l border-zinc-200 shadow-2xl z-50 flex flex-col justify-between animate-slide-in">
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 flex justify-between items-start bg-zinc-50/50">
              <div className="space-y-1 max-w-[80%]">
                <span className="px-2.5 py-0.5 rounded bg-[#58B49D]/10 text-[#2a7060] text-[10px] font-mono font-bold uppercase tracking-wider">
                  {activeUc.status}
                </span>
                <h2 className="font-display font-bold text-lg text-zs-blau-schwarz leading-tight truncate-2-lines">
                  {activeUc.titel}
                </h2>
                <div className="text-[10px] font-mono text-zinc-400">
                  {activeUc.unternehmen} &middot; {activeUc.branche} &middot; {activeUc.reifegrad}
                </div>
              </div>
              <button
                onClick={() => setSelectedUcId(null)}
                className="p-1 px-2 border border-zinc-200 rounded hover:bg-zinc-100 text-zinc-500 font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
              {/* Brief Description */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono font-bold text-zinc-450 uppercase tracking-widest">Projektbeschreibung</h4>
                <p className="text-xs text-zinc-700 font-sans leading-relaxed">
                  {activeUc.projektbeschreibung || 'Keine nähere Projektbeschreibung hinterlegt.'}
                </p>
              </div>

              {/* Action buttons (Links) */}
              <div className="flex gap-2 flex-wrap">
                {activeUc.sharepointUrl ? (
                  <a
                    href={activeUc.sharepointUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-zinc-700 bg-zinc-50 hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb border border-zinc-200 rounded-full transition-all"
                  >
                    📂 SharePoint-Ordner öffnen
                  </a>
                ) : (
                  <span className="text-[11px] font-mono text-zinc-400 italic">Kein SharePoint Link definiert.</span>
                )}
                {activeUc.websiteUrl && (
                  <a
                    href={activeUc.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-[#2a7060] bg-[#58B49D]/5 hover:bg-zs-textil-gruen hover:text-white border border-[#58B49D]/20 rounded-full transition-all"
                  >
                    🌐 zukunftsstoff.de
                  </a>
                )}
              </div>

              {/* Linked Invoices (sums of linked expenses) */}
              <div className="space-y-3 pt-4 border-t border-zinc-100">
                <div className="flex justify-between items-baseline">
                  <h4 className="text-[10px] font-mono font-bold text-zinc-450 uppercase tracking-widest">Verknüpfte Sachmittel-Rechnungen</h4>
                  <span className="font-mono text-xs font-bold text-zs-textil-gruen bg-zs-textil-gruen/10 px-2 py-0.5 rounded">
                    {formatEuro(activeInvoicesSum)} netto gesamt
                  </span>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {activeInvoices.length === 0 ? (
                    <div className="text-zinc-400 text-xs italic font-mono">Noch keine Belege verknüpft.</div>
                  ) : (
                    activeInvoices.map((r) => (
                      <div key={r.id} className="flex justify-between items-center bg-zinc-50 p-2.5 rounded-lg border border-zinc-150 text-xs">
                        <div className="truncate max-w-[70%] font-semibold text-zinc-800">
                          {r.rechnungsnummer} &middot; {r.rechnungssteller}
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <strong>{formatEuro(r.betragNetto)}</strong>
                          <button
                            onClick={() => onUnlinkInvoice(activeUc.id, r.id)}
                            className="text-red-500 font-bold hover:bg-red-50 p-1 rounded cursor-pointer"
                            title="Zuordnung entfernen"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Associate an invoice selector form */}
                {assignableInvoices.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    <select
                      value={assocInvoiceId}
                      onChange={(e) => setAssocInvoiceId(e.target.value)}
                      className="flex-grow px-2 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz text-left"
                    >
                      <option value="">-- Neue Rechnung zuordnen --</option>
                      {assignableInvoices.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.rechnungsnummer} ({r.rechnungssteller}) &middot; {formatEuro(r.betragNetto)}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddInvoiceAssociation}
                      className="px-3.5 py-1.5 rounded-full bg-zs-blau-schwarz text-zs-signal-gelb text-xs font-bold transition-all hover:opacity-90 cursor-pointer"
                    >
                      Verknüpfen
                    </button>
                  </div>
                )}
              </div>

              {/* Progress feedback and Timeline notes */}
              <div className="space-y-4 pt-4 border-t border-zinc-100">
                <h4 className="text-[10px] font-mono font-bold text-zinc-450 uppercase tracking-widest">Fortschrittsverlauf &amp; Notizen</h4>

                {/* Inline form to write notes */}
                <form onSubmit={handleAddNoteSubmit} className="bg-zinc-50 p-3 rounded-xl border border-zinc-150/80 space-y-2.5">
                  <div className="flex gap-1.5 flex-wrap">
                    {(['update', 'meilenstein', 'meeting', 'problem'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewNoteType(type)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold cursor-pointer transition-all border ${
                          newNoteType === type
                            ? 'bg-zs-blau-schwarz border-zs-blau-schwarz text-zs-signal-gelb'
                            : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300'
                        }`}
                      >
                        {type === 'meilenstein' ? '★ ' : type === 'problem' ? '⚠ ' : ''}{type}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Fortschrittsaktualisierung eingeben..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 outline-none focus:border-zs-blau-schwarz rounded-lg text-xs"
                    required
                  />
                  <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400">
                    <span>Inhalt wird revisionssicher gespeichert</span>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-zs-blau-schwarz text-zs-signal-gelb rounded-full font-bold cursor-pointer hover:bg-zs-blau-schwarz/90"
                    >
                      Speichern
                    </button>
                  </div>
                </form>

                {/* Timeline display */}
                <div className="relative pl-4 space-y-4 before:content-[''] before:absolute before:left-1.5 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-zinc-150">
                  {activeNotes.length === 0 ? (
                    <div className="text-zinc-400 text-xs italic font-mono pl-1">Noch keine Statusnotizen vorhanden.</div>
                  ) : (
                    activeNotes.map((n) => (
                      <div key={n.id} className="relative text-xs leading-normal">
                        {/* Dot indicator */}
                        <div className={`absolute -left-[18.5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          n.type === 'meilenstein' ? 'bg-zs-signal-gelb shadow-[0_0_0_1px_#041422/20]' :
                          n.type === 'problem' ? 'bg-red-500' :
                          n.type === 'meeting' ? 'bg-zs-textil-gruen' :
                          'bg-zs-blau-schwarz'
                        }`} />
                        <div className="flex justify-between items-baseline font-mono text-[9px] text-zinc-400 mb-0.5">
                          <span className="font-semibold uppercase text-zinc-500">{n.type} &middot; {formatDate(n.date)}</span>
                          <button
                            onClick={() => onDeleteUcNote(activeUc.id, n.id)}
                            className="text-red-400 opacity-40 hover:opacity-100 hover:text-red-600 font-bold ml-2 cursor-pointer"
                          >
                            Löschen
                          </button>
                        </div>
                        <p className="text-zinc-700 font-sans">{n.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Bottom panel action */}
            <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end">
              <button
                onClick={() => setSelectedUcId(null)}
                className="px-5 py-1.5 rounded-full bg-zs-blau-schwarz text-zs-signal-gelb text-xs font-bold transition-all hover:opacity-90 cursor-pointer"
              >
                Schließen
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── MODAL: CREATE / EDIT USE CASES ── */}
      {showFormModal && (
        <div className="fixed inset-0 bg-zs-blau-schwarz/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in animate-scale-up">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/30">
              <h3 className="font-display font-bold text-lg text-zs-blau-schwarz">
                {editingId ? 'Use Case bearbeiten' : 'Lösung-Use Case registrieren'}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="text-zinc-400 hover:text-zs-blau-schwarz transition-all text-xl font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Titel / Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="z.B. Chemisches Recycling von Polyester..."
                    value={ucTitel}
                    onChange={(e) => setUcTitel(e.target.value)}
                    className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Unternehmen (Geber)</label>
                    <input
                      type="text"
                      placeholder="z.B. GKD Group"
                      value={ucCo}
                      onChange={(e) => setUcCo(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Kern-Branche</label>
                    <select
                      value={ucBranche}
                      onChange={(e) => setUcBranche(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    >
                      <option value="Papier">Papier</option>
                      <option value="Chemie">Chemie</option>
                      <option value="Textil">Textil</option>
                      <option value="Energie">Energie</option>
                      <option value="Übergreifend">Übergreifend</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Reifegrad</label>
                    <select
                      value={ucReife}
                      onChange={(e) => setUcReife(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    >
                      <option value="Idee">Idee</option>
                      <option value="Konzept">Konzept</option>
                      <option value="Prototyp">Prototyp</option>
                      <option value="Pilotbetrieb">Pilotbetrieb</option>
                      <option value="Produktiv">Produktiv</option>
                      <option value="Skalierung">Skalierung</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Batch-Kennung</label>
                    <select
                      value={ucBatch}
                      onChange={(e) => setUcBatch(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    >
                      <option value="Batch 1">Batch 1 (feste Seed)</option>
                      <option value="Batch 2">Batch 2</option>
                      <option value="Batch 3">Batch 3</option>
                      <option value="Batch 4">Batch 4</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Aktivitätsstatus</label>
                    <select
                      value={ucStatus}
                      onChange={(e) => setUcStatus(e.target.value as UseCase['status'])}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    >
                      <option value="Pipeline">Pipeline</option>
                      <option value="in Prüfung">in Prüfung</option>
                      <option value="aktiv">aktiv</option>
                      <option value="kritisch">kritisch</option>
                      <option value="abgeschlossen">abgeschlossen</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Erfolgswahrsch. (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={ucProb}
                      onChange={(e) => setUcProb(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Pol. Relevanz (1-5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={ucRel}
                      onChange={(e) => setUcRel(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Deadline</label>
                    <input
                      type="date"
                      value={ucDl}
                      onChange={(e) => setUcDl(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Projektbeschreibung</label>
                  <textarea
                    rows={2}
                    placeholder="Kurze Problem- und Zielformulierung..."
                    value={ucNotizen} // sharing state as raw notiz field
                    onChange={(e) => setUcNotizen(e.target.value)}
                    className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white font-sans"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">SharePoint-Ordner URL</label>
                  <input
                    type="url"
                    placeholder="https://windn.sharepoint.com/sites/MiD-PCT/..."
                    value={ucSharepoint}
                    onChange={(e) => setUcSharepoint(e.target.value)}
                    className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz bg-white font-mono"
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
                  {editingId ? 'Änderungen speichern' : 'Use Case erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
