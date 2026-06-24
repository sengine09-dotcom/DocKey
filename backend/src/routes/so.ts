import express from 'express';
import SOController from '../controllers/SOController';

const router = express.Router();

router.get('/so', SOController.getAll);
router.get('/so/:id/deposit-status', SOController.getWorkflowStatus);
router.get('/so/:id', SOController.getById);
router.post('/so', SOController.create);
router.put('/so/:id', SOController.update);
router.delete('/so/:id', SOController.delete);
router.patch('/so/:id/confirm', SOController.confirm);
router.patch('/so/:id/cancel', SOController.cancel);
router.patch('/so/:id/mark-items-converted', SOController.markItemsConverted);

export default router;
