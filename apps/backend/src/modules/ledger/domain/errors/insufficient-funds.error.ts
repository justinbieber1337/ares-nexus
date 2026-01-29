export class InsufficientFundsError extends Error {
  constructor(message = 'Insufficient funds for requested operation') {
    super(message);
    this.name = 'InsufficientFundsError';
  }
}
