import express from 'express';
import AdminInitTokenController from '../controllers/AdminInitTokenController';

const router = express.Router();

router.post('/admin-init-tokens/runtime-disconnect', AdminInitTokenController.disconnect);
router.post('/admin-init-tokens/runtime-heartbeat', AdminInitTokenController.heartbeat);
router.get('/admin-init-tokens/runtime-status', AdminInitTokenController.runtimeStatus);
router.get('/admin-init-tokens/status', AdminInitTokenController.status);
router.get('/admin-init-tokens', AdminInitTokenController.list);
router.post('/admin-init-tokens', AdminInitTokenController.create);
router.patch('/admin-init-tokens/:id/disable', AdminInitTokenController.disable);

export default router;