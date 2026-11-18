/**
 * HyGrow - Backend Automated Daily Plant Logging & Sensor Integration Service
 * 
 * Scheduled daily runner and manual ingestion engine for multi-set hydroponic telemetry.
 * Automatically aggregates readings per sensor set, maps them to associated plants,
 * guarantees deterministic document IDs (${plantId}_${dateString}) to prevent duplicates,
 * records audit logs to 'logging_history', and preserves historical sensor assignments.
 */

import { getDatabase } from './firebase.js';

export const DEFAULT_BACKEND_SENSOR_SETS = [
  {
    id: 'set-main',
    name: 'Main NFT Bay',
    zone: 'Zone A (Bench 1-4)',
    zoneId: 'zone-a',
    crop: 'Butterhead Lettuce',
    growingSystem: 'NFT (Nutrient Film Technique)',
    deviceId: 'esp32-farm-01',
    associatedPlantIds: [
      'plant-butterhead-lettuce',
      'plant-rainbow-chard',
      'plant-cherry-tomatoes',
      'plant-crisp-peppers',
    ],
    sensorIds: ['temp-a-01', 'humidity-a-01', 'ph-a-01', 'ec-a-01', 'water-a-01', 'lux-a-01'],
    sensorTypes: ['DHT22 Air Temp/RH', 'Glass pH Electrode', 'Toroidal EC Probe', 'Submersible Temp', 'BH1750 Lux'],
    status: 'active',
    defaultTelemetry: {
      temperature: 23.4,
      humidity: 62.5,
      ph: 6.05,
      ec: 1.52,
      tds: 760,
      waterTemp: 20.6,
      waterLevel: 85,
      lightIntensity: 14800,
      vpd: 1.08,
    },
  },
  {
    id: 'set-dwc',
    name: 'DWC Raft System',
    zone: 'Zone B (Tanks 1-2)',
    zoneId: 'zone-b',
    crop: 'Genovese Basil',
    growingSystem: 'DWC (Deep Water Culture)',
    deviceId: 'esp32-farm-02',
    associatedPlantIds: ['plant-genovese-basil', 'plant-spearmint'],
    sensorIds: ['temp-b-02', 'humidity-b-02', 'ph-b-02', 'ec-b-02', 'water-b-02', 'lux-b-02'],
    sensorTypes: ['DHT22 Air Temp/RH', 'Glass pH Electrode', 'Toroidal EC Probe', 'Submersible Temp', 'BH1750 Lux'],
    status: 'active',
    defaultTelemetry: {
      temperature: 24.6,
      humidity: 66.0,
      ph: 5.95,
      ec: 1.60,
      tds: 800,
      waterTemp: 21.0,
      waterLevel: 90,
      lightIntensity: 15100,
      vpd: 1.05,
    },
  },
  {
    id: 'set-nursery',
    name: 'Germination Nursery',
    zone: 'Zone C (Rack Enclosure)',
    zoneId: 'zone-c',
    crop: 'Microgreens & Seedlings',
    growingSystem: 'Vertical Aeroponic Column & Plug Trays',
    deviceId: 'esp32-farm-03',
    associatedPlantIds: ['plant-hydro-strawberries', 'plant-baby-spinach'],
    sensorIds: ['temp-c-03', 'humidity-c-03', 'ph-c-03', 'ec-c-03', 'water-c-03', 'lux-c-03'],
    sensorTypes: ['DHT22 Air Temp/RH', 'Glass pH Electrode', 'Toroidal EC Probe', 'Submersible Temp', 'BH1750 Lux'],
    status: 'active',
    defaultTelemetry: {
      temperature: 25.4,
      humidity: 73.5,
      ph: 6.20,
      ec: 1.35,
      tds: 675,
      waterTemp: 21.5,
      waterLevel: 94,
      lightIntensity: 12500,
      vpd: 0.88,
    },
  },
];

export const PLANT_CROP_METADATA = {
  'plant-butterhead-lettuce': { name: 'Butterhead Lettuce', variety: 'Rex Butterhead', stage: 'Vegetative' },
  'plant-rainbow-chard': { name: 'Rainbow Swiss Chard', variety: 'Bright Lights', stage: 'Leaf Expansion' },
  'plant-cherry-tomatoes': { name: 'Cherry Tomatoes', variety: 'Sweet Million F1', stage: 'Flowering & Fruiting' },
  'plant-crisp-peppers': { name: 'Bell Peppers', variety: 'California Wonder', stage: 'Fruit Swell' },
  'plant-genovese-basil': { name: 'Genovese Basil', variety: 'Italian Sweet Basil', stage: 'Vegetative' },
  'plant-spearmint': { name: 'Fresh Spearmint', variety: 'Moroccan Spearmint', stage: 'Rapid Leafing' },
  'plant-hydro-strawberries': { name: 'Albion Strawberries', variety: 'Day-Neutral Albion', stage: 'Flowering' },
  'plant-baby-spinach': { name: 'Baby Spinach', variety: 'Bloomsdale Long Standing', stage: 'Microgreen/Seedling' },
};

/**
 * Format date in target timezone (YYYY-MM-DD)
 */
export function getDateStringInTimezone(timezone = 'Asia/Kolkata', date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Format readable human date: e.g. "Nov 18, 2026"
 */
export function formatHumanDate(dateString) {
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateString;
  }
}

/**
 * Aggregate multiple or single sensor samples into Daily Aggregates
 * Calculates avg, min, max, sample count, first and last timestamps.
 * If sensor is offline or has missing measurements, flags missingMetrics and marks partial.
 */
export function aggregateSensorTelemetry(samples, { sensorSet, fallbackSource = 'hardware' } = {}) {
  const sampleList = Array.isArray(samples) && samples.length > 0 ? samples : [];

  if (sampleList.length === 0) {
    // If no samples at all, return simulated fallback telemetry if sensor set has it
    const defaultData = sensorSet?.defaultTelemetry || {
      temperature: 24.0,
      humidity: 65,
      ph: 6.0,
      ec: 1.5,
      tds: 750,
      waterTemp: 21.0,
      waterLevel: 85,
      lightIntensity: 14000,
      vpd: 1.05,
    };

    return {
      readings: defaultData,
      minReadings: { ...defaultData },
      maxReadings: { ...defaultData },
      sampleCount: 1,
      source: 'simulated',
      isSimulated: true,
      loggingStatus: 'simulated',
      sensorStatuses: {
        temperature: 'simulated',
        humidity: 'simulated',
        ph: 'simulated',
        ec: 'simulated',
        waterTemp: 'simulated',
      },
      missingMetrics: [],
      firstReadingAt: new Date().toISOString(),
      lastReadingAt: new Date().toISOString(),
    };
  }

  // Check source: if all samples or at least one is explicitly 'simulated', flag appropriately
  const isAnySimulated = sampleList.some((s) => s.source === 'simulated' || s.isSimulated);
  const effectiveSource = isAnySimulated ? 'simulated' : fallbackSource;

  const metrics = ['temperature', 'humidity', 'ph', 'ec', 'tds', 'waterTemp', 'waterLevel', 'lightIntensity', 'vpd'];
  const sums = {};
  const counts = {};
  const mins = {};
  const maxs = {};
  const sensorStatuses = {};
  const missingMetrics = [];

  metrics.forEach((m) => {
    sums[m] = 0;
    counts[m] = 0;
    mins[m] = Infinity;
    maxs[m] = -Infinity;
  });

  sampleList.forEach((sample) => {
    const r = sample.readings || sample;
    metrics.forEach((m) => {
      const val = Number(r[m]);
      if (!isNaN(val) && val !== null && val !== undefined) {
        sums[m] += val;
        counts[m] += 1;
        if (val < mins[m]) mins[m] = val;
        if (val > maxs[m]) maxs[m] = val;
      }
    });
  });

  const readings = {};
  const minReadings = {};
  const maxReadings = {};

  metrics.forEach((m) => {
    if (counts[m] > 0) {
      const avg = sums[m] / counts[m];
      readings[m] = m === 'humidity' || m === 'tds' || m === 'lightIntensity' || m === 'waterLevel'
        ? Math.round(avg)
        : Number(avg.toFixed(2));
      minReadings[m] = m === 'humidity' || m === 'tds' || m === 'lightIntensity' || m === 'waterLevel'
        ? Math.round(mins[m])
        : Number(mins[m].toFixed(2));
      maxReadings[m] = m === 'humidity' || m === 'tds' || m === 'lightIntensity' || m === 'waterLevel'
        ? Math.round(maxs[m])
        : Number(maxs[m].toFixed(2));
      sensorStatuses[m] = effectiveSource === 'simulated' ? 'simulated' : 'online';
    } else {
      sensorStatuses[m] = 'offline';
      missingMetrics.push(m);
      // Use fallback default for reading so downstream math doesn't crash, but status is marked offline
      const defVal = sensorSet?.defaultTelemetry?.[m] ?? 0;
      readings[m] = defVal;
      minReadings[m] = defVal;
      maxReadings[m] = defVal;
    }
  });

  const firstTimestamp = sampleList[0]?.timestamp || new Date().toISOString();
  const lastTimestamp = sampleList[sampleList.length - 1]?.timestamp || new Date().toISOString();
  const loggingStatus = missingMetrics.length > 0 ? 'partial' : (effectiveSource === 'simulated' ? 'simulated' : 'complete');

  return {
    readings,
    minReadings,
    maxReadings,
    sampleCount: sampleList.length,
    source: effectiveSource,
    isSimulated: effectiveSource === 'simulated',
    loggingStatus,
    sensorStatuses,
    missingMetrics,
    firstReadingAt: firstTimestamp,
    lastReadingAt: lastTimestamp,
  };
}

class DailySchedulerService {
  constructor() {
    this.timezone = 'Asia/Kolkata';
    this.targetHour = 23;
    this.targetMinute = 55;
    this.enabled = true;
    this.lastRunDate = null;
    this.lastExecutionResult = null;
    this.intervalId = null;
    this.isExecuting = false;
  }

  configure({ enabled, timezone, targetHour, targetMinute }) {
    if (enabled !== undefined) this.enabled = Boolean(enabled);
    if (timezone) this.timezone = timezone;
    if (targetHour !== undefined) this.targetHour = Number(targetHour);
    if (targetMinute !== undefined) this.targetMinute = Number(targetMinute);
  }

  getStatus() {
    return {
      enabled: this.enabled,
      timezone: this.timezone,
      targetTime: `${String(this.targetHour).padStart(2, '0')}:${String(this.targetMinute).padStart(2, '0')}`,
      lastRunDate: this.lastRunDate,
      isExecuting: this.isExecuting,
      lastResult: this.lastExecutionResult,
      currentTimeInZone: new Date().toLocaleString('en-US', { timeZone: this.timezone }),
    };
  }

  start() {
    if (this.intervalId) clearInterval(this.intervalId);
    // Check every 60 seconds
    this.intervalId = setInterval(() => {
      this.checkAndTriggerScheduledRun().catch((err) => {
        console.error('[dailyScheduler] Error in scheduled cycle:', err);
      });
    }, 60_000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async checkAndTriggerScheduledRun() {
    if (!this.enabled || this.isExecuting) return;

    const todayDate = getDateStringInTimezone(this.timezone);
    if (this.lastRunDate === todayDate) return; // Already run for today

    // Check current hour and minute in timezone
    const nowParts = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(new Date());

    const currentHour = Number(nowParts.find((p) => p.type === 'hour')?.value || 0);
    const currentMinute = Number(nowParts.find((p) => p.type === 'minute')?.value || 0);

    if (currentHour >= this.targetHour && currentMinute >= this.targetMinute) {
      console.log(`[dailyScheduler] Triggering scheduled logging for date ${todayDate} (${this.timezone})...`);
      await this.executeDailyPlantLogging({
        date: todayDate,
        timezone: this.timezone,
        source: 'automated-scheduler',
        triggeredBy: 'system-cron',
      });
    }
  }

  /**
   * Main execution engine:
   * Aggregates readings for each sensor set and updates/creates plant_daily_logs for associated plants.
   */
  async executeDailyPlantLogging({
    date,
    timezone = this.timezone,
    source = 'automated-scheduler',
    triggeredBy = 'system',
    userId = 'demo-farmer',
    userEmail = 'farmer@hygrow.local',
    rawReadingsBySet = {},
    db: customDb,
  } = {}) {
    if (this.isExecuting) {
      return { success: false, message: 'Logging already in progress' };
    }

    this.isExecuting = true;
    const executionId = `exec-${Date.now()}`;
    const dateString = date || getDateStringInTimezone(timezone);
    const formattedDate = formatHumanDate(dateString);
    const startTime = Date.now();

    try {
      const db = customDb || (await getDatabase());
      const sensorSets = DEFAULT_BACKEND_SENSOR_SETS;
      const loggedRecords = [];

      // Process each sensor set independently
      for (const set of sensorSets) {
        // Collect raw readings provided or fallback
        const samples = rawReadingsBySet[set.id] || [];
        const aggregation = aggregateSensorTelemetry(samples, {
          sensorSet: set,
          fallbackSource: samples.length > 0 ? (samples[0]?.source || 'hardware') : 'simulated',
        });

        // Associated plants for this sensor set
        const plantIds = set.associatedPlantIds || [];

        for (const plantId of plantIds) {
          const plantMeta = PLANT_CROP_METADATA[plantId] || {
            name: set.crop || 'Hydroponic Crop',
            variety: 'Standard Variety',
            stage: 'Cultivation',
          };

          // Deterministic Document ID: ${plantId}_${dateString}
          const docId = `${plantId}_${dateString}`;
          const plantLogDocRef = db.collection('plant_daily_logs').doc(docId);

          // Check if document already exists to maintain audit trail and original createdAt
          let existingData = null;
          try {
            const snap = await plantLogDocRef.get();
            if (snap.exists) {
              existingData = snap.data();
            }
          } catch (_e) {
            // Firestore may be in mock or test environment
          }

          const recordPayload = {
            id: docId,
            plantId,
            cropName: plantMeta.name,
            variety: plantMeta.variety,
            stage: plantMeta.stage,
            dateString,
            formattedDate,
            timestamp: new Date().toISOString(),
            // Historical Sensor Immutability: preserve the sensor set assigned at the time of log
            sensorSetId: existingData?.sensorSetId || set.id,
            zone: existingData?.zone || set.zone,
            zoneId: existingData?.zoneId || set.zoneId,
            growingSystem: existingData?.growingSystem || set.growingSystem,
            deviceId: set.deviceId,
            source: aggregation.source,
            isSimulated: aggregation.isSimulated,
            loggingStatus: aggregation.loggingStatus,
            sampleCount: aggregation.sampleCount,
            sensorStatuses: aggregation.sensorStatuses,
            missingMetrics: aggregation.missingMetrics,
            readings: aggregation.readings,
            minReadings: aggregation.minReadings,
            maxReadings: aggregation.maxReadings,
            firstReadingAt: aggregation.firstReadingAt,
            lastReadingAt: aggregation.lastReadingAt,
            isAutomatedDailyAvg: true,
            isFirestoreSynced: true,
            userId,
            userEmail,
            notes: `Recorded via ${source} for ${plantMeta.name} from sensor set ${set.name} (${aggregation.sampleCount} samples).`,
            createdAt: existingData?.createdAt || new Date(),
            updatedAt: new Date(),
            lastFetchedAt: new Date().toISOString(),
          };

          try {
            await plantLogDocRef.set(recordPayload, { merge: true });
          } catch (writeErr) {
            console.warn(`[dailyScheduler] Firestore write to plant_daily_logs/${docId} note:`, writeErr.message);
          }

          loggedRecords.push(recordPayload);
        }
      }

      // Record audit entry in logging_history
      const auditPayload = {
        executionId,
        date: dateString,
        formattedDate,
        timezone,
        source,
        triggeredBy,
        sensorSetsProcessed: sensorSets.length,
        recordsLogged: loggedRecords.length,
        durationMs: Date.now() - startTime,
        status: 'success',
        createdAt: new Date(),
      };

      try {
        await db.collection('logging_history').doc(executionId).set(auditPayload);
      } catch (_e) {
        // Mock fallback
      }

      this.lastRunDate = dateString;
      this.lastExecutionResult = {
        success: true,
        executionId,
        date: dateString,
        recordsLogged: loggedRecords.length,
        timestamp: new Date().toISOString(),
      };

      return {
        success: true,
        executionId,
        date: dateString,
        timezone,
        sensorSetsProcessed: sensorSets.length,
        recordsLogged: loggedRecords.length,
        records: loggedRecords,
      };
    } catch (err) {
      console.error('[dailyScheduler] executeDailyPlantLogging error:', err);
      this.lastExecutionResult = {
        success: false,
        executionId,
        date: dateString,
        error: err.message,
        timestamp: new Date().toISOString(),
      };
      throw err;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Manual Single-Plant Fetch:
   * Fetches latest readings from that plant's assigned sensor set and creates/updates plant_daily_logs record.
   */
  async fetchAndLogSinglePlant({
    plantId,
    preferredSetId,
    date,
    timezone = this.timezone,
    rawReading,
    source = 'manual-plant-fetch',
    userId = 'demo-farmer',
    userEmail = 'farmer@hygrow.local',
    db: customDb,
  }) {
    if (!plantId) throw new Error('plantId is required.');

    const dateString = date || getDateStringInTimezone(timezone);
    const formattedDate = formatHumanDate(dateString);
    const db = customDb || (await getDatabase());

    // Identify assigned sensor set
    let targetSet = DEFAULT_BACKEND_SENSOR_SETS.find((s) => s.id === preferredSetId);
    if (!targetSet) {
      targetSet = DEFAULT_BACKEND_SENSOR_SETS.find((s) => s.associatedPlantIds?.includes(plantId)) || DEFAULT_BACKEND_SENSOR_SETS[0];
    }

    const samples = rawReading ? [rawReading] : [];
    const aggregation = aggregateSensorTelemetry(samples, {
      sensorSet: targetSet,
      fallbackSource: rawReading?.source || (rawReading ? 'hardware' : 'simulated'),
    });

    const plantMeta = PLANT_CROP_METADATA[plantId] || {
      name: targetSet.crop || 'Hydroponic Plant',
      variety: 'Cultivar',
      stage: 'Vegetative',
    };

    const docId = `${plantId}_${dateString}`;
    const docRef = db.collection('plant_daily_logs').doc(docId);

    let existingData = null;
    try {
      const snap = await docRef.get();
      if (snap.exists) existingData = snap.data();
    } catch (_e) {}

    const payload = {
      id: docId,
      plantId,
      cropName: plantMeta.name,
      variety: plantMeta.variety,
      stage: plantMeta.stage,
      dateString,
      formattedDate,
      timestamp: new Date().toISOString(),
      // Historical Immutability
      sensorSetId: existingData?.sensorSetId || targetSet.id,
      zone: existingData?.zone || targetSet.zone,
      zoneId: existingData?.zoneId || targetSet.zoneId,
      growingSystem: existingData?.growingSystem || targetSet.growingSystem,
      deviceId: targetSet.deviceId,
      source: aggregation.source,
      isSimulated: aggregation.isSimulated,
      loggingStatus: aggregation.loggingStatus,
      sampleCount: aggregation.sampleCount,
      sensorStatuses: aggregation.sensorStatuses,
      missingMetrics: aggregation.missingMetrics,
      readings: aggregation.readings,
      minReadings: aggregation.minReadings,
      maxReadings: aggregation.maxReadings,
      firstReadingAt: aggregation.firstReadingAt,
      lastReadingAt: aggregation.lastReadingAt,
      isAutomatedDailyAvg: true,
      isFirestoreSynced: true,
      userId,
      userEmail,
      notes: `Manual fetch completed from sensor set ${targetSet.name} (${aggregation.sampleCount} sample).`,
      createdAt: existingData?.createdAt || new Date(),
      updatedAt: new Date(),
      lastFetchedAt: new Date().toISOString(),
    };

    try {
      await docRef.set(payload, { merge: true });
    } catch (_e) {}

    return {
      success: true,
      id: docId,
      sensorSetId: targetSet.id,
      record: payload,
    };
  }
}

export const dailyScheduler = new DailySchedulerService();
