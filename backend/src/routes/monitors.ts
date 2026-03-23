import express from 'express';
import MonitorController from '../controllers/MonitorController';

const router = express.Router();

router.get('/monitors', MonitorController.getAll);
router.get('/monitors/next-id', MonitorController.getNextId);
router.get('/monitors/:id', MonitorController.getById);
router.post('/monitors', MonitorController.save);
router.patch('/monitors/:id/print', MonitorController.markPrinted);
router.delete('/monitors/:id', MonitorController.delete);

export default router;
