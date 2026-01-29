import { Inject, Injectable } from '@nestjs/common';
import { LedgerStore, LedgerStoreTransaction } from './ports/ledger.store';
import { InsufficientFundsError } from '../domain/errors/insufficient-funds.error';
import { TradeProps } from '../../matching-engine/domain/entities/trade';
import { LEDGER_TOKENS } from '../ledger.tokens';

export interface ReserveFundsCommand {
  accountId: string;
  marketId: string;
  side: 'bid' | 'ask';
  priceTicks: number;
  quantity: number;
  referenceId: string;
  idempotencyKeyId: string;
}

export interface ReleaseFundsCommand {
  accountId: string;
  asset: string;
  amount: bigint;
  referenceId: string;
  idempotencyKeyId: string;
}

export interface ReleaseOrderRemainderCommand {
  accountId: string;
  marketId: string;
  side: 'bid' | 'ask';
  priceTicks: number;
  remainingQuantity: number;
  referenceId: string;
  idempotencyKeyId: string;
}

export interface SettleTradesCommand {
  marketId: string;
  trades: TradeProps[];
  idempotencyKeyId: string;
}

export interface UpdateBalanceCommand {
  accountId: string;
  asset: string;
  amount: bigint;
  direction: 'deposit' | 'withdraw';
  referenceId: string;
  idempotencyKeyId: string;
}

@Injectable()
export class LedgerService {
  constructor(
    @Inject(LEDGER_TOKENS.LEDGER_STORE)
    private readonly store: LedgerStore,
  ) {}

  async createIdempotencyKey(
    accountId: string,
    scope: string,
    key: string,
    requestHash: string,
  ): Promise<string> {
    return this.store.transaction(async (tx) =>
      tx.upsertIdempotencyKey(accountId, scope, key, requestHash),
    );
  }

  /**
   * Reserve funds by moving available balance into locked balance.
   * Uses double-entry semantics: a debit from available is matched by
   * a credit into locked, keeping the overall position conserved.
   */
  async reserveForOrder(command: ReserveFundsCommand): Promise<bigint> {
    return this.store.transaction(async (tx) => {
      const market = await this.assertMarket(tx, command.marketId);
      const amount = this.calculateRequiredFunds(
        command.side,
        command.priceTicks,
        command.quantity,
        market.baseAsset,
        market.quoteAsset,
      );
      const asset = command.side === 'bid' ? market.quoteAsset : market.baseAsset;
      await this.ensureBalance(tx, command.accountId, asset);

      const updated = await tx.adjustBalance(
        command.accountId,
        asset,
        -amount,
        amount,
        amount,
      );
      if (!updated) {
        throw new InsufficientFundsError();
      }

      await this.recordDoubleEntry(tx, {
        accountId: command.accountId,
        asset,
        amount,
        referenceType: 'reserve',
        referenceId: command.referenceId,
        idempotencyKeyId: command.idempotencyKeyId,
        availableAfter: updated.available,
        lockedAfter: updated.locked,
      });

      return amount;
    });
  }

  /**
   * Release locked funds back to available.
   * Also records a double-entry movement to preserve auditability.
   */
  async releaseLockedFunds(command: ReleaseFundsCommand): Promise<void> {
    await this.store.transaction(async (tx) => {
      await this.ensureBalance(tx, command.accountId, command.asset);
      const updated = await tx.adjustBalance(
        command.accountId,
        command.asset,
        command.amount,
        -command.amount,
        undefined,
        command.amount,
      );
      if (!updated) {
        throw new InsufficientFundsError('Locked balance is insufficient');
      }

      await this.recordDoubleEntry(tx, {
        accountId: command.accountId,
        asset: command.asset,
        amount: command.amount,
        referenceType: 'release',
        referenceId: command.referenceId,
        idempotencyKeyId: command.idempotencyKeyId,
        availableAfter: updated.available,
        lockedAfter: updated.locked,
      });
    });
  }

  async releaseOrderRemainder(command: ReleaseOrderRemainderCommand): Promise<void> {
    await this.store.transaction(async (tx) => {
      const market = await this.assertMarket(tx, command.marketId);
      const asset = command.side === 'bid' ? market.quoteAsset : market.baseAsset;
      const amount =
        command.side === 'bid'
          ? BigInt(command.priceTicks) * BigInt(command.remainingQuantity)
          : BigInt(command.remainingQuantity);
      if (amount <= 0n) return;

      await this.ensureBalance(tx, command.accountId, asset);
      const updated = await tx.adjustBalance(
        command.accountId,
        asset,
        amount,
        -amount,
        undefined,
        amount,
      );
      if (!updated) {
        throw new InsufficientFundsError('Locked balance is insufficient');
      }

      await this.recordDoubleEntry(tx, {
        accountId: command.accountId,
        asset,
        amount,
        referenceType: 'release',
        referenceId: command.referenceId,
        idempotencyKeyId: command.idempotencyKeyId,
        availableAfter: updated.available,
        lockedAfter: updated.locked,
      });
    });
  }

  /**
   * Settle trades by transferring locked collateral into counterparties'
   * available balances. Each trade produces a balanced set of ledger entries
   * to ensure no net asset creation.
   */
  async settleTrades(command: SettleTradesCommand): Promise<void> {
    await this.store.transaction(async (tx) => {
      const market = await this.assertMarket(tx, command.marketId);
      for (const trade of command.trades) {
        const baseAmount = BigInt(trade.quantity);
        const quoteAmount = BigInt(trade.priceTicks) * BigInt(trade.quantity);

        const buyerAccountId =
          trade.side === 'bid' ? trade.takerUserId : trade.makerUserId;
        const sellerAccountId =
          trade.side === 'bid' ? trade.makerUserId : trade.takerUserId;

        await this.ensureBalance(tx, buyerAccountId, market.baseAsset);
        await this.ensureBalance(tx, buyerAccountId, market.quoteAsset);
        await this.ensureBalance(tx, sellerAccountId, market.baseAsset);
        await this.ensureBalance(tx, sellerAccountId, market.quoteAsset);

        const buyerQuote = await tx.adjustBalance(
          buyerAccountId,
          market.quoteAsset,
          0n,
          -quoteAmount,
          undefined,
          quoteAmount,
        );
        if (!buyerQuote) {
          throw new InsufficientFundsError('Buyer locked quote is insufficient');
        }

        const sellerBase = await tx.adjustBalance(
          sellerAccountId,
          market.baseAsset,
          0n,
          -baseAmount,
          undefined,
          baseAmount,
        );
        if (!sellerBase) {
          throw new InsufficientFundsError('Seller locked base is insufficient');
        }

        const buyerBase = await tx.adjustBalance(
          buyerAccountId,
          market.baseAsset,
          baseAmount,
          0n,
        );
        const sellerQuote = await tx.adjustBalance(
          sellerAccountId,
          market.quoteAsset,
          quoteAmount,
          0n,
        );

        if (!buyerBase || !sellerQuote) {
          throw new InsufficientFundsError('Settlement failed');
        }

        await this.recordEntry(tx, {
          accountId: buyerAccountId,
          asset: market.quoteAsset,
          amount: quoteAmount,
          balanceAfter: buyerQuote.locked,
          entryType: 'debit',
          referenceType: 'trade_debit_quote',
          referenceId: trade.id,
          idempotencyKeyId: command.idempotencyKeyId,
        });
        await this.recordEntry(tx, {
          accountId: sellerAccountId,
          asset: market.quoteAsset,
          amount: quoteAmount,
          balanceAfter: sellerQuote.available,
          entryType: 'credit',
          referenceType: 'trade_credit_quote',
          referenceId: trade.id,
          idempotencyKeyId: command.idempotencyKeyId,
        });

        await this.recordEntry(tx, {
          accountId: sellerAccountId,
          asset: market.baseAsset,
          amount: baseAmount,
          balanceAfter: sellerBase.locked,
          entryType: 'debit',
          referenceType: 'trade_debit_base',
          referenceId: trade.id,
          idempotencyKeyId: command.idempotencyKeyId,
        });
        await this.recordEntry(tx, {
          accountId: buyerAccountId,
          asset: market.baseAsset,
          amount: baseAmount,
          balanceAfter: buyerBase.available,
          entryType: 'credit',
          referenceType: 'trade_credit_base',
          referenceId: trade.id,
          idempotencyKeyId: command.idempotencyKeyId,
        });
      }
    });
  }

  /**
   * Update available balance for deposits/withdrawals.
   * Treated as an external counterparty entry for audit trails.
   */
  async updateBalance(command: UpdateBalanceCommand): Promise<void> {
    await this.store.transaction(async (tx) => {
      await this.ensureBalance(tx, command.accountId, command.asset);
      const delta = command.direction === 'deposit' ? command.amount : -command.amount;

      const updated = await tx.adjustBalance(
        command.accountId,
        command.asset,
        delta,
        0n,
        command.direction === 'withdraw' ? command.amount : undefined,
      );

      if (!updated) {
        throw new InsufficientFundsError();
      }

      await this.recordEntry(tx, {
        accountId: command.accountId,
        asset: command.asset,
        amount: command.amount,
        balanceAfter: updated.available,
        entryType: command.direction === 'deposit' ? 'credit' : 'debit',
        referenceType: command.direction,
        referenceId: command.referenceId,
        idempotencyKeyId: command.idempotencyKeyId,
      });
    });
  }

  private async assertMarket(tx: LedgerStoreTransaction, marketId: string) {
    const market = await tx.getMarket(marketId);
    if (!market) {
      throw new Error('Market not found');
    }
    return market;
  }

  private calculateRequiredFunds(
    side: 'bid' | 'ask',
    priceTicks: number,
    quantity: number,
    baseAsset: string,
    quoteAsset: string,
  ): bigint {
    if (side === 'ask') {
      return BigInt(quantity);
    }
    if (priceTicks <= 0) {
      throw new Error(`Invalid priceTicks for bid on ${quoteAsset}/${baseAsset}`);
    }
    return BigInt(priceTicks) * BigInt(quantity);
  }

  private async ensureBalance(tx: LedgerStoreTransaction, accountId: string, asset: string) {
    const existing = await tx.getBalance(accountId, asset);
    if (!existing) {
      await tx.upsertBalance(accountId, asset, 0n, 0n);
    }
  }

  private async recordDoubleEntry(
    tx: LedgerStoreTransaction,
    params: {
      accountId: string;
      asset: string;
      amount: bigint;
      referenceType: string;
      referenceId: string;
      idempotencyKeyId: string;
      availableAfter: bigint;
      lockedAfter: bigint;
    },
  ) {
    const entryType = params.entryType ?? 'debit';
    const otherEntryType = entryType === 'debit' ? 'credit' : 'debit';

    await tx.createLedgerEntry({
      accountId: params.accountId,
      asset: params.asset,
      amount: params.amount,
      balanceAfter: entryType === 'debit' ? params.availableAfter : params.lockedAfter,
      entryType,
      referenceType: params.referenceType,
      referenceId: `${params.referenceId}:primary`,
      idempotencyKeyId: params.idempotencyKeyId,
    });

    await tx.createLedgerEntry({
      accountId: params.accountId,
      asset: params.asset,
      amount: params.amount,
      balanceAfter: otherEntryType === 'credit' ? params.lockedAfter : params.availableAfter,
      entryType: otherEntryType,
      referenceType: params.referenceType,
      referenceId: `${params.referenceId}:counter`,
      idempotencyKeyId: params.idempotencyKeyId,
    });
  }

  private async recordEntry(
    tx: LedgerStoreTransaction,
    params: {
      accountId: string;
      asset: string;
      amount: bigint;
      balanceAfter: bigint;
      entryType: 'credit' | 'debit';
      referenceType: string;
      referenceId: string;
      idempotencyKeyId: string;
    },
  ) {
    await tx.createLedgerEntry({
      accountId: params.accountId,
      asset: params.asset,
      amount: params.amount,
      balanceAfter: params.balanceAfter,
      entryType: params.entryType,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      idempotencyKeyId: params.idempotencyKeyId,
    });
  }
}
