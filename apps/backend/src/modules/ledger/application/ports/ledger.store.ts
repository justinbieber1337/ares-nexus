export interface BalanceSnapshot {
  accountId: string;
  asset: string;
  available: bigint;
  locked: bigint;
}

export interface LedgerEntryInput {
  accountId: string;
  idempotencyKeyId: string;
  asset: string;
  amount: bigint;
  balanceAfter: bigint;
  entryType: 'credit' | 'debit';
  referenceType: string;
  referenceId: string;
}

export interface MarketSnapshot {
  id: string;
  baseAsset: string;
  quoteAsset: string;
}

export interface LedgerStoreTransaction {
  getMarket(marketId: string): Promise<MarketSnapshot | null>;
  getBalance(accountId: string, asset: string): Promise<BalanceSnapshot | null>;
  upsertIdempotencyKey(
    accountId: string,
    scope: string,
    key: string,
    requestHash: string,
  ): Promise<string>;
  upsertBalance(
    accountId: string,
    asset: string,
    available: bigint,
    locked: bigint,
  ): Promise<BalanceSnapshot>;
  adjustBalance(
    accountId: string,
    asset: string,
    availableDelta: bigint,
    lockedDelta: bigint,
    requireAvailable?: bigint,
    requireLocked?: bigint,
  ): Promise<BalanceSnapshot | null>;
  createLedgerEntry(entry: LedgerEntryInput): Promise<void>;
}

export interface LedgerStore {
  transaction<T>(handler: (tx: LedgerStoreTransaction) => Promise<T>): Promise<T>;
}
