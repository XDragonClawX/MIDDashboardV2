import React, { useState } from 'react';
import { Task, UseCase, Vergabe, Rechnungsbeleg } from '../../types';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Edit2, 
  Filter, 
  Calendar, 
  Link2, 
  BookOpen, 
  Award, 
  FileText,
  Search,
  Check
} from 'lucide-react';
import { formatDate } from '../../utils';

interface AufgabenPageProps {
  tasks: Task[];
  usecases: UseCase[];
  vergaben: Vergabe[];
  rechnungen: Rechnungsbeleg[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onUpdateTask: (id: number, task: Partial<Task>) => void;
  onDeleteTask: (id: number) => void;
  initialStatus?: string;
  onStatusChange?: (status: string) => void;
}

export default function AufgabenPage({
  tasks,
  usecases,
  vergaben,
  rechnungen,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  initialStatus = 'all',
  onStatusChange
}: AufgabenPageProps) {
  // Tabs and general UI filter states
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>(initialStatus);
  const [filterModule, setFilterModule] = useState<'all' | 'usecase' | 'vergabe' | 'rechnung'>('all');

  // Sync prop status with local state
  React.useEffect(() => {
    if (initialStatus !== undefined) {
      setFilterStatus(initialStatus);
    }
  }, [initialStatus]);

  // Modal / Form states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form inputs
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState<Task['priority']>('mittel');
  const [taskStatus, setTaskStatus] = useState<Task['status']>('offen');
  const [taskUcId, setTaskUcId] = useState<string>('');
  const [taskVergabeId, setTaskVergabeId] = useState<string>('');
  const [taskRechnungId, setTaskRechnungId] = useState<string>('');

  const handleOpenNewTask = () => {
    setEditingId(null);
    setTaskTitle('');
    setTaskDesc('');
    setTaskDueDate('');
    setTaskPriority('mittel');
    setTaskStatus('offen');
    setTaskUcId('');
    setTaskVergabeId('');
    setTaskRechnungId('');
    setShowModal(true);
  };

  const handleOpenEditTask = (t: Task) => {
    setEditingId(t.id);
    setTaskTitle(t.title);
    setTaskDesc(t.description || '');
    setTaskDueDate(t.dueDate || '');
    setTaskPriority(t.priority);
    setTaskStatus(t.status);
    setTaskUcId(t.useCaseId ? String(t.useCaseId) : '');
    setTaskVergabeId(t.vergabeId ? String(t.vergabeId) : '');
    setTaskRechnungId(t.rechnungId ? String(t.rechnungId) : '');
    setShowModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      alert('Der Aufgabentitel ist ein Pflichtfeld.');
      return;
    }

    const payload = {
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      dueDate: taskDueDate ? taskDueDate : null,
      status: taskStatus,
      priority: taskPriority,
      useCaseId: taskUcId ? Number(taskUcId) : null,
      vergabeId: taskVergabeId ? Number(taskVergabeId) : null,
      rechnungId: taskRechnungId ? Number(taskRechnungId) : null,
    };

    if (editingId) {
      onUpdateTask(editingId, payload);
    } else {
      onAddTask(payload);
    }

    setShowModal(false);
  };

  // Quick toggle status helper
  const handleToggleStatus = (t: Task) => {
    const nextStatusMap: Record<Task['status'], Task['status']> = {
      'offen': 'in_bearbeitung',
      'in_bearbeitung': 'erledigt',
      'erledigt': 'offen'
    };
    onUpdateTask(t.id, { status: nextStatusMap[t.status] });
  };

  // Helper matching titles for associations
  const getUcTitle = (id?: number | null) => {
    if (!id) return '';
    return usecases.find(u => u.id === id)?.titel || `Use Case #${id}`;
  };

  const getVergabeTitle = (id?: number | null) => {
    if (!id) return '';
    return vergaben.find(v => v.id === id)?.titel || `Vergabe #${id}`;
  };

  const getRechnungTitle = (id?: number | null) => {
    if (!id) return '';
    const r = rechnungen.find(i => i.id === id);
    return r ? `${r.rechnungssteller} (${r.rechnungsnummer})` : `Rechnung #${id}`;
  };

  // Filtration logic
  const filteredTasks = tasks.filter((t) => {
    // 1. Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchUc = getUcTitle(t.useCaseId).toLowerCase().includes(q);
      const matchVerg = getVergabeTitle(t.vergabeId).toLowerCase().includes(q);
      const matchInvc = getRechnungTitle(t.rechnungId).toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchUc && !matchVerg && !matchInvc) return false;
    }

    // 2. Priority Filter
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;

    // 3. Status Filter
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;

    // 4. Module Filter
    if (filterModule === 'usecase' && !t.useCaseId) return false;
    if (filterModule === 'vergabe' && !t.vergabeId) return false;
    if (filterModule === 'rechnung' && !t.rechnungId) return false;

    return true;
  });

  // KPIs
  const totalCount = filteredTasks.length;
  const openCount = filteredTasks.filter(t => t.status === 'offen').length;
  const progCount = filteredTasks.filter(t => t.status === 'in_bearbeitung').length;
  const doneCount = filteredTasks.filter(t => t.status === 'erledigt').length;

  // Status-Badges
  const getPriorityBadge = (p: Task['priority']) => {
    const styles = {
      hoch: 'bg-red-50 text-red-700 border-red-200',
      mittel: 'bg-amber-50 text-amber-700 border-amber-200',
      niedrig: 'bg-slate-50 text-slate-600 border-slate-200'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border font-semibold uppercase ${styles[p]}`}>
        {p}
      </span>
    );
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'erledigt':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 cursor-pointer hover:scale-105 transition-all" />;
      case 'in_bearbeitung':
        return <Clock className="w-5 h-5 text-amber-500 cursor-pointer hover:scale-105 transition-all" />;
      default:
        return <Circle className="w-5 h-5 text-zinc-350 cursor-pointer hover:scale-105 transition-all" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
            Aufgaben<span className="bg-zs-signal-gelb px-1 py-0.5 rounded">verwaltung &amp; To-Dos</span>
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Modulübergreifende To-Dos &middot; Verlinkt mit Use-Cases, Vergaben und Sachmittelbelegen
          </p>
        </div>
        <button
          onClick={handleOpenNewTask}
          className="px-5 py-2 text-xs font-bold rounded-full bg-zs-signal-gelb text-zs-blau-schwarz hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-all shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto uppercase tracking-wide"
        >
          <Plus className="w-3.5 h-3.5" /> Neue Aufgabe
        </button>
      </div>

      {/* Methodological Explanation Banner (Research input based on prompt) */}
      <div className="bg-[#58B49D]/5 border border-[#58B49D]/20 rounded-2xl p-4 text-xs text-zinc-700 space-y-2">
        <div className="flex items-center gap-2 font-bold text-zs-textil-gruen">
          <span>🧠 Systematik der Verknüpfung: Relationaler Poly-Assoziations-Ansatz</span>
        </div>
        <p className="leading-relaxed">
          Für dieses IT-Projektsteuerungssystem wurde ein <strong>zentralisiertes relationales Modell</strong> als die am besten geeignete Methode ermittelt. Die Verknüpfung erfolgt über optionale, indexierte Fremdschlüssel (<code className="font-mono text-zs-textil-gruen bg-[#58B49D]/15 px-1 rounded">useCaseId</code>, <code className="font-mono text-zs-textil-gruen bg-[#58B49D]/15 px-1 rounded">vergabeId</code>, <code className="font-mono text-zs-textil-gruen bg-[#58B49D]/15 px-1 rounded">rechnungId</code>).
        </p>
        <ul className="list-disc leading-relaxed list-inside pl-1 space-y-1 text-zinc-600">
          <li><strong>Zentrale Aufgabensteuerung (Single Source of Truth)</strong>: Verhindert Daten-Silos. Alle To-Dos werden in einer Datenbank gepflegt und sind instantan global auswertbar (KPIs).</li>
          <li><strong>Kontextuelle Sichtbarkeit</strong>: Aufgaben werden direkt dort angezeigt, wo sie entstehen – z.B. direkt im Use-Case-Detaildrawer, im Vergabe-Statusboard oder in der Belegliste.</li>
          <li><strong>Mehrfachzuordnung</strong>: Ein komplexer Arbeitsschritt kann gleichzeitig einem Pilotbetrieb (Use-Case) und dem damit verbundenden Beschaffungsauftrag (Vergabe) zugeordnet werden.</li>
        </ul>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-400">AUFGABEN GESAMT</div>
          <div className="text-2xl font-mono font-bold text-zs-blau-schwarz mt-1">{totalCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-400 font-semibold text-zinc-500">OFFEN</div>
          <div className="text-2xl font-mono font-bold text-zinc-600 mt-1">{openCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-400 font-semibold text-amber-500">IN BEARBEITUNG</div>
          <div className="text-2xl font-mono font-bold text-amber-500 mt-1">{progCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-400 font-semibold text-emerald-550">ERLEDIGT</div>
          <div className="text-2xl font-mono font-bold text-emerald-600 mt-1">{doneCount}</div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Aufgaben suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:bg-white focus:border-zs-blau-schwarz transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Priority filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 rounded-lg p-1.5 px-2 text-xs outline-none"
            >
              <option value="all">Alle Prioritäten</option>
              <option value="hoch">Hoch</option>
              <option value="mittel">Mittel</option>
              <option value="niedrig">Niedrig</option>
            </select>
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => {
              const val = e.target.value;
              setFilterStatus(val);
              if (onStatusChange) {
                onStatusChange(val);
              }
            }}
            className="bg-zinc-50 border border-zinc-200 rounded-lg p-1.5 px-2 text-xs outline-none font-medium cursor-pointer"
          >
            <option value="all">Alle Stati</option>
            <option value="offen">Offen</option>
            <option value="in_bearbeitung">In Bearbeitung</option>
            <option value="erledigt">Erledigt</option>
          </select>

          {/* Module relation filter */}
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value as any)}
            className="bg-zinc-50 border border-zinc-200 rounded-lg p-1.5 px-2 text-xs outline-none"
          >
            <option value="all">Alle Verlinkungen</option>
            <option value="usecase">Nur mit Use-Cases</option>
            <option value="vergabe">Nur mit Vergaben</option>
            <option value="rechnung">Nur mit Rechnungen</option>
          </select>

          {/* View Mode Toggle */}
          <div className="border border-zinc-250 p-0.5 rounded-lg flex items-center bg-zinc-50 ml-auto lg:ml-0">
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1 rounded text-[10px] font-mono uppercase font-bold transition-all ${
                viewMode === 'board' ? 'bg-zs-blau-schwarz text-white' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Spalten
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-[10px] font-mono uppercase font-bold transition-all ${
                viewMode === 'list' ? 'bg-zs-blau-schwarz text-white' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Liste
            </button>
          </div>
        </div>
      </div>

      {/* Main Board View */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* COLUMN: OFFEN */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex flex-col min-h-96">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-200 mb-4">
              <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-350 bubble-pulse"></span> Offen
              </span>
              <span className="font-mono text-xs text-zinc-450 bg-white/80 p-0.5 px-2 rounded-md border border-zinc-200 font-bold">
                {filteredTasks.filter(t => t.status === 'offen').length}
              </span>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[36rem] pr-1">
              {filteredTasks.filter(t => t.status === 'offen').length === 0 ? (
                <div className="text-center py-10 font-mono text-[11px] text-zinc-400 italic">Keine anstehenden Aufgaben.</div>
              ) : (
                filteredTasks.filter(t => t.status === 'offen').map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onToggleStatus={handleToggleStatus}
                    onEdit={handleOpenEditTask}
                    onDeleteClick={(id) => setDeleteConfirmId(id)}
                    deleteConfirmId={deleteConfirmId}
                    onDeleteConfirm={(id) => {
                      onDeleteTask(id);
                      setDeleteConfirmId(null);
                    }}
                    onDeleteCancel={() => setDeleteConfirmId(null)}
                    getUcTitle={getUcTitle}
                    getVergabeTitle={getVergabeTitle}
                    getRechnungTitle={getRechnungTitle}
                    getPriorityBadge={getPriorityBadge}
                    getStatusIcon={getStatusIcon}
                  />
                ))
              )}
            </div>
          </div>

          {/* COLUMN: IN BEARBEITUNG */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex flex-col min-h-96">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-200 mb-4">
              <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> In Bearbeitung
              </span>
              <span className="font-mono text-xs text-amber-600 bg-amber-50 p-0.5 px-2 rounded-md border border-amber-200 font-bold">
                {filteredTasks.filter(t => t.status === 'in_bearbeitung').length}
              </span>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[36rem] pr-1">
              {filteredTasks.filter(t => t.status === 'in_bearbeitung').length === 0 ? (
                <div className="text-center py-10 font-mono text-[11px] text-zinc-400 italic">Aktuell keine Aufgaben in Bearbeitung.</div>
              ) : (
                filteredTasks.filter(t => t.status === 'in_bearbeitung').map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onToggleStatus={handleToggleStatus}
                    onEdit={handleOpenEditTask}
                    onDeleteClick={(id) => setDeleteConfirmId(id)}
                    deleteConfirmId={deleteConfirmId}
                    onDeleteConfirm={(id) => {
                      onDeleteTask(id);
                      setDeleteConfirmId(null);
                    }}
                    onDeleteCancel={() => setDeleteConfirmId(null)}
                    getUcTitle={getUcTitle}
                    getVergabeTitle={getVergabeTitle}
                    getRechnungTitle={getRechnungTitle}
                    getPriorityBadge={getPriorityBadge}
                    getStatusIcon={getStatusIcon}
                  />
                ))
              )}
            </div>
          </div>

          {/* COLUMN: ERLEDIGT */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex flex-col min-h-96">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-200 mb-4">
              <span className="text-xs font-mono font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Erledigt
              </span>
              <span className="font-mono text-xs text-emerald-700 bg-emerald-50 p-0.5 px-2 rounded-md border border-emerald-200 font-bold">
                {filteredTasks.filter(t => t.status === 'erledigt').length}
              </span>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[36rem] pr-1">
              {filteredTasks.filter(t => t.status === 'erledigt').length === 0 ? (
                <div className="text-center py-10 font-mono text-[11px] text-zinc-400 italic">Noch keine Aufgaben erledigt.</div>
              ) : (
                filteredTasks.filter(t => t.status === 'erledigt').map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onToggleStatus={handleToggleStatus}
                    onEdit={handleOpenEditTask}
                    onDeleteClick={(id) => setDeleteConfirmId(id)}
                    deleteConfirmId={deleteConfirmId}
                    onDeleteConfirm={(id) => {
                      onDeleteTask(id);
                      setDeleteConfirmId(null);
                    }}
                    onDeleteCancel={() => setDeleteConfirmId(null)}
                    getUcTitle={getUcTitle}
                    getVergabeTitle={getVergabeTitle}
                    getRechnungTitle={getRechnungTitle}
                    getPriorityBadge={getPriorityBadge}
                    getStatusIcon={getStatusIcon}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[9px] text-zinc-400 tracking-wider">
                <th className="p-4 w-12 text-center">Status</th>
                <th className="p-4">Aufgabe / Beschreibung</th>
                <th className="p-4">Priorität</th>
                <th className="p-4">Fälligkeitsdatum</th>
                <th className="p-4">Zugeordnete Ressourcen</th>
                <th className="p-4 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-zinc-400 font-mono italic">
                    Keine Aufgaben passend zu den ausgewählten Filtern vorhanden.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => (
                  <tr key={t.id} className="border-b border-zinc-100 hover:bg-zinc-50/40 transition-all">
                    <td className="p-4 text-center">
                      <button onClick={() => handleToggleStatus(t)} className="outline-none">
                        {getStatusIcon(t.status)}
                      </button>
                    </td>
                    <td className="p-4 max-w-sm space-y-1">
                      <div className={`font-semibold text-zs-blau-schwarz text-xs ${t.status === 'erledigt' ? 'line-through text-zinc-400' : ''}`}>
                        {t.title}
                      </div>
                      {t.description && (
                        <p className="text-zinc-500 font-sans text-[11px] leading-relaxed line-clamp-2">
                          {t.description}
                        </p>
                      )}
                    </td>
                    <td className="p-4 font-mono">{getPriorityBadge(t.priority)}</td>
                    <td className="p-4 font-mono text-zinc-600">
                      {t.dueDate ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          {formatDate(t.dueDate)}
                        </span>
                      ) : (
                        <span className="text-zinc-400 italic font-medium">keine Frist</span>
                      )}
                    </td>
                    <td className="p-4 space-y-1">
                      {t.useCaseId && (
                        <div className="flex items-center gap-1 font-mono text-[10px] text-[#2a7060]/90 bg-[#58B49D]/10 p-1 px-2 rounded w-max">
                          <BookOpen className="w-3 h-3 text-[#2a7060]" />
                          <span className="truncate max-w-[150px]" title={getUcTitle(t.useCaseId)}>
                            UC: {getUcTitle(t.useCaseId)}
                          </span>
                        </div>
                      )}
                      {t.vergabeId && (
                        <div className="flex items-center gap-1 font-mono text-[10px] text-[#8C3A23]/95 bg-orange-50 p-1 px-2 rounded w-max">
                          <Award className="w-3 h-3 text-[#8C3A23]" />
                          <span className="truncate max-w-[150px]" title={getVergabeTitle(t.vergabeId)}>
                            VG: {getVergabeTitle(t.vergabeId)}
                          </span>
                        </div>
                      )}
                      {t.rechnungId && (
                        <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-600 bg-zinc-100 p-1 px-2 rounded w-max">
                          <FileText className="w-3 h-3 text-zinc-500" />
                          <span className="truncate max-w-[150px]" title={getRechnungTitle(t.rechnungId)}>
                            BELEG: {getRechnungTitle(t.rechnungId)}
                          </span>
                        </div>
                      )}
                      {!t.useCaseId && !t.vergabeId && !t.rechnungId && (
                        <span className="text-zinc-400 text-[10px] italic">Keine Zuordnung</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {deleteConfirmId === t.id ? (
                        <div className="inline-flex items-center gap-1.5 p-1 px-2 bg-red-50 border border-red-200 rounded text-[10px] font-mono">
                          <span className="text-red-700 font-bold">Löschen?</span>
                          <button
                            onClick={() => {
                              onDeleteTask(t.id);
                              setDeleteConfirmId(null);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold p-0.5 px-1.5 rounded transition"
                          >
                            Ja
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold p-0.5 px-1.5 rounded transition"
                          >
                            Nein
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditTask(t)}
                            className="p-1.5 border border-zinc-200 text-zinc-500 hover:text-zs-blau-schwarz hover:bg-zinc-100 rounded transition cursor-pointer"
                            title="Bearbeiten"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(t.id)}
                            className="p-1.5 border border-zinc-200 text-red-500 hover:bg-red-50 rounded transition cursor-pointer"
                            title="Löschen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL FORM (NEW & EDIT) */}
      {showModal && (
        <div className="fixed inset-0 bg-[#041422]/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-lg mt-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-zinc-150 flex justify-between items-center bg-zinc-50">
              <h3 className="font-display font-black text-zs-blau-schwarz text-base">
                {editingId ? 'Aufgabe bearbeiten' : 'Neue Aufgabe erstellen'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                  Titel der Aufgabe <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Z.B. SharePoint-Struktur bereinigen"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border border-zinc-200 rounded-lg outline-none focus:border-zs-blau-schwarz transition"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                  Beschreibung / Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Genaue Beschreibung oder To-Do Unterpunkte..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full text-xs p-2.5 border border-zinc-200 rounded-lg outline-none focus:border-zs-blau-schwarz transition resize-none font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Due Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-zinc-400" /> Fällig am
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-zinc-200 rounded-lg bg-white outline-none focus:border-zs-blau-schwarz transition"
                  />
                </div>

                {/* Priority */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                    Prioritätsstufe
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as Task['priority'])}
                    className="w-full text-xs p-2.5 bg-white border border-zinc-200 rounded-lg outline-none focus:border-zs-blau-schwarz transition"
                  >
                    <option value="hoch">🔴 Hoch</option>
                    <option value="mittel">🟡 Mittel</option>
                    <option value="niedrig">🟢 Niedrig</option>
                  </select>
                </div>
              </div>

              {/* Status (Optional but good in editor) */}
              {editingId && (
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                    aktueller Bearbeitungsstand
                  </label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as Task['status'])}
                    className="w-full text-xs p-2.5 bg-white border border-zinc-200 rounded-lg outline-none focus:border-zs-blau-schwarz transition"
                  >
                    <option value="offen">Offen</option>
                    <option value="in_bearbeitung">In Bearbeitung</option>
                    <option value="erledigt">Erledigt</option>
                  </select>
                </div>
              )}

              {/* Associations (Cross-Ref bindings) */}
              <div className="pt-3 border-t border-zinc-150 space-y-4">
                <span className="block text-[10px] font-mono font-black text-[#58B49D] uppercase tracking-wider">
                  🔗 Zugeordnete Module (Wahlfreie Querverknüpfung)
                </span>

                {/* Use Case Selection */}
                <div className="space-y-1">
                  <label className="text-[9px] font-mono font-bold text-zinc-450 uppercase tracking-wide flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-[#2a7060]" /> Use-Case / Pilotprojekt
                  </label>
                  <select
                    value={taskUcId}
                    onChange={(e) => setTaskUcId(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-zinc-200 rounded-lg outline-none focus:border-zs-blau-schwarz transition"
                  >
                    <option value="">-- Keinem Use Case zuordnen --</option>
                    {usecases.map((uc) => (
                      <option key={uc.id} value={uc.id}>
                        [{uc.status}] {uc.titel} ({uc.unternehmen})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vergabe Selection */}
                <div className="space-y-1">
                  <label className="text-[9px] font-mono font-bold text-zinc-455 uppercase tracking-wide flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-600" /> Ausgeschriebenes Vergabeverfahren
                  </label>
                  <select
                    value={taskVergabeId}
                    onChange={(e) => setTaskVergabeId(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-zinc-200 rounded-lg outline-none focus:border-zs-blau-schwarz transition"
                  >
                    <option value="">-- Keiner Vergabe zuordnen --</option>
                    {vergaben.map((v) => (
                      <option key={v.id} value={v.id}>
                        [{v.status}] {v.titel} ({v.auftragnehmer || 'Bietersuche'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rechnung Selection */}
                <div className="space-y-1">
                  <label className="text-[9px] font-mono font-bold text-zinc-460 uppercase tracking-wide flex items-center gap-1">
                    <FileText className="w-3 h-3 text-zinc-500" /> Rechnungsbeleg / Sachkosten
                  </label>
                  <select
                    value={taskRechnungId}
                    onChange={(e) => setTaskRechnungId(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-zinc-200 rounded-lg outline-none focus:border-zs-blau-schwarz transition"
                  >
                    <option value="">-- Keiner Rechnung zuordnen --</option>
                    {rechnungen.map((r) => (
                      <option key={r.id} value={r.id}>
                        [{r.status}] {r.rechnungssteller} &middot; Beleg nr {r.rechnungsnummer} ({formatEuro(r.betragNetto)} netto)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-4 flex gap-2 justify-end font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-zinc-650 hover:bg-zinc-50 transition cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-zs-signal-gelb text-zs-blau-schwarz hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb font-black transition cursor-pointer"
                >
                  {editingId ? 'Änderungen speichern' : 'To-Do anlegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TASK CARD INTERNAL HELPER COMPONENT (BOARD VIEW) ──
interface TaskCardProps {
  key?: React.Key;
  task: Task;
  onToggleStatus: (t: Task) => void;
  onEdit: (t: Task) => void;
  onDeleteClick: (id: number) => void;
  deleteConfirmId: number | null;
  onDeleteConfirm: (id: number) => void;
  onDeleteCancel: () => void;
  getUcTitle: (id?: number | null) => string;
  getVergabeTitle: (id?: number | null) => string;
  getRechnungTitle: (id?: number | null) => string;
  getPriorityBadge: (p: Task['priority']) => React.ReactNode;
  getStatusIcon: (s: Task['status']) => React.ReactNode;
}

function TaskCard({
  task,
  onToggleStatus,
  onEdit,
  onDeleteClick,
  deleteConfirmId,
  onDeleteConfirm,
  onDeleteCancel,
  getUcTitle,
  getVergabeTitle,
  getRechnungTitle,
  getPriorityBadge,
  getStatusIcon
}: TaskCardProps) {
  return (
    <div className="bg-white border border-zinc-200/80 p-4 rounded-xl shadow-3xs flex flex-col gap-3 group relative hover:border-zs-blau-schwarz transition-all text-xs">
      {/* Title + Action toggler */}
      <div className="flex items-start gap-2.5">
        <button onClick={() => onToggleStatus(task)} className="mt-0.5 outline-none flex-shrink-0">
          {getStatusIcon(task.status)}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-zs-blau-schwarz leading-tight ${task.status === 'erledigt' ? 'line-through text-zinc-400' : ''}`}>
            {task.title}
          </div>
          {task.description && (
            <p className="text-zinc-500 text-[11px] leading-relaxed mt-1 font-sans">
              {task.description}
            </p>
          )}
        </div>
      </div>

      {/* Due date and priority row */}
      <div className="flex items-center justify-between pt-1 font-mono text-[10px]">
        {task.dueDate ? (
          <span className="flex items-center gap-1 text-zinc-500 font-semibold">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            {formatDate(task.dueDate)}
          </span>
        ) : (
          <span className="text-zinc-450 italic">keine Frist</span>
        )}
        {getPriorityBadge(task.priority)}
      </div>

      {/* Linked associations list */}
      {(task.useCaseId || task.vergabeId || task.rechnungId) && (
        <div className="border-t border-zinc-100 pt-2.5 mt-0.5 space-y-1 text-[9px] font-mono select-none">
          {task.useCaseId && (
            <div className="flex items-center gap-1 text-[#2a7060] bg-[#58B49D]/10 px-2 py-0.5 rounded w-max max-w-full">
              <BookOpen className="w-3 h-3 flex-shrink-0" />
              <span className="truncate" title={getUcTitle(task.useCaseId)}>
                UC: {getUcTitle(task.useCaseId)}
              </span>
            </div>
          )}
          {task.vergabeId && (
            <div className="flex items-center gap-1 text-[#8C3A23] bg-orange-50 px-2 py-0.5 rounded w-max max-w-full">
              <Award className="w-3 h-3 flex-shrink-0" />
              <span className="truncate" title={getVergabeTitle(task.vergabeId)}>
                VG: {getVergabeTitle(task.vergabeId)}
              </span>
            </div>
          )}
          {task.rechnungId && (
            <div className="flex items-center gap-1 text-zinc-650 bg-zinc-100 px-2 py-0.5 rounded w-max max-w-full">
              <FileText className="w-3 h-3 flex-shrink-0" />
              <span className="truncate" title={getRechnungTitle(task.rechnungId)}>
                BEL: {getRechnungTitle(task.rechnungId)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Card actions */}
      <div className="border-t border-zinc-100 pt-2 flex items-center justify-end gap-1.5 h-7">
        {deleteConfirmId === task.id ? (
          <div className="flex items-center gap-1 px-1 text-[9px] font-mono bg-red-50 border border-red-200 rounded w-full justify-between">
            <span className="text-red-750 font-bold">Löschen?</span>
            <div className="flex gap-1">
              <button
                onClick={() => onDeleteConfirm(task.id)}
                className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition cursor-pointer"
              >
                Ja
              </button>
              <button
                onClick={onDeleteCancel}
                className="px-2 py-0.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-750 font-bold rounded transition cursor-pointer"
              >
                Nein
              </button>
            </div>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-white pl-2">
            <button
              onClick={() => onEdit(task)}
              className="p-1 px-2 border border-zinc-200 text-zinc-550 hover:text-zs-blau-schwarz hover:bg-zinc-50 rounded transition cursor-pointer font-mono text-[9px]"
            >
              Bearbeiten
            </button>
            <button
              onClick={() => onDeleteClick(task.id)}
              className="p-1 text-red-500 hover:bg-red-50 rounded transition cursor-pointer text-[9px]"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple Helper function for rendering formatEuro if not globally available here
function formatEuro(val: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);
}
