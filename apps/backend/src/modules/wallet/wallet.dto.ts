export interface LedgerUpdateRequest {
  accountId: string;
  asset: string;
  amount: number;
  direction: 'deposit' | 'withdraw';
  idempotencyKey: string;
  requestHash: string;
}
