export type OrderSide = 'bid' | 'ask';
export type OrderType = 'limit' | 'market';

export interface OrderProps {
  id: string;
  marketId: string;
  userId: string;
  side: OrderSide;
  type: OrderType;
  priceTicks: number;
  quantity: number;
  remainingQuantity: number;
  createdAt: Date;
  timeSequence: number;
}

export class Order {
  constructor(private readonly props: OrderProps) {}

  get id() {
    return this.props.id;
  }

  get marketId() {
    return this.props.marketId;
  }

  get userId() {
    return this.props.userId;
  }

  get side() {
    return this.props.side;
  }

  get type() {
    return this.props.type;
  }

  get priceTicks() {
    return this.props.priceTicks;
  }

  get quantity() {
    return this.props.quantity;
  }

  get remainingQuantity() {
    return this.props.remainingQuantity;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get timeSequence() {
    return this.props.timeSequence;
  }

  fill(quantity: number) {
    if (quantity <= 0) return;
    this.props.remainingQuantity = Math.max(0, this.props.remainingQuantity - quantity);
  }

  isFilled() {
    return this.props.remainingQuantity <= 0;
  }

  toPrimitives(): OrderProps {
    return { ...this.props };
  }
}
