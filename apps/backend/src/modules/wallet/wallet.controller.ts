import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { LedgerService } from '../ledger/application/ledger.service';
import { LedgerUpdateRequest } from './wallet.dto';
import { InsufficientFundsError } from '../ledger/domain/errors/insufficient-funds.error';

@Controller('wallet')
export class WalletController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Post('ledger')
  async updateBalance(@Body() body: LedgerUpdateRequest) {
    try {
      const idempotencyKeyId = await this.ledgerService.createIdempotencyKey(
        body.accountId,
        'wallet',
        body.idempotencyKey,
        body.requestHash,
      );

      await this.ledgerService.updateBalance({
        accountId: body.accountId,
        asset: body.asset,
        amount: BigInt(Math.floor(body.amount)),
        direction: body.direction,
        referenceId: body.idempotencyKey,
        idempotencyKeyId,
      });

      return { status: 'ok' };
    } catch (error) {
      if (error instanceof InsufficientFundsError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
