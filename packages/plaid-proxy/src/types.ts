export type CreateLinkTokenResponse = {
  linkToken: string;
  expiration?: string | null;
};

export type ExchangePublicTokenRequest = {
  publicToken: string;
  institutionName?: string | null;
  institutionID?: string | null;
};

export type ExchangePublicTokenResponse = {
  itemID: string;
  accounts: PlaidAccountDTO[];
};

export type SyncItemRequest = {
  itemID: string;
  cursor?: string | null;
};

export type SyncItemResponse = {
  accounts: PlaidAccountDTO[];
  added: PlaidTransactionDTO[];
  modified: PlaidTransactionDTO[];
  removed: PlaidRemovedTransactionDTO[];
  nextCursor?: string | null;
  hasMore: boolean;
};

export type RemoveItemRequest = {
  itemID: string;
};

export type PlaidAccountDTO = {
  accountID: string;
  name: string;
  officialName?: string | null;
  type: string;
  subtype?: string | null;
  mask?: string | null;
  balances: {
    current?: number | null;
    available?: number | null;
    limit?: number | null;
    isoCurrencyCode?: string | null;
  };
};

export type PlaidTransactionDTO = {
  transactionID: string;
  accountID: string;
  amount: number;
  isoCurrencyCode?: string | null;
  date: string;
  authorizedDate?: string | null;
  name: string;
  merchantName?: string | null;
  pending: boolean;
  pendingTransactionID?: string | null;
  personalFinanceCategory?: {
    primary?: string | null;
    detailed?: string | null;
  } | null;
};

export type PlaidRemovedTransactionDTO = {
  transactionID: string;
};

/** Raw account object from Plaid's REST API (snake_case). */
export type PlaidRawAccount = {
  account_id: string;
  name: string;
  official_name?: string | null;
  type: string;
  subtype?: string | null;
  mask?: string | null;
  balances?: {
    current?: number | null;
    available?: number | null;
    limit?: number | null;
    iso_currency_code?: string | null;
  } | null;
};

/** Raw transaction object from Plaid's REST API (snake_case). */
export type PlaidRawTransaction = {
  transaction_id: string;
  account_id: string;
  amount: number;
  iso_currency_code?: string | null;
  date: string;
  authorized_date?: string | null;
  name: string;
  merchant_name?: string | null;
  pending?: boolean;
  pending_transaction_id?: string | null;
  personal_finance_category?: {
    primary?: string | null;
    detailed?: string | null;
  } | null;
};
