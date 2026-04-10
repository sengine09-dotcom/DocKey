import { Request, Response } from 'express';
import { deleteDocumentByType, getDocumentById, listDocumentsByType, saveDocumentByType } from '../lib/mainDocuments';
import { resolveCompanyContext } from '../lib/companyContext';

class InvoiceController {
  static async getAll(req: Request, res: Response) {
    try {
      const ctx = await resolveCompanyContext(req);
      if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const invoices = await listDocumentsByType('invoice', ctx.companyId);
      res.json({ success: true, data: invoices });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const ctx = await resolveCompanyContext(req);
      if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const { id } = req.params;
      const invoice = await getDocumentById('invoice', id, ctx.companyId);
      if (!invoice) {
        return res.status(404).json({ success: false, message: 'Invoice not found' });
      }
      res.json({ success: true, data: invoice });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async save(req: Request, res: Response) {
    try {
      const ctx = await resolveCompanyContext(req);
      if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const saved = await saveDocumentByType('invoice', req.body, ctx.companyId);
      res.json({ success: true, data: saved });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const ctx = await resolveCompanyContext(req);
      if (!ctx) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const { id } = req.params;
      const deleted = await deleteDocumentByType('invoice', id, ctx.companyId);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Invoice not found' });
      }
      res.json({ success: true, message: 'Invoice deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default InvoiceController;
