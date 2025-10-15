const pool = require("../index");

// Simple in-memory storage (like Laravel's cache)
const storage = {
  iot_treatment_status: 'inactive',
  iot_latest_weight: {
    weight: 0,
    volume_ml: 0,
    volume_kl: 0,
    timestamp: null,
    is_start: false,
    device_id: null
  },
  iot_device_status: {
    connected: false,
    device_id: null,
    last_seen: null
  }
};

exports.health = (req, res) => {
  console.log('✅ Health check called');
  return res.status(200)
    .header('Access-Control-Allow-Origin', '*')
    .header('Cache-Control', 'no-cache, must-revalidate')
    .json({ status: 'healthy' });
};

exports.getStatus = (req, res) => {
  try {
    const status = storage.iot_treatment_status;
    return res.status(200)
      .header('Access-Control-Allow-Origin', '*')
      .header('Cache-Control', 'no-cache, must-revalidate')
      .json({ status: status });
  } catch (error) {
    return res.status(503)
      .header('Access-Control-Allow-Origin', '*')
      .json({ error: 'Service unavailable' });
  }
};

exports.updateStatus = (req, res) => {
  const { status, device_id } = req.body;

  // Laravel validation
  if (!status || !['active', 'inactive'].includes(status) || !device_id) {
    return res.status(422)
      .header('Access-Control-Allow-Origin', '*')
      .json({
        success: false,
        errors: { 
          status: 'Status is required and must be active or inactive', 
          device_id: 'Device ID is required' 
        }
      });
  }

  try {
    storage.iot_treatment_status = status;
    
    // Update device status
    storage.iot_device_status = {
      connected: true,
      device_id: device_id,
      last_seen: new Date().toISOString()
    };

    return res.status(200)
      .header('Access-Control-Allow-Origin', '*')
      .json({ success: true });
  } catch (error) {
    return res.status(500)
      .header('Access-Control-Allow-Origin', '*')
      .json({
        success: false,
        message: 'Failed to update status'
      });
  }
};

exports.getWeight = (req, res) => {
  try {
    const weightData = storage.iot_latest_weight;
    return res.status(200)
      .header('Access-Control-Allow-Origin', '*')
      .header('Cache-Control', 'no-cache, must-revalidate')
      .json(weightData);
  } catch (error) {
    return res.status(503)
      .header('Access-Control-Allow-Origin', '*')
      .json({
        weight: 0,
        volume_ml: 0,
        volume_kl: 0,
        error: 'Failed to retrieve weight data'
      });
  }
};

exports.storeWeight = (req, res) => {
  console.log('📦 Weight endpoint called - FULL DATA:', req.body);
  
  // Accept ALL the data ESP32 sends but only validate required fields
  const { weight, volume_ml, volume_kl, is_start, device_id, initial_weight, drained_volume } = req.body;

  // Laravel validation - only weight and device_id are required
  if (weight === undefined || !device_id) {
    return res.status(422).json({
      success: false,
      errors: { 
        weight: 'Weight is required and must be numeric', 
        device_id: 'Device ID is required' 
      }
    });
  }

  try {
    const weightNum = parseFloat(weight);
    
    // Use ESP32's calculations or calculate our own
    const volumeMl = volume_ml !== undefined ? volume_ml : weightNum * 1000;
    const volumeKl = volume_kl !== undefined ? volume_kl : volumeMl / 1000000;

    console.log('📊 Storing weight data:', {
      weight: weightNum,
      device_id: device_id,
      volume_ml: volumeMl,
      is_start: is_start
    });

    // Store like Laravel
    storage.iot_latest_weight = {
      weight: weightNum,
      volume_ml: volumeMl,
      volume_kl: volumeKl,
      timestamp: new Date().toISOString(),
      is_start: is_start || (weightNum > 0),
      device_id: device_id
    };

    // Update device status (like Laravel)
    storage.iot_device_status = {
      connected: true,
      device_id: device_id,
      last_seen: new Date().toISOString()
    };

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error storing weight:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to store weight data'
    });
  }
};

exports.getDeviceStatus = (req, res) => {
  try {
    const status = storage.iot_device_status;
    return res.status(200)
      .header('Access-Control-Allow-Origin', '*')
      .header('Cache-Control', 'no-cache, must-revalidate')
      .json(status);
  } catch (error) {
    return res.status(503)
      .header('Access-Control-Allow-Origin', '*')
      .json({
        connected: false,
        error: 'Failed to retrieve device status'
      });
  }
};

exports.updateDeviceStatus = (req, res) => {
  console.log('📱 Device status called:', req.body);
  
  const { connected, device_id, last_seen, scale_initialized } = req.body;

  // Laravel validation
  if (connected === undefined || !device_id) {
    return res.status(422)
      .header('Access-Control-Allow-Origin', '*')
      .json({
        success: false,
        errors: { 
          connected: 'Connected status is required', 
          device_id: 'Device ID is required' 
        }
      });
  }

  try {
    storage.iot_device_status = {
      connected: connected,
      device_id: device_id,
      last_seen: last_seen || new Date().toISOString(),
      scale_initialized: scale_initialized || false
    };

    console.log(`✅ Device status updated: ${connected ? 'Connected' : 'Disconnected'}`);
    return res.status(200)
      .header('Access-Control-Allow-Origin', '*')
      .json({ success: true });
  } catch (error) {
    console.error('❌ Error updating device status:', error);
    return res.status(500)
      .header('Access-Control-Allow-Origin', '*')
      .json({
        success: false,
        message: 'Failed to update device status'
      });
  }
};

exports.connectDevice = (req, res) => {
  const { device_id } = req.body;

  if (!device_id) {
    return res.status(422)
      .header('Access-Control-Allow-Origin', '*')
      .json({
        success: false,
        errors: { device_id: 'Device ID is required' }
      });
  }

  try {
    storage.iot_device_status = {
      connected: true,
      device_id: device_id,
      last_seen: new Date().toISOString()
    };

    console.log(`✅ Device connected: ${device_id}`);
    return res.status(200)
      .header('Access-Control-Allow-Origin', '*')
      .json({
        success: true,
        message: 'Device connected successfully'
      });
  } catch (error) {
    console.error('❌ Error connecting device:', error);
    return res.status(500)
      .header('Access-Control-Allow-Origin', '*')
      .json({
        success: false,
        message: error.message
      });
  }
};

// Optional: Add if you want to keep reminders in ESP32
exports.getReminders = (req, res) => {
  const { device_id } = req.query;

  if (!device_id) {
    return res.status(422)
      .header('Access-Control-Allow-Origin', '*')
      .json({
        success: false,
        errors: { device_id: 'Device ID is required' }
      });
  }

  try {
    // Return empty string (no reminders) like your Laravel would
    console.log(`🔔 Reminders requested for: ${device_id}`);
    return res.status(200)
      .header('Access-Control-Allow-Origin', '*')
      .json({
        success: true,
        reminders: ""
      });
  } catch (error) {
    return res.status(500)
      .header('Access-Control-Allow-Origin', '*')
      .json({
        success: false,
        message: 'Failed to get reminders'
      });
  }
};