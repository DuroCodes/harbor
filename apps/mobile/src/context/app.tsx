import { router } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  addWidget,
  availableToAdd,
  defaultLayout,
  loadWidgets,
  moveWidgetToIndex,
  packRows,
  persistWidgets,
  relocateWidget,
  removeWidget,
  toggleWidth,
  type DashboardWidgetItem,
  type DashboardWidgetKind,
} from '@/components/board/layout';
import { DEFAULT_CATEGORIES } from '@/data/categories';
import { mapAccountDTO, mapTransactionDTO } from '@/lib/plaid/mapper';
import { isProxyConfigured, plaidProxy } from '@/lib/plaid/client';
import { SecureKeys, secureDelete, secureGet, secureSet } from '@/lib/secure';
import { storage } from '@/lib/storage';
import {
  buildNetWorthSeries,
  cashFlowSankey,
  categoryBudgetProgress,
  monthlyCashFlow,
  netWorth,
} from '@/lib/calc';
import {
  accountGroup,
  type Account,
  type Category,
  type CashFlowSankeyData,
  type CategoryBudgetProgress,
  type Institution,
  type MonthlyCashFlow,
  type NetWorthSnapshot,
  type NetWorthSummary,
  type Transaction,
} from '@/lib/types';

const PROXY_URL_KEY = 'harbor.proxy.url';
const PROXY_KEY_KEY = 'harbor.proxy.apikey';
const DATA_KEY = 'harbor.local.data.v1';
const CURSOR_KEY = 'harbor.sync.cursors.v1';

type LocalData = {
  institutions: Institution[];
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  snapshots: NetWorthSnapshot[];
};

type AppContextValue = {
  hasAccounts: boolean;
  proxyConfigured: boolean;
  isSyncing: boolean;
  lastSyncError: string | null;
  institutions: Institution[];
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  snapshots: NetWorthSnapshot[];
  /** Snapshot series for the chart (recorded and/or reconstructed from txns). */
  netWorthHistory: NetWorthSnapshot[];
  widgets: DashboardWidgetItem[];
  widgetRows: DashboardWidgetItem[][];
  availableWidgets: DashboardWidgetKind[];
  summary: NetWorthSummary;
  cashFlow: MonthlyCashFlow;
  sankeyData: CashFlowSankeyData;
  budgetProgress: CategoryBudgetProgress[];
  categoriesById: Record<string, Category>;
  institutionsById: Record<string, Institution>;
  accountsById: Record<string, Account>;
  proxyURL: string;
  proxyAPIKey: string;
  setProxyURL: (v: string) => void;
  setProxyAPIKey: (v: string) => void;
  saveProxySettings: (url?: string, key?: string) => Promise<void>;
  connectWithPublicToken: (args: {
    publicToken: string;
    institutionName?: string | null;
    institutionID?: string | null;
  }) => Promise<void>;
  refreshAll: () => Promise<void>;
  unlinkInstitution: (institutionID: string) => Promise<void>;
  updateTransactionNotes: (id: string, notes: string) => void;
  setBudget: (categoryID: string, amount: number | null) => void;
  addDashboardWidget: (kind: DashboardWidgetKind) => void;
  removeDashboardWidget: (id: string) => void;
  toggleDashboardWidth: (id: string) => void;
  relocateDashboardWidget: (id: string, toIndex: number) => void;
  /** Live reorder during drag — updates UI without writing storage. */
  previewMove: (id: string, toIndex: number) => void;
  /** Persist current widget order after a drag ends. */
  commitLayout: () => void;
  resetLayout: () => void;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  /** App lock — gated at root until unlocked. */
  lockEnabled: boolean;
  lockUnlocked: boolean;
  lockBiometricsEnabled: boolean;
  lockBiometricsAvailable: boolean;
  lockBiometricsName: string;
  unlockApp: () => void;
  refreshLockState: (mode?: 'boot' | 'settings') => Promise<void>;
  setLockBiometricsEnabled: (enabled: boolean) => Promise<void>;
  clearAppLock: () => Promise<void>;
  openConnect: () => void;
  openCashFlow: () => void;
  openActivity: () => void;
  openAccounts: () => void;
  openBudgets: () => void;
  openNetWorth: () => void;
  openTransaction: (id: string) => void;
  openAccount: (id: string) => void;
  getTransaction: (id: string) => Transaction | undefined;
  getAccount: (id: string) => Account | undefined;
  toCashFlowInputs: (txns?: Transaction[]) => ReturnType<typeof mapTxnInputs>;
};

const mapTxnInputs = (
  transactions: Transaction[],
  categoriesById: Record<string, Category>
) =>
  transactions.map((t) => {
    const cat = t.categoryID ? categoriesById[t.categoryID] : undefined;
    return {
      amount: t.amount,
      date: new Date(t.date),
      status: t.status,
      isIncome: cat?.isIncome ?? false,
      isTransfer: cat?.isTransfer ?? false,
      categoryID: t.categoryID,
      categoryName: cat?.name,
      categoryImage: cat?.systemImage,
    };
  });

const ensureCategories = (existing: Category[]): Category[] => {
  if (existing.length === 0) return DEFAULT_CATEGORIES.map((c) => ({ ...c }));

  const byId = new Map(DEFAULT_CATEGORIES.map((c) => [c.id, c]));
  const byName = new Map(DEFAULT_CATEGORIES.map((c) => [c.name, c]));

  return existing.map((c) => {
    const def = byId.get(c.id) ?? byName.get(c.name);
    if (!def) return c;
    return {
      ...c,
      systemImage: def.systemImage,
      plaidPrimaryKeys: c.plaidPrimaryKeys?.length
        ? c.plaidPrimaryKeys
        : def.plaidPrimaryKeys,
      isIncome: def.isIncome,
      isTransfer: def.isTransfer,
    };
  });
};

const loadCursors = async (): Promise<Record<string, string | null>> => {
  try {
    const raw = await storage.getItem(CURSOR_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string | null>) : {};
  } catch {
    return {};
  }
};

const saveCursors = async (cursors: Record<string, string | null>) => {
  await storage.setItem(CURSOR_KEY, JSON.stringify(cursors));
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [widgets, setWidgets] =
    useState<DashboardWidgetItem[]>(defaultLayout());
  const [proxyURL, setProxyURL] = useState('');
  const [proxyAPIKey, setProxyAPIKey] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [lockUnlocked, setLockUnlocked] = useState(true);
  const [lockBiometricsEnabled, setLockBiometricsFlag] = useState(false);
  const [lockBiometricsAvailable, setLockBiometricsAvailable] = useState(false);
  const [lockBiometricsName, setLockBiometricsName] = useState('Biometrics');

  const hasAccounts = accounts.some((a) => a.isActive && !a.isHidden);
  const proxyConfigured = isProxyConfigured(proxyURL, proxyAPIKey);

  const refreshLockState = useCallback(
    async (mode: 'boot' | 'settings' = 'settings') => {
      const { loadAppLockState } = await import('@/lib/lock');
      const snap = await loadAppLockState();
      setLockEnabled(snap.hasPasscode);
      setLockBiometricsFlag(snap.biometricsEnabled);
      setLockBiometricsAvailable(snap.biometricsAvailable);
      setLockBiometricsName(snap.biometricsName);
      if (mode === 'boot') {
        setLockUnlocked(snap.isUnlocked);
      } else if (!snap.hasPasscode) {
        setLockUnlocked(true);
      }
    },
    []
  );

  const unlockApp = useCallback(() => {
    setLockUnlocked(true);
  }, []);

  const setLockBiometricsEnabled = useCallback(async (enabled: boolean) => {
    const { setBiometricsEnabled } = await import('@/lib/lock');
    await setBiometricsEnabled(enabled);
    setLockBiometricsFlag(enabled);
  }, []);

  const clearAppLock = useCallback(async () => {
    const { clearPasscode } = await import('@/lib/lock');
    await clearPasscode();
    setLockEnabled(false);
    setLockBiometricsFlag(false);
    setLockUnlocked(true);
  }, []);

  const persistData = useCallback(
    async (next: Partial<LocalData> & { keep?: boolean }) => {
      const payload: LocalData = {
        institutions: next.institutions ?? institutions,
        accounts: next.accounts ?? accounts,
        transactions: next.transactions ?? transactions,
        categories: next.categories ?? categories,
        snapshots: next.snapshots ?? snapshots,
      };
      await storage.setItem(DATA_KEY, JSON.stringify(payload));
    },
    [institutions, accounts, transactions, categories, snapshots]
  );

  useEffect(() => {
    (async () => {
      // Prefer SecureStore for proxy secrets; migrate from AsyncStorage once.
      let url = await secureGet(SecureKeys.proxyURL);
      let key = await secureGet(SecureKeys.proxyAPIKey);
      const legacyURL = await storage.getItem(PROXY_URL_KEY);
      const legacyKey = await storage.getItem(PROXY_KEY_KEY);
      if (!url && legacyURL) {
        url = legacyURL;
        await secureSet(SecureKeys.proxyURL, legacyURL);
        await storage.removeItem(PROXY_URL_KEY);
      }
      if (!key && legacyKey) {
        key = legacyKey;
        await secureSet(SecureKeys.proxyAPIKey, legacyKey);
        await storage.removeItem(PROXY_KEY_KEY);
      }

      const [w, raw] = await Promise.all([
        loadWidgets(),
        storage.getItem(DATA_KEY),
      ]);
      setWidgets(w);
      if (url) setProxyURL(url);
      if (key) setProxyAPIKey(key);
      await storage.removeItem('harbor.demo.enabled');
      if (raw) {
        try {
          const data = JSON.parse(raw) as LocalData;
          setInstitutions(data.institutions ?? []);
          setAccounts(data.accounts ?? []);
          setTransactions(data.transactions ?? []);
          setCategories(ensureCategories(data.categories ?? []));
          setSnapshots(data.snapshots ?? []);
        } catch {
          setCategories(DEFAULT_CATEGORIES);
        }
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
      await refreshLockState('boot');
      setReady(true);
    })();
  }, [refreshLockState]);

  const persistLayout = useCallback((next: DashboardWidgetItem[]) => {
    setWidgets(next);
    void persistWidgets(next);
  }, []);

  const widgetsRef = useRef(widgets);
  widgetsRef.current = widgets;

  const previewMove = useCallback((id: string, toIndex: number) => {
    setWidgets((prev) => moveWidgetToIndex(prev, id, toIndex));
  }, []);

  const commitLayout = useCallback(() => {
    void persistWidgets(widgetsRef.current);
  }, []);

  const categoriesById = useMemo(() => {
    const map: Record<string, Category> = {};
    for (const c of categories) map[c.id] = c;
    return map;
  }, [categories]);

  const institutionsById = useMemo(() => {
    const map: Record<string, Institution> = {};
    for (const i of institutions) map[i.id] = i;
    return map;
  }, [institutions]);

  const accountsById = useMemo(() => {
    const map: Record<string, Account> = {};
    for (const a of accounts) map[a.id] = a;
    return map;
  }, [accounts]);

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.isActive && !a.isHidden),
    [accounts]
  );

  const summary = useMemo(
    () =>
      netWorth(
        activeAccounts.map((a) => ({
          group: accountGroup(a),
          currentBalance: a.currentBalance,
          isActive: a.isActive,
        }))
      ),
    [activeAccounts]
  );

  const txnInputs = useMemo(
    () => mapTxnInputs(transactions, categoriesById),
    [transactions, categoriesById]
  );

  const netWorthHistory = useMemo(
    () =>
      buildNetWorthSeries(
        summary.netWorth,
        snapshots,
        transactions.map((t) => ({
          date: t.date,
          amount: t.amount,
          status: t.status,
          isRemoved: t.isRemoved,
          isTransfer: t.categoryID
            ? (categoriesById[t.categoryID]?.isTransfer ?? false)
            : false,
        })),
        90
      ),
    [summary.netWorth, snapshots, transactions, categoriesById]
  );

  const cashFlow = useMemo(
    () => monthlyCashFlow(txnInputs, new Date()),
    [txnInputs]
  );
  const sankeyData = useMemo(
    () => cashFlowSankey(txnInputs, new Date()),
    [txnInputs]
  );

  const budgetProgress = useMemo(() => {
    const budgets = categories
      .filter((c) => !c.isIncome && !c.isTransfer)
      .filter((c) => (c.monthlyBudgetLimit ?? 0) > 0)
      .map((c) => ({
        categoryID: c.id,
        categoryName: c.name,
        systemImage: c.systemImage,
        monthlyLimit: c.monthlyBudgetLimit!,
      }));
    return categoryBudgetProgress(budgets, txnInputs, new Date());
  }, [categories, txnInputs]);

  const recordSnapshot = useCallback(
    (nextAccounts: Account[], prevSnapshots: NetWorthSnapshot[]) => {
      const active = nextAccounts.filter((a) => a.isActive && !a.isHidden);
      const s = netWorth(
        active.map((a) => ({
          group: accountGroup(a),
          currentBalance: a.currentBalance,
          isActive: a.isActive,
        }))
      );
      const today = new Date().toISOString().slice(0, 10);
      const point: NetWorthSnapshot = {
        id: `nw-${today}`,
        date: `${today}T12:00:00.000Z`,
        netWorth: s.netWorth,
        cash: s.cash,
        investments: s.investments,
        credit: s.credit,
      };
      const withoutToday = prevSnapshots.filter(
        (p) => !p.date.startsWith(today)
      );
      return [...withoutToday, point].sort(
        (a, b) => +new Date(a.date) - +new Date(b.date)
      );
    },
    []
  );

  const syncItemID = useCallback(
    async (
      itemID: string,
      state: {
        institutions: Institution[];
        accounts: Account[];
        transactions: Transaction[];
        categories: Category[];
      }
    ) => {
      const cursors = await loadCursors();
      let cursor = cursors[itemID] ?? null;
      let nextInstitutions = [...state.institutions];
      let nextAccounts = [...state.accounts];
      let nextTransactions = [...state.transactions];
      const cats = state.categories;

      let hasMore = true;
      let safety = 0;
      while (hasMore && safety < 50) {
        safety += 1;
        const response = await plaidProxy.syncItem(
          { itemID, cursor },
          proxyURL,
          proxyAPIKey
        );

        const institution = nextInstitutions.find(
          (i) => i.plaidItemID === itemID
        );
        const institutionID = institution?.id ?? itemID;

        for (const dto of response.accounts) {
          const mapped = mapAccountDTO(dto, institutionID);
          const idx = nextAccounts.findIndex(
            (a) => a.plaidAccountID === mapped.plaidAccountID
          );
          if (idx >= 0)
            nextAccounts[idx] = {
              ...nextAccounts[idx],
              ...mapped,
              id: nextAccounts[idx].id,
            };
          else nextAccounts.push(mapped);
        }

        const upsertTxn = (dto: (typeof response.added)[number]) => {
          const mapped = mapTransactionDTO(dto, cats);
          // Match pending→posted first (local.plaidTransactionID == dto.pendingTransactionID),
          // then by current Plaid transaction id — preserves local id + notes.
          let idx = -1;
          if (dto.pendingTransactionID) {
            idx = nextTransactions.findIndex(
              (t) => t.plaidTransactionID === dto.pendingTransactionID
            );
          }
          if (idx < 0) {
            idx = nextTransactions.findIndex(
              (t) => t.plaidTransactionID === mapped.plaidTransactionID
            );
          }
          if (idx >= 0) {
            const existing = nextTransactions[idx];
            nextTransactions[idx] = {
              ...existing,
              ...mapped,
              id: existing.id,
              notes: existing.notes,
            };
          } else {
            nextTransactions.push({
              ...mapped,
              id: mapped.plaidTransactionID,
              notes: null,
            });
          }
        };
        response.added.forEach(upsertTxn);
        response.modified.forEach(upsertTxn);
        for (const removed of response.removed) {
          nextTransactions = nextTransactions.map((t) =>
            t.plaidTransactionID === removed.transactionID
              ? { ...t, isRemoved: true, status: 'removed' as const }
              : t
          );
        }

        cursor = response.nextCursor ?? null;
        hasMore = response.hasMore;
      }

      cursors[itemID] = cursor;
      await saveCursors(cursors);

      nextInstitutions = nextInstitutions.map((i) =>
        i.plaidItemID === itemID
          ? { ...i, lastSyncedAt: new Date().toISOString() }
          : i
      );

      return { nextInstitutions, nextAccounts, nextTransactions };
    },
    [proxyURL, proxyAPIKey]
  );

  const connectWithPublicToken = useCallback(
    async (args: {
      publicToken: string;
      institutionName?: string | null;
      institutionID?: string | null;
    }) => {
      setLastSyncError(null);
      const response = await plaidProxy.exchangePublicToken(
        {
          publicToken: args.publicToken,
          institutionName: args.institutionName,
          institutionID: args.institutionID,
        },
        proxyURL,
        proxyAPIKey
      );

      const cats = ensureCategories(categories);
      const institution: Institution = {
        id: response.itemID,
        plaidItemID: response.itemID,
        name: args.institutionName?.trim() || 'Connected Institution',
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      let nextInstitutions = [
        ...institutions.filter((i) => i.plaidItemID !== response.itemID),
        institution,
      ];
      let nextAccounts = [
        ...accounts.filter((a) => a.institutionID !== institution.id),
        ...response.accounts.map((dto) => mapAccountDTO(dto, institution.id)),
      ];
      let nextTransactions = [...transactions];

      const synced = await syncItemID(response.itemID, {
        institutions: nextInstitutions,
        accounts: nextAccounts,
        transactions: nextTransactions,
        categories: cats,
      });
      nextInstitutions = synced.nextInstitutions;
      nextAccounts = synced.nextAccounts;
      nextTransactions = synced.nextTransactions;

      // Plaid usually returns ~30 days immediately; the rest of
      // `transactions.days_requested` history arrives shortly after. Re-sync a
      // few times so we don't strand the user on the initial window.
      for (const delayMs of [2_000, 5_000, 10_000]) {
        await new Promise((r) => setTimeout(r, delayMs));
        try {
          const again = await syncItemID(response.itemID, {
            institutions: nextInstitutions,
            accounts: nextAccounts,
            transactions: nextTransactions,
            categories: cats,
          });
          nextInstitutions = again.nextInstitutions;
          nextAccounts = again.nextAccounts;
          nextTransactions = again.nextTransactions;
        } catch {
          break;
        }
      }

      const nextSnapshots = recordSnapshot(nextAccounts, snapshots);

      setInstitutions(nextInstitutions);
      setAccounts(nextAccounts);
      setTransactions(nextTransactions);
      setCategories(cats);
      setSnapshots(nextSnapshots);
      await persistData({
        institutions: nextInstitutions,
        accounts: nextAccounts,
        transactions: nextTransactions,
        categories: cats,
        snapshots: nextSnapshots,
      });
    },
    [
      categories,
      institutions,
      accounts,
      transactions,
      snapshots,
      proxyURL,
      proxyAPIKey,
      syncItemID,
      recordSnapshot,
      persistData,
    ]
  );

  const refreshAll = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setLastSyncError(null);
    try {
      const cats = ensureCategories(categories);
      setCategories(cats);

      let nextInstitutions = [...institutions];
      let nextAccounts = [...accounts];
      let nextTransactions = [...transactions];

      if (proxyConfigured) {
        for (const institution of institutions.filter((i) => i.isActive)) {
          const synced = await syncItemID(institution.plaidItemID, {
            institutions: nextInstitutions,
            accounts: nextAccounts,
            transactions: nextTransactions,
            categories: cats,
          });
          nextInstitutions = synced.nextInstitutions;
          nextAccounts = synced.nextAccounts;
          nextTransactions = synced.nextTransactions;
        }
      }

      const nextSnapshots = recordSnapshot(nextAccounts, snapshots);
      setInstitutions(nextInstitutions);
      setAccounts(nextAccounts);
      setTransactions(nextTransactions);
      setSnapshots(nextSnapshots);
      await persistData({
        institutions: nextInstitutions,
        accounts: nextAccounts,
        transactions: nextTransactions,
        categories: cats,
        snapshots: nextSnapshots,
      });
    } catch (err) {
      setLastSyncError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [
    isSyncing,
    categories,
    institutions,
    accounts,
    transactions,
    snapshots,
    proxyConfigured,
    syncItemID,
    recordSnapshot,
    persistData,
  ]);

  const unlinkInstitution = useCallback(
    async (institutionID: string) => {
      const institution = institutions.find((i) => i.id === institutionID);
      if (!institution) return;
      if (proxyConfigured) {
        try {
          await plaidProxy.removeItem(
            { itemID: institution.plaidItemID },
            proxyURL,
            proxyAPIKey
          );
        } catch {
          // Still delete local data if proxy remove fails.
        }
      }
      const nextInstitutions = institutions.filter(
        (i) => i.id !== institutionID
      );
      const nextAccounts = accounts.filter(
        (a) => a.institutionID !== institutionID
      );
      const accountIDs = new Set(
        accounts
          .filter((a) => a.institutionID === institutionID)
          .map((a) => a.id)
      );
      const nextTransactions = transactions.filter(
        (t) => !t.accountID || !accountIDs.has(t.accountID)
      );
      const nextSnapshots = recordSnapshot(nextAccounts, snapshots);
      // Drop sync cursor for this Item.
      const cursors = await loadCursors();
      delete cursors[institution.plaidItemID];
      await saveCursors(cursors);
      setInstitutions(nextInstitutions);
      setAccounts(nextAccounts);
      setTransactions(nextTransactions);
      setSnapshots(nextSnapshots);
      await persistData({
        institutions: nextInstitutions,
        accounts: nextAccounts,
        transactions: nextTransactions,
        snapshots: nextSnapshots,
      });
    },
    [
      institutions,
      accounts,
      transactions,
      snapshots,
      proxyConfigured,
      proxyURL,
      proxyAPIKey,
      recordSnapshot,
      persistData,
    ]
  );

  const setBudget = useCallback(
    (categoryID: string, amount: number | null) => {
      setCategories((prev) => {
        const next = prev.map((c) =>
          c.id === categoryID
            ? { ...c, monthlyBudgetLimit: amount && amount > 0 ? amount : null }
            : c
        );
        void persistData({ categories: next });
        return next;
      });
    },
    [persistData]
  );

  const updateTransactionNotes = useCallback(
    (id: string, notes: string) => {
      setTransactions((prev) => {
        const next = prev.map((t) =>
          t.id === id ? { ...t, notes: notes.trim() ? notes : null } : t
        );
        void persistData({ transactions: next });
        return next;
      });
    },
    [persistData]
  );

  const saveProxySettings = useCallback(
    async (url?: string, key?: string) => {
      const nextURL = (url ?? proxyURL).trim().replace(/\/$/, '');
      const nextKey = (key ?? proxyAPIKey).trim();
      setProxyURL(nextURL);
      setProxyAPIKey(nextKey);
      if (nextURL) await secureSet(SecureKeys.proxyURL, nextURL);
      else await secureDelete(SecureKeys.proxyURL);
      if (nextKey) await secureSet(SecureKeys.proxyAPIKey, nextKey);
      else await secureDelete(SecureKeys.proxyAPIKey);
      // Clear any leftover AsyncStorage secrets.
      await storage.removeItem(PROXY_URL_KEY);
      await storage.removeItem(PROXY_KEY_KEY);
    },
    [proxyURL, proxyAPIKey]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      hasAccounts,
      proxyConfigured,
      isSyncing,
      lastSyncError,
      institutions,
      accounts: activeAccounts,
      transactions: transactions
        .filter((t) => !t.isRemoved)
        .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
      categories: [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
      snapshots,
      netWorthHistory,
      widgets,
      widgetRows: packRows(widgets),
      availableWidgets: availableToAdd(widgets),
      summary,
      cashFlow,
      sankeyData,
      budgetProgress,
      categoriesById,
      institutionsById,
      accountsById,
      proxyURL,
      proxyAPIKey,
      setProxyURL,
      setProxyAPIKey,
      saveProxySettings,
      connectWithPublicToken,
      refreshAll,
      unlinkInstitution,
      updateTransactionNotes,
      setBudget,
      addDashboardWidget: (kind) => persistLayout(addWidget(widgets, kind)),
      removeDashboardWidget: (id) => persistLayout(removeWidget(widgets, id)),
      toggleDashboardWidth: (id) => persistLayout(toggleWidth(widgets, id)),
      relocateDashboardWidget: (id, to) =>
        persistLayout(relocateWidget(widgets, id, to)),
      previewMove,
      commitLayout,
      resetLayout: () => persistLayout(defaultLayout()),
      settingsOpen,
      openSettings: () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false),
      lockEnabled,
      lockUnlocked,
      lockBiometricsEnabled,
      lockBiometricsAvailable,
      lockBiometricsName,
      unlockApp,
      refreshLockState,
      setLockBiometricsEnabled,
      clearAppLock,
      openConnect: () => router.push('/connect'),
      openCashFlow: () => router.push('/cash-flow'),
      openActivity: () => router.push('/activity'),
      openAccounts: () => router.push('/accounts'),
      openBudgets: () => router.push('/budgets'),
      openNetWorth: () => router.push('/net-worth'),
      openTransaction: (id) => router.push(`/transaction/${id}`),
      openAccount: (id) => router.push(`/account/${id}`),
      getTransaction: (id) => transactions.find((t) => t.id === id),
      getAccount: (id) => accounts.find((a) => a.id === id),
      toCashFlowInputs: (txns) =>
        mapTxnInputs(txns ?? transactions, categoriesById),
    }),
    [
      hasAccounts,
      proxyConfigured,
      isSyncing,
      lastSyncError,
      institutions,
      activeAccounts,
      transactions,
      categories,
      snapshots,
      netWorthHistory,
      widgets,
      summary,
      cashFlow,
      sankeyData,
      budgetProgress,
      categoriesById,
      institutionsById,
      accountsById,
      proxyURL,
      proxyAPIKey,
      saveProxySettings,
      connectWithPublicToken,
      refreshAll,
      unlinkInstitution,
      updateTransactionNotes,
      setBudget,
      persistLayout,
      previewMove,
      commitLayout,
      accounts,
      settingsOpen,
      lockEnabled,
      lockUnlocked,
      lockBiometricsEnabled,
      lockBiometricsAvailable,
      lockBiometricsName,
      unlockApp,
      refreshLockState,
      setLockBiometricsEnabled,
      clearAppLock,
    ]
  );

  if (!ready) return null;

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
};
