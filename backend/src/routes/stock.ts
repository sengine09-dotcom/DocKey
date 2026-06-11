import express from 'express';
import StockController from '../controllers/StockController';

const router = express.Router();

router.get('/stock/summary', StockController.getSummary);
router.get('/stock/transactions', StockController.getTransactions);

export default router;
