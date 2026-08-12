import type {
  AccountBalanceInput,
  CashFlowLink,
  CashFlowNode,
  CashFlowSankeyData,
  CashFlowTransactionInput,
  CategoryBudgetInput,
  CategoryBudgetProgress,
  MonthlyCashFlow,
  NetWorthSnapshot,
  NetWorthSummary,
} from './types';

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date: Date, months: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

export const netWorth = (accounts: AccountBalanceInput[]): NetWorthSummary => {
  let cash = 0;
  let investments = 0;
  let credit = 0;

  for (const account of accounts) {
    if (!account.isActive) continue;
    const balance = account.currentBalance;
    switch (account.group) {
      case 'cash':
        cash += balance;
        break;
      case 'investments':
        investments += balance;
        break;
      case 'credit':
        credit += Math.abs(balance);
        break;
      case 'other':
        if (balance >= 0) cash += balance;
        else credit += Math.abs(balance);
        break;
    }
  }

  return {
    cash,
    investments,
    credit,
    netWorth: cash + investments - credit,
  };
};

export const monthlyCashFlow = (
  transactions: CashFlowTransactionInput[],
  month: Date
): MonthlyCashFlow => {
  const breakdown = cashFlowSankey(transactions, month);
  return {
    income: breakdown.totalIncome,
    spending: breakdown.totalSpending,
    net: breakdown.totalIncome - breakdown.totalSpending,
  };
};

type CategoryBucket = { title: string; amount: number; image?: string | null };

export const cashFlowSankey = (
  transactions: CashFlowTransactionInput[],
  month: Date
): CashFlowSankeyData => {
  const start = startOfMonth(month);
  const end = addMonths(start, 1);

  const incomeByCategory = new Map<string, CategoryBucket>();
  const expenseByCategory = new Map<string, CategoryBucket>();

  for (const txn of transactions) {
    if (txn.status !== 'posted' && txn.status !== 'pending') continue;
    if (txn.date < start || txn.date >= end) continue;
    if (txn.isTransfer) continue;

    const key = txn.categoryID ?? txn.categoryName ?? 'other';
    const title = txn.categoryName ?? 'Other';
    const image = txn.categoryImage;
    const amount = Math.abs(txn.amount);

    if (txn.isIncome) {
      const existing = incomeByCategory.get(key);
      incomeByCategory.set(key, {
        title,
        amount: (existing?.amount ?? 0) + amount,
        image: image ?? existing?.image ?? 'arrow.down.circle',
      });
    } else if (txn.amount < 0) {
      if (
        title !== 'Other' &&
        !txn.isIncome &&
        (expenseByCategory.has(key) || txn.categoryName != null)
      ) {
        const existing = expenseByCategory.get(key);
        const next = (existing?.amount ?? 0) - amount;
        if (next > 0) {
          expenseByCategory.set(key, {
            title,
            amount: next,
            image: image ?? existing?.image,
          });
        } else {
          expenseByCategory.delete(key);
          if (next < 0) {
            const incomeKey = 'income-general';
            const existingIncome = incomeByCategory.get(incomeKey);
            incomeByCategory.set(incomeKey, {
              title: 'Income',
              amount: (existingIncome?.amount ?? 0) + Math.abs(next),
              image: 'arrow.down.circle',
            });
          }
        }
      } else {
        const existing = incomeByCategory.get(key);
        incomeByCategory.set(key, {
          title: title === 'Other' ? 'Income' : title,
          amount: (existing?.amount ?? 0) + amount,
          image: image ?? existing?.image ?? 'arrow.down.circle',
        });
      }
    } else if (txn.amount > 0) {
      const existing = expenseByCategory.get(key);
      expenseByCategory.set(key, {
        title,
        amount: (existing?.amount ?? 0) + amount,
        image: image ?? existing?.image,
      });
    }
  }

  const incomeNodes: CashFlowNode[] = [...incomeByCategory.entries()]
    .map(([key, value]) => ({
      id: `in-${key}`,
      title: value.title,
      amount: value.amount,
      systemImage: value.image,
      kind: 'income' as const,
    }))
    .sort((a, b) => b.amount - a.amount);

  const expenseNodes: CashFlowNode[] = [...expenseByCategory.entries()]
    .map(([key, value]) => ({
      id: `out-${key}`,
      title: value.title,
      amount: value.amount,
      systemImage: value.image,
      kind: 'expense' as const,
    }))
    .sort((a, b) => b.amount - a.amount);

  const totalIncome = incomeNodes.reduce((sum, n) => sum + n.amount, 0);
  const totalSpending = expenseNodes.reduce((sum, n) => sum + n.amount, 0);
  const leftover = totalIncome - totalSpending;

  const outflowNodes = [...expenseNodes];
  if (leftover > 0) {
    outflowNodes.push({
      id: 'out-leftover',
      title: 'Left over',
      amount: leftover,
      systemImage: 'leaf',
      kind: 'leftover',
    });
  }

  const outflowTotal = outflowNodes.reduce((sum, n) => sum + n.amount, 0);
  const links: CashFlowLink[] = [];

  if (outflowTotal > 0 && incomeNodes.length > 0) {
    for (const income of incomeNodes) {
      for (const outflow of outflowNodes) {
        const share = income.amount * (outflow.amount / outflowTotal);
        if (share <= 0) continue;
        links.push({
          id: `${income.id}->${outflow.id}`,
          sourceID: income.id,
          targetID: outflow.id,
          amount: share,
        });
      }
    }
  }

  return {
    incomeNodes,
    outflowNodes,
    links,
    totalIncome,
    totalSpending,
    leftover,
    isEmpty: totalIncome === 0 && totalSpending === 0,
  };
};

export const categoryBudgetProgress = (
  budgets: CategoryBudgetInput[],
  transactions: CashFlowTransactionInput[],
  month: Date
): CategoryBudgetProgress[] => {
  if (budgets.length === 0) return [];

  const sankey = cashFlowSankey(transactions, month);
  const spentByCategoryID = new Map<string, number>();
  for (const node of sankey.outflowNodes) {
    if (node.kind !== 'expense') continue;
    const key = node.id.startsWith('out-') ? node.id.slice(4) : node.id;
    spentByCategoryID.set(key, node.amount);
  }

  return budgets
    .filter((b) => b.monthlyLimit > 0)
    .map((budget) => {
      const spent = spentByCategoryID.get(budget.categoryID) ?? 0;
      const limit = budget.monthlyLimit;
      const remaining = limit - spent;
      const isOverBudget = spent > limit;
      return {
        id: budget.categoryID,
        categoryName: budget.categoryName,
        systemImage: budget.systemImage,
        limit,
        spent,
        remaining,
        isOverBudget,
        fractionUsed: limit > 0 ? spent / limit : spent > 0 ? 1 : 0,
      };
    })
    .sort((lhs, rhs) => {
      if (lhs.isOverBudget !== rhs.isOverBudget) {
        return lhs.isOverBudget && !rhs.isOverBudget ? -1 : 1;
      }
      return rhs.fractionUsed - lhs.fractionUsed;
    });
};

type HistoryTxn = {
  date: string;
  amount: number;
  status: string;
  isRemoved?: boolean;
  isTransfer?: boolean;
};

/**
 * Chart series for net worth. Prefers recorded daily snapshots; when those are
 * sparse (typical right after linking), walks transactions backward from the
 * current net worth so the graph can show ~90 days immediately.
 */
export const buildNetWorthSeries = (
  currentNetWorth: number,
  snapshots: NetWorthSnapshot[],
  transactions: HistoryTxn[],
  days = 90
): NetWorthSnapshot[] => {
  const recorded = [...snapshots]
    .filter((s) => Number.isFinite(s.netWorth))
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  if (recorded.length >= 2) {
    const span =
      (+new Date(recorded[recorded.length - 1].date) - +new Date(recorded[0].date)) /
      (1000 * 60 * 60 * 24);
    // Enough real snapshots spanning multiple days — use them as-is.
    if (span >= 1) return recorded;
  }

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const byDay = new Map<string, number>();
  for (const t of transactions) {
    if (t.isRemoved || t.status === 'removed') continue;
    if (t.status !== 'posted' && t.status !== 'pending') continue;
    if (t.isTransfer) continue;
    const key = t.date.slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + t.amount);
  }

  // Overlay recorded points when present.
  const recordedByDay = new Map(recorded.map((s) => [s.date.slice(0, 10), s.netWorth]));

  const points: NetWorthSnapshot[] = [];
  let nw = currentNetWorth;

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const value = recordedByDay.has(key) ? recordedByDay.get(key)! : nw;
    points.push({
      id: `nw-${key}`,
      date: `${key}T12:00:00.000Z`,
      netWorth: value,
      cash: 0,
      investments: 0,
      credit: 0,
    });
    // Step to prior day: reverse today's Plaid-signed activity (ΔNW ≈ −amount).
    nw = value + (byDay.get(key) ?? 0);
  }

  return points.reverse();
};
