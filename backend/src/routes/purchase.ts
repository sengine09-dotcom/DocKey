import express from 'express';
import PRController from '../controllers/PRController';
import GRController from '../controllers/GRController';

const router = express.Router();

// PR (Purchase Requisition)
router.get('/purchase/pr', PRController.getAll);
router.get('/purchase/pr/:id', PRController.getById);
router.post('/purchase/pr', PRController.create);
router.put('/purchase/pr/:id', PRController.update);
router.delete('/purchase/pr/:id', PRController.delete);
router.patch('/purchase/pr/:id/submit', PRController.submit);
router.patch('/purchase/pr/:id/approve', PRController.approve);
router.patch('/purchase/pr/:id/reject', PRController.reject);
router.patch('/purchase/pr/:id/convert', PRController.convert);
router.patch('/purchase/pr/:id/mark-items-converted', PRController.markItemsConverted);

// GR (Goods Receipt)
router.get('/purchase/gr', GRController.getAll);
router.get('/purchase/gr/:id', GRController.getById);
router.post('/purchase/gr', GRController.create);
router.put('/purchase/gr/:id', GRController.update);
router.delete('/purchase/gr/:id', GRController.delete);
router.patch('/purchase/gr/:id/confirm', GRController.confirm);

export default router;
