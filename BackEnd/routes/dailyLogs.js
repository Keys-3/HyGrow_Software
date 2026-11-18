import { Router } from 'express';
import { getDatabase } from '../services/firebase.js';

const router = Router();

/**
 * GET /api/daily-sensor-logs
 * Fetch daily sensor average logs from Firestore for future analysis
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

    // Sort newest date first
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
