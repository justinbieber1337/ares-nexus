export interface OrderBookChangedEvent {
  marketId: string;
  bestBidPriceTicks: number | null;
  bestAskPriceTicks: number | null;
  updatedAt: Date;
}
