const express = require('express');
const DocumentController = require('../controllers/DocumentController');

const router = express.Router();

router.get('/documents', DocumentController.getAll);
router.post('/documents', DocumentController.create);
router.delete('/documents/:id', DocumentController.delete);

module.exports = router;
