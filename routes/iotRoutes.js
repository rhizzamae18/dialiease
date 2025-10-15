const express = require('express');
const router = express.Router();
const iotController = require('../controllers/iotController');

// EXACT same routes as your Laravel
router.get('/health', iotController.health);
router.get('/device-status', iotController.getDeviceStatus);
router.get('/weight', iotController.getWeight);
router.get('/status', iotController.getStatus);
router.get('/reminders', iotController.getReminders); // Add this if you want to keep it

router.post('/weight', iotController.storeWeight);
router.post('/status', iotController.updateStatus);
router.post('/device-status', iotController.updateDeviceStatus);
router.post('/connect', iotController.connectDevice);

module.exports = router;