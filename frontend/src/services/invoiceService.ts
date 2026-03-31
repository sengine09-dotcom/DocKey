import documentService from './documentService';

const invoiceService = {
  getAll: () => documentService.getAll('invoice'),
  getById: (id: string) => documentService.getById('invoice', id),
  save: (payload: any) => documentService.save('invoice', payload),
  delete: (id: string) => documentService.delete('invoice', id),
};

export default invoiceService;
