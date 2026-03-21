import { Request, Response } from 'express';
import DocumentModel from '../models/Document';

class DocumentController {
  static async getAll(req: Request, res: Response) {
    try {
      const { search = '', status = '' } = req.query;
      const documents: any[] = (await DocumentModel.getAll(
        String(search),
        String(status)
      )) as any[];
      res.json({
        success: true,
        data: documents,
        count: documents.length
      });
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching documents',
        error: error.message
      });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { fileName = 'Untitled Document', customerName = 'Unnamed Customer' } = req.body;
      const document = await DocumentModel.create(fileName, customerName);
      res.status(201).json({
        success: true,
        data: document,
        message: 'Document created successfully'
      });
    } catch (error) {
      console.error('Error creating document:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating document',
        error: error.message
      });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await DocumentModel.delete(id);
      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting document',
        error: error.message
      });
    }
  }
}

export default DocumentController;
