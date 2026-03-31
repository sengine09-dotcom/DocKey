import { Request, Response } from 'express';
import { deleteDocumentByType, getDocumentById, isMainDocumentType, listDocumentsByType, saveDocumentByType } from '../lib/mainDocuments';

class DocumentController {
  static async getAll(req: Request, res: Response) {
    try {
      const { type } = req.params;
      if (!isMainDocumentType(type)) {
        return res.status(400).json({ success: false, message: 'Invalid document type' });
      }

      const data = await listDocumentsByType(type);
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { type, id } = req.params;
      if (!isMainDocumentType(type)) {
        return res.status(400).json({ success: false, message: 'Invalid document type' });
      }

      const data = await getDocumentById(type, id);
      if (!data) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }

      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async save(req: Request, res: Response) {
    try {
      const { type } = req.params;            
      if (!isMainDocumentType(type)) {
        return res.status(400).json({ success: false, message: 'Invalid document type' });
      }
      const data = await saveDocumentByType(type, req.body);

      console.log('[DEBUG] Document saved:', data);

      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { type, id } = req.params;
      if (!isMainDocumentType(type)) {
        return res.status(400).json({ success: false, message: 'Invalid document type' });
      }

      const deleted = await deleteDocumentByType(type, id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }

      return res.json({ success: true, message: 'Document deleted' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default DocumentController;