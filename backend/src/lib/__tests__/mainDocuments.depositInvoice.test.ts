import { isMainDocumentType } from '../mainDocuments';

describe('deposit_invoice type registration', () => {
  it('recognises deposit_invoice as a valid type', () => {
    expect(isMainDocumentType('deposit_invoice')).toBe(true);
  });
});
