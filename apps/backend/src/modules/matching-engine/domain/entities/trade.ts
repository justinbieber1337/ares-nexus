import { OrderSide } from './order';

export interface TradeProps {
  id: string;
  marketId: string;
  takerOrderId: string;
  makerOrderId: string;
  takerUserId: string;
  makerUserId: string;
  side: OrderSide;
  priceTicks: number;
  quantity: number;
  executedAt: Date;
}

export class Trade {
  constructor(private readonly props: TradeProps) {}

  get id() {
    return this.props.id;
  }

  get marketId() {
    return this.props.marketId;
  }

  get takerOrderId() {
    return this.props.takerOrderId;
  }

  get makerOrderId() {
    return this.props.makerOrderId;
  }

  get takerUserId() {
    return this.props.takerUserId;
  }

  get makerUserId() {
    return this.props.makerUserId;
  }

  get side() {
    return this.props.side;
  }

  get priceTicks() {
    return this.props.priceTicks;
  }

  get quantity() {
    return this.props.quantity;
  }

  get executedAt() {
    return this.props.executedAt;
  }

  toPrimitives(): TradeProps {
    return { ...this.props };
  }
}
