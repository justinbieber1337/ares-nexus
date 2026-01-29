import { OrderSide, OrderType } from '../../domain/entities/order';

export interface PlaceOrderCommand {
  orderId: string;
  marketId: string;
  userId: string;
  accountId: string;
  side: OrderSide;
  type: OrderType;
  priceTicks: number;
  quantity: number;
  idempotencyKey: string;
  requestHash: string;
}
