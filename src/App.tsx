import React, { useState, useEffect } from 'react';
import {
  PersonalEintrag,
  Rechnungsbeleg,
  Mittelabruf,
  Vergabe,
  Partner,
  PartnerMatch,
  Buchung,
  AuditLog,
  Task,
} from './types';
import {
  SEED_PERSONAL as INITIAL_PERSONAL,
  SEED_RECHNUNGEN as INITIAL_RECHNUNGEN,
  SEED_MITTELABRUFE as INITIAL_MITTELABRUFE,
  SEED_VERGABEN as INITIAL_VERGABEN,
  SEED_PARTNER as INITIAL_PARTNERS,
  SEED_TASKS as INITIAL_TASKS,
} from './data';
import { loadLocalStorage as loadFromStorage, saveLocalStorage as saveToStorage } from './utils';

const INITIAL_MATCHES: PartnerMatch[] = [];
const INITIAL_BUCHUNGEN: Buchung[] = [];

function sanitizeAndDeduplicate<T extends { id: number }>(items: T[], fallbackSeed: T[] = []): T[] {
  const list = Array.isArray(items) && items.length > 0 ? items : fallbackSeed;
  const seenIds = new Set<number>();
  const verifiedList: T[] = [];
  
  list.forEach((item) => {
    if (item && typeof item.id === 'number' && !isNaN(item.id) && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      verifiedList.push(item);
    } else if (item) {
      verifiedList.push({ ...item, id: -1 });
    }
  });

  let nextId = verifiedList.length > 0 ? Math.max(...verifiedList.map(x => x.id)) + 1 : 1;
  if (nextId < 1 || isNaN(nextId)) nextId = 1;

  return verifiedList.map((item) => {
    if (item.id === -1) {
      const newId = nextId++;
      return { ...item, id: newId };
    }
    return item;
  });
}


// Lucide icons
import {
  LayoutDashboard,
  Coins,
  Users,
  FileSpreadsheet,
  ArrowDownCircle,
  TrendingUp,
  Award,
  BookOpen,
  Database,
  UploadCloud,
  FileText,
  ShieldCheck,
  Settings,
  Search,
  Menu,
  ChevronRight,
  CheckSquare,
} from 'lucide-react';

// Subpages import
import ExecutiveCockpit from './components/pages/ExecutiveCockpit';
import BudgetPage from './components/pages/BudgetPage';
import PersonalkostenPage from './components/pages/PersonalkostenPage';
import RechnungsPage from './components/pages/RechnungsPage';
import MittelabrufePage from './components/pages/MittelabrufePage';
import LiquiditaetsPage from './components/pages/LiquiditaetsPage';
import VergabePage from './components/pages/VergabePage';
import UseCasePage from './components/pages/UseCasePage';
import PartnerPage from './components/pages/PartnerPage';
import AufgabenPage from './components/pages/AufgabenPage';
import ExcelImportPage from './components/pages/ExcelImportPage';
import ReportingPage from './components/pages/ReportingPage';
import AuditLogPage from './components/pages/AuditLogPage';
import SettingsPage from './components/pages/SettingsPage';

export default function App() {
  // Sidebar toggler for mobile responsive
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // States with Lazy Initializations
  const [personal, setPersonal] = useState<PersonalEintrag[]>(() =>
    sanitizeAndDeduplicate(loadFromStorage('midpct_personal', INITIAL_PERSONAL))
  );
  const [rechnungen, setRechnungen] = useState<Rechnungsbeleg[]>(() =>
    sanitizeAndDeduplicate(loadFromStorage('midpct_rechnungen', INITIAL_RECHNUNGEN))
  );
  const [mittelabrufe, setMittelabrufe] = useState<Mittelabruf[]>(() =>
    sanitizeAndDeduplicate(loadFromStorage('midpct_mittelabrufe', INITIAL_MITTELABRUFE))
  );
  const [vergaben, setVergaben] = useState<Vergabe[]>(() =>
    sanitizeAndDeduplicate(loadFromStorage('midpct_vergaben', INITIAL_VERGABEN))
  );
  const [partners, setPartners] = useState<Partner[]>(() =>
    sanitizeAndDeduplicate(loadFromStorage('midpct_partners', INITIAL_PARTNERS))
  );
  const [matches, setMatches] = useState<PartnerMatch[]>(() =>
    loadFromStorage('midpct_matches', INITIAL_MATCHES)
  );
  const [buchungen, setBuchungen] = useState<Buchung[]>(() =>
    sanitizeAndDeduplicate(loadFromStorage('midpct_buchungen', INITIAL_BUCHUNGEN))
  );

  const [tasks, setTasks] = useState<Task[]>(() =>
    sanitizeAndDeduplicate(loadFromStorage('midpct_tasks', INITIAL_TASKS))
  );

  const [mitarbeiterList, setMitarbeiterList] = useState<string[]>(() =>
    loadFromStorage('midpct_mitarbeiter_list', ['von Styp-Rekowski', 'Lena Guth', 'Lea Fischöder'])
  );

  useEffect(() => { saveToStorage('midpct_mitarbeiter_list', mitarbeiterList); }, [mitarbeiterList]);

  // Use Case Notes state (Record<usecaseId, Note[]>)
  const [ucNotes, setUcNotes] = useState<{ [key: number]: any[] }>(() =>
    loadFromStorage('midpct_uc_notes', {})
  );

  // Links of associated invoice IDs directly with Use Case IDs
  const [ucInvoices, setUcInvoices] = useState<{ [key: number]: number[] }>(() =>
    loadFromStorage('midpct_uc_invoices', {})
  );

  // State Audit logs
  const [logs, setLogs] = useState<AuditLog[]>(() =>
    loadFromStorage('midpct_audit_logs', [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        module: 'SYSTEM',
        action: 'INIT',
        details: 'ERP-System mit Seeddaten und AZA-Planstrukturen initialisiert.',
        user: 'System-Core',
      },
    ])
  );

  // Navigations page
  const [activePage, setActivePage] = useState<string>('cockpit');

  // Filter year
  const [activeYear, setActiveYear] = useState<string | null>(null);

  // Global search triggers (Strg+K)
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Drill-down filtering states from Cockpit chart clicks
  const [personalQuarterFilter, setPersonalQuarterFilter] = useState<string>('all');
  const [rechnungenKategorieFilter, setRechnungenKategorieFilter] = useState<string>('all');
  const [mittelabrufeGeberFilter, setMittelabrufeGeberFilter] = useState<string>('all');
  const [aufgabenStatusFilter, setAufgabenStatusFilter] = useState<string>('all');

  // Auto-Persist trigger when states update
  useEffect(() => { saveToStorage('midpct_personal', personal); }, [personal]);
  useEffect(() => { saveToStorage('midpct_rechnungen', rechnungen); }, [rechnungen]);
  useEffect(() => { saveToStorage('midpct_mittelabrufe', mittelabrufe); }, [mittelabrufe]);
  useEffect(() => { saveToStorage('midpct_vergaben', vergaben); }, [vergaben]);
  useEffect(() => { saveToStorage('midpct_partners', partners); }, [partners]);
  useEffect(() => { saveToStorage('midpct_tasks', tasks); }, [tasks]);
  useEffect(() => { saveToStorage('midpct_matches', matches); }, [matches]);
  useEffect(() => { saveToStorage('midpct_buchungen', buchungen); }, [buchungen]);
  useEffect(() => { saveToStorage('midpct_uc_notes', ucNotes); }, [ucNotes]);
  useEffect(() => { saveToStorage('midpct_uc_invoices', ucInvoices); }, [ucInvoices]);
  useEffect(() => { saveToStorage('midpct_audit_logs', logs); }, [logs]);

  // Listener to catch Ctrl+K to popup search overlay, and Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Use Case Seed structures
  const [usecases, setUsecases] = useState<any[]>(() => {
    const loaded = loadFromStorage('midpct_usecases', []);
    const filtered = loaded.filter((uc: any) => {
      if (!uc) return false;
      const batchStr = String(uc.batch || '').replace(/\s+/g, '').toLowerCase();
      if (batchStr === 'batch1' || batchStr.includes('batch1')) {
        return false;
      }
      
      const titleLower = String(uc.titel || '').toLowerCase();
      if (
        titleLower.includes('chemisches recycling von kunststoff') ||
        titleLower.includes('ki-basierter chatbot für den maschinenpark') ||
        titleLower.includes('starke netze — peak-shaving') ||
        titleLower.includes('starke netze - peak-shaving mit ki')
      ) {
        return false;
      }
      
      return true;
    });
    return sanitizeAndDeduplicate(filtered);
  });
  useEffect(() => { saveToStorage('midpct_usecases', usecases); }, [usecases]);

  // Deleted use case titles tracking to prevent auto-sync from re-adding them
  const [deletedUcs, setDeletedUcs] = useState<string[]>(() =>
    loadFromStorage('midpct_deleted_usecases', [])
  );
  useEffect(() => { saveToStorage('midpct_deleted_usecases', deletedUcs); }, [deletedUcs]);

  // Central log writer helper to track revision entries
  const writeLog = (module: string, action: string, details: string) => {
    setLogs((prev) => {
      const newId = prev.length > 0 ? Math.max(...prev.map((l) => l.id)) + 1 : 1;
      const entry: AuditLog = {
        id: newId,
        timestamp: new Date().toISOString(),
        module,
        action,
        details,
        user: 'WIN.DN-Controller',
      };
      return [entry, ...prev];
    });
  };

  // ── APP GLOBAL HANDLERS ──

  // Personal Page Handlers
  const handleAddPersonal = (eintrag: Omit<PersonalEintrag, 'id'>) => {
    setPersonal((prev) => {
      const nextId = prev.length > 0 ? Math.max(...prev.map((x) => x.id)) + 1 : 1;
      const item = { ...eintrag, id: nextId };
      writeLog('PERSONAL', 'CREATE', `Lohnbeleg für ${item.mitarbeiter} (${item.monat}/${item.jahr}) eingepflegt. AG-Kosten: ${item.agKosten} €`);
      return [...prev, item];
    });
  };

  const handleUpdatePersonal = (id: number, updated: Partial<PersonalEintrag>) => {
    setPersonal((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const item = { ...p, ...updated };
          writeLog('PERSONAL', 'UPDATE', `Lohnbeleg ${item.mitarbeiter} (${item.monat}/${item.jahr}) angepasst.`);
          return item;
        }
        return p;
      })
    );
  };

  const handleDeletePersonal = (id: number) => {
    const matched = personal.find((p) => p.id === id);
    setPersonal((prev) => prev.filter((p) => p.id !== id));
    if (matched) {
      writeLog('PERSONAL', 'DELETE', `Lohnbeleg ${matched.mitarbeiter} (${matched.monat}/${matched.jahr}) unwiderruflich gelöscht.`);
    }
  };

  const handleRenameMitarbeiterGlobal = (oldName: string, newName: string) => {
    setPersonal((prev) => prev.map((p) => p.mitarbeiter === oldName ? { ...p, mitarbeiter: newName } : p));
    setMitarbeiterList((prev) => prev.map((m) => m === oldName ? newName : m));
    writeLog('PERSONAL', 'UPDATE', `Mitarbeiter "${oldName}" global in "${newName}" umbenannt.`);
  };

  const handleRenameSingleMitarbeiter = (id: number, newName: string) => {
    setPersonal((prev) => prev.map((p) => p.id === id ? { ...p, mitarbeiter: newName } : p));
    writeLog('PERSONAL', 'UPDATE', `Lohnbeleg ID ${id} auf "${newName}" umgeändert.`);
  };

  // Rechnungen (Expense Invoices) handlers
  const handleAddRechnung = (beleg: Omit<Rechnungsbeleg, 'id'>) => {
    setRechnungen((prev) => {
      const nextId = prev.length > 0 ? Math.max(...prev.map((x) => x.id)) + 1 : 1;
      const item = { ...beleg, id: nextId };
      writeLog('EXPENSES', 'CREATE', `Sachbeleg ${item.rechnungsnummer} von ${item.rechnungssteller} über ${item.betragNetto} € netto eingebucht.`);
      return [...prev, item];
    });
  };

  const handleUpdateRechnung = (id: number, updated: Partial<Rechnungsbeleg>) => {
    setRechnungen((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const item = { ...r, ...updated };
          writeLog('EXPENSES', 'UPDATE', `Sachbeleg ${r.rechnungsnummer} von ${r.rechnungssteller} angepasst.`);
          return item;
        }
        return r;
      })
    );
  };

  const handleDeleteRechnung = (id: number) => {
    const matched = rechnungen.find((r) => r.id === id);
    setRechnungen((prev) => prev.filter((r) => r.id !== id));
    if (matched) {
      writeLog('EXPENSES', 'DELETE', `Sachbeleg ${matched.rechnungsnummer} (${matched.rechnungssteller}) unwiderruflich gelöscht.`);
    }
  };

  // Mittelabrufe Page Handlers
  const handleAddMittelabruf = (abruf: Omit<Mittelabruf, 'id'>) => {
    setMittelabrufe((prev) => {
      const nextId = prev.length > 0 ? Math.max(...prev.map((x) => x.id)) + 1 : 1;
      const item = { ...abruf, id: nextId };
      writeLog('CLAIMS', 'CREATE', `Mittelabruf ${item.abrufnummer} über ${item.beantragt} € beim Mittelgeber beantragt.`);
      return [...prev, item];
    });
  };

  const handleUpdateMittelabrufStatus = (id: number, newStatus: Mittelabruf['status']) => {
    setMittelabrufe((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const item = { ...a, status: newStatus };
          writeLog('CLAIMS', 'UPDATE', `Mittelabruf ${a.abrufnummer} Status auf "${newStatus}" geändert.`);
          return item;
        }
        return a;
      })
    );
  };

  // Manual bookings handlers (Budget tab)
  const handleAddBuchung = (booking: Omit<Buchung, 'id'>) => {
    setBuchungen((prev) => {
      const nextId = prev.length > 0 ? Math.max(...prev.map((x) => x.id)) + 1 : 1;
      const item = { ...booking, id: nextId };
      writeLog('BUDGET', 'CREATE', `Manuelle Buchung "${item.beschreibung}" über ${item.betrag} € verbucht.`);
      return [...prev, item];
    });
  };

  const handleUpdateBuchungStatus = (id: number, newStatus: Buchung['status']) => {
    setBuchungen((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const item = { ...b, status: newStatus };
          writeLog('BUDGET', 'UPDATE', `Buchung "${b.beschreibung}" Status auf "${newStatus}" geändert.`);
          return item;
        }
        return b;
      })
    );
  };

  // Vergaben Procurements Page Handlers
  const handleAddVergabe = (vergabe: Omit<Vergabe, 'id'>) => {
    setVergaben((prev) => {
      const nextId = prev.length > 0 ? Math.max(...prev.map((x) => x.id)) + 1 : 1;
      const item = { ...vergabe, id: nextId };
      writeLog('PROCUREMENT', 'CREATE', `Ausschreibung/Vergabe "${item.titel}" im Status "${item.status}" angelegt.`);
      return [...prev, item];
    });
  };

  const handleUpdateVergabe = (id: number, updated: Partial<Vergabe>) => {
    setVergaben((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          const item = { ...v, ...updated };
          writeLog('PROCUREMENT', 'UPDATE', `Ausschreibungsdetails für "${v.titel}" angepasst.`);
          return item;
        }
        return v;
      })
    );
  };

  const handleDeleteVergabe = (id: number) => {
    const matched = vergaben.find((v) => v.id === id);
    setVergaben((prev) => prev.filter((v) => v.id !== id));
    if (matched) {
      writeLog('PROCUREMENT', 'DELETE', `Ausschreibung "${matched.titel}" gelöscht.`);
    }
  };

  // Use Case Page Handlers
  const handleAddUseCase = (uc: any) => {
    setUsecases((prev) => {
      // Clean up uc.id if it was passed from backend to avoid conflicting ID structures
      const { id: dummyId, ...ucData } = uc;
      const nextId = prev.length > 0 ? Math.max(...prev.map((x) => x.id)) + 1 : 1;
      const item = { ...ucData, id: nextId };
      
      // Use setTimeout to schedule state updates for related states to avoid nested render warnings
      setTimeout(() => {
        setUcNotes((notesPrev) => ({ ...notesPrev, [nextId]: [] }));
        setUcInvoices((invPrev) => ({ ...invPrev, [nextId]: [] }));
      }, 0);

      writeLog('USECASES', 'CREATE', `Neuer Pilot-Use Case "${item.titel}" registriert.`);
      return [...prev, item];
    });
  };

  const handleUpdateUseCase = (id: number, uc: Partial<any>) => {
    setUsecases((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const item = { ...u, ...uc };
          writeLog('USECASES', 'UPDATE', `Pilot-Details "${u.titel}" angepasst.`);
          return item;
        }
        return u;
      })
    );
  };

  const handleDeleteUseCase = (id: number) => {
    const matched = usecases.find((u) => u.id === id);
    if (matched) {
      setDeletedUcs((prev) => {
        const titleLower = matched.titel.toLowerCase();
        if (!prev.includes(titleLower)) {
          return [...prev, titleLower];
        }
        return prev;
      });
      setUsecases((prev) => prev.filter((u) => u.id !== id));
      writeLog('USECASES', 'DELETE', `Pilotusecase "${matched.titel}" gelöscht.`);
    }
  };

  // Timeline Progress Notes triggers (Inside Use Case page details drawer)
  const handleAddUcNote = (ucId: number, note: { text: string; type: string }) => {
    const notesList = ucNotes[ucId] || [];
    const nextId = notesList.length > 0 ? Math.max(...notesList.map((n) => n.id)) + 1 : 101;
    const newNote = {
      id: nextId,
      text: note.text,
      type: note.type,
      date: new Date().toISOString().slice(0, 10),
    };

    setUcNotes((prev) => ({
      ...prev,
      [ucId]: [...notesList, newNote],
    }));

    const matchedUc = usecases.find((u) => u.id === ucId);
    writeLog('USECASES', 'ADD_NOTE', `Timeline Note im Use Case "${matchedUc?.titel}" hinzugefügt.`);
  };

  const handleDeleteUcNote = (ucId: number, noteId: number) => {
    setUcNotes((prev) => ({
      ...prev,
      [ucId]: (prev[ucId] || []).filter((n) => n.id !== noteId),
    }));
    const matchedUc = usecases.find((u) => u.id === ucId);
    writeLog('USECASES', 'DELETE_NOTE', `Timeline Note im Use Case "${matchedUc?.titel}" entfernt.`);
  };

  // Associated expense invoice triggers
  const handleLinkInvoice = (ucId: number, invoiceId: number) => {
    const assignedIds = ucInvoices[ucId] || [];
    if (assignedIds.includes(invoiceId)) return;

    setUcInvoices((prev) => ({
      ...prev,
      [ucId]: [...assignedIds, invoiceId],
    }));

    const matchedUc = usecases.find((u) => u.id === ucId);
    const matchedInv = rechnungen.find((r) => r.id === invoiceId);
    writeLog('USECASES', 'LINK_BELEG', `Rechnung ${matchedInv?.rechnungsnummer} mit Use-Case "${matchedUc?.titel}" verknüpft.`);
  };

  const handleUnlinkInvoice = (ucId: number, invoiceId: number) => {
    setUcInvoices((prev) => ({
      ...prev,
      [ucId]: (prev[ucId] || []).filter((id) => id !== invoiceId),
    }));

    const matchedUc = usecases.find((u) => u.id === ucId);
    const matchedInv = rechnungen.find((r) => r.id === invoiceId);
    writeLog('USECASES', 'UNLINK_BELEG', `Verknüpfung von Rechnung ${matchedInv?.rechnungsnummer} zu Use-Case "${matchedUc?.titel}" aufgehoben.`);
  };

  // ── TASKS & TO-DO HANDLERS ──
  const handleAddTask = (task: Omit<Task, 'id' | 'createdAt'>) => {
    setTasks((prev) => {
      const nextId = prev.length > 0 ? Math.max(...prev.map((x) => x.id)) + 1 : 1;
      const item: Task = {
        ...task,
        id: nextId,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      writeLog('TASKS', 'CREATE', `Neue Aufgabe "${item.title}" angelegt. Fällig: ${item.dueDate || 'Keine Frist'}`);
      return [...prev, item];
    });
  };

  const handleUpdateTask = (id: number, updated: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const item = { ...t, ...updated, updatedAt: new Date().toISOString().slice(0, 10) };
          writeLog('TASKS', 'UPDATE', `Aufgabe "${item.title}" aktualisiert (Status: ${item.status}).`);
          return item;
        }
        return t;
      })
    );
  };

  const handleDeleteTask = (id: number) => {
    const matched = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (matched) {
      writeLog('TASKS', 'DELETE', `Aufgabe "${matched.title}" gelöscht.`);
    }
  };

  // Partner Database Handlers
  const handleAddPartner = (partner: Omit<Partner, 'id'>) => {
    setPartners((prev) => {
      const nextId = prev.length > 0 ? Math.max(...prev.map((x) => x.id)) + 1 : 1;
      const item = { ...partner, id: nextId };
      writeLog('PARTNER', 'CREATE', `Neuer Partner "${item.name}" (${item.typ}) eingetragen.`);
      return [...prev, item];
    });
  };

  const handleUpdatePartner = (id: number, updated: Partial<Partner>) => {
    setPartners((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const item = { ...p, ...updated };
          writeLog('PARTNER', 'UPDATE', `Partnerdetails für "${p.name}" angepasst.`);
          return item;
        }
        return p;
      })
    );
  };

  const handleDeletePartner = (id: number) => {
    const matched = partners.find((p) => p.id === id);
    setPartners((prev) => prev.filter((p) => p.id !== id));
    if (matched) {
      writeLog('PARTNER', 'DELETE', `Partner "${matched.name}" gelöscht.`);
    }
  };

  // Toggle strategic ecosystem partnerships
  const handleToggleMatch = (industryId: number, providerId: number, type: PartnerMatch['type']) => {
    // Check if match already exists
    const existingIndex = matches.findIndex((x) => x.industryId === industryId && x.providerId === providerId);
    if (existingIndex > -1) {
      if (type === 'NONE') {
        setMatches((prev) => prev.filter((_, idx) => idx !== existingIndex));
      } else {
        setMatches((prev) =>
          prev.map((m, idx) => (idx === existingIndex ? { ...m, type } : m))
        );
      }
    } else if (type !== 'NONE') {
      const newId = matches.length > 0 ? Math.max(...matches.map((x) => x.id)) + 1 : 1;
      setMatches((prev) => [...prev, { id: newId, industryId, providerId, type }]);
    }

    const indPartner = partners.find((p) => p.id === industryId);
    const provPartner = partners.find((p) => p.id === providerId);
    writeLog('MATCHMAKING', 'TOGGLE', `Beziehung zwischen "${indPartner?.name}" und "${provPartner?.name}" auf "${type}" gesetzt.`);
  };

  // Excel Upload Import Merges
  const handleImportPersonal = (data: any[]) => {
    data.forEach((row) => {
      const agKosten = row.arbeitgeberKosten || row.agKosten || 0;
      handleAddPersonal({
        jahr: row.jahr || 2026,
        monat: row.monat || 6,
        mitarbeiter: row.employeeName || (row.vorname && row.nachname ? `${row.vorname} ${row.nachname}` : 'Mitarbeiter'),
        agKosten,
        sachkosten: 0,
        foerderfaehig: agKosten,
        bafaAnteil: agKosten * 0.9,
        lhoAnteil: agKosten * 0.075,
        eigenaufwand: agKosten * 0.025,
        foerderjahr: row.foerderjahr || row.jahr || 2026,
        quartal: row.quartal || 2,
        status: 'ENTWURF',
        bemerkung: row.position || 'Stelle',
      });
    });
  };

  const handleImportRechnungen = (data: any[]) => {
    data.forEach((row) => {
      const betragNetto = row.betragNetto || 0;
      handleAddRechnung({
        rechnungsnummer: row.rechnungsnummer || 'RE-IMPORT',
        rechnungsdatum: row.rechnungsdatum || new Date().toISOString().slice(0, 10),
        rechnungssteller: row.rechnungssteller || 'Lieferant',
        leistungsbeschreibung: row.leistungsbeschreibung || 'Importierter Beleg',
        zahlungsdatum: row.zahlungsdatum || null,
        kostenkategorie: row.kostenkategorie || 'Sonstige Sachkosten',
        foerderjahr: row.foerderjahr || 2025,
        quartal: row.quartal || 4,
        arbeitspaket: row.arbeitspaket || 'AP2',
        betragNetto,
        betragBrutto: betragNetto * 1.19, // simulate brutto with 19%
        foerderfaehig: row.foerderfaehig === undefined ? true : row.foerderfaehig,
        status: 'ENTWURF',
      });
    });
  };

  const handleImportMittelabrufe = (data: any[]) => {
    data.forEach((row) => {
      handleAddMittelabruf({
        abrufnummer: row.abrufnummer || 'AB-IMPORT',
        zeitraumVon: row.zeitraumVon || '2025-04-01',
        zeitraumBis: row.zeitraumBis || '2025-06-30',
        mittelgeber: 'BAFA_BUND',
        foerderjahr: 2025,
        quartal: 2,
        beantragt: row.beantragt || 0,
        eingegangen: row.eingegangen || 0,
        differenz: (row.beantragt || 0) - (row.eingegangen || 0),
        status: 'ENTWURF',
      });
    });
  };

  const handleImportVergaben = (data: any[]) => {
    data.forEach((row) => {
      handleAddVergabe({
        titel: row.titel || 'Importiertes Verfahren',
        auftragnehmer: row.auftragnehmer || '',
        vergabeart: 'freihändige Vergabe',
        auftragswert: row.auftragswert || 0,
        ausschreibungsDatum: null,
        abgabeFrist: null,
        zuschlagsDatum: null,
        vertragsende: null,
        status: row.status || 'Vorbereitung',
        bafaFreigabe: false,
        notizen: '',
        arbeitspaket: 'AP2 – Technologietransfer',
      });
    });
  };

  const handleImportPartners = (data: any[]) => {
    data.forEach((row) => {
      // Validate or fall back types & statuses
      let finalTyp = row.typ || 'Startup / Lösungspartner';
      if (!['Startup / Lösungspartner', 'Industrieunternehmen', 'Kooperationspartner', 'Dienstleister'].includes(finalTyp)) {
        finalTyp = 'Startup / Lösungspartner';
      }

      let finalStatus = row.status || 'in Kontakt';
      if (!['in Kontakt', 'aktiv', 'Pilot läuft', 'abgeschlossen', 'abgelehnt'].includes(finalStatus)) {
        finalStatus = 'in Kontakt';
      }

      handleAddPartner({
        name: row.name || 'Importierter Partner',
        typ: finalTyp,
        branche: row.branche || 'Übergreifend',
        status: finalStatus,
        rolle: row.rolle || '',
        useCase: row.useCase || '',
        ap: row.ap || '',
        funktion: row.funktion || '',
        email: row.email || '',
        tel: row.tel || '',
        web: row.web || '',
        ort: row.ort || '',
        bewertung: typeof row.bewertung === 'number' ? row.bewertung : (parseInt(row.bewertung) || 3),
        gruendung: row.gruendung || '',
        tech: row.tech || '',
        beschr: row.beschr || '',
        notizen: row.notizen || '',
        datum: row.datum || new Date().toISOString().slice(0, 10),
        sharepoint: row.sharepoint || '',
      });
    });
  };

  // Systems settings snapshots save/loads
  const handleResetDatabase = () => {
    // Clear Storage item keys
    localStorage.removeItem('midpct_personal');
    localStorage.removeItem('midpct_rechnungen');
    localStorage.removeItem('midpct_mittelabrufe');
    localStorage.removeItem('midpct_vergaben');
    localStorage.removeItem('midpct_partners');
    localStorage.removeItem('midpct_matches');
    localStorage.removeItem('midpct_buchungen');
    localStorage.removeItem('midpct_uc_notes');
    localStorage.removeItem('midpct_uc_invoices');
    localStorage.removeItem('midpct_usecases');
    localStorage.removeItem('midpct_deleted_usecases');
    localStorage.removeItem('midpct_audit_logs');

    // Hard refresh data values
    setPersonal(INITIAL_PERSONAL);
    setRechnungen(INITIAL_RECHNUNGEN);
    setMittelabrufe(INITIAL_MITTELABRUFE);
    setVergaben(INITIAL_VERGABEN);
    setPartners(INITIAL_PARTNERS);
    setMatches(INITIAL_MATCHES);
    setUsecases([]);
    setDeletedUcs([]);
    setUcNotes({});
    setUcInvoices({});

    setLogs([
      {
        id: 1,
        timestamp: new Date().toISOString(),
        module: 'SYSTEM',
        action: 'RESET',
        details: 'Datenbank vollständig zurückgesetzt und Werkseinstellungen re-initialisiert.',
        user: 'System-Controller',
      },
    ]);
  };

  const exportDatabaseSnapshot = () => {
    return {
      personal,
      rechnungen,
      mittelabrufe,
      vergaben,
      partners,
      matches,
      buchungen,
      ucNotes,
      ucInvoices,
      usecases,
    };
  };

  const onLoadJSONSnapshot = (snap: any) => {
    if (snap.personal) setPersonal(snap.personal);
    if (snap.rechnungen) setRechnungen(snap.rechnungen);
    if (snap.mittelabrufe) setMittelabrufe(snap.mittelabrufe);
    if (snap.vergaben) setVergaben(snap.vergaben);
    if (snap.partners) setPartners(snap.partners);
    if (snap.matches) setMatches(snap.matches);
    if (snap.buchungen) setBuchungen(snap.buchungen);
    if (snap.ucNotes) setUcNotes(snap.ucNotes);
    if (snap.ucInvoices) setUcInvoices(snap.ucInvoices);
    if (snap.usecases) setUsecases(snap.usecases);

    writeLog('SYSTEM', 'SNAPSHOT_LOAD', 'Datenbanksnapshot erfolgreich eingespielt.');
  };

  // Global search matching across collections (Strg+K)
  const getSearchResults = () => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];

    const results: { text: string; page: string; category: string }[] = [];

    // Search invoices
    rechnungen.forEach((r) => {
      const rechnungsnummer = r.rechnungsnummer || '';
      const rechnungssteller = r.rechnungssteller || '';
      const kostenkategorie = r.kostenkategorie || '';
      const beschreibung = r.leistungsbeschreibung || '';

      if (
        rechnungsnummer.toLowerCase().includes(q) ||
        rechnungssteller.toLowerCase().includes(q) ||
        kostenkategorie.toLowerCase().includes(q) ||
        beschreibung.toLowerCase().includes(q)
      ) {
        results.push({
          text: `Rechnung #${rechnungsnummer} von ${rechnungssteller} (${kostenkategorie})`,
          page: 'rechnungen',
          category: 'Rechnungsbelege',
        });
      }
    });

    // Search personal
    personal.forEach((p) => {
      const mitarbeiter = p.mitarbeiter || '';
      const bemerkung = p.bemerkung || '';
      if (
        mitarbeiter.toLowerCase().includes(q) ||
        bemerkung.toLowerCase().includes(q)
      ) {
        results.push({
          text: `Mitarbeiter-Eintrag: ${mitarbeiter} (Jahr ${p.foerderjahr || ''}, Q${p.quartal || ''})`,
          page: 'personal',
          category: 'Personalbelege',
        });
      }
    });

    // Search vergabe
    vergaben.forEach((v) => {
      const titel = v.titel || '';
      const auftragnehmer = v.auftragnehmer || '';
      const vergabeart = v.vergabeart || '';
      const notizen = v.notizen || '';

      if (
        titel.toLowerCase().includes(q) ||
        auftragnehmer.toLowerCase().includes(q) ||
        vergabeart.toLowerCase().includes(q) ||
        notizen.toLowerCase().includes(q)
      ) {
        results.push({
          text: `Ausschreibung: ${titel} (Bieter: ${auftragnehmer || 'keiner'})`,
          page: 'vergaben',
          category: 'Ausschreibungen/Vergabe',
        });
      }
    });

    // Search usecases
    usecases.forEach((u) => {
      const titel = u.titel || '';
      const unternehmen = u.unternehmen || '';
      const ansprechpartner = u.ansprechpartner || '';
      const branche = u.branche || '';
      const notizen = u.notizen || '';

      if (
        titel.toLowerCase().includes(q) ||
        unternehmen.toLowerCase().includes(q) ||
        ansprechpartner.toLowerCase().includes(q) ||
        branche.toLowerCase().includes(q) ||
        notizen.toLowerCase().includes(q)
      ) {
        results.push({
          text: `Use-Case: ${titel} (${unternehmen})`,
          page: 'usecase',
          category: 'Transformationspiloten',
        });
      }
    });

    return results.slice(0, 8); // limit to 8 results max
  };

  const results = getSearchResults();

  // Selected global year label readable helper
  const activeYearLabel =
    activeYear === null ? 'Alle Förderjahre' :
    activeYear === 'gesamt25' ? 'Förderjahr 2025 (Ab April)' :
    activeYear === 'mrz29' ? 'Förderjahr 2029 (Bis März)' :
    `Förderjahr ${activeYear}`;

  return (
    <div className="min-h-screen bg-zinc-50 flex font-sans text-zinc-800 antialiased selection:bg-zs-signal-gelb/40 selection:text-zs-blau-schwarz">
      
      {/* Sidebar background backdrop overlay for mobile/tablet */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#041422]/70 backdrop-blur-xs z-20 xl:hidden transition-opacity duration-300 cursor-pointer"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR NAVIGATION ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#041422] text-zinc-300 border-r border-[#1b2f42] flex flex-col justify-between transform transition-transform duration-300 xl:translate-x-0 xl:static xl:h-screen ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden scrollbar-thin">
          {/* Logo and branding */}
          <div className="p-6">
            <div className="text-zs-signal-gelb font-bold text-xl tracking-tighter">ZUKUNFTSSTOFF</div>
            <div className="text-[10px] uppercase tracking-widest text-[#58B49D] font-bold opacity-80">Made in Düren • MiD-PCT</div>
          </div>

          {/* Quick-Access Search Trigger (Design Layout) */}
          <div className="px-4 mb-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full relative bg-white/10 hover:bg-white/15 transition-all text-left rounded border border-white/20 p-2.5 flex items-center justify-between cursor-pointer"
            >
              <div className="text-xs text-white/50 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-white/40" />
                Suche (Strg+K)
              </div>
              <div className="text-[10px] bg-white/20 text-white/75 px-1 rounded font-mono">⌘K</div>
            </button>
          </div>

          <div className="py-2 px-1 flex-1">
            <span className="px-5 py-2 block text-[10px] font-mono tracking-widest text-[#58B49D] font-bold uppercase">
              Prozess-Module
            </span>
            <nav className="space-y-0.5">
              {[
                { key: 'cockpit', label: 'Executive Cockpit', icon: LayoutDashboard },
                { key: 'budget', label: 'Budget & AZA-Plan', icon: Coins },
                { key: 'personal', label: 'Personalkosten F0824', icon: Users },
                { key: 'rechnungen', label: 'Sachbelege F0835', icon: FileSpreadsheet },
                { key: 'mittelabrufe', label: 'Mittelabrufe Claims', icon: ArrowDownCircle },
                { key: 'liqui', label: 'Liquiditätsüberwachung', icon: TrendingUp },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = activePage === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActivePage(item.key);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      isSelected
                        ? 'bg-zs-signal-gelb text-zs-blau-schwarz font-extrabold shadow-sm'
                        : 'text-zinc-450 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <span className="px-5 py-2 mt-4 block text-[10px] font-mono tracking-widest text-[#BA8B68] font-bold uppercase">
              Ecosystem &amp; Netzwerk
            </span>
            <nav className="space-y-0.5">
              {[
                { key: 'vergaben', label: 'Vergabevorgänge', icon: Award },
                { key: 'usecase', label: 'Use-Case Management', icon: BookOpen },
                { key: 'partner', label: 'Partner Datenbank', icon: Database },
                { key: 'aufgaben', label: 'Aufgaben & To-Dos', icon: CheckSquare },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = activePage === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActivePage(item.key);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      isSelected
                        ? 'bg-zs-signal-gelb text-zs-blau-schwarz font-extrabold shadow-sm'
                        : 'text-zinc-450 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <span className="px-5 py-2 mt-4 block text-[10px] font-mono tracking-widest text-zinc-500 font-bold uppercase">
              Werkzeuge &amp; Audit
            </span>
            <nav className="space-y-0.5">
              {[
                { key: 'import', label: 'Excel/CSV Importer', icon: UploadCloud },
                { key: 'report', label: 'Berichte &amp; Exporte', icon: FileText },
                { key: 'audit', label: 'Revisions-Änderungslog', icon: ShieldCheck },
                { key: 'settings', label: 'Systemeinstellungen', icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = activePage === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActivePage(item.key);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      isSelected
                        ? 'bg-zs-signal-gelb text-zs-blau-schwarz font-extrabold shadow-sm'
                        : 'text-zinc-450 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span dangerouslySetInnerHTML={{ __html: item.label }} />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* DYNAMIC FORDERJAHR BUTTON GRID */}
          <div className="p-4 border-t border-white/10 bg-[#020d18]/40">
            <div className="text-[10px] uppercase font-bold text-white/40 mb-2 px-1 tracking-wider">Förderjahr</div>
            <div className="grid grid-cols-3 gap-1 font-mono text-[9px]">
              {[
                { val: 'gesamt25', label: '2025' },
                { val: '2026', label: '2026' },
                { val: '2027', label: '2027' },
                { val: '2028', label: '2028' },
                { val: 'mrz29', label: '2029' },
                { val: null, label: 'Alle' },
              ].map((yr) => {
                const isSelected = activeYear === yr.val;
                return (
                  <button
                    key={yr.label}
                    onClick={() => setActiveYear(yr.val)}
                    className={`py-1 rounded text-center cursor-pointer transition-all font-bold ${
                      isSelected
                        ? 'bg-zs-signal-gelb text-zs-blau-schwarz'
                        : 'bg-white/10 hover:bg-white/20 text-white/80'
                    }`}
                  >
                    {yr.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#112435] bg-[#020d18]/45 text-[10px] font-mono text-zinc-500 leading-snug">
          <div>ERP Stand: Mai 2026</div>
          <div className="text-[9px] text-[#58B49D] font-bold mt-1">WIN.DN GmbH &middot; Düren</div>
        </div>
      </aside>

      {/* Main viewport area */}
      <div className="flex-grow flex flex-col min-h-screen lg:h-screen overflow-hidden">
        
        {/* ── CENTRAL SUB-HEADER CONTROLS ── */}
        <header className="bg-white border-b border-zinc-200/90 h-16 px-6 flex items-center justify-between z-10 print:hidden shrink-0">
          <div className="flex items-center gap-4">
            {/* Hamburger trigger for small monitors */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="xl:hidden p-1.5 border border-zinc-200 hover:bg-zinc-100 rounded-lg text-zinc-650 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Year select filters dropdown */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase hidden sm:inline">Active Scope:</span>
              <select
                value={activeYear || ''}
                onChange={(e) => setActiveYear(e.target.value === '' ? null : e.target.value)}
                className="text-xs bg-zinc-50 border border-zinc-300 rounded-full px-3.5 py-1.5 cursor-pointer font-bold text-zs-blau-schwarz outline-none hover:border-zinc-400 transition-all font-mono"
              >
                <option value="">Alle Förderjahre (2025-2029)</option>
                <option value="gesamt25">2025 (Ab April-Dez)</option>
                <option value="2026">Förderjahr 2026</option>
                <option value="2027">Förderjahr 2027</option>
                <option value="2028">Förderjahr 2028</option>
                <option value="mrz29">2029 (Bis März-Ende)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Global search launcher widget (Strg+K) */}
            <button
              onClick={() => setSearchOpen(true)}
              className="px-4 py-2 text-xs border border-zinc-200 rounded-full bg-zinc-50 text-zinc-400 select-none cursor-pointer flex items-center gap-3.5 hover:border-zinc-300 transition-all font-mono"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Strg+K suchen...</span>
            </button>
            
            <div className="w-px h-6 bg-zinc-200" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#58B49D] animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-wider text-zs-blau-schwarz uppercase">DIN-CONNECTED</span>
            </div>
          </div>
        </header>

        {/* ── CORE VIEW PAGES INJECTOR ── */}
        <main className="flex-grow p-6 overflow-y-auto scrollbar-thin bg-zinc-50/50 print:p-0">
          <div className={`${activePage === 'cockpit' ? 'max-w-full px-2 lg:px-6' : 'max-w-7xl'} mx-auto pb-12 print:pb-0`}>
            {activePage === 'cockpit' && (
              <ExecutiveCockpit
                personal={personal}
                rechnungen={rechnungen}
                mittelabrufe={mittelabrufe}
                usecases={usecases}
                vergaben={vergaben}
                activeYear={activeYear}
                activeYearLabel={activeYearLabel}
                tasks={tasks}
                onUpdateTask={handleUpdateTask}
                onNavigateDetail={(page, filters) => {
                  if (filters.personalQuarter !== undefined) {
                    setPersonalQuarterFilter(filters.personalQuarter);
                  }
                  if (filters.rechnungenKategorie !== undefined) {
                    setRechnungenKategorieFilter(filters.rechnungenKategorie);
                  }
                  if (filters.mittelabrufeGeber !== undefined) {
                    setMittelabrufeGeberFilter(filters.mittelabrufeGeber);
                  }
                  if (filters.aufgabenStatus !== undefined) {
                    setAufgabenStatusFilter(filters.aufgabenStatus);
                  }
                  setActivePage(page);
                }}
              />
            )}
            {activePage === 'budget' && (
              <BudgetPage
                personal={personal}
                rechnungen={rechnungen}
                mittelabrufe={mittelabrufe}
                buchungen={buchungen}
                activeYear={activeYear}
                activeYearLabel={activeYearLabel}
                onSetGlobalYear={setActiveYear}
                onAddBuchung={handleAddBuchung}
                onUpdateBuchungStatus={handleUpdateBuchungStatus}
              />
            )}
            {activePage === 'personal' && (
              <PersonalkostenPage
                personal={personal}
                mitarbeiterList={mitarbeiterList}
                activeYear={activeYear}
                activeYearLabel={activeYearLabel}
                onAddEintrag={handleAddPersonal}
                onUpdateEintragStatus={(id, newStatus) => handleUpdatePersonal(id, { status: newStatus })}
                onUpdateMitarbeiterList={setMitarbeiterList}
                onRenameMitarbeiterGlobal={handleRenameMitarbeiterGlobal}
                onRenameSingleMitarbeiter={handleRenameSingleMitarbeiter}
                initialQuarter={personalQuarterFilter}
                onQuarterChange={setPersonalQuarterFilter}
              />
            )}
            {activePage === 'rechnungen' && (
              <RechnungsPage
                rechnungen={rechnungen}
                activeYear={activeYear}
                activeYearLabel={activeYearLabel}
                onAddRechnung={handleAddRechnung}
                onUpdateRechnungStatus={(id, newStatus) => handleUpdateRechnung(id, { status: newStatus })}
                initialCategory={rechnungenKategorieFilter}
                onCategoryChange={setRechnungenKategorieFilter}
              />
            )}
            {activePage === 'mittelabrufe' && (
              <MittelabrufePage
                mittelabrufe={mittelabrufe}
                activeYear={activeYear}
                activeYearLabel={activeYearLabel}
                onAddMittelabruf={handleAddMittelabruf}
                onUpdateMittelabrufStatus={handleUpdateMittelabrufStatus}
                initialGeber={mittelabrufeGeberFilter}
                onGeberChange={setMittelabrufeGeberFilter}
              />
            )}
            {activePage === 'liqui' && (
              <LiquiditaetsPage
                personal={personal}
                rechnungen={rechnungen}
                mittelabrufe={mittelabrufe}
                buchungen={buchungen}
                activeYear={activeYear}
                activeYearLabel={activeYearLabel}
              />
            )}
            {activePage === 'vergaben' && (
              <VergabePage
                vergaben={vergaben}
                activeYear={activeYear}
                activeYearLabel={activeYearLabel}
                onAddVergabe={handleAddVergabe}
                onUpdateVergabe={handleUpdateVergabe}
                onDeleteVergabe={handleDeleteVergabe}
                tasks={tasks}
                onUpdateTask={handleUpdateTask}
              />
            )}
            {activePage === 'usecase' && (
              <UseCasePage
                usecases={usecases}
                deletedUcs={deletedUcs}
                rechnungen={rechnungen}
                activeYear={activeYear}
                activeYearLabel={activeYearLabel}
                onAddUseCase={handleAddUseCase}
                onUpdateUseCase={handleUpdateUseCase}
                onDeleteUseCase={handleDeleteUseCase}
                ucNotes={ucNotes}
                onAddUcNote={handleAddUcNote}
                onDeleteUcNote={handleDeleteUcNote}
                ucInvoices={ucInvoices}
                onLinkInvoice={handleLinkInvoice}
                onUnlinkInvoice={handleUnlinkInvoice}
                tasks={tasks}
                onUpdateTask={handleUpdateTask}
              />
            )}
            {activePage === 'partner' && (
              <PartnerPage
                partners={partners}
                matches={matches}
                onAddPartner={handleAddPartner}
                onUpdatePartner={handleUpdatePartner}
                onDeletePartner={handleDeletePartner}
                onToggleMatch={handleToggleMatch}
              />
            )}
            {activePage === 'aufgaben' && (
              <AufgabenPage
                tasks={tasks}
                usecases={usecases}
                vergaben={vergaben}
                rechnungen={rechnungen}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                initialStatus={aufgabenStatusFilter}
                onStatusChange={setAufgabenStatusFilter}
              />
            )}
            {activePage === 'import' && (
              <ExcelImportPage
                onImportPersonal={handleImportPersonal}
                onImportRechnungen={handleImportRechnungen}
                onImportMittelabrufe={handleImportMittelabrufe}
                onImportVergaben={handleImportVergaben}
                onImportPartners={handleImportPartners}
              />
            )}
            {activePage === 'report' && (
              <ReportingPage
                personal={personal}
                rechnungen={rechnungen}
                mittelabrufe={mittelabrufe}
                vergaben={vergaben}
                activeYear={activeYear}
                activeYearLabel={activeYearLabel}
              />
            )}
            {activePage === 'audit' && (
              <AuditLogPage logs={logs} />
            )}
            {activePage === 'settings' && (
              <SettingsPage
                onResetDatabase={handleResetDatabase}
                onLoadJSONSnapshot={onLoadJSONSnapshot}
                exportDatabaseSnapshot={exportDatabaseSnapshot}
              />
            )}
          </div>
        </main>
      </div>

      {/* ── MODAL: GLOBAL SEARCH MODAL (Ctrl+K overlay) ── */}
      {searchOpen && (
        <div className="fixed inset-0 bg-[#041422]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setSearchOpen(false)}>
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input bar */}
            <div className="p-4 border-b border-zinc-150 flex items-center gap-3">
              <Search className="w-5 h-5 text-zinc-400" />
              <input
                type="text"
                autoFocus
                placeholder="Typ zu suchen... (Abrufnummer, Name, Creditor)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-sans outline-none text-zinc-800"
              />
              <kbd className="px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 font-mono text-[9px] text-[#041422] font-semibold">ESC</kbd>
            </div>

            {/* Live Search listings */}
            <div className="p-2 max-h-72 overflow-y-auto pr-1">
              {searchQuery.trim() === '' ? (
                <div className="py-8 text-center text-xs text-zinc-400 font-mono">
                  Geben Sie ein Suchwort ein, um ERP-Sammlungen nachzuschlagen.
                </div>
              ) : results.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400 font-mono">
                  Keine Übereinstimmungen gefunden.
                </div>
              ) : (
                <div className="space-y-0.5">
                  {results.map((res, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setActivePage(res.page);
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="flex justify-between items-center p-2.5 rounded-lg hover:bg-zs-signal-gelb/25 cursor-pointer text-xs transition-all border border-transparent hover:border-zinc-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-bold bg-[#041422]/10 px-2 py-0.5 rounded text-zs-blau-schwarz text-left">
                          {res.category}
                        </span>
                        <span className="text-zinc-700 font-medium truncate max-w-[280px]">{res.text}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-zinc-150 bg-zinc-50/50 flex justify-between text-[9px] font-mono text-zinc-400">
              <span>Navigieren Sie per Mausklick</span>
              <span>Made in Düren &bull; WIN.DN</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
