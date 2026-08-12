import type { PlaidAccountDTO, PlaidTransactionDTO } from '@harbor/plaid-proxy';

import type {
  Account,
  AccountKind,
  AccountSubtype,
  Category,
  Transaction,
} from '@/lib/types';

export const accountKindFromPlaid = (type: string): AccountKind => {
  switch (type.toLowerCase()) {
    case 'depository':
      return 'depository';
    case 'credit':
      return 'credit';
    case 'investment':
      return 'investment';
    case 'loan':
      return 'loan';
    case 'brokerage':
      return 'brokerage';
    default:
      return 'other';
  }
};

export const accountSubtypeFromPlaid = (
  subtype?: string | null
): AccountSubtype => {
  if (!subtype) return 'other';
  switch (subtype.toLowerCase()) {
    case 'checking':
      return 'checking';
    case 'savings':
      return 'savings';
    case 'money market':
    case 'moneymarket':
      return 'moneyMarket';
    case 'credit card':
    case 'creditcard':
      return 'creditCard';
    case 'brokerage':
      return 'brokerage';
    case 'ira':
      return 'ira';
    case '401k':
      return '401k';
    case '403b':
      return '403b';
    case 'retirement':
      return 'retirement';
    case 'student':
      return 'student';
    case 'mortgage':
      return 'mortgage';
    default:
      return 'other';
  }
};

export const mapAccountDTO = (
  dto: PlaidAccountDTO,
  institutionID: string
): Account => ({
  id: dto.accountID,
  plaidAccountID: dto.accountID,
  name: dto.name,
  officialName: dto.officialName ?? undefined,
  kind: accountKindFromPlaid(dto.type),
  subtype: accountSubtypeFromPlaid(dto.subtype),
  mask: dto.mask ?? undefined,
  currencyCode: dto.balances.isoCurrencyCode ?? 'USD',
  currentBalance: dto.balances.current ?? 0,
  availableBalance: dto.balances.available ?? undefined,
  creditLimit: dto.balances.limit ?? undefined,
  isHidden: false,
  isActive: true,
  institutionID,
});

export const resolveCategoryID = (
  dto: PlaidTransactionDTO,
  categories: Category[]
): string | undefined => {
  const detailed = dto.personalFinanceCategory?.detailed;
  const primary = dto.personalFinanceCategory?.primary;
  if (detailed) {
    const match = categories.find((c) =>
      c.plaidPrimaryKeys?.includes(detailed)
    );
    if (match) return match.id;
  }
  if (primary) {
    const match = categories.find((c) => c.plaidPrimaryKeys?.includes(primary));
    if (match) return match.id;
  }
  return categories.find((c) => c.name === 'Other')?.id;
};

export const mapTransactionDTO = (
  dto: PlaidTransactionDTO,
  categories: Category[]
): Omit<Transaction, 'id' | 'notes'> & {
  pendingTransactionID?: string | null;
} => ({
  plaidTransactionID: dto.transactionID,
  pendingTransactionID: dto.pendingTransactionID ?? null,
  merchantName: dto.merchantName ?? undefined,
  name: dto.name,
  amount: dto.amount,
  isoCurrencyCode: dto.isoCurrencyCode ?? 'USD',
  date: `${dto.date}T12:00:00.000Z`,
  status: dto.pending ? 'pending' : 'posted',
  isRemoved: false,
  accountID: dto.accountID,
  categoryID: resolveCategoryID(dto, categories),
});
