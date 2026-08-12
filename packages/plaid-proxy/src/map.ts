import type {
  PlaidAccountDTO,
  PlaidRawAccount,
  PlaidRawTransaction,
  PlaidTransactionDTO,
} from './types';

export const mapAccount = (account: PlaidRawAccount): PlaidAccountDTO => ({
  accountID: account.account_id,
  name: account.name,
  officialName: account.official_name,
  type: account.type,
  subtype: account.subtype,
  mask: account.mask,
  balances: {
    current: account.balances?.current ?? null,
    available: account.balances?.available ?? null,
    limit: account.balances?.limit ?? null,
    isoCurrencyCode: account.balances?.iso_currency_code ?? 'USD',
  },
});

export const mapTransaction = (
  txn: PlaidRawTransaction
): PlaidTransactionDTO => ({
  transactionID: txn.transaction_id,
  accountID: txn.account_id,
  amount: txn.amount,
  isoCurrencyCode: txn.iso_currency_code ?? 'USD',
  date: txn.date,
  authorizedDate: txn.authorized_date ?? null,
  name: txn.name,
  merchantName: txn.merchant_name ?? null,
  pending: !!txn.pending,
  pendingTransactionID: txn.pending_transaction_id ?? null,
  personalFinanceCategory: txn.personal_finance_category
    ? {
        primary: txn.personal_finance_category.primary ?? null,
        detailed: txn.personal_finance_category.detailed ?? null,
      }
    : null,
});
