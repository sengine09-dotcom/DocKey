import { Request, Response } from 'express';
import { deleteDocumentByType, getDocumentById, listDocumentsByType, saveDocumentByType } from '../lib/mainDocuments';

class InvoiceController {
  static async getAll(_req: Request, res: Response) {
    try {
      const invoices = await listDocumentsByType('invoice');
      res.json({ success: true, data: invoices });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const invoice = await getDocumentById('invoice', id);
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
      const saved = await saveDocumentByType('invoice', req.body);
      res.json({ success: true, data: saved });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await deleteDocumentByType('invoice', id);
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
