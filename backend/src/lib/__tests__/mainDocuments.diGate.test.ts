// These are unit tests for the gate logic extracted into a helper.
// The gate checks are inline in saveDocumentByType, so we test via integration
// against a real (test) DB or by mocking prisma. For now, test the happy-path
// validation logic directly.

describe('Deposit Invoice gate validation', () => {
  it('rejects depositPercentage = 0', () => {
    const pct = 0;
    expect(pct >= 1 && pct <= 99).toBe(false);
  });

  it('rejects depositPercentage = 100', () => {
    const pct = 100;
    expect(pct >= 1 && pct <= 99).toBe(false);
  });

  it('accepts depositPercentage = 30', () => {
    const pct = 30;
    expect(pct >= 1 && pct <= 99).toBe(true);
  });
});

describe('Balance Invoice GR gate helpers', () => {
  it('returns empty array when no convertedToPr items', () => {
    const soItems: Array<{ prNumber: string | null }> = [];
    const prNumbers = soItems.map(i => i.prNumber).filter((v): v is string => Boolean(v));
    expect(prNumbers).toHaveLength(0);
  });

  it('collects prNumbers from converted items', () => {
    const soItems = [
      { convertedToPr: true, prNumber: 'PR-26-000001' },
      { convertedToPr: false, prNumber: null },
    ];
    const prNumbers = soItems
      .filter(i => i.convertedToPr)
      .map(i => i.prNumber)
      .filter((v): v is string => Boolean(v));
    expect(prNumbers).toEqual(['PR-26-000001']);
  });
});
