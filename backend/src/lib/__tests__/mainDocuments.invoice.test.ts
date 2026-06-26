import { computePaymentStatus } from '../mainDocuments';

describe('computePaymentStatus', () => {
  const pastDate = new Date(Date.now() - 86400_000 * 2); // 2 days ago
  const futureDate = new Date(Date.now() + 86400_000 * 10); // 10 days from now

  it('returns PAID when paymentStatus is PAID regardless of dueDate', () => {
    expect(computePaymentStatus('PAID', pastDate)).toBe('PAID');
    expect(computePaymentStatus('PAID', null)).toBe('PAID');
  });

  it('returns OVERDUE when PENDING and dueDate is in the past', () => {
    expect(computePaymentStatus('PENDING', pastDate)).toBe('OVERDUE');
  });

  it('returns PENDING when PENDING and dueDate is in the future', () => {
    expect(computePaymentStatus('PENDING', futureDate)).toBe('PENDING');
  });

  it('returns PENDING when PENDING and no dueDate', () => {
    expect(computePaymentStatus('PENDING', null)).toBe('PENDING');
  });
});
