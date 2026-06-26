import express from 'express';
import DocumentController from '../controllers/DocumentController';

const router = express.Router();

router.get('/documents/counts', DocumentController.getCounts);
router.patch('/documents/:id/mark-paid', DocumentController.markPaid);
router.get('/documents/:type', DocumentController.getAll);
router.get('/documents/:type/:id', DocumentController.getById);
router.post('/documents/:type', DocumentController.save);
router.delete('/documents/:type/:id', DocumentController.delete);

export default router;