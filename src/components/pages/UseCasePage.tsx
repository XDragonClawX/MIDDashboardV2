import React, { useState, useEffect, useRef } from 'react';
import { UseCase, UseCaseTodo, Rechnungsbeleg, Task, Vergabe, OekoprofitCheckup, SystemSettings } from '../../types';
import UseCaseTechTree from '../UseCaseTechTree';
import {
  formatEuro,
  formatDate,
  getUseCaseSteckbrief,
  formatUseCaseSteckbriefPlainText,
  formatUseCaseSteckbriefMarkdown,
} from '../../utils';
import { 
  Building2, 
  Rocket, 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  Layers, 
  FileText, 
  ExternalLink,
  CheckCircle2,
  Copy,
  Download,
  Printer,
  Check,
  Briefcase
} from 'lucide-react';

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

  // Task integration
  tasks?: Task[];
  onUpdateTask?: (id: number, task: Partial<Task>) => void;

  // Batch 2 synchronization
  onResetBatch2?: () => void;

  // Tech-Tree & Adjacencies integration
  vergaben?: Vergabe[];
  oekoprofitCheckups?: OekoprofitCheckup[];
  settings?: SystemSettings;

  // Deep-link from Cockpit Hex Map
  initialUseCaseId?: number | null;
}

type BatchTab = 'Batch 1' | 'Batch 2' | 'Batch 3' | 'all';

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
  tasks = [],
  onUpdateTask,
  onResetBatch2,
  vergaben = [],
  oekoprofitCheckups = [],
  settings,
  initialUseCaseId = null,
}: UseCasePageProps) {
  // Batch Navigation Tab & Tech-Tree Mode
  const [selectedBatch, setSelectedBatch] = useState<BatchTab>('Batch 1');
  const [pageView, setPageView] = useState<'batches' | 'techtree'>('techtree');

  // Detail Drawer state & view mode
  const [selectedUcId, setSelectedUcId] = useState<number | null>(initialUseCaseId);
  const [drawerMode, setDrawerMode] = useState<'operativ' | 'steckbrief'>('operativ');
  const [steckbriefCopied, setSteckbriefCopied] = useState(false);
  const appliedInitialIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!initialUseCaseId) {
      appliedInitialIdRef.current = null;
      return;
    }
    if (appliedInitialIdRef.current === initialUseCaseId) return;
    const matched = usecases.find((u) => u.id === initialUseCaseId);
    if (matched) {
      appliedInitialIdRef.current = initialUseCaseId;
      if (
        matched.batch === 'Batch 1' ||
        matched.batch === 'Batch 2' ||
        matched.batch === 'Batch 3'
      ) {
        setSelectedBatch(matched.batch);
      } else {
        setSelectedBatch('all');
      }
      setSelectedUcId(matched.id);
    }
  }, [initialUseCaseId, usecases]);

  // Modal form states (New/Edit Use Case)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [ucTitel, setUcTitel] = useState('');
  const [ucCo, setUcCo] = useState(''); // Industrieunternehmen
  const [ucStartup, setUcStartup] = useState(''); // Startup / Lösungspartner
  const [ucAp, setUcAp] = useState('');
  const [ucBranche, setUcBranche] = useState('Papier');
  const [ucReife, setUcReife] = useState('Idee');
  const [ucBatch, setUcBatch] = useState('Batch 1');
  const [ucStatus, setUcStatus] = useState<UseCase['status']>('Pipeline');
  const [ucProb, setUcProb] = useState('75');
  const [ucRel, setUcRel] = useState('4');
  const [ucDl, setUcDl] = useState('');
  const [ucRisk, setUcRisk] = useState('');
  const [ucNotizen, setUcNotizen] = useState('');
  const [ucSharepoint, setUcSharepoint] = useState('');
  const [ucWebsite, setUcWebsite] = useState('');
  const [ucBeschreibung, setUcBeschreibung] = useState('');
  const [ucProblemstellung, setUcProblemstellung] = useState('');
  const [ucLoesungsansatz, setUcLoesungsansatz] = useState('');
  const [ucStatusNextSteps, setUcStatusNextSteps] = useState('');
  const [ucStandortMehrwert, setUcStandortMehrwert] = useState('');

  // Quick todo draft for card inline inputs
  const [cardTodoInput, setCardTodoInput] = useState<{ [key: number]: string }>({});

  // Drawer Todo input
  const [drawerTodoText, setDrawerTodoText] = useState('');
  const [drawerTodoDueDate, setDrawerTodoDueDate] = useState('');

  // Synchronization States for zukunftsstoff.de Use Cases
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [batch2SyncToast, setBatch2SyncToast] = useState<string | null>(null);

  // Timeline form state in drawer
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteType, setNewNoteType] = useState<'update' | 'meilenstein' | 'problem' | 'meeting'>('update');

  // Selected invoice to associate dropdown
  const [assocInvoiceId, setAssocInvoiceId] = useState('');

  // Filter bar
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBranche, setFilterBranche] = useState('');

  // Compute counts per batch
  const batch1Count = usecases.filter((u) => u.batch === 'Batch 1').length;
  const batch2Count = usecases.filter((u) => u.batch === 'Batch 2').length;
  const batch3Count = usecases.filter((u) => u.batch === 'Batch 3').length;
  const totalCount = usecases.length;

  // Auto-sync effect on mount
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
          let updatedCount = 0;
          data.usecases.forEach((liveUc: any) => {
            if (!liveUc || !liveUc.titel) return;
            const liveTitleLower = liveUc.titel.toLowerCase();

            if (deletedUcs.includes(liveTitleLower)) return;

            const existing = usecases.find(
              (u) => (u.titel || '').toLowerCase().trim() === liveTitleLower.trim()
            );

            if (existing) {
              const hasChanges = 
                (liveUc.startupPartner && !existing.startupPartner) ||
                (liveUc.projektbeschreibung && !existing.projektbeschreibung);
              if (hasChanges) {
                onUpdateUseCase(existing.id, {
                  startupPartner: liveUc.startupPartner || existing.startupPartner,
                  projektbeschreibung: liveUc.projektbeschreibung || existing.projektbeschreibung
                });
                updatedCount++;
              }
            }
          });

          setSyncStatus('success');
          setSyncMessage(
            updatedCount > 0 
              ? `${updatedCount} Use-Cases mit zukunftsstoff.de synchronisiert.` 
              : 'Verbindung zu zukunftsstoff.de aktiv. Alle Piloten auf aktuellem Stand.'
          );
        }
      } catch (err: any) {
        if (!active) return;
        setSyncStatus('idle');
      }
    };

    syncZukunftsstoff();
    return () => {
      active = false;
    };
  }, []);

  // Filter logic
  const filteredUcs = usecases.filter((u) => {
    // 1. Batch filter
    if (selectedBatch !== 'all' && u.batch !== selectedBatch) {
      return false;
    }

    // 2. Year filter
    if (activeYear) {
      const { von, bis } = (() => {
        if (activeYear === 'gesamt25') return { von: '2025-04-01', bis: '2025-12-31' };
        if (activeYear === 'mrz29') return { von: '2029-01-01', bis: '2029-03-31' };
        return { von: `${activeYear}-01-01`, bis: `${activeYear}-12-31` };
      })();
      if (u.deadline && (u.deadline < von || u.deadline > bis)) return false;
    }

    // 3. Status & Branche filters
    if (filterStatus && u.status !== filterStatus) return false;
    if (filterBranche && u.branche !== filterBranche) return false;

    return true;
  });

  // To-Do Handlers
  const handleToggleTodo = (ucId: number, todoId: string) => {
    const uc = usecases.find((u) => u.id === ucId);
    if (!uc) return;
    const currentTodos = uc.todos || [];
    const updated = currentTodos.map((t) =>
      t.id === todoId ? { ...t, completed: !t.completed } : t
    );
    onUpdateUseCase(ucId, { todos: updated });
  };

  const handleAddTodo = (ucId: number, text: string, dueDate?: string) => {
    if (!text.trim()) return;
    const uc = usecases.find((u) => u.id === ucId);
    if (!uc) return;
    const currentTodos = uc.todos || [];
    const newTodo: UseCaseTodo = {
      id: `todo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: text.trim(),
      completed: false,
      dueDate: dueDate || undefined,
    };
    onUpdateUseCase(ucId, { todos: [...currentTodos, newTodo] });
  };

  const handleDeleteTodo = (ucId: number, todoId: string) => {
    const uc = usecases.find((u) => u.id === ucId);
    if (!uc) return;
    const currentTodos = uc.todos || [];
    onUpdateUseCase(ucId, { todos: currentTodos.filter((t) => t.id !== todoId) });
  };

  // Form Modal open handler
  const handleOpenAddModal = () => {
    setEditingId(null);
    setUcTitel('');
    setUcCo('');
    setUcStartup('');
    setUcAp('');
    setUcBranche('Papier');
    setUcReife(selectedBatch === 'Batch 1' ? 'Pilotbetrieb' : selectedBatch === 'Batch 2' ? 'Konzept' : 'Idee');
    setUcBatch(selectedBatch === 'all' ? 'Batch 2' : selectedBatch);
    setUcStatus(selectedBatch === 'Batch 1' ? 'aktiv' : 'in Prüfung');
    setUcProb('75');
    setUcRel('4');
    setUcDl('');
    setUcRisk('');
    setUcNotizen('');
    setUcSharepoint('');
    setUcWebsite('');
    setUcBeschreibung('');
    setUcProblemstellung('');
    setUcLoesungsansatz('');
    setUcStatusNextSteps('');
    setUcStandortMehrwert('');
    setShowFormModal(true);
  };

  const handleEditClick = (u: UseCase, e: React.MouseEvent) => {
    e.stopPropagation();
    const sb = getUseCaseSteckbrief(u);
    setEditingId(u.id);
    setUcTitel(u.titel);
    setUcCo(u.unternehmen);
    setUcStartup(u.startupPartner || u.loesung || '');
    setUcAp(u.ansprechpartner || '');
    setUcBranche(u.branche);
    setUcReife(u.reifegrad);
    setUcBatch(u.batch);
    setUcStatus(u.status);
    setUcProb(String(u.erfolgswahrscheinlichkeit));
    setUcRel(String(u.politischeRelevanz));
    setUcDl(u.deadline || '');
    setUcRisk(u.risiken || '');
    setUcNotizen(u.notizen || '');
    setUcSharepoint(u.sharepointUrl || '');
    setUcWebsite(u.websiteUrl || '');
    setUcBeschreibung(u.projektbeschreibung || '');
    setUcProblemstellung(u.problemstellung || sb.problemstellung);
    setUcLoesungsansatz(u.loesungsansatz || sb.loesungsansatz);
    setUcStatusNextSteps(u.statusNextSteps || sb.statusNextSteps);
    setUcStandortMehrwert(u.standortMehrwert || sb.standortMehrwert);
    setShowFormModal(true);
  };

  const handleDeleteClick = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ucTitel.trim()) {
      setFormError('Titel / Bezeichnung des Use-Cases ist ein Pflichtfeld.');
      return;
    }
    setFormError(null);

    const payload = {
      titel: ucTitel.trim(),
      unternehmen: ucCo.trim() || 'Noch nicht definiert',
      startupPartner: ucStartup.trim(),
      loesung: ucStartup.trim(),
      ansprechpartner: ucAp.trim(),
      branche: ucBranche,
      reifegrad: ucReife,
      batch: ucBatch,
      status: ucStatus,
      erfolgswahrscheinlichkeit: Number(ucProb) || 75,
      politischeRelevanz: Number(ucRel) || 4,
      deadline: ucDl,
      risiken: ucRisk.trim(),
      notizen: ucNotizen.trim(),
      sharepointUrl: ucSharepoint.trim(),
      websiteUrl: ucWebsite.trim(),
      projektbeschreibung: ucBeschreibung.trim(),
      problemstellung: ucProblemstellung.trim() || undefined,
      loesungsansatz: ucLoesungsansatz.trim() || undefined,
      statusNextSteps: ucStatusNextSteps.trim() || undefined,
      standortMehrwert: ucStandortMehrwert.trim() || undefined,
    };

    if (editingId) {
      onUpdateUseCase(editingId, payload);
    } else {
      onAddUseCase({
        ...payload,
        thema: '',
        todos: [
          { id: `todo-${Date.now()}-1`, text: 'Erstgespräch & Anforderungsanalyse durchführen', completed: false },
          { id: `todo-${Date.now()}-2`, text: 'Letter of Intent (LoI) vorbereiten', completed: false },
        ],
      });
    }

    setEditingId(null);
    setShowFormModal(false);
  };

  const downloadMarkdownFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportBatchMarkdown = () => {
    if (filteredUcs.length === 0) return;
    const header = `# Use-Case Steckbriefe · ${selectedBatch === 'all' ? 'Alle Batches' : selectedBatch}\n\nProjekt: Zukunftsstoff – Made in Düren / MiD-PTC (FKZ 46SK0267X) · Exportiert am ${new Date().toLocaleDateString('de-DE')}\n\n---\n\n`;
    const body = filteredUcs.map((uc) => formatUseCaseSteckbriefMarkdown(uc)).join('\n---\n\n');
    const slug = (selectedBatch === 'all' ? 'Alle_Batches' : selectedBatch).replace(/\s+/g, '_');
    downloadMarkdownFile(`UseCase_Steckbriefe_${slug}.md`, header + body);
  };

  // Active drawer use case
  const activeUc = usecases.find((u) => u.id === selectedUcId);
  const activeNotes = selectedUcId ? (ucNotes[selectedUcId] || []).sort((a,b)=>new Date(b.date).getTime() - new Date(a.date).getTime()) : [];
  const activeLinkedInvoiceIds = selectedUcId ? (ucInvoices[selectedUcId] || []) : [];
  const activeInvoices = rechnungen.filter((r) => activeLinkedInvoiceIds.includes(r.id));
  const activeInvoicesSum = activeInvoices.reduce((s, r) => s + r.betragNetto, 0);
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

  // Batch contextual descriptions
  const getBatchDescription = (batch: BatchTab) => {
    switch (batch) {
      case 'Batch 1':
        return {
          title: 'Batch 1 — Aktive Pilotprojekte im Wirkbetrieb',
          badge: 'Aktiver Pilotbetrieb',
          badgeClass: 'bg-[#58B49D]/15 text-[#2a7060] border border-[#58B49D]/30',
          desc: 'Laufende Technologietransfers mit fest kontrahierten Industriepartnern und Startups im Dürener Industriecluster. Pilotbetriebe befinden sich in Erprobung, Messdatenerfassung und Skalierung.',
        };
      case 'Batch 2':
        return {
          title: 'Batch 2 — Matchmaking & Vorbereitung (Industrie & Startups)',
          badge: 'In Vorbereitung & Matchmaking',
          badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300',
          desc: 'Gezielte Anbahnung und Vorbereitung potenzieller Use-Cases zwischen Industrieunternehmen und innovativen Startups. Definition von technischen Lastenheften, Kooperationsmodellen und nächsten To-Dos vor Pilotstart.',
        };
      case 'Batch 3':
        return {
          title: 'Batch 3 — Zukünftige Transformations-Pipeline',
          badge: 'Strategische Pipeline',
          badgeClass: 'bg-blue-100 text-blue-900 border border-blue-200',
          desc: 'Strategische Handlungsfelder, Bedarfe und Ausblick für kommende Ausschreibungswellen sowie Initiativen mit BioökonomieREVIER und regionalen Forschungsinstituten.',
        };
      case 'all':
      default:
        return {
          title: 'Gesamtübersicht — Alle Use-Case Batches',
          badge: `${totalCount} Piloten & Vorhaben`,
          badgeClass: 'bg-zinc-100 text-zinc-800 border border-zinc-200',
          desc: 'Ganzheitliche Sicht auf den Transformationspfad: Von aktiven Pilotbetrieben (Batch 1) über angebahnte Matchmakings (Batch 2) bis hin zur strategischen Folgepipeline (Batch 3).',
        };
    }
  };

  const activeBatchInfo = getBatchDescription(selectedBatch);

  return (
    <div className="space-y-6 relative">
      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
            Use-Case <span className="bg-zs-signal-gelb px-2 py-0.5 rounded">Management</span>
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Transformationspiloten &middot; Industrie &amp; Startups &middot; 6-Felder-Steckbrief &middot; {activeYearLabel}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <div className="inline-flex items-center gap-1 p-1 bg-zinc-200/70 rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={() => setPageView('techtree')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                pageView === 'techtree'
                  ? 'bg-white text-zs-blau-schwarz shadow-xs'
                  : 'text-zinc-600 hover:text-zs-blau-schwarz'
              }`}
            >
              Tech-Tree &amp; Synergien
            </button>
            <button
              type="button"
              onClick={() => setPageView('batches')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                pageView === 'batches'
                  ? 'bg-white text-zs-blau-schwarz shadow-xs'
                  : 'text-zinc-600 hover:text-zs-blau-schwarz'
              }`}
            >
              Batch-Steckbriefe ({totalCount})
            </button>
          </div>
          {filteredUcs.length > 0 && (
            <button
              type="button"
              onClick={handleExportBatchMarkdown}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono font-bold rounded-full border border-zinc-300 bg-white text-zs-blau-schwarz hover:bg-zinc-100 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Steckbrief-Export (.md)</span>
            </button>
          )}
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-full bg-zs-signal-gelb text-zs-blau-schwarz hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Neuen Use-Case anlegen</span>
          </button>
        </div>
      </div>

      {/* ── PILLAR 1 & 3: DÜRENER TRANSFORMATIONS-TECH-TREE & CLUSTER-SYNERGIEN ── */}
      {pageView === 'techtree' && settings?.gamificationMode !== false && (
        <UseCaseTechTree
          usecases={usecases}
          vergaben={vergaben}
          oekoprofitCheckups={oekoprofitCheckups}
          onSelectUseCase={(id) => setSelectedUcId(id)}
          onUpdateUseCase={onUpdateUseCase}
          onAddUseCase={onAddUseCase}
        />
      )}

      {/* ── BATCH NAVIGATION TAB BAR ── */}
      <div className="bg-white rounded-2xl p-2 border border-zinc-200/80 shadow-xs">
        <div className="flex flex-wrap gap-2 items-center">
          {[
            {
              id: 'Batch 1' as BatchTab,
              label: 'Batch 1',
              subtitle: 'Aktive Piloten',
              count: batch1Count,
              badgeColor: 'bg-[#58B49D]/20 text-[#2a7060]',
              activeBg: 'bg-zs-blau-schwarz text-white',
              icon: Rocket,
            },
            {
              id: 'Batch 2' as BatchTab,
              label: 'Batch 2',
              subtitle: 'Matchmaking & Vorbereitung',
              count: batch2Count,
              badgeColor: 'bg-amber-100 text-amber-800',
              activeBg: 'bg-zs-blau-schwarz text-white',
              icon: Briefcase,
            },
            {
              id: 'Batch 3' as BatchTab,
              label: 'Batch 3',
              subtitle: 'Zukünftige Pipeline',
              count: batch3Count,
              badgeColor: 'bg-blue-100 text-blue-800',
              activeBg: 'bg-zs-blau-schwarz text-white',
              icon: Layers,
            },
            {
              id: 'all' as BatchTab,
              label: 'Alle Batches',
              subtitle: 'Gesamtübersicht',
              count: totalCount,
              badgeColor: 'bg-zinc-200 text-zinc-700',
              activeBg: 'bg-zs-blau-schwarz text-white',
              icon: Building2,
            },
          ].map((tab) => {
            const isSelected = selectedBatch === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedBatch(tab.id)}
                className={`flex-1 min-w-[170px] flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer text-left border ${
                  isSelected
                    ? `${tab.activeBg} border-zs-blau-schwarz shadow-md`
                    : 'bg-zinc-50/70 hover:bg-zinc-100/90 border-transparent text-zinc-650'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/10 text-zs-signal-gelb' : 'bg-white text-zinc-600 shadow-xs'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-sm flex items-center gap-2">
                      <span>{tab.label}</span>
                    </div>
                    <div className={`text-[11px] font-mono leading-tight ${isSelected ? 'text-zinc-300' : 'text-zinc-450'}`}>
                      {tab.subtitle}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-mono tabular-nums font-bold ${
                  isSelected ? 'bg-zs-signal-gelb text-zs-blau-schwarz' : tab.badgeColor
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Context Banner for selected batch */}
        <div className="mt-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="font-display font-bold text-zs-blau-schwarz text-xs sm:text-sm">
              {activeBatchInfo.title} <span className="font-mono text-[11px] font-normal text-zinc-500">&middot; {activeBatchInfo.badge}</span>
            </div>
            <p className="text-zinc-600 font-sans leading-relaxed text-[11.5px]">
              {activeBatchInfo.desc}
            </p>
          </div>
          {selectedBatch === 'Batch 2' && (
            <div className="shrink-0 flex flex-wrap items-center gap-2">
              {onResetBatch2 && (
                <button
                  type="button"
                  onClick={() => {
                    onResetBatch2();
                    setBatch2SyncToast('Batch 2 Vorbereitungsliste erfolgreich mit allen 7 Industrie- & Startup-Partnern synchronisiert!');
                    setTimeout(() => setBatch2SyncToast(null), 4000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-950 font-mono text-[11px] font-semibold transition-all shadow-2xs cursor-pointer"
                  title="Batch 2 Vorbereitungsprojekte mit Seed synchronisieren"
                >
                  <span>Standard-Batch-2 neu laden</span>
                </button>
              )}
            </div>
          )}
        </div>

        {batch2SyncToast && (
          <div className="mt-2.5 p-2.5 px-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{batch2SyncToast}</span>
            </div>
            <button
              onClick={() => setBatch2SyncToast(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-1.5 py-0.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200/80 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Filter:</span>
          
          <select
            value={filterBranche}
            onChange={(e) => setFilterBranche(e.target.value)}
            className="text-xs bg-zinc-50 border border-zinc-300 rounded-md px-3 py-1.5 cursor-pointer focus:border-zs-blau-schwarz"
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
            className="text-xs bg-zinc-50 border border-zinc-300 rounded-md px-3 py-1.5 cursor-pointer focus:border-zs-blau-schwarz"
          >
            <option value="">Alle Status</option>
            <option value="aktiv">aktiv</option>
            <option value="in Vorbereitung">in Vorbereitung</option>
            <option value="in Prüfung">in Prüfung</option>
            <option value="Pipeline">Pipeline</option>
            <option value="kritisch">kritisch</option>
            <option value="abgeschlossen">abgeschlossen</option>
          </select>

          {(filterBranche || filterStatus) && (
            <button
              onClick={() => {
                setFilterBranche('');
                setFilterStatus('');
              }}
              className="text-xs font-mono text-zinc-400 hover:text-zs-blau-schwarz transition-all cursor-pointer underline"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>

        <div className="text-xs font-mono text-zinc-500">
          Zeige <strong>{filteredUcs.length}</strong> von <strong>{totalCount}</strong> Use-Cases
        </div>
      </div>

      {/* ── USE CASES CARDS GRID ── */}
      {filteredUcs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-base text-zinc-700">
            Keine Use-Cases für {selectedBatch} gefunden
          </h3>
          <p className="text-xs font-sans text-zinc-500 max-w-md mx-auto">
            In diesem Filterbereich sind aktuell keine Einträge hinterlegt. Sie können jetzt einen neuen Pilot-Use-Case für {selectedBatch} anlegen.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-zs-signal-gelb text-zs-blau-schwarz font-bold text-xs rounded-full hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Neuen Use-Case anlegen</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUcs.map((u) => {
            const todos = u.todos || [];
            const doneCount = todos.filter((t) => t.completed).length;
            const totalTodos = todos.length;
            const isBatch1 = u.batch === 'Batch 1';
            const isBatch2 = u.batch === 'Batch 2';

            return (
              <div
                key={u.id}
                onClick={() => {
                  setDrawerMode('operativ');
                  setSelectedUcId(u.id);
                }}
                className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs hover:shadow-lg hover:border-zs-blau-schwarz transition-all cursor-pointer flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5">
                  {/* Top Header: Clean metadata & Controls */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="text-[11px] font-mono font-bold text-zinc-500">
                      <span className={isBatch1 ? 'text-[#2a7060]' : isBatch2 ? 'text-amber-800' : 'text-blue-800'}>
                        {u.batch}
                      </span>{' '}
                      &middot;{' '}
                      <span className={u.status === 'kritisch' ? 'text-red-600' : 'text-zs-blau-schwarz'}>
                        {u.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {deleteConfirmId === u.id ? (
                        <div className="flex gap-1.5 items-center bg-red-50 p-1 px-2 rounded border border-red-200">
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
                            className="p-1 px-1.5 rounded border border-zinc-200 text-zinc-400 hover:bg-zs-blau-schwarz hover:text-white transition-all text-xs cursor-pointer"
                            title="Bearbeiten"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(u.id, e)}
                            className="p-1 px-1.5 rounded border border-red-100 text-red-400 hover:bg-red-500 hover:text-white transition-all text-xs cursor-pointer"
                            title="Löschen"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-display font-bold text-base text-zs-blau-schwarz mt-3 leading-snug group-hover:text-zs-textil-gruen transition-colors">
                    {u.titel}
                  </h3>

                  {/* Beteiligte Unternehmen (Getrennte Felder Industrie & Startup) */}
                  <div className="mt-3.5 space-y-1.5 bg-zinc-50/80 p-3 rounded-xl border border-zinc-200/60 text-xs">
                    <div className="flex items-start gap-2">
                      <div className="p-1 rounded bg-white text-zinc-700 shadow-2xs mt-0.5">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Industrieunternehmen</div>
                        <div className="font-bold text-zinc-850 truncate">{u.unternehmen}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 pt-1 border-t border-zinc-200/40">
                      <div className="p-1 rounded bg-white text-zs-textil-gruen shadow-2xs mt-0.5">
                        <Rocket className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Startup-Partner</div>
                        <div className="font-bold text-zinc-850 truncate">
                          {u.startupPartner || u.loesung || (
                            <span className="text-zinc-400 italic font-normal">Matchmaking in Vorbereitung</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Beschreibung */}
                  <div className="mt-3">
                    <p className="text-xs text-zinc-600 font-sans leading-relaxed line-clamp-2">
                      {u.projektbeschreibung || u.notizen || 'Noch keine ausführliche Projektbeschreibung hinterlegt.'}
                    </p>
                  </div>

                  {/* Quiet metadata row with dot separator */}
                  <div className="mt-3 text-[11px] font-mono text-zinc-500">
                    {u.branche} &middot; {u.reifegrad}{u.deadline ? ` · Frist ${formatDate(u.deadline)}` : ''}
                  </div>

                  {/* ── NÄCHSTE TO-DOS CHECKLISTE (INTERAKTIV) ── */}
                  <div 
                    className="mt-4 pt-3.5 border-t border-zinc-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center mb-2 text-xs">
                      <div className="flex items-center gap-1.5 font-display font-bold text-zs-blau-schwarz text-xs">
                        <CheckSquare className="w-3.5 h-3.5 text-[#58B49D]" />
                        <span>Nächste To-Dos</span>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-500 font-semibold">
                        {doneCount}/{totalTodos} erledigt
                      </span>
                    </div>

                    {/* Progress bar */}
                    {totalTodos > 0 && (
                      <div className="w-full bg-zinc-100 h-1 rounded-full overflow-hidden mb-2.5">
                        <div
                          className="h-full bg-zs-textil-gruen rounded-full transition-all"
                          style={{ width: `${(doneCount / totalTodos) * 100}%` }}
                        />
                      </div>
                    )}

                    {/* Todo Items */}
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {todos.length === 0 ? (
                        <div className="text-[11px] font-mono text-zinc-400 italic py-1">
                          Noch keine nächsten To-Dos eingetragen.
                        </div>
                      ) : (
                        todos.map((todo) => (
                          <div
                            key={todo.id}
                            onClick={() => handleToggleTodo(u.id, todo.id)}
                            className={`flex items-start gap-2 p-1.5 rounded-lg text-[11px] transition-all cursor-pointer group/item ${
                              todo.completed
                                ? 'bg-zinc-50/60 text-zinc-400'
                                : 'bg-zinc-50 hover:bg-zinc-100/80 text-zinc-750'
                            }`}
                          >
                            <button
                              type="button"
                              className="mt-0.5 text-zinc-500 hover:text-zs-blau-schwarz cursor-pointer shrink-0"
                            >
                              {todo.completed ? (
                                <CheckSquare className="w-3.5 h-3.5 text-[#58B49D]" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-zinc-400 group-hover/item:text-zinc-600" />
                              )}
                            </button>
                            <span className={`flex-1 leading-tight ${todo.completed ? 'line-through text-zinc-400' : 'font-medium'}`}>
                              {todo.text}
                            </span>
                            {todo.dueDate && (
                              <span className="text-[9px] font-mono text-zinc-400 shrink-0">
                                {formatDate(todo.dueDate)}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Inline Quick Add To-Do */}
                    <div className="mt-2 flex gap-1.5 pt-1">
                      <input
                        type="text"
                        placeholder="+ Nächstes To-Do..."
                        value={cardTodoInput[u.id] || ''}
                        onChange={(e) => setCardTodoInput({ ...cardTodoInput, [u.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTodo(u.id, cardTodoInput[u.id] || '');
                            setCardTodoInput({ ...cardTodoInput, [u.id]: '' });
                          }
                        }}
                        className="flex-1 px-2.5 py-1 text-[11px] bg-zinc-50 hover:bg-white focus:bg-white border border-zinc-200 rounded-lg outline-none focus:border-zs-blau-schwarz transition"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          handleAddTodo(u.id, cardTodoInput[u.id] || '');
                          setCardTodoInput({ ...cardTodoInput, [u.id]: '' });
                        }}
                        className="px-2.5 py-1 bg-zinc-100 hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb text-zinc-700 rounded-lg text-[10px] font-bold font-mono transition cursor-pointer"
                        title="To-Do hinzufügen"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Erfolgswahrscheinlichkeit & Details Link */}
                <div className="px-5 py-3 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400">Erfolg:</span>
                    <span className="text-xs font-mono font-bold text-zs-blau-schwarz">
                      {u.erfolgswahrscheinlichkeit}%
                    </span>
                    <div className="w-16 bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zs-textil-gruen rounded-full"
                        style={{ width: `${u.erfolgswahrscheinlichkeit}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDrawerMode('steckbrief');
                        setSelectedUcId(u.id);
                      }}
                      className="text-[11px] font-mono text-zinc-500 hover:text-zs-blau-schwarz underline cursor-pointer"
                    >
                      Steckbrief
                    </button>
                    <span className="text-[11px] font-mono text-zinc-400 group-hover:text-zs-blau-schwarz group-hover:translate-x-0.5 transition-all flex items-center gap-1 font-semibold">
                      Details &rarr;
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── DETAIL DRAWER (SLIDES IN FROM RIGHT) ── */}
      {selectedUcId && activeUc && (
        <>
          <div
            className="fixed inset-0 bg-[#041422]/30 z-40 backdrop-blur-xs"
            onClick={() => setSelectedUcId(null)}
          />
          <div className="fixed top-0 right-0 w-full sm:max-w-xl h-full bg-white border-l border-zinc-200 shadow-2xl z-50 flex flex-col justify-between animate-slide-in">
            {/* Drawer Header */}
            <div className="p-5 border-b border-zinc-100 bg-zinc-50/60 flex justify-between items-start">
              <div className="space-y-1.5 max-w-[85%]">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                    activeUc.batch === 'Batch 1' ? 'bg-teal-100 text-teal-800' :
                    activeUc.batch === 'Batch 2' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {activeUc.batch}
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-[#58B49D]/15 text-[#2a7060] text-[10px] font-mono font-bold uppercase tracking-wider">
                    {activeUc.status}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-mono">
                    {activeUc.reifegrad}
                  </span>
                </div>
                <h2 className="font-display font-bold text-xl text-zs-blau-schwarz leading-tight">
                  {activeUc.titel}
                </h2>
                <div className="text-xs font-mono text-zinc-400">
                  Branche: <strong>{activeUc.branche}</strong> &middot; Erfolg: <strong>{activeUc.erfolgswahrscheinlichkeit}%</strong>
                </div>
              </div>
              <button
                onClick={() => setSelectedUcId(null)}
                className="p-1 px-2.5 border border-zinc-200 rounded-lg hover:bg-zinc-100 text-zinc-500 font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Drawer Segmented Switch: Operativ & To-Dos vs 6-Felder-Steckbrief */}
            <div className="px-5 pt-3 pb-2 border-b border-zinc-100 bg-white flex items-center justify-between gap-2">
              <div className="inline-flex p-1 rounded-lg bg-zinc-100 border border-zinc-200">
                <button
                  type="button"
                  onClick={() => setDrawerMode('operativ')}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    drawerMode === 'operativ' ? 'bg-zs-blau-schwarz text-zs-signal-gelb' : 'text-zinc-600 hover:text-zs-blau-schwarz'
                  }`}
                >
                  Operativ &amp; To-Dos
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerMode('steckbrief')}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    drawerMode === 'steckbrief' ? 'bg-zs-blau-schwarz text-zs-signal-gelb' : 'text-zinc-600 hover:text-zs-blau-schwarz'
                  }`}
                >
                  6-Felder-Steckbrief &amp; Export
                </button>
              </div>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
              {drawerMode === 'steckbrief' && (() => {
                const sb = getUseCaseSteckbrief(activeUc);
                return (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                      <span className="text-[11px] font-mono font-bold text-zs-blau-schwarz uppercase">
                        Steckbrief-Schema (6 Pflichtfelder)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(formatUseCaseSteckbriefPlainText(activeUc));
                            setSteckbriefCopied(true);
                            setTimeout(() => setSteckbriefCopied(false), 2200);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-300 bg-white text-[11px] font-mono font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                        >
                          {steckbriefCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          {steckbriefCopied ? 'Kopiert' : 'Text kopieren'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const slug = activeUc.titel.toLowerCase().replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
                            downloadMarkdownFile(`Steckbrief_${slug || activeUc.id}.md`, formatUseCaseSteckbriefMarkdown(activeUc));
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-300 bg-white text-[11px] font-mono font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> .md Export
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-300 bg-white text-[11px] font-mono font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" /> Drucken
                        </button>
                      </div>
                    </div>

                    {[
                      { nr: '1. Titel', val: sb.titel },
                      { nr: '2. Partner', val: sb.partner },
                      { nr: '3. Problemstellung', val: sb.problemstellung },
                      { nr: '4. Lösungsansatz', val: sb.loesungsansatz },
                      { nr: '5. Status & Next Steps', val: sb.statusNextSteps },
                      { nr: '6. Standort-Mehrwert', val: sb.standortMehrwert },
                    ].map((field) => (
                      <div key={field.nr} className="p-3.5 rounded-xl border border-zinc-200 bg-white space-y-1">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                          {field.nr}
                        </div>
                        <div className="text-xs text-zs-blau-schwarz leading-relaxed whitespace-pre-line">
                          {field.val}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {drawerMode === 'operativ' && (
              <>
              {/* ── BETEILIGTE PARTNER (ZWEI GETRENNTE BOXEN) ── */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-zinc-600" />
                  Beteiligte Partner &amp; Stakeholder
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Industrieunternehmen */}
                  <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-1">
                    <div className="text-[9.5px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      Industrieunternehmen
                    </div>
                    <div className="font-display font-bold text-sm text-zs-blau-schwarz">
                      {activeUc.unternehmen}
                    </div>
                    {activeUc.industrieWebsite && (
                      <a
                        href={activeUc.industrieWebsite}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-mono text-zs-textil-gruen hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-2.5 h-2.5" /> Website öffnen
                      </a>
                    )}
                  </div>

                  {/* Startup / Lösungspartner */}
                  <div className="p-3.5 bg-[#58B49D]/5 rounded-xl border border-[#58B49D]/20 space-y-1">
                    <div className="text-[9.5px] font-mono font-bold text-[#2a7060] uppercase tracking-wider flex items-center gap-1">
                      <Rocket className="w-3 h-3 text-[#58B49D]" />
                      Startup-Partner
                    </div>
                    <div className="font-display font-bold text-sm text-zs-blau-schwarz">
                      {activeUc.startupPartner || activeUc.loesung || (
                        <span className="text-zinc-400 italic font-normal">In Vorbereitung</span>
                      )}
                    </div>
                    {activeUc.loesungWebsite && (
                      <a
                        href={activeUc.loesungWebsite}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-mono text-[#2a7060] hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-2.5 h-2.5" /> Startup Website
                      </a>
                    )}
                  </div>
                </div>

                {activeUc.ansprechpartner && (
                  <div className="text-[11px] font-mono text-zinc-500 bg-zinc-50/50 p-2.5 rounded-lg border border-zinc-150">
                    <strong>Ansprechpartner:</strong> {activeUc.ansprechpartner}
                  </div>
                )}
              </div>

              {/* ── PROJEKTBESCHREIBUNG ── */}
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-600" />
                  Projektbeschreibung
                </h4>
                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/70 text-xs font-sans text-zinc-750 leading-relaxed space-y-2">
                  <p>{activeUc.projektbeschreibung || 'Keine detaillierte Projektbeschreibung hinterlegt.'}</p>
                  {activeUc.risiken && (
                    <div className="mt-2 pt-2 border-t border-zinc-200/60 text-[11px] text-zinc-600">
                      <strong className="text-amber-800">Risiken &amp; Auflagen:</strong> {activeUc.risiken}
                    </div>
                  )}
                </div>
              </div>

              {/* ── INTERAKTIVE TO-DOS & NÄCHSTE SCHRITTE ── */}
              <div className="space-y-3 pt-2 border-t border-zinc-100">
                <div className="flex justify-between items-baseline">
                  <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-[#58B49D]" />
                    Nächste To-Dos &amp; Aufgaben
                  </h4>
                  {activeUc.todos && activeUc.todos.length > 0 && (
                    <span className="font-mono text-xs font-bold text-[#2a7060] bg-[#58B49D]/10 px-2 py-0.5 rounded">
                      {activeUc.todos.filter((t) => t.completed).length} von {activeUc.todos.length} erledigt
                    </span>
                  )}
                </div>

                {/* Checklist items */}
                <div className="space-y-2">
                  {(!activeUc.todos || activeUc.todos.length === 0) ? (
                    <div className="text-zinc-400 text-xs italic font-mono bg-zinc-50 p-3 rounded-lg border border-dashed border-zinc-200">
                      Noch keine To-Dos hinterlegt. Nutzen Sie das Formular unten, um nächste Schritte anzulegen.
                    </div>
                  ) : (
                    activeUc.todos.map((todo) => (
                      <div
                        key={todo.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                          todo.completed
                            ? 'bg-zinc-50 border-zinc-200/60 text-zinc-400'
                            : 'bg-white border-zinc-200 hover:border-zs-blau-schwarz text-zinc-800'
                        }`}
                      >
                        <div
                          className="flex items-center gap-2.5 flex-1 cursor-pointer"
                          onClick={() => handleToggleTodo(activeUc.id, todo.id)}
                        >
                          <button type="button" className="text-zinc-500 hover:text-zs-blau-schwarz">
                            {todo.completed ? (
                              <CheckSquare className="w-4 h-4 text-[#58B49D]" />
                            ) : (
                              <Square className="w-4 h-4 text-zinc-400" />
                            )}
                          </button>
                          <span className={`${todo.completed ? 'line-through text-zinc-400' : 'font-medium'}`}>
                            {todo.text}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {todo.dueDate && (
                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                              {formatDate(todo.dueDate)}
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteTodo(activeUc.id, todo.id)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded cursor-pointer"
                            title="Löschen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add To-Do in Drawer */}
                <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80 space-y-2">
                  <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
                    + Neues To-Do hinzufügen
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="z.B. Machbarkeitsanalyse mit Startup abstimmen..."
                      value={drawerTodoText}
                      onChange={(e) => setDrawerTodoText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (drawerTodoText.trim()) {
                            handleAddTodo(activeUc.id, drawerTodoText, drawerTodoDueDate);
                            setDrawerTodoText('');
                            setDrawerTodoDueDate('');
                          }
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-zinc-250 rounded-lg outline-none focus:border-zs-blau-schwarz"
                    />
                    <input
                      type="date"
                      value={drawerTodoDueDate}
                      onChange={(e) => setDrawerTodoDueDate(e.target.value)}
                      className="px-2 py-1.5 text-xs bg-white border border-zinc-250 rounded-lg outline-none focus:border-zs-blau-schwarz font-mono text-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (drawerTodoText.trim()) {
                          handleAddTodo(activeUc.id, drawerTodoText, drawerTodoDueDate);
                          setDrawerTodoText('');
                          setDrawerTodoDueDate('');
                        }
                      }}
                      className="px-4 py-1.5 bg-zs-blau-schwarz text-zs-signal-gelb font-bold text-xs rounded-lg hover:opacity-90 transition cursor-pointer"
                    >
                      Hinzufügen
                    </button>
                  </div>
                </div>
              </div>

              {/* ── EXTERNE LINKS & DOKUMENTATION ── */}
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                  Dokumentation &amp; Cloud-Speicher
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {activeUc.sharepointUrl ? (
                    <a
                      href={activeUc.sharepointUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 font-mono text-[10.5px] font-semibold text-zinc-700 bg-zinc-50 hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb border border-zinc-200 rounded-full transition-all"
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
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 font-mono text-[10.5px] font-semibold text-[#2a7060] bg-[#58B49D]/10 hover:bg-zs-textil-gruen hover:text-white border border-[#58B49D]/20 rounded-full transition-all"
                    >
                      🌐 zukunftsstoff.de Pilotsteckbrief
                    </a>
                  )}
                </div>
              </div>

              {/* ── VERKNÜPFTE RECHNUNGEN ── */}
              <div className="space-y-3 pt-2 border-t border-zinc-100">
                <div className="flex justify-between items-baseline">
                  <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                    Verknüpfte Sachmittel-Belege
                  </h4>
                  <span className="font-mono text-xs font-bold text-zs-textil-gruen bg-zs-textil-gruen/10 px-2 py-0.5 rounded">
                    {formatEuro(activeInvoicesSum)} netto
                  </span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {activeInvoices.length === 0 ? (
                    <div className="text-zinc-400 text-xs italic font-mono bg-zinc-50 p-2.5 rounded-lg border border-dashed border-zinc-200">
                      Noch keine Sachmittelrechnungen verknüpft.
                    </div>
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

              {/* ── TIMELINE NOTES ── */}
              <div className="space-y-4 pt-2 border-t border-zinc-100">
                <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                  Fortschrittsverlauf &amp; Notizen
                </h4>

                <form onSubmit={handleAddNoteSubmit} className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80 space-y-2.5">
                  <div className="flex gap-1.5 flex-wrap">
                    {(['update', 'meilenstein', 'meeting', 'problem'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewNoteType(type)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold cursor-pointer transition-all border ${
                          newNoteType === type
                            ? 'bg-zs-blau-schwarz border-zs-blau-schwarz text-zs-signal-gelb'
                            : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                        }`}
                      >
                        {type === 'meilenstein' ? '★ ' : type === 'problem' ? '⚠ ' : ''}{type}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Statusupdate oder Notiz eingeben..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 outline-none focus:border-zs-blau-schwarz rounded-lg text-xs"
                    required
                  />
                  <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400">
                    <span>Revisionssicher protokolliert</span>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-zs-blau-schwarz text-zs-signal-gelb rounded-full font-bold cursor-pointer hover:bg-zs-blau-schwarz/90"
                    >
                      Speichern
                    </button>
                  </div>
                </form>

                <div className="relative pl-4 space-y-4 before:content-[''] before:absolute before:left-1.5 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-zinc-200">
                  {activeNotes.length === 0 ? (
                    <div className="text-zinc-400 text-xs italic font-mono pl-1">Noch keine Statusnotizen vorhanden.</div>
                  ) : (
                    activeNotes.map((n) => (
                      <div key={n.id} className="relative text-xs leading-normal">
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
              </>
              )}
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-4 border-t border-zinc-100 bg-zinc-50/60 flex justify-between items-center">
              <button
                onClick={(e) => {
                  setSelectedUcId(null);
                  handleEditClick(activeUc, e);
                }}
                className="px-4 py-2 rounded-full border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-zinc-100 transition cursor-pointer"
              >
                ✏️ Use-Case bearbeiten
              </button>
              <button
                onClick={() => setSelectedUcId(null)}
                className="px-5 py-2 rounded-full bg-zs-blau-schwarz text-zs-signal-gelb text-xs font-bold transition hover:opacity-90 cursor-pointer"
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
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-xl w-full overflow-hidden animate-fade-in animate-scale-up">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <div>
                <h3 className="font-display font-bold text-lg text-zs-blau-schwarz">
                  {editingId ? 'Use-Case bearbeiten' : 'Neuen Use-Case registrieren'}
                </h3>
                <p className="text-xs font-mono text-zinc-500">
                  {ucBatch} &middot; Struktur für Industrieunternehmen &amp; Startups
                </p>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-zinc-400 hover:text-zs-blau-schwarz transition text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
                {/* Titel */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                    Titel / Bezeichnung des Use-Cases <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. Wasserstoffbasierte Prozesswärme in der Papierherstellung"
                    value={ucTitel}
                    onChange={(e) => setUcTitel(e.target.value)}
                    className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    required
                  />
                </div>

                {/* Batch & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      Batch-Zuordnung
                    </label>
                    <select
                      value={ucBatch}
                      onChange={(e) => setUcBatch(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz font-bold"
                    >
                      <option value="Batch 1">Batch 1 (Aktive Piloten)</option>
                      <option value="Batch 2">Batch 2 (Matchmaking &amp; Vorbereitung)</option>
                      <option value="Batch 3">Batch 3 (Zukünftige Pipeline)</option>
                      <option value="Batch 4">Batch 4</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      Aktivitätsstatus
                    </label>
                    <select
                      value={ucStatus}
                      onChange={(e) => setUcStatus(e.target.value as UseCase['status'])}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    >
                      <option value="Pipeline">Pipeline</option>
                      <option value="in Vorbereitung">in Vorbereitung</option>
                      <option value="in Prüfung">in Prüfung</option>
                      <option value="aktiv">aktiv</option>
                      <option value="kritisch">kritisch</option>
                      <option value="abgeschlossen">abgeschlossen</option>
                    </select>
                  </div>
                </div>

                {/* GETRENNTE PARTNER-FELDER (INDUSTRIE & STARTUP) */}
                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-3">
                  <div className="text-[10.5px] font-mono font-bold text-zs-blau-schwarz uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Beteiligte Partner (Industrie &amp; Startup)
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                        🏢 Industrieunternehmen
                      </label>
                      <input
                        type="text"
                        placeholder="z.B. Schoellershammer GmbH"
                        value={ucCo}
                        onChange={(e) => setUcCo(e.target.value)}
                        className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                        🚀 Startup- / Lösungspartner
                      </label>
                      <input
                        type="text"
                        placeholder="z.B. H2-Heat Innovations"
                        value={ucStartup}
                        onChange={(e) => setUcStartup(e.target.value)}
                        className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      Ansprechpartner (Kontaktdaten)
                    </label>
                    <input
                      type="text"
                      placeholder="z.B. Dr. Peter Weber (Industrie) / Janine Brandt (Startup)"
                      value={ucAp}
                      onChange={(e) => setUcAp(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    />
                  </div>
                </div>

                {/* Branche & Reifegrad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      Kern-Branche
                    </label>
                    <select
                      value={ucBranche}
                      onChange={(e) => setUcBranche(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    >
                      <option value="Papier">Papier</option>
                      <option value="Chemie">Chemie</option>
                      <option value="Textil">Textil</option>
                      <option value="Energie">Energie</option>
                      <option value="Übergreifend">Übergreifend</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      Reifegrad
                    </label>
                    <select
                      value={ucReife}
                      onChange={(e) => setUcReife(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    >
                      <option value="Idee">Idee</option>
                      <option value="Konzept">Konzept</option>
                      <option value="Prototyp">Prototyp</option>
                      <option value="Pilotbetrieb">Pilotbetrieb</option>
                      <option value="Produktiv">Produktiv</option>
                      <option value="Skalierung">Skalierung</option>
                    </select>
                  </div>
                </div>

                {/* Projektbeschreibung */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                    Projektbeschreibung (Kurzfassung)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Kurzbeschreibung für die Kartenansicht..."
                    value={ucBeschreibung}
                    onChange={(e) => setUcBeschreibung(e.target.value)}
                    className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz font-sans leading-relaxed"
                  />
                </div>

                {/* 6-Felder-Steckbrief Details */}
                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-3">
                  <div className="text-[10.5px] font-mono font-bold text-zs-blau-schwarz uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    6-Felder-Steckbrief (Problem · Lösung · Next Steps · Mehrwert)
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      3. Problemstellung
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Konkrete Herausforderung (Ressourceneffizienz, Kreislaufwirtschaft, Digitalisierung)..."
                      value={ucProblemstellung}
                      onChange={(e) => setUcProblemstellung(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      4. Lösungsansatz
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Technologie, Pilotaufbau oder Validierungsschritte..."
                      value={ucLoesungsansatz}
                      onChange={(e) => setUcLoesungsansatz(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      5. Status &amp; Next Steps
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Aktuelle Phase und nächste Meilensteine..."
                      value={ucStatusNextSteps}
                      onChange={(e) => setUcStatusNextSteps(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      6. Standort-Mehrwert (Düren)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Direkter Beitrag zur regionalen Wertschöpfung und Transformation in Düren..."
                      value={ucStandortMehrwert}
                      onChange={(e) => setUcStandortMehrwert(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                    />
                  </div>
                </div>

                {/* Erfolg & Frist */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      Erfolgswahrsch. (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={ucProb}
                      onChange={(e) => setUcProb(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      Pol. Relevanz (1-5)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={ucRel}
                      onChange={(e) => setUcRel(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      Deadline / Meilenstein
                    </label>
                    <input
                      type="date"
                      value={ucDl}
                      onChange={(e) => setUcDl(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz font-mono text-zinc-600"
                    />
                  </div>
                </div>

                {/* Risiken & Verlinkungen */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                    Risiken &amp; Herausforderungen
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. IT-Sicherheit, Verfügbarkeit von Mustermaterialien..."
                    value={ucRisk}
                    onChange={(e) => setUcRisk(e.target.value)}
                    className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      SharePoint Ordner URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://windn.sharepoint.com/..."
                      value={ucSharepoint}
                      onChange={(e) => setUcSharepoint(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz font-mono text-zinc-600"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      Web / zukunftsstoff.de URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.zukunftsstoff.de/..."
                      value={ucWebsite}
                      onChange={(e) => setUcWebsite(e.target.value)}
                      className="px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs outline-none focus:border-zs-blau-schwarz font-mono text-zinc-600"
                    />
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="p-5 border-t border-zinc-100 flex flex-col gap-2 bg-zinc-50/50">
                {formError && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    {formError}
                  </div>
                )}
                <div className="flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setFormError(null);
                      setShowFormModal(false);
                    }}
                    className="px-4 py-2 rounded-full border border-zinc-300 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-zs-signal-gelb text-zs-blau-schwarz font-bold text-xs hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition cursor-pointer shadow-xs"
                  >
                    {editingId ? 'Änderungen speichern' : 'Use-Case anlegen'}
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
