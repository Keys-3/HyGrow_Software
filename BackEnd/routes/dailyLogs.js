import { Router } from 'express';
import { getDatabase } from '../services/firebase.js';
import { dailyScheduler, DEFAULT_BACKEND_SENSOR_SETS } from '../services/dailyScheduler.js';

const router = Router();

/**
 * GET /api/daily-sensor-logs/status
 * Get scheduler status and recent execution summary
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    scheduler: dailyScheduler.getStatus(),
    sensorSets: DEFAULT_BACKEND_SENSOR_SETS.map((s) => ({
      id: s.id,
      name: s.name,
      zone: s.zone,
      crop: s.crop,
      growingSystem: s.growingSystem,
      status: s.status,
      associatedPlantIds: s.associatedPlantIds,
      sensorIds: s.sensorIds,
    })),
  });
});

/**
 * POST /api/daily-sensor-logs/trigger
 * Bulk manual trigger: "Fetch All Sensor Sets & Update Plant Logs"
 */
router.post('/trigger', async (req, res) => {
  try {
    const userId = req.user?.uid || req.body.userId || 'demo-farmer';
    const userEmail = req.user?.email || req.body.userEmail || 'farmer@hygrow.local';
    const rawReadingsBySet = req.body.rawReadingsBySet || {};
    const timezone = req.body.timezone || 'Asia/Kolkata';

    const result = await dailyScheduler.executeDailyPlantLogging({
      timezone,
      source: 'manual-bulk-fetch',
      triggeredBy: userId,
      userId,
      userEmail,
      rawReadingsBySet,
    });

    res.json(result);
  } catch (err) {
    console.error('[dailyLogs] Error executing manual trigger:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to trigger plant sensor logging.',
    });
  }
});

/**
 * POST /api/daily-sensor-logs/fetch-plant
 * Single-plant manual fetch: "Fetch Sensor Data & Create Today's Log"
 */
router.post('/fetch-plant', async (req, res) => {
  try {
    const { plantId, sensorSetId, rawReading, timezone } = req.body;

    if (!plantId) {
      return res.status(400).json({ success: false, error: 'plantId is required.' });
    }

    const userId = req.user?.uid || req.body.userId || 'demo-farmer';
    const userEmail = req.user?.email || req.body.userEmail || 'farmer@hygrow.local';

    const result = await dailyScheduler.fetchAndLogSinglePlant({
      plantId,
      preferredSetId: sensorSetId,
      rawReading,
      timezone: timezone || 'Asia/Kolkata',
      source: 'manual-plant-fetch',
      userId,
      userEmail,
    });

    res.json(result);
  } catch (err) {
    console.error('[dailyLogs] Error fetching single plant sensors:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch plant sensor log.',
    });
  }
});

/**
 * GET /api/daily-sensor-logs/plant-logs
 * Fetch records from `plant_daily_logs` collection
 */
router.get('/plant-logs', async (req, res) => {
  try {
    const db = await getDatabase();
    const plantId = req.query.plantId;
    const date = req.query.date;
    const limit = Math.min(Number(req.query.limit) || 365, 365);

    let queryRef = db.collection('plant_daily_logs');

    if (plantId) {
      queryRef = queryRef.where('plantId', '==', plantId);
    }
    if (date) {
      queryRef = queryRef.where('dateString', '==', date);
    }

    const snapshot = await queryRef.limit(limit).get();
    const logs = [];

    snapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    logs.sort((a, b) => {
      const dateA = a.dateString || a.timestamp || '';
      const dateB = b.dateString || b.timestamp || '';
      return dateB.localeCompare(dateA);
    });

    res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (err) {
    console.error('[dailyLogs] Error fetching plant_daily_logs:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch plant daily logs.',
    });
  }
});

/**
 * GET /api/daily-sensor-logs/history
 * Audit trail records from `logging_history`
 */
router.get('/history', async (req, res) => {
  try {
    const db = await getDatabase();
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const snapshot = await db.collection('logging_history').limit(limit).get();
    const history = [];

    snapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    history.sort((a, b) => {
      const timeA = a.timestamp || a.date || '';
      const timeB = b.timestamp || b.date || '';
      return timeB.localeCompare(timeA);
    });

    res.json({
      success: true,
      count: history.length,
      history,
    });
  } catch (err) {
    console.error('[dailyLogs] Error fetching logging history:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch logging history.',
    });
  }
});

/**
 * DELETE /api/daily-sensor-logs/log/:id
 * Delete a specific daily log document by ID (e.g. plant-butterhead-lettuce_2026-11-18)
 */
router.delete('/log/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Log ID is required.' });
    }

    const db = await getDatabase();
    await db.collection('plant_daily_logs').doc(id).delete();

    // Also attempt deletion in daily_sensor_logs if it matches daily-YYYY-MM-DD
    const parts = id.split('_');
    if (parts.length >= 2) {
      const datePart = parts[parts.length - 1];
      try {
        await db.collection('daily_sensor_logs').doc(`daily-${datePart}`).delete();
      } catch (_e) {}
    }

    res.json({
      success: true,
      message: `Log record '${id}' deleted successfully.`,
      deletedId: id,
    });
  } catch (err) {
    console.error('[dailyLogs] Error deleting daily log:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to delete daily log record.',
    });
  }
});

/**
 * DELETE /api/daily-sensor-logs/plant/:plantId
 * Delete entire historical record for a specific plant
 */
router.delete('/plant/:plantId', async (req, res) => {
  try {
    const { plantId } = req.params;
    if (!plantId) {
      return res.status(400).json({ success: false, error: 'plantId is required.' });
    }

    const db = await getDatabase();
    // 1. Delete matching documents in plant_daily_logs
    const plantLogsSnap = await db.collection('plant_daily_logs').where('plantId', '==', plantId).get();
    const batch = db.batch();
    let count = 0;

    plantLogsSnap.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });

    // 2. Delete matching documents in plant_logs
    const legacySnap = await db.collection('plant_logs').where('plantId', '==', plantId).get();
    legacySnap.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });

    if (count > 0) {
      await batch.commit();
    }

    res.json({
      success: true,
      message: `Deleted ${count} historical log documents for plant '${plantId}'.`,
      plantId,
      deletedCount: count,
    });
  } catch (err) {
    console.error('[dailyLogs] Error deleting plant history:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to delete plant history.',
    });
  }
});

/**
 * GET /api/daily-sensor-logs
 * Fetch daily sensor average logs from Firestore
 */
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const userId = req.user?.uid || req.query.userId;
    const limit = Math.min(Number(req.query.limit) || 365, 365);
    const plantId = req.query.plantId;

    let queryRef = db.collection('daily_sensor_logs');

    if (userId) {
      queryRef = queryRef.where('userId', '==', userId);
    }
    if (plantId) {
      queryRef = queryRef.where('plantId', '==', plantId);
    }

    const snapshot = await queryRef.limit(limit).get();
    const logs = [];

    snapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    logs.sort((a, b) => {
      const dateA = a.date || a.timestamp || '';
      const dateB = b.date || b.timestamp || '';
      return dateB.localeCompare(dateA);
    });

    res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (err) {
    console.error('[dailyLogs] Error fetching daily sensor logs:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch daily sensor logs.',
    });
  }
});

/**
 * POST /api/daily-sensor-logs
 * Store or update a daily average sensor record in Firestore
 */
router.post('/', async (req, res) => {
  try {
    const {
      date,
      plantId,
      plantName,
      zone,
      deviceId,
      sampleCount,
      readings,
      minReadings,
      maxReadings,
      isOptimal,
      notes,
    } = req.body;

    if (!date || !readings) {
      return res.status(400).json({
        success: false,
        error: 'Fields "date" (YYYY-MM-DD) and "readings" object are required.',
      });
    }

    const db = await getDatabase();
    const userId = req.user?.uid || req.body.userId || 'demo-farmer';
    const userEmail = req.user?.email || req.body.userEmail || 'farmer@hygrow.local';
    const docId = `daily-${date}`;

    const docPayload = {
      date,
      plantId: plantId || 'general',
      plantName: plantName || 'Hydroponic Crop',
      zone: zone || 'Production Bay',
      deviceId: deviceId || 'hygrow-sensor-hub',
      userId,
      userEmail,
      sampleCount: Number(sampleCount) || 1,
      isAutomatedDailyAvg: true,
      isFirestoreSynced: true,
      readings: {
        temperature: Number(readings.temperature ?? 24.0),
        humidity: Math.round(readings.humidity ?? 64),
        ph: Number(readings.ph ?? 6.05),
        ec: Number(readings.ec ?? 1.5),
        tds: Math.round(readings.tds ?? (readings.ec ? readings.ec * 500 : 750)),
        waterTemp: Number(readings.waterTemp ?? 20.4),
        waterLevel: Math.round(readings.waterLevel ?? 84),
        lightIntensity: Math.round(readings.lightIntensity ?? 14500),
        vpd: Number(readings.vpd ?? 1.05),
      },
      minReadings: minReadings || readings,
      maxReadings: maxReadings || readings,
      isOptimal: isOptimal !== undefined ? Boolean(isOptimal) : true,
      notes: notes || `Automated daily average recorded for ${date}.`,
      updatedAt: new Date(),
    };

    await db.collection('daily_sensor_logs').doc(docId).set(docPayload, { merge: true });

    // Also upsert to plant_logs for unified history
    await db.collection('plant_logs').doc(`daily-avg-${date}`).set({
      userId,
      userEmail,
      plantName: docPayload.plantName,
      stage: 'Daily Telemetry Summary',
      notes: docPayload.notes,
      readings: docPayload.readings,
      timestamp: new Date().toISOString(),
      isDailyAverageSummary: true,
      sampleCount: docPayload.sampleCount,
      updatedAt: new Date(),
    }, { merge: true });

    res.json({
      success: true,
      id: docId,
      record: docPayload,
    });
  } catch (err) {
    console.error('[dailyLogs] Error storing daily sensor log:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to store daily sensor log.',
    });
  }
});

export default router;
