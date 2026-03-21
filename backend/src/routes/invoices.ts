import express from 'express';
import InvoiceController from '../controllers/InvoiceController';

const router = express.Router();

router.get('/invoices', InvoiceController.getAll);
router.get('/invoices/:id', InvoiceController.getById);
router.post('/invoices', InvoiceController.save);
router.delete('/invoices/:id', InvoiceController.delete);

export default router;
