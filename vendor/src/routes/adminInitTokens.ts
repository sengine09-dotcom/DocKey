import express from 'express';
import AdminInitTokenController from '../controllers/AdminInitTokenController';
import { appendFile } from 'fs';

const router = express.Router();

router.post('/admin-init-tokens/first-time', AdminInitTokenController.firstTime);
router.post('/admin-init-tokens/consume', AdminInitTokenController.consume);
router.post('/admin-init-tokens/set-company', AdminInitTokenController.setCompany);
router.post('/admin-init-tokens/release', AdminInitTokenController.release);
router.post('/admin-init-tokens/runtime-disconnect', AdminInitTokenController.disconnect);
router.post('/admin-init-tokens/runtime-heartbeat', AdminInitTokenController.heartbeat);
router.get('/admin-init-tokens/runtime-status', AdminInitTokenController.runtimeStatus);
router.get('/admin-init-tokens/status', AdminInitTokenController.status);
router.get('/admin-init-tokens', AdminInitTokenController.list);
router.post('/admin-init-tokens', AdminInitTokenController.create);
router.patch('/admin-init-tokens/:id', AdminInitTokenController.update);
router.patch('/admin-init-tokens/:id/disable', AdminInitTokenController.disable);
router.delete('/admin-init-tokens/:id', AdminInitTokenController.remove);

export default router; 