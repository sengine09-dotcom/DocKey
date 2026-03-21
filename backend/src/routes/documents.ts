import express from 'express';
import DocumentController from '../controllers/DocumentController';

const router = express.Router();

router.get('/documents', DocumentController.getAll);
router.post('/documents', DocumentController.create);
router.delete('/documents/:id', DocumentController.delete);

export default router;
