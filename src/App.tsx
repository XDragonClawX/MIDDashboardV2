import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  UseCase,
  Zahlungsanforderung,
  OekoprofitCheckup,
  ProfiPositionCode,
  SystemSettings,
  MitarbeiterStamm,
  AchievementUnlock,
} from './types';
import {
  SEED_PERSONAL as INITIAL_PERSONAL,
  SEED_RECHNUNGEN as INITIAL_RECHNUNGEN,
  SEED_MITTELABRUFE as INITIAL_MITTELABRUFE,
  SEED_VERGABEN as INITIAL_VERGABEN,
  SEED_PARTNER as INITIAL_PARTNERS,
  SEED_TASKS as INITIAL_TASKS,
  SEED_USECASES as INITIAL_USECASES,
  SEED_ZAHLUNGSANFORDERUNGEN as INITIAL_ZAS,
  SEED_OEKOPROFIT_CHECKUPS as INITIAL_OEKOPROFIT,
  SEED_MITARBEITER_STAMM as INITIAL_MITARBEITER_STAMM,
  DEFAULT_SETTINGS,
  AZA_VERSION_META,
} from './data';
import {
  loadLocalStorage as loadFromStorage,
  saveLocalStorage as saveToStorage,
  roundEuro,
  addEuro,
  subEuro,
  mulPercent,
  normalizeProfiAmounts,
  PROFI_STARK_FKZ,
  STORAGE_KEYS,
  GOBD_GENESIS_HASH,
  computeAuditEntryHash,
  ensureAuditLogChain,
  verifyAuditChain,
  getFoerderfaehigerRechnungsBetrag,
  computeComplianceShield,
  recordBackupTimestamp,
  evaluateProjectAchievements,
  getBackupMonths,
  BACKUP_RECORDED_EVENT,
  TIER_LABEL,
} from './utils';
import {
  computeComplianceStreaks,
  mergeAchievementUnlocks,
  applyPersistedUnlocks,
  sanitizeUnlocks,
  unlockKey,
} from './gamification';
import AchievementToastStack, { AchievementToastItem } from './components/AchievementToast';

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
  ShieldAlert,
  Shield,
  Settings,
  Search,
  Menu,
  ChevronRight,
  CheckSquare,
  Calculator,
  Plus,
  Eye,
  EyeOff,
  Presentation,
  Gamepad2,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';

// Subpages import
import ExecutiveCockpit, { CockpitDrilldownFilters } from './components/pages/ExecutiveCockpit';
import BudgetPage, { BudgetFocus, BudgetTab } from './components/pages/BudgetPage';
import PersonalkostenPage from './components/pages/PersonalkostenPage';
import RechnungsPage from './components/pages/RechnungsPage';
import MittelabrufePage, { AbrufStatusFilter, MittelabrufeSubTab } from './components/pages/MittelabrufePage';
import LiquiditaetsPage from './components/pages/LiquiditaetsPage';
import VergabePage from './components/pages/VergabePage';
import UseCasePage from './components/pages/UseCasePage';
import PartnerPage from './components/pages/PartnerPage';
import AufgabenPage from './components/pages/AufgabenPage';
import ExcelImportPage from './components/pages/ExcelImportPage';
import ReportingPage from './components/pages/ReportingPage';
import AuditLogPage from './components/pages/AuditLogPage';
import SettingsPage from './components/pages/SettingsPage';
import TVoDRechnerPage from './components/pages/TVoDRechnerPage';

declare global {
  interface Window {
    __MIDPCT_INITIAL_STATE__?: Record<string, any>;
  }
}

const INITIAL_MATCHES: PartnerMatch[] = [];
const INITIAL_BUCHUNGEN: Buchung[] = [];

function getOfflineInjectedState(): Record<string, any> | null {
  if (typeof window !== 'undefined' && window.__MIDPCT_INITIAL_STATE__) {
    return window.__MIDPCT_INITIAL_STATE__;
  }
  return null;
}

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

  let nextId = verifiedList.length > 0 ? Math.max(...verifiedList.map((x) => x.id)) + 1 : 1;
  if (nextId < 1 || isNaN(nextId)) nextId = 1;

  return verifiedList.map((item) => {
    if (item.id === -1) {
      const newId = nextId++;
      return { ...item, id: newId };
    }
    return item;
  });
}

function upgradeAndNormalizeZas(rawZas: Zahlungsanforderung[]): Zahlungsanforderung[] {
  const baseList = Array.isArray(rawZas) && rawZas.length > 0 ? rawZas : INITIAL_ZAS;

  // Upgrade historical 2026 ZAs if stored version had incomplete 0-euro placeholders (!belegVollstaendig)
  const upgraded = baseList.map((z) => {
    const seedMatch = INITIAL_ZAS.find(
      (s) =>
        s.datum.trim() === String(z?.datum || '').trim() ||
        s.bezeichnung.toLowerCase().trim() === String(z?.bezeichnung || '').toLowerCase().trim()
    );
    if (seedMatch && !z.belegVollstaendig) {
      return {
        ...seedMatch,
        id: z.id || seedMatch.id,
      };
    }
    return {
      ...z,
      istJePosition: normalizeProfiAmounts(z.istJePosition),
      vorschauJePosition: normalizeProfiAmounts(z.vorschauJePosition),
    };
  });

  const existingKeys = new Set(
    upgraded.map((z) => `${String(z?.datum || '').trim()}::${String(z?.bezeichnung || '').toLowerCase().trim()}`)
  );
  const missing = INITIAL_ZAS.filter(
    (seed) =>
      !existingKeys.has(`${seed.datum.trim()}::${seed.bezeichnung.toLowerCase().trim()}`) &&
      !upgraded.some((u) => u.datum === seed.datum)
  );

  return sanitizeAndDeduplicate([...upgraded, ...missing], INITIAL_ZAS).map((z) => ({
    ...z,
    istJePosition: normalizeProfiAmounts(z.istJePosition),
    vorschauJePosition: normalizeProfiAmounts(z.vorschauJePosition),
  }));
}

function normalizePersonalList(raw: PersonalEintrag[]): PersonalEintrag[] {
  const loaded = sanitizeAndDeduplicate(raw, INITIAL_PERSONAL);
  return loaded.map((p) => {
    const ff = p.foerderfaehig || addEuro(p.agKosten || 0, p.sachkosten || 0);
    const bafa = mulPercent(ff, 90);
    const eigen = subEuro(ff, bafa);
    return {
      ...p,
      foerderfaehig: ff,
      bafaAnteil: bafa,
      lhoAnteil: 0,
      eigenaufwand: eigen,
    };
  });
}

function normalizeRechnungenList(raw: Rechnungsbeleg[]): Rechnungsbeleg[] {
  const loaded = sanitizeAndDeduplicate(raw, INITIAL_RECHNUNGEN);
  return loaded.map((r) => ({
    ...r,
    mwstSatz:
      r.mwstSatz !== undefined
        ? r.mwstSatz
        : r.betragBrutto > (r.betragNetto || 0) + 0.01
        ? 19
        : 'brutto',
  }));
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const injected = getOfflineInjectedState();

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const raw = injected?.settings || loadFromStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...raw };
  });

  const [mitarbeiterStamm, setMitarbeiterStamm] = useState<MitarbeiterStamm[]>(() => {
    const loaded = injected?.mitarbeiterStamm || loadFromStorage<MitarbeiterStamm[]>(STORAGE_KEYS.mitarbeiterStamm, INITIAL_MITARBEITER_STAMM);
    const existingNames = new Set((loaded || []).map((m: MitarbeiterStamm) => String(m.name || '').toLowerCase().trim()));
    const missing = INITIAL_MITARBEITER_STAMM.filter((s) => !existingNames.has(s.name.toLowerCase().trim()));
    return sanitizeAndDeduplicate([...(loaded || []), ...missing], INITIAL_MITARBEITER_STAMM);
  });

  const [personal, setPersonal] = useState<PersonalEintrag[]>(() =>
    normalizePersonalList(injected?.personal || loadFromStorage('midpct_personal', INITIAL_PERSONAL))
  );

  const [rechnungen, setRechnungen] = useState<Rechnungsbeleg[]>(() =>
    normalizeRechnungenList(injected?.rechnungen || loadFromStorage('midpct_rechnungen', INITIAL_RECHNUNGEN))
  );

  const [mittelabrufe, setMittelabrufe] = useState<Mittelabruf[]>(() => {
    const loaded = injected?.mittelabrufe || loadFromStorage<Mittelabruf[]>('midpct_mittelabrufe', INITIAL_MITTELABRUFE);
    const bafaOnly = (loaded || []).filter((m: Mittelabruf) => m.mittelgeber !== 'LHO_LAND');
    return sanitizeAndDeduplicate(bafaOnly, INITIAL_MITTELABRUFE);
  });

  const [zas, setZas] = useState<Zahlungsanforderung[]>(() =>
    upgradeAndNormalizeZas(injected?.zas || loadFromStorage<Zahlungsanforderung[]>('midpct_zas', INITIAL_ZAS))
  );

  const [vergaben, setVergaben] = useState<Vergabe[]>(() =>
    sanitizeAndDeduplicate(injected?.vergaben || loadFromStorage('midpct_vergaben', INITIAL_VERGABEN), INITIAL_VERGABEN)
  );

  const [oekoprofitCheckups, setOekoprofitCheckups] = useState<OekoprofitCheckup[]>(() =>
    sanitizeAndDeduplicate(
      injected?.oekoprofitCheckups || loadFromStorage('midpct_oekoprofit_checkups', INITIAL_OEKOPROFIT),
      INITIAL_OEKOPROFIT
    )
  );

  const [partners, setPartners] = useState<Partner[]>(() => {
    const loaded = injected?.partners || loadFromStorage<Partner[]>('midpct_partners', INITIAL_PARTNERS);
    const existingNames = new Set((loaded || []).map((p: Partner) => String(p?.name || '').toLowerCase().trim()));
    const missingPartners = INITIAL_PARTNERS.filter(
      (p) => !existingNames.has(String(p?.name || '').toLowerCase().trim())
    );
    return sanitizeAndDeduplicate([...(loaded || []), ...missingPartners], INITIAL_PARTNERS);
  });

  const [matches, setMatches] = useState<PartnerMatch[]>(() =>
    injected?.matches || loadFromStorage('midpct_matches', INITIAL_MATCHES)
  );

  const [buchungen, setBuchungen] = useState<Buchung[]>(() =>
    sanitizeAndDeduplicate(injected?.buchungen || loadFromStorage('midpct_buchungen', INITIAL_BUCHUNGEN), INITIAL_BUCHUNGEN)
  );

  const [tasks, setTasks] = useState<Task[]>(() =>
    sanitizeAndDeduplicate(injected?.tasks || loadFromStorage('midpct_tasks', INITIAL_TASKS), INITIAL_TASKS)
  );

  const [mitarbeiterList, setMitarbeiterList] = useState<string[]>(() =>
    injected?.mitarbeiterList ||
    loadFromStorage('midpct_mitarbeiter_list', ['von Styp-Rekowski', 'Lena Guth', 'Lea Fischöder'])
  );

  const [ucNotes, setUcNotes] = useState<{ [key: number]: any[] }>(() =>
    injected?.ucNotes || loadFromStorage('midpct_uc_notes', {})
  );

  const [ucInvoices, setUcInvoices] = useState<{ [key: number]: number[] }>(() =>
    injected?.ucInvoices || loadFromStorage('midpct_uc_invoices', {})
  );

  const [logs, setLogs] = useState<AuditLog[]>(() => {
    const rawLogs = injected?.logs ||
      loadFromStorage<AuditLog[]>('midpct_audit_logs', [
        {
          id: 1,
          timestamp: new Date().toISOString(),
          module: 'SYSTEM',
          action: 'INIT',
          details: 'ERP-System mit verifizierten BAFA-Seeddaten (FKZ 46SK0267X) initialisiert.',
          user: 'System-Core',
        },
      ]);
    return ensureAuditLogChain(rawLogs);
  });

  const [usecases, setUsecases] = useState<UseCase[]>(() => {
    const loaded = injected?.usecases || loadFromStorage<UseCase[]>('midpct_usecases', INITIAL_USECASES);
    const existingTitles = new Set(
      (loaded || []).map((uc: UseCase) => String(uc?.titel || '').toLowerCase().trim())
    );
    const existingCompanies = new Set(
      (loaded || []).map((uc: UseCase) => String(uc?.unternehmen || '').toLowerCase().trim())
    );
    const missingSeeds = INITIAL_USECASES.filter(
      (seed) =>
        !existingTitles.has(String(seed.titel || '').toLowerCase().trim()) &&
        !existingCompanies.has(String(seed.unternehmen || '').toLowerCase().trim())
    );
    const updatedLoaded = (loaded || []).map((uc: UseCase) => {
      const matchedSeed = INITIAL_USECASES.find(
        (s) =>
          String(s.titel || '').toLowerCase().trim() === String(uc.titel || '').toLowerCase().trim() ||
          (s.batch === 'Batch 2' &&
            String(s.unternehmen || '').toLowerCase().trim() === String(uc.unternehmen || '').toLowerCase().trim())
      );
      if (matchedSeed) {
        return {
          ...matchedSeed,
          ...uc,
          startupPartner: uc.startupPartner || matchedSeed.startupPartner || uc.loesung || matchedSeed.loesung,
          todos: uc.todos && uc.todos.length > 0 ? uc.todos : matchedSeed.todos,
          projektbeschreibung: uc.projektbeschreibung || matchedSeed.projektbeschreibung,
        };
      }
      return uc;
    });
    return sanitizeAndDeduplicate([...updatedLoaded, ...missingSeeds], INITIAL_USECASES);
  });

  const [deletedUcs, setDeletedUcs] = useState<string[]>(() =>
    injected?.deletedUcs || loadFromStorage('midpct_deleted_usecases', [])
  );

  // Navigation & filter states
  const [activePage, setActivePage] = useState<string>('cockpit');
  const [activeYear, setActiveYear] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Server Hybrid Persistence status
  const [serverSyncStatus, setServerSyncStatus] = useState<'synced' | 'saving' | 'offline'>('offline');
  const [lastServerSync, setLastServerSync] = useState<string | null>(null);
  const skipNextPushRef = useRef(false);
  const isMountedRef = useRef(false);

  // Drill-down filtering states
  const [personalQuarterFilter, setPersonalQuarterFilter] = useState<string>('all');
  const [rechnungenKategorieFilter, setRechnungenKategorieFilter] = useState<string>('all');
  const [rechnungenProfiPosFilter, setRechnungenProfiPosFilter] = useState<ProfiPositionCode | ''>('');
  const [mittelabrufeGeberFilter, setMittelabrufeGeberFilter] = useState<string>('all');
  const [mittelabrufeSubTab, setMittelabrufeSubTab] = useState<MittelabrufeSubTab>('za-rechner');
  const [mittelabrufeStatusFilter, setMittelabrufeStatusFilter] = useState<AbrufStatusFilter>('all');
  const [budgetTab, setBudgetTab] = useState<BudgetTab>('kategorie');
  const [budgetFocus, setBudgetFocus] = useState<BudgetFocus>('all');
  const [aufgabenStatusFilter, setAufgabenStatusFilter] = useState<string>('all');
  const [selectedUseCaseId, setSelectedUseCaseId] = useState<number | null>(null);
  const [complianceOpen, setComplianceOpen] = useState(false);

  const auditVerify = useMemo(() => verifyAuditChain(logs), [logs]);
  const gamificationEnabled = settings.gamificationMode !== false;
  const complianceShield = useMemo(
    () =>
      computeComplianceShield({
        zas,
        vergaben,
        oekoprofitCheckups,
        rechnungen,
      }),
    [zas, vergaben, oekoprofitCheckups, rechnungen]
  );

  // ── Gamification Stufe 1: Serien, Stufen & dauerhafte Freischaltungen ──
  // null = Trophäenschrank wurde noch nie initialisiert (Bestand wird beim ersten Lauf still übernommen)
  const [achievementUnlocks, setAchievementUnlocks] = useState<AchievementUnlock[] | null>(() =>
    sanitizeUnlocks(loadFromStorage<unknown>('midpct_achievement_unlocks', null))
  );
  // Synchron aktueller Stand, damit doppelte Effekt-Läufe (StrictMode) nichts doppelt protokollieren
  const unlocksRef = useRef<AchievementUnlock[] | null>(achievementUnlocks);
  const [achievementToasts, setAchievementToasts] = useState<AchievementToastItem[]>([]);
  const [backupTick, setBackupTick] = useState(0);

  useEffect(() => {
    const onBackup = () => setBackupTick((t) => t + 1);
    window.addEventListener(BACKUP_RECORDED_EVENT, onBackup);
    return () => window.removeEventListener(BACKUP_RECORDED_EVENT, onBackup);
  }, []);

  useEffect(() => {
    if (achievementUnlocks !== null) saveToStorage('midpct_achievement_unlocks', achievementUnlocks);
  }, [achievementUnlocks]);

  const complianceStreaks = useMemo(
    () =>
      computeComplianceStreaks({
        rechnungen,
        zas,
        backupMonths: getBackupMonths(),
        nowIso: new Date().toISOString(),
      }),
    // backupTick: neu berechnen, sobald eine Sicherung erstellt wurde
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rechnungen, zas, backupTick]
  );

  const projectAchievements = useMemo(
    () =>
      evaluateProjectAchievements({
        personal,
        rechnungen,
        zas,
        vergaben,
        usecases,
        oekoprofitCheckups,
        settings,
        streaks: complianceStreaks,
        auditChain: { valid: auditVerify.valid, checkedCount: auditVerify.checkedCount },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [personal, rechnungen, zas, vergaben, usecases, oekoprofitCheckups, settings, complianceStreaks, auditVerify, backupTick]
  );

  const displayAchievements = useMemo(
    () => applyPersistedUnlocks(projectAchievements, achievementUnlocks ?? []),
    [projectAchievements, achievementUnlocks]
  );

  const dismissAchievementToast = React.useCallback((key: string) => {
    setAchievementToasts((prev) => prev.filter((t) => t.key !== key));
  }, []);

  const navigateDirectFromMenu = (page: string) => {
    setPersonalQuarterFilter('all');
    setRechnungenKategorieFilter('all');
    setRechnungenProfiPosFilter('');
    setMittelabrufeGeberFilter('all');
    setMittelabrufeSubTab('za-rechner');
    setMittelabrufeStatusFilter('all');
    setBudgetTab('kategorie');
    setBudgetFocus('all');
    setAufgabenStatusFilter('all');
    setSelectedUseCaseId(null);
    setActivePage(page);
    setSidebarOpen(false);
  };

  const handleCockpitDrilldown = (page: string, filters: CockpitDrilldownFilters) => {
    setPersonalQuarterFilter(filters.personalQuarter ?? 'all');
    setRechnungenKategorieFilter(filters.rechnungenKategorie ?? 'all');
    setRechnungenProfiPosFilter(filters.rechnungenProfiPos ?? '');
    setMittelabrufeGeberFilter(filters.mittelabrufeGeber ?? 'all');
    setMittelabrufeSubTab(filters.mittelabrufeSubTab ?? 'za-rechner');
    setMittelabrufeStatusFilter(filters.mittelabrufeStatusFilter ?? 'all');
    setBudgetTab(filters.budgetTab ?? 'kategorie');
    setBudgetFocus(filters.budgetFocus ?? 'all');
    setAufgabenStatusFilter(filters.aufgabenStatus ?? 'all');
    setSelectedUseCaseId(filters.useCaseId ?? null);
    setActivePage(page);
  };

  // Sync mitarbeiterList names into mitarbeiterStamm automatically
  const handleUpdateMitarbeiterList = (nextList: string[]) => {
    setMitarbeiterList(nextList);
    setMitarbeiterStamm((prev) => {
      const existing = new Set(prev.map((m) => m.name.toLowerCase().trim()));
      const additions: MitarbeiterStamm[] = [];
      let nextId = prev.length > 0 ? Math.max(...prev.map((m) => m.id)) + 1 : 1;
      nextList.forEach((name) => {
        if (!existing.has(name.toLowerCase().trim())) {
          const lower = name.toLowerCase();
          const isShk = lower.includes('fischöder') || lower.includes('fischoeder') || lower.includes('shk') || lower.includes('hilfskraft');
          additions.push({
            id: nextId++,
            name,
            rolle: isShk ? 'Studentische Hilfskraft' : 'Projektmitarbeiter/in',
            primaerePosition: isShk ? '0817' : '0812',
            svQuote: isShk ? 0.18 : 0.185,
            tvoedGruppe: isShk ? 'SHK' : 'E11',
            tvoedStufe: isShk ? 'Pauschal' : 'Stufe 2',
            aktiv: true,
          });
        }
      });
      return additions.length > 0 ? [...prev, ...additions] : prev;
    });
  };

  // Auto-Persist to localStorage
  useEffect(() => { saveToStorage(STORAGE_KEYS.settings, settings); }, [settings]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.mitarbeiterStamm, mitarbeiterStamm); }, [mitarbeiterStamm]);
  useEffect(() => { saveToStorage('midpct_mitarbeiter_list', mitarbeiterList); }, [mitarbeiterList]);
  useEffect(() => { saveToStorage('midpct_personal', personal); }, [personal]);
  useEffect(() => { saveToStorage('midpct_rechnungen', rechnungen); }, [rechnungen]);
  useEffect(() => { saveToStorage('midpct_mittelabrufe', mittelabrufe); }, [mittelabrufe]);
  useEffect(() => { saveToStorage('midpct_zas', zas); }, [zas]);
  useEffect(() => { saveToStorage('midpct_vergaben', vergaben); }, [vergaben]);
  useEffect(() => { saveToStorage('midpct_oekoprofit_checkups', oekoprofitCheckups); }, [oekoprofitCheckups]);
  useEffect(() => { saveToStorage('midpct_partners', partners); }, [partners]);
  useEffect(() => { saveToStorage('midpct_tasks', tasks); }, [tasks]);
  useEffect(() => { saveToStorage('midpct_matches', matches); }, [matches]);
  useEffect(() => { saveToStorage('midpct_buchungen', buchungen); }, [buchungen]);
  useEffect(() => { saveToStorage('midpct_uc_notes', ucNotes); }, [ucNotes]);
  useEffect(() => { saveToStorage('midpct_uc_invoices', ucInvoices); }, [ucInvoices]);
  useEffect(() => { saveToStorage('midpct_audit_logs', logs); }, [logs]);
  useEffect(() => { saveToStorage('midpct_usecases', usecases); }, [usecases]);
  useEffect(() => { saveToStorage('midpct_deleted_usecases', deletedUcs); }, [deletedUcs]);

  const applyFullStateSnapshot = (snap: any, logSnapshot: boolean = false) => {
    if (!snap || typeof snap !== 'object') return;
    skipNextPushRef.current = true;
    if (snap.settings) setSettings({ ...DEFAULT_SETTINGS, ...snap.settings });
    if (snap.mitarbeiterStamm) setMitarbeiterStamm(snap.mitarbeiterStamm);
    if (snap.mitarbeiterList) setMitarbeiterList(snap.mitarbeiterList);
    if (snap.personal) setPersonal(normalizePersonalList(snap.personal));
    if (snap.rechnungen) setRechnungen(normalizeRechnungenList(snap.rechnungen));
    if (snap.mittelabrufe) {
      setMittelabrufe((snap.mittelabrufe || []).filter((m: Mittelabruf) => m.mittelgeber !== 'LHO_LAND'));
    }
    if (snap.zas) setZas(upgradeAndNormalizeZas(snap.zas));
    if (snap.vergaben) setVergaben(snap.vergaben);
    if (snap.oekoprofitCheckups) setOekoprofitCheckups(snap.oekoprofitCheckups);
    if (snap.partners) setPartners(snap.partners);
    if (snap.matches) setMatches(snap.matches);
    if (snap.buchungen) setBuchungen(snap.buchungen);
    if (snap.tasks) setTasks(snap.tasks);
    if (snap.ucNotes) setUcNotes(snap.ucNotes);
    if (snap.ucInvoices) setUcInvoices(snap.ucInvoices);
    if (snap.usecases) setUsecases(snap.usecases);
    if (snap.deletedUcs) setDeletedUcs(snap.deletedUcs);
    if (snap.logs && !logSnapshot) setLogs(ensureAuditLogChain(snap.logs));
    const snapUnlocks = sanitizeUnlocks(snap.achievementUnlocks);
    if (snapUnlocks) {
      unlocksRef.current = snapUnlocks;
      setAchievementUnlocks(snapUnlocks);
    }
    if (logSnapshot) {
      writeLog('SYSTEM', 'SNAPSHOT_LOAD', 'Datenbanksnapshot erfolgreich eingespielt.');
    }
  };

  // Build full snapshot object
  const buildStatePayload = () => ({
    personal,
    rechnungen,
    mittelabrufe,
    zas,
    vergaben,
    oekoprofitCheckups,
    partners,
    matches,
    buchungen,
    tasks,
    mitarbeiterList,
    mitarbeiterStamm,
    settings,
    ucNotes,
    ucInvoices,
    usecases,
    deletedUcs,
    logs,
    achievementUnlocks: achievementUnlocks ?? [],
  });

  // Initial server hydration check (only when served via http(s) and no offline injection)
  useEffect(() => {
    if (typeof window === 'undefined' || window.location.protocol === 'file:' || injected) {
      setServerSyncStatus('offline');
      isMountedRef.current = true;
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) {
          if (!cancelled) setServerSyncStatus('offline');
          isMountedRef.current = true;
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (data?.state) {
          const localLastModified = localStorage.getItem('midpct_last_local_modified') || '';
          const serverUpdatedAt = data.updatedAt || data.state.updatedAt || '';
          if (!localLastModified || (serverUpdatedAt && serverUpdatedAt > localLastModified)) {
            applyFullStateSnapshot(data.state, false);
          }
          setLastServerSync(serverUpdatedAt || new Date().toISOString());
          setServerSyncStatus('synced');
        } else {
          // Server has no file yet: seed it immediately with current client state
          const pushRes = await fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: buildStatePayload() }),
          });
          if (pushRes.ok) {
            const pData = await pushRes.json();
            setLastServerSync(pData.updatedAt || new Date().toISOString());
            setServerSyncStatus('synced');
          } else {
            setServerSyncStatus('offline');
          }
        }
      } catch {
        if (!cancelled) setServerSyncStatus('offline');
      } finally {
        isMountedRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-push to /api/state whenever data changes
  useEffect(() => {
    if (!isMountedRef.current) return;
    localStorage.setItem('midpct_last_local_modified', new Date().toISOString());

    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }
    if (typeof window === 'undefined' || window.location.protocol === 'file:') {
      return;
    }

    setServerSyncStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: buildStatePayload() }),
        });
        if (res.ok) {
          const data = await res.json();
          setLastServerSync(data.updatedAt || new Date().toISOString());
          setServerSyncStatus('synced');
        } else {
          setServerSyncStatus('offline');
        }
      } catch {
        setServerSyncStatus('offline');
      }
    }, 800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    personal,
    rechnungen,
    mittelabrufe,
    zas,
    vergaben,
    oekoprofitCheckups,
    partners,
    matches,
    buchungen,
    tasks,
    mitarbeiterList,
    mitarbeiterStamm,
    settings,
    ucNotes,
    ucInvoices,
    usecases,
    deletedUcs,
    logs,
    achievementUnlocks,
  ]);

  const handleSyncWithServer = async (direction: 'push' | 'pull'): Promise<{ ok: boolean; message: string }> => {
    if (typeof window === 'undefined' || window.location.protocol === 'file:') {
      return { ok: false, message: 'Im Offline-HTML-Modus (file://) steht kein lokaler Express-Server zur Verfügung.' };
    }
    try {
      if (direction === 'push') {
        setServerSyncStatus('saving');
        const res = await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: buildStatePayload() }),
        });
        if (!res.ok) throw new Error('Serverfehler beim Speichern');
        const data = await res.json();
        setLastServerSync(data.updatedAt || new Date().toISOString());
        setServerSyncStatus('synced');
        return { ok: true, message: `Server-Persistenz erfolgreich aktualisiert (data/midpct_db.json).` };
      } else {
        const res = await fetch('/api/state');
        if (!res.ok) throw new Error('Server nicht erreichbar');
        const data = await res.json();
        if (!data?.state) {
          return { ok: false, message: 'Auf dem Server existiert noch kein gespeicherter Stand.' };
        }
        applyFullStateSnapshot(data.state, false);
        setLastServerSync(data.updatedAt || new Date().toISOString());
        setServerSyncStatus('synced');
        return { ok: true, message: 'Datenstand erfolgreich aus Server-Datenbank (data/midpct_db.json) geladen.' };
      }
    } catch (err: any) {
      setServerSyncStatus('offline');
      return { ok: false, message: err?.message || 'Verbindung zum Server fehlgeschlagen.' };
    }
  };

  // Listener for Ctrl+K and Escape
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

  // GoBD Hash-Chained Central Log Writer
  const writeLog = (
    module: string,
    action: string,
    details: string,
    meta?: {
      entityType?: string;
      entityId?: number;
      beforeJson?: string;
      afterJson?: string;
      pdfHash?: string;
    }
  ) => {
    setLogs((prev) => {
      const chainedPrev = prev.length > 0 && prev[0].hash ? prev : ensureAuditLogChain(prev);
      const newId = chainedPrev.length > 0 ? Math.max(...chainedPrev.map((l) => l.id)) + 1 : 1;
      const previousHash = chainedPrev.length > 0 ? chainedPrev[0].hash || GOBD_GENESIS_HASH : GOBD_GENESIS_HASH;
      const baseEntry: Omit<AuditLog, 'hash'> = {
        id: newId,
        timestamp: new Date().toISOString(),
        module,
        action,
        details,
        user: 'WIN.DN-Controller',
        entityType: meta?.entityType,
        entityId: meta?.entityId,
        beforeJson: meta?.beforeJson,
        afterJson: meta?.afterJson,
        pdfHash: meta?.pdfHash,
        previousHash,
      };
      const hash = computeAuditEntryHash(baseEntry, previousHash);
      return [{ ...baseEntry, hash }, ...chainedPrev];
    });
  };

  // Neu erreichte Abzeichen dauerhaft speichern, im GoBD-Audit-Log festhalten und anzeigen.
  // Nur in der Projekt-Steuerung aktiv – die neutrale Prüfungsansicht bleibt frei von Spielelementen.
  useEffect(() => {
    if (!gamificationEnabled) return;
    const previous = unlocksRef.current;
    const isFirstRun = previous === null;
    const { unlocks, newlyUnlocked } = mergeAchievementUnlocks(
      previous ?? [],
      projectAchievements,
      new Date().toISOString(),
      isFirstRun
    );
    if (!isFirstRun && newlyUnlocked.length === 0) return;

    unlocksRef.current = unlocks;
    setAchievementUnlocks(unlocks);

    if (isFirstRun) {
      if (unlocks.length > 0) {
        writeLog(
          'GAMIFICATION',
          'TROPHY_INIT',
          `Trophäenschrank initialisiert: ${newlyUnlocked.length} bereits erreichte Abzeichen aus dem Datenbestand übernommen.`,
          { entityType: 'Achievement', afterJson: JSON.stringify(unlocks) }
        );
      }
      return;
    }

    const byId = new Map(projectAchievements.map((a) => [a.id, a]));
    newlyUnlocked.forEach((u) => {
      const achievement = byId.get(u.achievementId);
      const title = achievement?.title ?? u.achievementId;
      writeLog(
        'GAMIFICATION',
        'ACHIEVEMENT_UNLOCK',
        `Abzeichen „${title}"${u.tier ? ` (${TIER_LABEL[u.tier]})` : ''} freigeschaltet.`,
        { entityType: 'Achievement', afterJson: JSON.stringify(u) }
      );
    });
    setAchievementToasts((prev) => [
      ...prev,
      ...newlyUnlocked.map((u) => {
        const achievement = byId.get(u.achievementId);
        return {
          key: `${unlockKey(u.achievementId, u.tier)}@${u.unlockedAt}`,
          title: achievement?.title ?? u.achievementId,
          description: achievement?.description ?? '',
          tier: u.tier,
          hidden: achievement?.hidden,
        };
      }),
    ]);
    // writeLog ist eine stabile Hilfsfunktion; unlocksRef liefert den aktuellen Stand
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectAchievements, gamificationEnabled]);

  // ── APP GLOBAL HANDLERS ──

  const handleUpdateSettings = (patch: Partial<SystemSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeLog('SYSTEM', 'SETTINGS', `Systemeinstellungen angepasst (${Object.keys(patch).join(', ')}).`, {
        entityType: 'SystemSettings',
        beforeJson: JSON.stringify(prev),
        afterJson: JSON.stringify(next),
      });
      return next;
    });
  };

  // Personal Page Handlers
  const handleAddPersonal = (eintrag: Omit<PersonalEintrag, 'id'>) => {
    setPersonal((prev) => {
      const nextId = prev.length > 0 ? Math.max(...prev.map((x) => x.id)) + 1 : 1;
      const item = { ...eintrag, id: nextId };
      writeLog(
        'PERSONAL',
        'CREATE',
        `Lohnbeleg für ${item.mitarbeiter} (${item.monat}/${item.jahr}) eingepflegt. AG-Kosten: ${item.agKosten} €`,
        {
          entityType: 'PersonalEintrag',
          entityId: nextId,
          afterJson: JSON.stringify(item),
        }
      );
      return [...prev, item];
    });
  };

  const handleUpdatePersonal = (id: number, updated: Partial<PersonalEintrag>) => {
    setPersonal((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const item = { ...p, ...updated };
          writeLog('PERSONAL', 'UPDATE', `Lohnbeleg ${item.mitarbeiter} (${item.monat}/${item.jahr}) angepasst.`, {
            entityType: 'PersonalEintrag',
            entityId: id,
            beforeJson: JSON.stringify(p),
            afterJson: JSON.stringify(item),
          });
          return item;
        }
        return p;
      })
    );
  };

  const handleRenameMitarbeiterGlobal = (oldName: string, newName: string) => {
    setPersonal((prev) => prev.map((p) => (p.mitarbeiter === oldName ? { ...p, mitarbeiter: newName } : p)));
    setMitarbeiterList((prev) => prev.map((m) => (m === oldName ? newName : m)));
    setMitarbeiterStamm((prev) => prev.map((s) => (s.name === oldName ? { ...s, name: newName } : s)));
    writeLog('PERSONAL', 'UPDATE', `Mitarbeiter "${oldName}" global in "${newName}" umbenannt.`);
  };

  const handleRenameSingleMitarbeiter = (id: number, newName: string) => {
    setPersonal((prev) => prev.map((p) => (p.id === id ? { ...p, mitarbeiter: newName } : p)));
    writeLog('PERSONAL', 'UPDATE', `Lohnbeleg ID ${id} auf "${newName}" umgeändert.`, {
      entityType: 'PersonalEintrag',
      entityId: id,
    });
  };

  // Compliance-Gate Prüfung für Rechnungen
  const checkRechnungComplianceGate = (
    vergabeId: number | null | undefined,
    status: Rechnungsbeleg['status']
  ): { ok: boolean; error?: string } => {
    if (status === 'EINGEREICHT' && vergabeId) {
      const linkedVergabe = vergaben.find((v) => v.id === vergabeId);
      if (linkedVergabe && !linkedVergabe.bafaFreigabe) {
        return {
          ok: false,
          error: `Compliance-Gate blockiert "EINGEREICHT": Verknüpfte Vergabe "${linkedVergabe.titel}" besitzt noch keine schriftliche BAFA-Freigabe.`,
        };
      }
    }
    return { ok: true };
  };

  // Rechnungen Handlers
  const handleAddRechnung = (
    beleg: Omit<Rechnungsbeleg, 'id'>,
    opts?: { source?: 'import' }
  ): { ok: boolean; error?: string } => {
    const gate = checkRechnungComplianceGate(beleg.vergabeId, beleg.status);
    if (!gate.ok) return gate;

    const nextId = rechnungen.length > 0 ? Math.max(...rechnungen.map((x) => x.id)) + 1 : 1;
    const foerderfaehigerBetrag = getFoerderfaehigerRechnungsBetrag(beleg, settings.vorsteuerabzugsberechtigt);
    const item: Rechnungsbeleg = {
      ...beleg,
      id: nextId,
      foerderfaehigerBetrag,
      // Erfassungszeitpunkt für die Serie „Fristgerechte Erfassung".
      // Importierte Altbelege bleiben ohne Zeitpunkt und werden nicht bewertet.
      createdAt: beleg.createdAt ?? (opts?.source === 'import' ? undefined : new Date().toISOString()),
    };
    setRechnungen((prev) => [...prev, item]);
    writeLog(
      'EXPENSES',
      'CREATE',
      `Sachbeleg ${item.rechnungsnummer} von ${item.rechnungssteller} (${roundEuro(foerderfaehigerBetrag)} € förderfähig, Pos. ${item.profiPosition || '0835'}) eingebucht.`,
      {
        entityType: 'Rechnungsbeleg',
        entityId: nextId,
        afterJson: JSON.stringify(item),
        pdfHash: item.pdfHash,
      }
    );
    return { ok: true };
  };

  const handleUpdateRechnung = (
    id: number,
    updated: Partial<Rechnungsbeleg>
  ): { ok: boolean; error?: string } => {
    const current = rechnungen.find((r) => r.id === id);
    if (!current) return { ok: false, error: 'Beleg nicht gefunden.' };

    const merged: Rechnungsbeleg = { ...current, ...updated };
    const gate = checkRechnungComplianceGate(merged.vergabeId, merged.status);
    if (!gate.ok) return gate;

    merged.foerderfaehigerBetrag = getFoerderfaehigerRechnungsBetrag(merged, settings.vorsteuerabzugsberechtigt);

    setRechnungen((prev) => prev.map((r) => (r.id === id ? merged : r)));
    writeLog('EXPENSES', 'UPDATE', `Sachbeleg ${current.rechnungsnummer} (${current.rechnungssteller}) angepasst (Status: ${merged.status}).`, {
      entityType: 'Rechnungsbeleg',
      entityId: id,
      beforeJson: JSON.stringify(current),
      afterJson: JSON.stringify(merged),
      pdfHash: merged.pdfHash,
    });
    return { ok: true };
  };

  // Mittelabrufe Page Handlers
  const handleAddMittelabruf = (abruf: Omit<Mittelabruf, 'id'>) => {
    setMittelabrufe((prev) => {
      const nextId = prev.length > 0 ? Math.max(...prev.map((x) => x.id)) + 1 : 1;
      const item = { ...abruf, id: nextId };
      writeLog('CLAIMS', 'CREATE', `Mittelabruf ${item.abrufnummer} über ${item.beantragt} € beim Mittelgeber beantragt.`, {
        entityType: 'Mittelabruf',
        entityId: nextId,
        afterJson: JSON.stringify(item),
      });
      return [...prev, item];
    });
  };

  const handleUpdateMittelabrufStatus = (id: number, newStatus: Mittelabruf['status']) => {
    setMittelabrufe((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const item = { ...a, status: newStatus };
          writeLog('CLAIMS', 'UPDATE', `Mittelabruf ${a.abrufnummer} Status auf "${newStatus}" geändert.`, {
            entityType: 'Mittelabruf',
            entityId: id,
            beforeJson: JSON.stringify(a),
            afterJson: JSON.stringify(item),
          });
          return item;
        }
        return a;
      })
    );
  };

  // Zahlungsanforderungen (profi-online) Handlers
  const handleSaveZa = (zaInput: Omit<Zahlungsanforderung, 'id'> | Zahlungsanforderung) => {
    const normalizedInput = {
      ...zaInput,
      istJePosition: normalizeProfiAmounts(zaInput.istJePosition),
      vorschauJePosition: normalizeProfiAmounts(zaInput.vorschauJePosition),
    };
    if ('id' in normalizedInput && typeof normalizedInput.id === 'number') {
      const existing = zas.find((z) => z.id === normalizedInput.id);
      setZas((prev) => {
        const exists = prev.some((z) => z.id === normalizedInput.id);
        if (exists) {
          return prev.map((z) => (z.id === normalizedInput.id ? { ...normalizedInput } : z));
        }
        return [...prev, normalizedInput];
      });
      writeLog(
        'CLAIMS',
        'UPDATE',
        `Zahlungsanforderung "${normalizedInput.bezeichnung}" (Zeile 19: ${normalizedInput.zeile19Anforderung} €) gespeichert.`,
        {
          entityType: 'Zahlungsanforderung',
          entityId: normalizedInput.id,
          beforeJson: existing ? JSON.stringify(existing) : undefined,
          afterJson: JSON.stringify(normalizedInput),
          pdfHash: normalizedInput.pdfHash,
        }
      );
    } else {
      setZas((prev) => {
        const nextId = prev.length > 0 ? Math.max(...prev.map((x) => x.id)) + 1 : 1;
        const item: Zahlungsanforderung = { ...normalizedInput, id: nextId };
        writeLog('CLAIMS', 'CREATE', `Neue Zahlungsanforderung "${item.bezeichnung}" (Zeile 19: ${item.zeile19Anforderung} €) angelegt.`, {
          entityType: 'Zahlungsanforderung',
          entityId: nextId,
          afterJson: JSON.stringify(item),
          pdfHash: item.pdfHash,
        });
        return [...prev, item];
      });
    }
  };

  const handleDeleteZa = (id: number) => {
    const matched = zas.find((z) => z.id === id);
    setZas((prev) => prev.filter((z) => z.id !== id));
    if (matched) {
      writeLog('CLAIMS', 'DELETE', `Zahlungsanforderung "${matched.bezeichnung}" entfernt.`, {
        entityType: 'Zahlungsanforderung',
        entityId: id,
        beforeJson: JSON.stringify(matched),
      });
    }
  };

  // Manual bookings handlers
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
      writeLog('PROCUREMENT', 'CREATE', `Ausschreibung/Vergabe "${item.titel}" im Status "${item.status}" angelegt.`, {
        entityType: 'Vergabe',
        entityId: nextId,
        afterJson: JSON.stringify(item),
      });
      return [...prev, item];
    });
  };

  const handleUpdateVergabe = (id: number, updated: Partial<Vergabe>) => {
    setVergaben((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          const item = { ...v, ...updated };
          writeLog('PROCUREMENT', 'UPDATE', `Ausschreibungsdetails für "${v.titel}" angepasst.`, {
            entityType: 'Vergabe',
            entityId: id,
            beforeJson: JSON.stringify(v),
            afterJson: JSON.stringify(item),
          });
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
      writeLog('PROCUREMENT', 'DELETE', `Ausschreibung "${matched.titel}" gelöscht.`, {
        entityType: 'Vergabe',
        entityId: id,
        beforeJson: JSON.stringify(matched),
      });
    }
  };

  // Ökoprofit-Checkup Handlers (0835)
  const handleAddOekoprofit = (item: Omit<OekoprofitCheckup, 'id'>) => {
    setOekoprofitCheckups((prev) => {
      const nextId = prev.length > 0 ? Math.max(...prev.map((x) => x.id)) + 1 : 1;
      const entry = { ...item, id: nextId };
      writeLog('PROCUREMENT', 'CREATE', `Ökoprofit-Checkup für Startup "${entry.startupName}" (5.000 € brutto, Pos. 0835) angelegt.`);
      return [...prev, entry];
    });
  };

  const handleUpdateOekoprofit = (id: number, updated: Partial<OekoprofitCheckup>) => {
    setOekoprofitCheckups((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const item = { ...c, ...updated };
          writeLog('PROCUREMENT', 'UPDATE', `Ökoprofit-Checkup "${item.startupName}" aktualisiert (${item.status}).`);
          return item;
        }
        return c;
      })
    );
  };

  const handleDeleteOekoprofit = (id: number) => {
    const matched = oekoprofitCheckups.find((c) => c.id === id);
    setOekoprofitCheckups((prev) => prev.filter((c) => c.id !== id));
    if (matched) {
      writeLog('PROCUREMENT', 'DELETE', `Ökoprofit-Checkup "${matched.startupName}" entfernt.`);
    }
  };

  // Ökoprofit-Checkup -> Pos. 0835 Sachbeleg Automatisierung
  const handleCreateOekoprofitInvoice = (
    checkup: OekoprofitCheckup,
    trancheIndex: 1 | 2 | 3
  ): { ok: boolean; rechnungId?: number; error?: string } => {
    const basis = checkup.verguetungBrutto || 5000;
    const factor = trancheIndex === 3 ? 0.5 : 0.25;
    const trancheLabel =
      trancheIndex === 1 ? '1. Abschlag (25 %)' : trancheIndex === 2 ? '2. Abschlag (25 %)' : 'Schlusszahlung (50 %)';
    const brutto = roundEuro(basis * factor);
    const netto = roundEuro(brutto / 1.19);
    const todayISO = new Date().toISOString().slice(0, 10);
    const yearNum = Math.max(2025, Math.min(2029, new Date().getFullYear()));
    const monthNum = new Date().getMonth() + 1;
    const quartal = Math.ceil(monthNum / 3);

    const newBelegDraft: Omit<Rechnungsbeleg, 'id'> = {
      rechnungsnummer: `OEKO-${checkup.id}-T${trancheIndex}`,
      rechnungssteller: checkup.berater || 'Ökoprofit-Beratungspartner',
      leistungsbeschreibung: `Ökoprofit-Checkup "${checkup.startupName}" – ${trancheLabel}`,
      rechnungsdatum: todayISO,
      zahlungsdatum: null,
      kostenkategorie: 'Ökoprofit-Checkup',
      profiPosition: '0835',
      foerderjahr: yearNum,
      quartal,
      arbeitspaket: 'AP2 – Technologietransfer',
      betragNetto: netto,
      betragBrutto: brutto,
      mwstSatz: 19,
      foerderfaehigerBetrag: settings.vorsteuerabzugsberechtigt ? netto : brutto,
      foerderfaehig: true,
      status: 'ENTWURF',
    };

    const nextId = rechnungen.length > 0 ? Math.max(...rechnungen.map((x) => x.id)) + 1 : 1;
    const item: Rechnungsbeleg = { ...newBelegDraft, id: nextId };
    setRechnungen((prev) => [...prev, item]);

    const patch: Partial<OekoprofitCheckup> =
      trancheIndex === 1
        ? { tranche1Invoiced: true }
        : trancheIndex === 2
        ? { tranche2Invoiced: true }
        : { tranche3Invoiced: true };
    setOekoprofitCheckups((prev) => prev.map((c) => (c.id === checkup.id ? { ...c, ...patch } : c)));

    writeLog(
      'EXPENSES',
      'CREATE',
      `Ökoprofit-Teilrechnung ${item.rechnungsnummer} (${trancheLabel}: ${brutto} € brutto / ${netto} € netto) aus Checkup "${checkup.startupName}" in Sachbelege (0835) übergeben.`,
      {
        entityType: 'Rechnungsbeleg',
        entityId: nextId,
        afterJson: JSON.stringify(item),
      }
    );
    return { ok: true, rechnungId: nextId };
  };

  // End-to-End Booster-Pipeline (Partner Match -> Use-Case + 37.000-€-Vergabe 0835)
  const handleCreateBoosterPipeline = (
    industryPartner: Partner,
    providerPartner: Partner
  ): { ok: boolean; useCaseId: number; vergabeId: number } => {
    const newUcId = usecases.length > 0 ? Math.max(...usecases.map((u) => u.id)) + 1 : 1;
    const newVergabeId = vergaben.length > 0 ? Math.max(...vergaben.map((v) => v.id)) + 1 : 1;
    const deadlineDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const newUseCase: UseCase = {
      id: newUcId,
      titel: `Transformations-Booster: ${industryPartner.name} × ${providerPartner.name}`,
      unternehmen: industryPartner.name,
      startupPartner: providerPartner.name,
      ansprechpartner: industryPartner.email || providerPartner.email || 'WIN.DN Projektteam',
      branche: industryPartner.branche || providerPartner.branche || 'Übergreifend',
      reifegrad: 'Pilotbetrieb',
      batch: 'Batch 3',
      thema: providerPartner.tech || 'Industrielle Transformation',
      risiken: 'Technische Integration & BAFA-Freigabe vor Beauftragung sicherstellen.',
      politischeRelevanz: 4,
      deadline: deadlineDate,
      erfolgswahrscheinlichkeit: 75,
      status: 'in Vorbereitung',
      notizen: `Automatisch aus Partner-Matchmaking initialisiert (${industryPartner.name} + ${providerPartner.name}).`,
      sharepointUrl: '',
      websiteUrl: providerPartner.web || '',
      loesung: providerPartner.tech || providerPartner.name,
      problemstellung: `Transformationsbedarf am Industriestandort ${industryPartner.name} (${industryPartner.branche}).`,
      loesungsansatz: `Pilotierung der Lösung von ${providerPartner.name} im Rahmen eines 37.000-€-Transformations-Boosters.`,
      statusNextSteps: '1. BAFA-Freigabe der Vergabe einholen, 2. Leistungsbeschreibung finalisieren, 3. Kick-off.',
      standortMehrwert: `Stärkung der regionalen Wertschöpfung im Wirtschaftsraum Düren durch Kooperation von ${industryPartner.name} und ${providerPartner.name}.`,
      todos: [
        { id: `tb-${newUcId}-1`, text: 'Leistungsbeschreibung & Vergleichsangebot einholen', completed: false, dueDate: deadlineDate },
        { id: `tb-${newUcId}-2`, text: 'Schriftliche BAFA-Freigabe (Pos. 0835) dokumentieren', completed: false, dueDate: deadlineDate },
        { id: `tb-${newUcId}-3`, text: 'Auftragsvergabe / Direktauftrag (37.000 €) unterzeichnen', completed: false, dueDate: deadlineDate },
        { id: `tb-${newUcId}-4`, text: 'Kick-off & Meilensteinplan zwischen Industrie und Startup abstimmen', completed: false, dueDate: deadlineDate },
        { id: `tb-${newUcId}-5`, text: 'Pilotbetrieb & Technologietransfer dokumentieren', completed: false, dueDate: deadlineDate },
        { id: `tb-${newUcId}-6`, text: 'Schlussrechnung & Verwendungsnachweis (Pos. 0835) in ZA aufnehmen', completed: false, dueDate: deadlineDate },
      ],
    };

    const newVergabe: Vergabe = {
      id: newVergabeId,
      titel: `Transformations-Booster: ${industryPartner.name} / ${providerPartner.name}`,
      auftragnehmer: providerPartner.name,
      vergabeart: 'Freihändige Vergabe / Direktauftrag',
      auftragswert: 37000,
      ausschreibungsDatum: new Date().toISOString().slice(0, 10),
      abgabeFrist: null,
      zuschlagsDatum: null,
      vertragsende: deadlineDate,
      arbeitspaket: 'AP5 – Use-Cases',
      bafaFreigabe: false,
      useCaseId: newUcId,
      status: 'Vorbereitung',
      notizen: `Verknüpft mit Use-Case #${newUcId}. Compliance-Gate: Sachbelege erst nach BAFA-Freigabe einreichbar.`,
    };

    setUsecases((prev) => [...prev, newUseCase]);
    setVergaben((prev) => [...prev, newVergabe]);

    writeLog(
      'USECASES',
      'CREATE',
      `Booster-Pipeline initialisiert: Use-Case #${newUcId} ("${newUseCase.titel}") + Pos. 0835 Vergabe #${newVergabeId} über 37.000,00 € (BAFA-Freigabe offen).`,
      {
        entityType: 'UseCase+Vergabe',
        entityId: newUcId,
        afterJson: JSON.stringify({ useCaseId: newUcId, vergabeId: newVergabeId, auftragswert: 37000 }),
      }
    );

    return { ok: true, useCaseId: newUcId, vergabeId: newVergabeId };
  };

  // Use Case Page Handlers
  const handleAddUseCase = (uc: any) => {
    setUsecases((prev) => {
      const { id: _dummyId, ...ucData } = uc;
      const nextId = prev.length > 0 ? Math.max(...prev.map((x) => x.id)) + 1 : 1;
      const item = { ...ucData, id: nextId };

      setTimeout(() => {
        setUcNotes((notesPrev) => ({ ...notesPrev, [nextId]: [] }));
        setUcInvoices((invPrev) => ({ ...invPrev, [nextId]: [] }));
      }, 0);

      writeLog('USECASES', 'CREATE', `Neuer Pilot-Use Case "${item.titel}" registriert.`, {
        entityType: 'UseCase',
        entityId: nextId,
      });
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

  const handleResetBatch2 = () => {
    const batch2Seeds = INITIAL_USECASES.filter((u) => u.batch === 'Batch 2');
    setUsecases((prev) => {
      const nonBatch2 = prev.filter((u) => u.batch !== 'Batch 2');
      return sanitizeAndDeduplicate([...nonBatch2, ...batch2Seeds], INITIAL_USECASES);
    });
    writeLog('USECASES', 'RESET', 'Batch 2 Vorbereitungs-Unternehmen auf Standard-Vorbereitungsliste synchronisiert.');
  };

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

  // Tasks Handlers
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

  const handleToggleMatch = (industryId: number, providerId: number, type: PartnerMatch['type']) => {
    const existingIndex = matches.findIndex((x) => x.industryId === industryId && x.providerId === providerId);
    if (existingIndex > -1) {
      if (type === 'NONE') {
        setMatches((prev) => prev.filter((_, idx) => idx !== existingIndex));
      } else {
        setMatches((prev) => prev.map((m, idx) => (idx === existingIndex ? { ...m, type } : m)));
      }
    } else if (type !== 'NONE') {
      const newId = matches.length > 0 ? Math.max(...matches.map((x) => x.id || 0)) + 1 : 1;
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
      const bafaAnteil = mulPercent(agKosten, 90);
      const eigenaufwand = subEuro(agKosten, bafaAnteil);
      handleAddPersonal({
        jahr: row.jahr || 2026,
        monat: row.monat || 6,
        mitarbeiter: row.employeeName || (row.vorname && row.nachname ? `${row.vorname} ${row.nachname}` : 'Mitarbeiter'),
        agKosten,
        sachkosten: 0,
        foerderfaehig: agKosten,
        bafaAnteil,
        lhoAnteil: 0,
        eigenaufwand,
        foerderjahr: row.foerderjahr || row.jahr || 2026,
        quartal: row.quartal || 2,
        brutto0812: row.brutto0812,
        brutto0817: row.brutto0817,
        sv0820: row.sv0820,
        status: 'ENTWURF',
        bemerkung: row.position || 'Stelle',
      });
    });
  };

  const handleImportRechnungen = (data: any[]) => {
    data.forEach((row) => {
      const betragNetto = row.betragNetto || 0;
      const betragBrutto = row.betragBrutto || roundEuro(betragNetto * 1.19);
      const mwstSatz = row.mwstSatz ?? 19;
      handleAddRechnung({
        rechnungsnummer: row.rechnungsnummer || 'RE-IMPORT',
        rechnungsdatum: row.rechnungsdatum || new Date().toISOString().slice(0, 10),
        rechnungssteller: row.rechnungssteller || 'Lieferant',
        leistungsbeschreibung: row.leistungsbeschreibung || 'Importierter Beleg',
        zahlungsdatum: row.zahlungsdatum || null,
        kostenkategorie: row.kostenkategorie || 'Sonstige Sachkosten',
        profiPosition: row.profiPosition,
        foerderjahr: row.foerderjahr || 2026,
        quartal: row.quartal || 3,
        arbeitspaket: row.arbeitspaket || 'AP2',
        betragNetto,
        betragBrutto,
        mwstSatz,
        pdfHash: row.pdfHash,
        foerderfaehig: row.foerderfaehig === undefined ? true : row.foerderfaehig,
        status: 'ENTWURF',
      }, { source: 'import' });
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
        differenz: subEuro(row.beantragt || 0, row.eingegangen || 0),
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
        bewertung: typeof row.bewertung === 'number' ? row.bewertung : parseInt(row.bewertung) || 3,
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
    localStorage.removeItem('midpct_personal');
    localStorage.removeItem('midpct_rechnungen');
    localStorage.removeItem('midpct_mittelabrufe');
    localStorage.removeItem('midpct_zas');
    localStorage.removeItem('midpct_vergaben');
    localStorage.removeItem('midpct_oekoprofit_checkups');
    localStorage.removeItem('midpct_partners');
    localStorage.removeItem('midpct_matches');
    localStorage.removeItem('midpct_buchungen');
    localStorage.removeItem('midpct_uc_notes');
    localStorage.removeItem('midpct_uc_invoices');
    localStorage.removeItem('midpct_usecases');
    localStorage.removeItem('midpct_deleted_usecases');
    localStorage.removeItem('midpct_audit_logs');
    localStorage.removeItem(STORAGE_KEYS.settings);
    localStorage.removeItem(STORAGE_KEYS.mitarbeiterStamm);

    setSettings(DEFAULT_SETTINGS);
    setMitarbeiterStamm(INITIAL_MITARBEITER_STAMM);
    setMitarbeiterList(['von Styp-Rekowski', 'Lena Guth', 'Lea Fischöder']);
    setPersonal(INITIAL_PERSONAL);
    setRechnungen(INITIAL_RECHNUNGEN);
    setMittelabrufe(INITIAL_MITTELABRUFE);
    setZas(INITIAL_ZAS);
    setVergaben(INITIAL_VERGABEN);
    setOekoprofitCheckups(INITIAL_OEKOPROFIT);
    setPartners(INITIAL_PARTNERS);
    setMatches(INITIAL_MATCHES);
    setBuchungen(INITIAL_BUCHUNGEN);
    setUsecases(INITIAL_USECASES);
    setDeletedUcs([]);
    setUcNotes({});
    setUcInvoices({});

    setLogs(
      ensureAuditLogChain([
        {
          id: 1,
          timestamp: new Date().toISOString(),
          module: 'SYSTEM',
          action: 'RESET',
          details: 'Datenbank vollständig auf verifizierte BAFA-Seeddaten (FKZ 46SK0267X) zurückgesetzt.',
          user: 'System-Controller',
        },
      ])
    );
  };

  const exportDatabaseSnapshot = () => buildStatePayload();

  const handleQuickBackupSnapshot = () => {
    const data = buildStatePayload();
    const str = JSON.stringify(data, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MiD-PCT_Kassenschluss_Snapshot_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    recordBackupTimestamp();
    writeLog('SYSTEM', 'SNAPSHOT_EXPORT', 'Monatlicher JSON-Revisions-Snapshot exportiert.');
  };

  const onLoadJSONSnapshot = (snap: any) => {
    applyFullStateSnapshot(snap, true);
  };

  // Global search matching across collections (Strg+K)
  const getSearchResults = () => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];

    const results: { text: string; page: string; category: string }[] = [];

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

    personal.forEach((p) => {
      const mitarbeiter = p.mitarbeiter || '';
      const bemerkung = p.bemerkung || '';
      if (mitarbeiter.toLowerCase().includes(q) || bemerkung.toLowerCase().includes(q)) {
        results.push({
          text: `Mitarbeiter-Eintrag: ${mitarbeiter} (Jahr ${p.foerderjahr || ''}, Q${p.quartal || ''})`,
          page: 'personal',
          category: 'Personalbelege',
        });
      }
    });

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

    oekoprofitCheckups.forEach((c) => {
      const startup = c.startupName || '';
      const berater = c.berater || '';
      const branche = c.branche || '';
      if (
        startup.toLowerCase().includes(q) ||
        berater.toLowerCase().includes(q) ||
        branche.toLowerCase().includes(q) ||
        'oekoprofit'.includes(q) ||
        'ökoprofit'.includes(q) ||
        'transformationsbooster'.includes(q)
      ) {
        results.push({
          text: `Ökoprofit-Checkup: ${startup} (${berater || 'Berater offen'} · ${c.status})`,
          page: 'vergaben',
          category: 'Ökoprofit / Pos. 0835',
        });
      }
    });

    zas.forEach((z) => {
      const bez = z.bezeichnung || '';
      const dat = z.datum || '';
      if (
        bez.toLowerCase().includes(q) ||
        dat.toLowerCase().includes(q) ||
        'za'.includes(q) ||
        'profi-online'.includes(q) ||
        'zeile 19'.includes(q)
      ) {
        results.push({
          text: `Zahlungsanforderung: ${bez} (${dat})`,
          page: 'mittelabrufe',
          category: 'profi-online ZA',
        });
      }
    });

    return results.slice(0, 8);
  };

  const results = getSearchResults();

  const activeYearLabel =
    activeYear === null
      ? 'Alle Förderjahre'
      : activeYear === 'gesamt25'
      ? 'Förderjahr 2025 (Ab April)'
      : activeYear === 'mrz29'
      ? 'Förderjahr 2029 (Bis März)'
      : `Förderjahr ${activeYear}`;

  return (
    <div className="min-h-screen bg-zinc-50 flex font-sans text-zinc-800 antialiased selection:bg-zs-signal-gelb/40 selection:text-zs-blau-schwarz">
      {/* Sidebar background backdrop overlay for mobile/tablet */}
      {sidebarOpen && !settings.boardroomMode && (
        <div
          className="fixed inset-0 bg-[#041422]/70 backdrop-blur-xs z-20 xl:hidden transition-opacity duration-300 cursor-pointer"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR NAVIGATION (hidden cleanly in Boardroom mode or Print) ── */}
      {!settings.boardroomMode && (
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#041422] text-zinc-300 border-r border-[#1b2f42] flex flex-col justify-between transform transition-transform duration-300 xl:translate-x-0 xl:static xl:h-screen print:hidden ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden scrollbar-thin">
            {/* Logo and branding */}
            <div className="p-6">
              <div className="text-zs-signal-gelb font-bold text-xl tracking-tighter">ZUKUNFTSSTOFF</div>
              <div className="text-[10px] uppercase tracking-widest text-[#58B49D] font-bold opacity-80">
                Made in Düren • MiD-PCT
              </div>
            </div>

            {/* Quick-Access Search Trigger */}
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
                  { key: 'personal', label: 'Personalkosten 0812–0820', icon: Users },
                  { key: 'rechnungen', label: 'Sachbelege 0831–0843', icon: FileSpreadsheet },
                  { key: 'mittelabrufe', label: 'Mittelabrufe & profi-online ZA', icon: ArrowDownCircle },
                  { key: 'liqui', label: 'Liquiditätsüberwachung', icon: TrendingUp },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = activePage === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => navigateDirectFromMenu(item.key)}
                      className={`w-full flex items-center gap-3 px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-zs-signal-gelb text-zs-blau-schwarz font-extrabold shadow-sm'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-left">{item.label}</span>
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
                      onClick={() => navigateDirectFromMenu(item.key)}
                      className={`w-full flex items-center gap-3 px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-zs-signal-gelb text-zs-blau-schwarz font-extrabold shadow-sm'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-left">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <span className="px-5 py-2 mt-4 block text-[10px] font-mono tracking-widest text-zinc-500 font-bold uppercase">
                Werkzeuge &amp; Audit
              </span>
              <nav className="space-y-0.5">
                {[
                  { key: 'tvoed_rechner', label: 'TVöD Tarife-Rechner', icon: Calculator },
                  { key: 'import', label: 'KI-PDF & Excel Importer', icon: UploadCloud },
                  { key: 'report', label: 'Berichte & Exporte', icon: FileText },
                  { key: 'audit', label: 'Revisions-Änderungslog', icon: ShieldCheck },
                  { key: 'settings', label: 'Systemeinstellungen', icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = activePage === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => navigateDirectFromMenu(item.key)}
                      className={`w-full flex items-center gap-3 px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-zs-signal-gelb text-zs-blau-schwarz font-extrabold shadow-sm'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-left">{item.label}</span>
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
          <div className="p-4 border-t border-[#112435] bg-[#020d18]/45 text-[10px] font-mono text-zinc-400 leading-snug">
            <div>{AZA_VERSION_META[settings.azaVersion].shortLabel}</div>
            <div className="text-[9px] text-[#58B49D] font-bold mt-1">WIN.DN GmbH &middot; Düren</div>
          </div>
        </aside>
      )}

      {/* Main viewport area */}
      <div className="flex-grow flex flex-col min-h-screen lg:h-screen overflow-hidden">
        {/* ── CENTRAL SUB-HEADER CONTROLS ── */}
        <header className="bg-white border-b border-zinc-200/90 h-16 px-4 lg:px-6 flex items-center justify-between z-10 print:hidden shrink-0 gap-3">
          <div className="flex items-center gap-3">
            {!settings.boardroomMode && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="xl:hidden p-1.5 border border-zinc-200 hover:bg-zinc-100 rounded-lg text-zinc-600 cursor-pointer"
                aria-label="Menü öffnen"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {settings.boardroomMode && (
              <div className="flex items-center gap-2 pr-2 border-r border-zinc-200">
                <span className="font-display font-extrabold text-sm text-zs-blau-schwarz tracking-tight">
                  ZUKUNFTSSTOFF
                </span>
                <span className="text-[10px] font-mono font-bold text-[#58B49D] hidden sm:inline">
                  Boardroom
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase hidden sm:inline">Scope:</span>
              <select
                value={activeYear || ''}
                onChange={(e) => setActiveYear(e.target.value === '' ? null : e.target.value)}
                className="text-xs bg-zinc-50 border border-zinc-300 rounded-full px-3 py-1.5 cursor-pointer font-bold text-zs-blau-schwarz outline-none hover:border-zinc-400 transition-all font-mono"
              >
                <option value="">Alle Förderjahre (2025–2029)</option>
                <option value="gesamt25">2025 (Apr–Dez)</option>
                <option value="2026">Förderjahr 2026</option>
                <option value="2027">Förderjahr 2027</option>
                <option value="2028">Förderjahr 2028</option>
                <option value="mrz29">2029 (Jan–Mär)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg bg-zinc-50 text-zinc-500 select-none cursor-pointer flex items-center gap-2 hover:border-zinc-300 transition-all font-mono"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden md:inline">Strg+K</span>
            </button>

            <button
              onClick={() => handleUpdateSettings({ gamificationMode: !gamificationEnabled })}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                gamificationEnabled
                  ? 'bg-[#041422]/5 text-zs-blau-schwarz border-zinc-300 hover:bg-zinc-100'
                  : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200'
              }`}
              title="Umschalten zwischen Projekt-Steuerung (mit Karte & Trophäen) und neutraler Prüfungs- & Gremien-Ansicht"
            >
              {gamificationEnabled ? (
                <Gamepad2 className="w-3.5 h-3.5 text-[#58B49D]" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-600" />
              )}
              <span className="hidden lg:inline">
                {gamificationEnabled ? 'Projekt-Steuerung' : 'Prüfungs-Ansicht'}
              </span>
            </button>

            <button
              onClick={() => handleUpdateSettings({ privacyMode: !settings.privacyMode })}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                settings.privacyMode
                  ? 'bg-zs-blau-schwarz text-zs-signal-gelb border-zs-blau-schwarz'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
              }`}
              title="Individualgehälter und Personennamen im Cockpit & Reporting ausblenden"
            >
              {settings.privacyMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden lg:inline">{settings.privacyMode ? 'Gehälter maskiert' : 'Gehälter ausblenden'}</span>
            </button>

            <button
              onClick={() => handleUpdateSettings({ boardroomMode: !settings.boardroomMode })}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                settings.boardroomMode
                  ? 'bg-zs-signal-gelb text-zs-blau-schwarz border-zs-signal-gelb font-bold'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
              }`}
              title="Seitenleiste für Aufsichtsrats- oder BAFA-Präsentationen ausblenden"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{settings.boardroomMode ? 'Präsentation beenden' : 'Präsentationsmodus'}</span>
            </button>

            {/* Compliance-Shield + 1-Click-Quests */}
            <div className="relative">
              <button
                onClick={() => setComplianceOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-bold cursor-pointer tabular-nums transition-colors ${
                  complianceShield.status === 'optimal'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                    : complianceShield.status === 'warning'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                    : 'bg-red-50 border-red-300 text-red-800 hover:bg-red-100'
                }`}
                title="BAFA & ANBest-P Compliance-Status mit direkten Maßnahmen"
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  {gamificationEnabled
                    ? `Schutzschild: ${complianceShield.score} %`
                    : `ANBest-P: ${complianceShield.score} %`}
                </span>
                <span className="sm:hidden">{complianceShield.score}%</span>
              </button>

              {complianceOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setComplianceOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl border border-zinc-200 shadow-xl z-40 p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                      <div>
                        <div className="font-display font-bold text-zs-blau-schwarz">
                          {gamificationEnabled
                            ? `BAFA Compliance-Schutzschild (${complianceShield.score} %)`
                            : `Prüfstatus ANBest-P: ${complianceShield.score} % konform`}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {complianceShield.quests.length === 0
                            ? 'Keine offenen Förderrechts- oder Beleglücken.'
                            : `${complianceShield.quests.length} offene Maßnahme(n) zur 100-%-Konformität`}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          complianceShield.status === 'optimal'
                            ? 'bg-emerald-100 text-emerald-800'
                            : complianceShield.status === 'warning'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {complianceShield.score} %
                      </span>
                    </div>

                    {complianceShield.quests.length === 0 ? (
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>Alle ZAs, Vergaben, Fristen und Checkups sind vollständig geprüft.</span>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {complianceShield.quests.map((q) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => {
                              setComplianceOpen(false);
                              handleCockpitDrilldown(
                                q.targetPage,
                                q.subTab
                                  ? { mittelabrufeSubTab: q.subTab as MittelabrufeSubTab }
                                  : {}
                              );
                            }}
                            className="w-full text-left p-2.5 rounded-lg border border-zinc-200 hover:border-zs-blau-schwarz hover:bg-zinc-50 transition-colors cursor-pointer space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-zs-blau-schwarz">{q.title}</span>
                              <span className="font-mono text-[10px] font-bold text-emerald-700 shrink-0">
                                +{q.impactPct} %
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 leading-snug">{q.detail}</p>
                            <div className="text-[10px] font-mono font-bold text-[#041422] flex items-center gap-1 pt-0.5">
                              <span>{q.actionLabel}</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => navigateDirectFromMenu('audit')}
              className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-semibold cursor-pointer ${
                auditVerify.valid
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
              title="GoBD SHA-256 Hash-Ketten-Integrität im Revisionslog prüfen"
            >
              {auditVerify.valid ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-red-700" />
              )}
              <span>GoBD</span>
            </button>

            <button
              onClick={() => navigateDirectFromMenu('mittelabrufe')}
              className="px-3 py-1.5 text-xs font-semibold bg-zs-blau-schwarz text-white rounded-lg hover:bg-[#08243d] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Zum profi-online ZA-Rechner wechseln"
            >
              <Plus className="w-3.5 h-3.5 text-zs-signal-gelb" />
              <span>Neue ZA</span>
            </button>

            <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono text-zinc-600 pl-2 border-l border-zinc-200">
              <span className="font-bold text-zs-blau-schwarz">FKZ {PROFI_STARK_FKZ}</span>
              <span className="text-zinc-300">&middot;</span>
              <span>90/10</span>
            </div>
          </div>
        </header>

        {/* ── CORE VIEW PAGES INJECTOR ── */}
        <main className="flex-grow p-6 overflow-y-auto scrollbar-thin bg-zinc-50/50 print:p-0 print:bg-white">
          {/* DIN-A4 WIN.DN Print Letterhead */}
          <div className="print-letterhead hidden print:flex items-end justify-between mb-6 pb-3 border-b-2 border-[#041422]">
            <div>
              <div className="text-lg font-extrabold tracking-tight text-[#041422]">
                ZUKUNFTSSTOFF – Made in Düren (MiD-PTC)
              </div>
              <div className="text-[11px] font-mono text-zinc-600">
                WIN.DN Wirtschaftsförderung Düren GmbH &middot; STARK-Förderkennzeichen {PROFI_STARK_FKZ}
              </div>
            </div>
            <div className="text-right text-[10px] font-mono text-zinc-600">
              <div>Scope: {activeYearLabel} &middot; 90 % Bund / 10 % Eigenanteil</div>
              <div>
                Planstand: {AZA_VERSION_META[settings.azaVersion].shortLabel} &middot; Druckdatum:{' '}
                {new Date().toLocaleDateString('de-DE')}
              </div>
            </div>
          </div>

          <div
            className={`${
              activePage === 'cockpit' || settings.boardroomMode ? 'max-w-full px-2 lg:px-6' : 'max-w-7xl'
            } mx-auto pb-12 print:pb-0 print:max-w-full print:px-0`}
          >
            {activePage === 'cockpit' && (
              <ExecutiveCockpit
                personal={personal}
                rechnungen={rechnungen}
                mittelabrufe={mittelabrufe}
                zas={zas}
                usecases={usecases}
                vergaben={vergaben}
                oekoprofitCheckups={oekoprofitCheckups}
                mitarbeiterStamm={mitarbeiterStamm}
                settings={settings}
                activeYear={activeYear}
                activeYearLabel={activeYearLabel}
                tasks={tasks}
                achievements={displayAchievements}
                streaks={complianceStreaks}
                onUpdateTask={handleUpdateTask}
                onUpdateUseCase={handleUpdateUseCase}
                onNavigateDetail={handleCockpitDrilldown}
              />
            )}
            {activePage === 'budget' && (
              <BudgetPage
                personal={personal}
                rechnungen={rechnungen}
                mittelabrufe={mittelabrufe}
                buchungen={buchungen}
                mitarbeiterStamm={mitarbeiterStamm}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                activeYear={activeYear}
                activeYearLabel={activeYearLabel}
                onSetGlobalYear={setActiveYear}
                onAddBuchung={handleAddBuchung}
                onUpdateBuchungStatus={handleUpdateBuchungStatus}
                initialTab={budgetTab}
                initialFocus={budgetFocus}
                onFocusChange={setBudgetFocus}
                onBackToCockpit={() => setActivePage('cockpit')}
              />
            )}
            {activePage === 'personal' && (
              <PersonalkostenPage
                personal={personal}
                mitarbeiterList={mitarbeiterList}
                mitarbeiterStamm={mitarbeiterStamm}
                settings={settings}
                onUpdateMitarbeiterStamm={setMitarbeiterStamm}
                activeYear={activeYear}
                activeYearLabel={activeYearLabel}
                onAddEintrag={handleAddPersonal}
                onUpdateEintragStatus={(id, newStatus) => handleUpdatePersonal(id, { status: newStatus })}
                onUpdateMitarbeiterList={handleUpdateMitarbeiterList}
                onRenameMitarbeiterGlobal={handleRenameMitarbeiterGlobal}
                onRenameSingleMitarbeiter={handleRenameSingleMitarbeiter}
                initialQuarter={personalQuarterFilter}
                onQuarterChange={setPersonalQuarterFilter}
                onUpdateEintrag={handleUpdatePersonal}
              />
            )}
            {activePage === 'rechnungen' && (
              <RechnungsPage
                rechnungen={rechnungen}
                vergaben={vergaben}
                usecases={usecases}
                settings={settings}
                activeYear={activeYear}
                activeYearLabel={activeYearLabel}
                onAddRechnung={handleAddRechnung}
                onUpdateRechnungStatus={(id, newStatus) => handleUpdateRechnung(id, { status: newStatus })}
                initialCategory={rechnungenKategorieFilter}
                onCategoryChange={setRechnungenKategorieFilter}
                initialProfiPos={rechnungenProfiPosFilter}
                onProfiPosChange={setRechnungenProfiPosFilter}
                onBackToCockpit={() => setActivePage('cockpit')}
              />
            )}
            {activePage === 'mittelabrufe' && (
              <MittelabrufePage
                mittelabrufe={mittelabrufe}
                personal={personal}
                rechnungen={rechnungen}
                zas={zas}
                mitarbeiterStamm={mitarbeiterStamm}
                settings={settings}
                activeYear={activeYear}
                activeYearLabel={activeYearLabel}
                onAddMittelabruf={handleAddMittelabruf}
                onUpdateMittelabrufStatus={handleUpdateMittelabrufStatus}
                onSaveZa={handleSaveZa}
                onDeleteZa={handleDeleteZa}
                initialGeber={mittelabrufeGeberFilter}
                onGeberChange={setMittelabrufeGeberFilter}
                initialSubTab={mittelabrufeSubTab}
                onSubTabChange={setMittelabrufeSubTab}
                initialStatusFilter={mittelabrufeStatusFilter}
                onStatusFilterChange={setMittelabrufeStatusFilter}
                onBackToCockpit={() => setActivePage('cockpit')}
                onQuickBackupSnapshot={handleQuickBackupSnapshot}
                onNavigateToRechnungen={() => navigateDirectFromMenu('rechnungen')}
              />
            )}
            {activePage === 'liqui' && (
              <LiquiditaetsPage
                personal={personal}
                rechnungen={rechnungen}
                mittelabrufe={mittelabrufe}
                buchungen={buchungen}
                settings={settings}
                activeYear={activeYear}
                activeYearLabel={activeYearLabel}
              />
            )}
            {activePage === 'vergaben' && (
              <VergabePage
                vergaben={vergaben}
                usecases={usecases}
                oekoprofitCheckups={oekoprofitCheckups}
                settings={settings}
                activeYear={activeYear}
                activeYearLabel={activeYearLabel}
                onAddVergabe={handleAddVergabe}
                onUpdateVergabe={handleUpdateVergabe}
                onDeleteVergabe={handleDeleteVergabe}
                onAddOekoprofit={handleAddOekoprofit}
                onUpdateOekoprofit={handleUpdateOekoprofit}
                onDeleteOekoprofit={handleDeleteOekoprofit}
                onCreateOekoprofitInvoice={handleCreateOekoprofitInvoice}
                onNavigateToRechnungen={() => navigateDirectFromMenu('rechnungen')}
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
                onResetBatch2={handleResetBatch2}
                vergaben={vergaben}
                oekoprofitCheckups={oekoprofitCheckups}
                settings={settings}
                initialUseCaseId={selectedUseCaseId}
              />
            )}
            {activePage === 'partner' && (
              <PartnerPage
                partners={partners}
                matches={matches}
                oekoprofitCheckups={oekoprofitCheckups}
                usecases={usecases}
                onAddPartner={handleAddPartner}
                onUpdatePartner={handleUpdatePartner}
                onDeletePartner={handleDeletePartner}
                onToggleMatch={handleToggleMatch}
                onCreateBoosterPipeline={handleCreateBoosterPipeline}
                onNavigateToVergaben={() => navigateDirectFromMenu('vergaben')}
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
                settings={settings}
                zas={zas}
                onImportPersonal={handleImportPersonal}
                onImportRechnungen={handleImportRechnungen}
                onImportMittelabrufe={handleImportMittelabrufe}
                onImportVergaben={handleImportVergaben}
                onImportPartners={handleImportPartners}
                onAddRechnung={handleAddRechnung}
                onSaveZa={handleSaveZa}
              />
            )}
            {activePage === 'report' && (
              <ReportingPage
                personal={personal}
                rechnungen={rechnungen}
                mittelabrufe={mittelabrufe}
                zas={zas}
                vergaben={vergaben}
                mitarbeiterStamm={mitarbeiterStamm}
                settings={settings}
                activeYear={activeYear}
                activeYearLabel={activeYearLabel}
              />
            )}
            {activePage === 'audit' && <AuditLogPage logs={logs} />}
            {activePage === 'tvoed_rechner' && <TVoDRechnerPage settings={settings} />}
            {activePage === 'settings' && (
              <SettingsPage
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                serverSyncStatus={serverSyncStatus}
                lastServerSync={lastServerSync}
                onSyncWithServer={handleSyncWithServer}
                onResetDatabase={handleResetDatabase}
                onLoadJSONSnapshot={onLoadJSONSnapshot}
                exportDatabaseSnapshot={exportDatabaseSnapshot}
              />
            )}
          </div>
        </main>
      </div>

      {/* Hinweise zu neu freigeschalteten Abzeichen (nur Projekt-Steuerung) */}
      {gamificationEnabled && (
        <AchievementToastStack items={achievementToasts} onDismiss={dismissAchievementToast} />
      )}

      {/* ── MODAL: GLOBAL SEARCH MODAL (Ctrl+K overlay) ── */}
      {searchOpen && (
        <div
          className="fixed inset-0 bg-[#041422]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-200 flex items-center gap-3">
              <Search className="w-5 h-5 text-zinc-400" />
              <input
                type="text"
                autoFocus
                placeholder="Suchen... (Abrufnummer, Name, Kreditor, ZA)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-sans outline-none text-zinc-800"
              />
              <kbd className="px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 font-mono text-[9px] text-[#041422] font-semibold">
                ESC
              </kbd>
            </div>

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

            <div className="p-3 border-t border-zinc-200 bg-zinc-50/50 flex justify-between text-[9px] font-mono text-zinc-400">
              <span>Navigieren Sie per Mausklick</span>
              <span>Made in Düren &bull; WIN.DN</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
