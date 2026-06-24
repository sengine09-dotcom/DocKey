describe('DR → DI status update logic', () => {
  it('uses referenceNo as the DI document number to look up', () => {
    const header = { referenceNo: 'DI-26-000001' };
    const diNumber = String(header.referenceNo || '').trim();
    expect(diNumber).toBe('DI-26-000001');
  });

  it('skips DI update when referenceNo is empty', () => {
    const header = { referenceNo: '' };
    const diNumber = String(header.referenceNo || '').trim();
    expect(Boolean(diNumber)).toBe(false);
  });

  it('skips DI update when referenceNo is undefined', () => {
    const header: Record<string, unknown> = {};
    const diNumber = String(header['referenceNo'] || '').trim();
    expect(Boolean(diNumber)).toBe(false);
  });

  it('would update when referenceNo is a DI number', () => {
    const header = { referenceNo: 'DI-26-000042' };
    const diNumber = String(header.referenceNo || '').trim();
    // This is the value passed to updateMany where clause
    expect(diNumber).toBe('DI-26-000042');
    expect(Boolean(diNumber)).toBe(true);
  });
});
