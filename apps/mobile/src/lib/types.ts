export type AccountGroup = 'cash' | 'credit' | 'investments' | 'other';

export type AccountKind =
  'depository' | 'credit' | 'investment' | 'loan' | 'brokerage' | 'other';

export type AccountSubtype =
  | 'checking'
  | 'savings'
  | 'moneyMarket'
  | 'creditCard'
  | 'brokerage'
  | 'ira'
  | '401k'
  | '403b'
  | 'retirement'
  | 'student'
  | 'mortgage'
  | 'other';

export type TransactionStatus = 'pending' | 'posted' | 'removed';

export type CashFlowNodeKind = 'income' | 'expense' | 'leftover';

export interface Institution {
  id: string;
  plaidItemID: string;
  name: string;
  logoIdentifier?: string;
  createdAt: string;
  lastSyncedAt?: string;
  isActive: boolean;
}

export interface Account {
  id: string;
  plaidAccountID: string;
  name: string;
  officialName?: string;
  kind: AccountKind;
  subtype: AccountSubtype;
  mask?: string;
  currencyCode: string;
  currentBalance: number;
  availableBalance?: number;
  creditLimit?: number;
  isHidden: boolean;
  isActive: boolean;
  lastSyncedAt?: string;
  institutionID?: string;
}

export interface Category {
  id: string;
  name: string;
  systemImage: string;
  isIncome: boolean;
  isTransfer: boolean;
  isDefault: boolean;
  sortOrder: number;
  monthlyBudgetLimit?: number | null;
  /** Plaid personal_finance_category primary/detailed keys */
  plaidPrimaryKeys?: string[];
}

export interface Transaction {
  id: string;
  plaidTransactionID: string;
  /** Prior pending Plaid id when this row was upgraded pending → posted. */
  pendingTransactionID?: string | null;
  merchantName?: string;
  name: string;
  amount: number;
  isoCurrencyCode: string;
  date: string;
  status: TransactionStatus;
  notes?: string | null;
  isRemoved: boolean;
  accountID?: string;
  categoryID?: string;
}

export interface NetWorthSnapshot {
  id: string;
  date: string;
  netWorth: number;
  cash: number;
  investments: number;
  credit: number;
}

export interface NetWorthSummary {
  cash: number;
  investments: number;
  credit: number;
  netWorth: number;
}

export interface MonthlyCashFlow {
  income: number;
  spending: number;
  net: number;
}

export interface CashFlowNode {
  id: string;
  title: string;
  amount: number;
  systemImage?: string | null;
  kind: CashFlowNodeKind;
}

export interface CashFlowLink {
  id: string;
  sourceID: string;
  targetID: string;
  amount: number;
}

export interface CashFlowSankeyData {
  incomeNodes: CashFlowNode[];
  outflowNodes: CashFlowNode[];
  links: CashFlowLink[];
  totalIncome: number;
  totalSpending: number;
  leftover: number;
  isEmpty: boolean;
}

export interface CategoryBudgetProgress {
  id: string;
  categoryName: string;
  systemImage: string;
  limit: number;
  spent: number;
  remaining: number;
  isOverBudget: boolean;
  fractionUsed: number;
}

export interface AccountBalanceInput {
  group: AccountGroup;
  currentBalance: number;
  isActive: boolean;
}

export interface CashFlowTransactionInput {
  amount: number;
  date: Date;
  status: TransactionStatus;
  isIncome: boolean;
  isTransfer: boolean;
  categoryID?: string | null;
  categoryName?: string | null;
  categoryImage?: string | null;
}

export interface CategoryBudgetInput {
  categoryID: string;
  categoryName: string;
  systemImage: string;
  monthlyLimit: number;
}

export const ACCOUNT_GROUP_META: Record<
  AccountGroup,
  { title: string; systemImage: string }
> = {
  cash: { title: 'Cash', systemImage: 'banknote' },
  credit: { title: 'Credit', systemImage: 'creditcard' },
  investments: {
    title: 'Investments',
    systemImage: 'chart.line.uptrend.xyaxis',
  },
  other: { title: 'Other', systemImage: 'rectangle.stack' },
};

export const ACCOUNT_KIND_GROUP: Record<AccountKind, AccountGroup> = {
  depository: 'cash',
  credit: 'credit',
  loan: 'credit',
  investment: 'investments',
  brokerage: 'investments',
  other: 'other',
};

export const ACCOUNT_SUBTYPE_DISPLAY: Record<AccountSubtype, string> = {
  checking: 'Checking',
  savings: 'Savings',
  moneyMarket: 'Money Market',
  creditCard: 'Credit Card',
  brokerage: 'Brokerage',
  ira: 'IRA',
  '401k': '401(k)',
  '403b': '403(b)',
  retirement: 'Retirement',
  student: 'Student Loan',
  mortgage: 'Mortgage',
  other: 'Other',
};

export const accountGroup = (account: Account): AccountGroup =>
  ACCOUNT_KIND_GROUP[account.kind];

export const accountDisplayName = (account: Account): string => {
  const raw =
    account.officialName && account.officialName.length > 0
      ? account.officialName
      : account.name;
  return prettifyDisplayName(raw);
};

/** Title-case Plaid-style ALL CAPS names ("SHARE ACCOUNT" → "Share Account"). */
export const prettifyDisplayName = (name: string): string => {
  const letters = name.replace(/[^A-Za-z]/g, '');
  if (letters.length < 3 || letters !== letters.toUpperCase()) return name;
  return name
    .toLowerCase()
    .replace(
      /(^|[\s/._-])([a-z])/g,
      (_, sep: string, c: string) => sep + c.toUpperCase()
    );
};

export const transactionDisplayMerchant = (txn: Transaction): string => {
  if (txn.merchantName && txn.merchantName.length > 0) return txn.merchantName;
  return txn.name;
};

/** Display convention: expenses render negative; income (stored negative by Plaid) renders positive. */
export const signedAmountForDisplay = (amount: number): number => -amount;
