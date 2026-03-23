import express from 'express';
import CodeController from '../controllers/CodeController';

const router = express.Router();

router.get('/codes/:type', CodeController.getAll);
router.post('/codes/:type', CodeController.create);
router.put('/codes/:type/:id', CodeController.update);
router.delete('/codes/:type/:id', CodeController.delete);

export default router;