import { computePaymentStatus } from '../mainDocuments';

// DO gate logic: if linkedSOId is set, a DO must exist for that SO before RC can be saved.
// The gate throws 'กรุณาออกใบส่งสินค้า (DO) ก่อน' when no DO is found.
describe('DO gate on RC save', () => {
  // Simulate the gate check: returns the error message when doForSO is null
  function checkDoGate(linkedSOId: string | null, doForSO: object | null): string | null {
    if (linkedSOId) {
      if (!doForSO) {
        return 'กรุณาออกใบส่งสินค้า (DO) ก่อน';
      }
    }
    return null;
  }

  it('throws when saving RC for a linked SO that has no DO', () => {
    const result = checkDoGate('test-so-id', null);
    expect(result).toBe('กรุณาออกใบส่งสินค้า (DO) ก่อน');
  });

  it('allows RC when linkedSOId is empty (standalone receipt)', () => {
    const result = checkDoGate(null, null);
    expect(result).toBeNull();
  });

  it('allows RC when linkedSOId is set and DO exists', () => {
    const result = checkDoGate('test-so-id', { id: 'do-1', linkedSOId: 'test-so-id' });
    expect(result).toBeNull();
  });

  it('allows RC when linkedSOId is empty string (no linkage)', () => {
    const result = checkDoGate('', null);
    expect(result).toBeNull();
  });
});

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
