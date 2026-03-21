const Document = require('../models/Document');

class DocumentController {
  static async getAll(req, res) {
    try {
      const { search = '', status = '' } = req.query;
      const documents = await Document.getAll(search, status);
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

  static async create(req, res) {
    try {
      const { fileName = 'Untitled Document', customerName = 'Unnamed Customer' } = req.body;
      const document = await Document.create(fileName, customerName);
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

  static async delete(req, res) {
    try {
      const { id } = req.params;
      await Document.delete(id);
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

module.exports = DocumentController;
