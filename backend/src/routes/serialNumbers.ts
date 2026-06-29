import express from 'express';
import { SerialNumberController } from '../controllers/SerialNumberController';

const router = express.Router();

router.get('/serial-numbers/validate', SerialNumberController.validate);

export default router;
