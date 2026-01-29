import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import {
  LedgerStore,
  LedgerStoreTransaction,
  BalanceSnapshot,
  LedgerEntryInput,
  MarketSnapshot,
} from '../../application/ports/ledger.store';

class PrismaLedgerTransaction implements LedgerStoreTransaction {
  constructor(private readonly tx: PrismaService) {}

  async getMarket(marketId: string): Promise<MarketSnapshot | null> {
    const market = await this.tx.market.findUnique({
      where: { id: marketId },
      select: { id: true, baseAsset: true, quoteAsset: true },
    });
    return market ?? null;
  }

  async getBalance(accountId: string, asset: string): Promise<BalanceSnapshot | null> {
    const balance = await this.tx.balance.findUnique({
      where: { accountId_asset: { accountId, asset } },
    });
    if (!balance) return null;
    return {
      accountId: balance.accountId,
      asset: balance.asset,
      available: BigInt(balance.available.toString()),
      locked: BigInt(balance.locked.toString()),
    };
  }

  async upsertIdempotencyKey(
    accountId: string,
    scope: string,
    key: string,
    requestHash: string,
  ): Promise<string> {
    const idempotencyKey = await this.tx.idempotencyKey.upsert({
      where: {
        accountId_scope_key: {
          accountId,
          scope,
          key,
        },
      },
      create: {
        accountId,
        scope,
        key,
        requestHash,
        status: 'consumed',
        consumedAt: new Date(),
      },
      update: {
        requestHash,
        status: 'consumed',
        consumedAt: new Date(),
      },
      select: { id: true },
    });
    return idempotencyKey.id;
  }

  async upsertBalance(
    accountId: string,
    asset: string,
    available: bigint,
    locked: bigint,
  ): Promise<BalanceSnapshot> {
    const balance = await this.tx.balance.upsert({
      where: { accountId_asset: { accountId, asset } },
      create: {
        accountId,
        asset,
        available: available,
        locked: locked,
      },
      update: {
        available: available,
        locked: locked,
      },
    });
    return {
      accountId: balance.accountId,
      asset: balance.asset,
      available: BigInt(balance.available.toString()),
      locked: BigInt(balance.locked.toString()),
    };
  }

  async adjustBalance(
    accountId: string,
    asset: string,
    availableDelta: bigint,
    lockedDelta: bigint,
    requireAvailable?: bigint,
    requireLocked?: bigint,
  ): Promise<BalanceSnapshot | null> {
    const availableRequirement =
      requireAvailable !== undefined ? { gte: requireAvailable } : undefined;
    const lockedRequirement =
      requireLocked !== undefined ? { gte: requireLocked } : undefined;

    const updated = await this.tx.balance.updateMany({
      where: {
        accountId,
        asset,
        ...(availableRequirement ? { available: availableRequirement } : {}),
        ...(lockedRequirement ? { locked: lockedRequirement } : {}),
      },
      data: {
        available: availableDelta !== 0n ? { increment: availableDelta } : undefined,
        locked: lockedDelta !== 0n ? { increment: lockedDelta } : undefined,
      },
    });

    if (updated.count === 0) return null;

    const balance = await this.tx.balance.findUnique({
      where: { accountId_asset: { accountId, asset } },
    });
    if (!balance) return null;
    return {
      accountId: balance.accountId,
      asset: balance.asset,
      available: BigInt(balance.available.toString()),
      locked: BigInt(balance.locked.toString()),
    };
  }

  async createLedgerEntry(entry: LedgerEntryInput): Promise<void> {
    await this.tx.ledgerEntry.create({
      data: {
        accountId: entry.accountId,
        idempotencyKeyId: entry.idempotencyKeyId,
        asset: entry.asset,
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
        entryType: entry.entryType,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
      },
    });
  }
}

@Injectable()
export class PrismaLedgerStore implements LedgerStore {
  constructor(private readonly prisma: PrismaService) {}

  async transaction<T>(handler: (tx: LedgerStoreTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const storeTx = new PrismaLedgerTransaction(tx as PrismaService);
      return handler(storeTx);
    });
  }
}
