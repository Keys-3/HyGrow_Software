import type { PlantLogReading } from './plantLogUtils';

export interface OptimalRange {
  min: number;
  max: number;
}

export interface PlantOptimalThresholds {
  temperature: OptimalRange;
  humidity: OptimalRange;
  ph: OptimalRange;
  ec: OptimalRange;
  waterTemp: OptimalRange;
}

export interface PlantProfile {
  id: string;
  name: string;
  variety: string;
  zone: string;
  zoneId?: string;
  category: string;
  growingSystem: string;
  sensorSetId: string;
  sensorIds?: string[];
  plantingDate: string; // ISO date
  currentStage: string;
  harvestCycleDays: number;
  imageUrl: string;
  notes: string;
  optimalThresholds: PlantOptimalThresholds;
}

export interface PlantSensorReadingRecord {
  id: string;
  plantId: string;
  weekNumber: number;
  timestamp: string; // ISO date
  season: 'Winter' | 'Spring' | 'Summer' | 'Autumn';
  stage: string;
  temperature: number;
  humidity: number;
  ph: number;
  ec: number;
  tds: number;
  waterTemp: number;
  waterLevel: number;
  lightIntensity: number;
  vpd: number;
  isOptimal: boolean;
}

export interface PlantGrowthPhotoRecord {
  id: string;
  plantId: string;
  plantName: string;
  stage: string;
  timestamp: string; // ISO date
  imageUrl: string;
  notes: string;
  readings: PlantLogReading;
}

export interface PlantDailyLogRecord {
  id: string;
  plantId: string;
  cropName?: string;
  variety?: string;
  dayNumber: number; // Day in chronological sequence (1 to 365)
  dateString: string; // "YYYY-MM-DD"
  formattedDate: string; // "Nov 16, 2026"
  timestamp: string; // ISO date
  season: 'Winter' | 'Spring' | 'Summer' | 'Autumn';
  stage: string;
  sensorSetId?: string; // Immutable record of assigned sensor set
  zone?: string; // Immutable zone name
  zoneId?: string;
  growingSystem?: string;
  source?: 'hardware' | 'simulated' | 'cloud';
  loggingStatus?: 'complete' | 'partial' | 'simulated' | 'failed';
  isSimulated?: boolean;
  readings: PlantLogReading;
  isOptimal: boolean;
  photos: PlantGrowthPhotoRecord[]; // Photos attached to THIS specific day!
  notes?: string;
  isAutomatedDailyAvg?: boolean;
  sampleCount?: number;
  sensorStatuses?: Record<string, 'online' | 'offline' | 'simulated'>;
  missingMetrics?: string[];
  minReadings?: PlantLogReading;
  maxReadings?: PlantLogReading;
  isFirestoreSynced?: boolean;
  lastFetchedAt?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface PlantProfileSummaryStats {
  totalReadings: number;
  totalPhotos: number;
  avgTemp: number;
  avgHumidity: number;
  avgPh: number;
  avgEc: number;
  avgWaterTemp: number;
  optimalCompliancePercent: number;
  currentStage: string;
  daysGrown: number;
}

export const METHI_PROFILE: PlantProfile = {
  id: 'plant-methi',
  name: 'Fenugreek (Methi)',
  variety: 'Fenugreek',
  zone: 'Zone A (Bench 1-4)',
  zoneId: 'zone-a',
  category: 'Leafy Greens',
  growingSystem: 'Hydroponic System',
  sensorSetId: 'set-main',
  sensorIds: ['temp-a-01', 'humidity-a-01', 'ph-a-01', 'ec-a-01', 'water-a-01', 'lux-a-01'],
  plantingDate: new Date().toISOString(),
  currentStage: 'Seedling',
  harvestCycleDays: 30,
  imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80',
  notes: 'Fenugreek (Methi) cultivation records from today onwards with continuous automated sensor logging.',
  optimalThresholds: {
    temperature: { min: 20, max: 26 },
    humidity: { min: 55, max: 70 },
    ph: { min: 5.6, max: 6.4 },
    ec: { min: 1.2, max: 1.8 },
    waterTemp: { min: 18, max: 22 },
  },
};

export const INITIAL_PLANT_PROFILES: PlantProfile[] = [
  {
    id: 'plant-butterhead-lettuce',
    name: 'Butterhead Lettuce',
    variety: 'Rex Butterhead',
    zone: 'NFT Bay 1 (Channel A)',
    zoneId: 'zone-a',
    category: 'Leafy Greens',
    growingSystem: 'NFT (Nutrient Film Technique)',
    sensorSetId: 'set-main',
    sensorIds: ['temp-a-01', 'humidity-a-01', 'ph-a-01', 'ec-a-01', 'water-a-01', 'lux-a-01'],
    plantingDate: new Date(Date.now() - 365 * 86400000).toISOString(),
    currentStage: 'Harvest Ready',
    harvestCycleDays: 42,
    imageUrl: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=800&auto=format&fit=crop&q=80',
    notes: 'Commercial nutrient film technique (NFT) cultivation with automated recirculating doser and 18-hour LED photoperiod.',
    optimalThresholds: {
      temperature: { min: 20.0, max: 24.0 },
      humidity: { min: 55, max: 68 },
      ph: { min: 5.8, max: 6.2 },
      ec: { min: 1.2, max: 1.6 },
      waterTemp: { min: 19.0, max: 21.5 },
    },
  },
  {
    id: 'plant-genovese-basil',
    name: 'Genovese Basil',
    variety: 'Italian Sweet Basil',
    zone: 'DWC Raft B (Deep Water)',
    zoneId: 'zone-b',
    category: 'Aromatic Culinary Herbs',
    growingSystem: 'DWC (Deep Water Culture)',
    sensorSetId: 'set-dwc',
    sensorIds: ['temp-b-02', 'humidity-b-02', 'ph-b-02', 'ec-b-02', 'water-b-02', 'lux-b-02'],
    plantingDate: new Date(Date.now() - 330 * 86400000).toISOString(),
    currentStage: 'Flowering',
    harvestCycleDays: 35,
    imageUrl: 'https://images.unsplash.com/photo-1606103920295-9a091573f160?w=800&auto=format&fit=crop&q=80',
    notes: 'Floating polystyrene raft bed over 30cm oxygenated nutrient basin with continuous venturi bubbling.',
    optimalThresholds: {
      temperature: { min: 23.0, max: 27.0 },
      humidity: { min: 60, max: 72 },
      ph: { min: 5.9, max: 6.4 },
      ec: { min: 1.4, max: 1.9 },
      waterTemp: { min: 20.5, max: 22.5 },
    },
  },
  {
    id: 'plant-cherry-tomatoes',
    name: 'Cherry Tomatoes',
    variety: 'Sweet Million Indeterminate',
    zone: 'Dutch Bucket 3 (Substrate)',
    zoneId: 'zone-a',
    category: 'Vine Fruiting Crops',
    growingSystem: 'Dutch Bucket Substrate System',
    sensorSetId: 'set-main',
    sensorIds: ['temp-a-01', 'humidity-a-01', 'ph-a-01', 'ec-a-01', 'water-a-01', 'lux-a-01'],
    plantingDate: new Date(Date.now() - 365 * 86400000).toISOString(),
    currentStage: 'Fruiting',
    harvestCycleDays: 85,
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80',
    notes: 'Perlite/clay pebble substrate buckets with automated dual-drip emitters, trellis string supports, and potassium-boosted blooming feed.',
    optimalThresholds: {
      temperature: { min: 22.0, max: 27.5 },
      humidity: { min: 55, max: 68 },
      ph: { min: 5.8, max: 6.3 },
      ec: { min: 1.8, max: 2.5 },
      waterTemp: { min: 19.5, max: 22.0 },
    },
  },
  {
    id: 'plant-hydro-strawberries',
    name: 'Hydro Strawberries',
    variety: 'Albion Day-Neutral',
    zone: 'Vertical Tower A (Aeroponic)',
    zoneId: 'zone-c',
    category: 'Soft Berries',
    growingSystem: 'Vertical Aeroponic Tower',
    sensorSetId: 'set-nursery',
    sensorIds: ['temp-c-03', 'humidity-c-03', 'ph-c-03', 'ec-c-03', 'water-c-03', 'lux-c-03'],
    plantingDate: new Date(Date.now() - 290 * 86400000).toISOString(),
    currentStage: 'Fruiting',
    harvestCycleDays: 70,
    imageUrl: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800&auto=format&fit=crop&q=80',
    notes: 'Vertical aeroponic misting column with intermittent root chamber spray interval of 1 minute on / 4 minutes off.',
    optimalThresholds: {
      temperature: { min: 20.0, max: 24.5 },
      humidity: { min: 55, max: 65 },
      ph: { min: 5.6, max: 6.1 },
      ec: { min: 1.3, max: 1.8 },
      waterTemp: { min: 18.5, max: 21.0 },
    },
  },
  {
    id: 'plant-rainbow-chard',
    name: 'Rainbow Swiss Chard',
    variety: 'Bright Lights Multicolour',
    zone: 'NFT Bay 2 (Channel C)',
    zoneId: 'zone-a',
    category: 'Leafy Greens',
    growingSystem: 'NFT (Nutrient Film Technique)',
    sensorSetId: 'set-main',
    sensorIds: ['temp-a-01', 'humidity-a-01', 'ph-a-01', 'ec-a-01', 'water-a-01', 'lux-a-01'],
    plantingDate: new Date(Date.now() - 365 * 86400000).toISOString(),
    currentStage: 'Vegetative',
    harvestCycleDays: 50,
    imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&auto=format&fit=crop&q=80',
    notes: 'High iron and magnesium solution with full spectrum LED supplementary lighting.',
    optimalThresholds: {
      temperature: { min: 21.0, max: 25.0 },
      humidity: { min: 58, max: 70 },
      ph: { min: 6.0, max: 6.5 },
      ec: { min: 1.5, max: 2.0 },
      waterTemp: { min: 19.0, max: 22.0 },
    },
  },
  {
    id: 'plant-crisp-peppers',
    name: 'Crisp Bell Peppers',
    variety: 'California Wonder Yellow',
    zone: 'Dutch Bucket 1 (Substrate)',
    zoneId: 'zone-a',
    category: 'Fruiting Crops',
    growingSystem: 'Dutch Bucket Substrate System',
    sensorSetId: 'set-main',
    sensorIds: ['temp-a-01', 'humidity-a-01', 'ph-a-01', 'ec-a-01', 'water-a-01', 'lux-a-01'],
    plantingDate: new Date(Date.now() - 340 * 86400000).toISOString(),
    currentStage: 'Fruiting',
    harvestCycleDays: 90,
    imageUrl: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=800&auto=format&fit=crop&q=80',
    notes: 'Controlled calcium nitrate ratio to ensure thick pericarp cell wall density and eliminate blossom end rot.',
    optimalThresholds: {
      temperature: { min: 22.5, max: 27.0 },
      humidity: { min: 55, max: 70 },
      ph: { min: 5.8, max: 6.3 },
      ec: { min: 1.7, max: 2.3 },
      waterTemp: { min: 20.0, max: 22.5 },
    },
  },
  {
    id: 'plant-spearmint',
    name: 'Fresh Spearmint',
    variety: 'Mentha Spicata Native',
    zone: 'DWC Raft A (Herb Bay)',
    zoneId: 'zone-b',
    category: 'Aromatic Culinary Herbs',
    growingSystem: 'DWC (Deep Water Culture)',
    sensorSetId: 'set-dwc',
    sensorIds: ['temp-b-02', 'humidity-b-02', 'ph-b-02', 'ec-b-02', 'water-b-02', 'lux-b-02'],
    plantingDate: new Date(Date.now() - 365 * 86400000).toISOString(),
    currentStage: 'Vegetative',
    harvestCycleDays: 30,
    imageUrl: 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=800&auto=format&fit=crop&q=80',
    notes: 'Aggressive stolon runner growth pruned bi-weekly with balanced nitrate solution.',
    optimalThresholds: {
      temperature: { min: 20.0, max: 24.5 },
      humidity: { min: 55, max: 70 },
      ph: { min: 6.0, max: 6.5 },
      ec: { min: 1.3, max: 1.7 },
      waterTemp: { min: 18.5, max: 21.5 },
    },
  },
  {
    id: 'plant-baby-spinach',
    name: 'Baby Spinach',
    variety: 'Bloomsdale Long Standing',
    zone: 'Deep Flow Bed (Bay 4)',
    zoneId: 'zone-c',
    category: 'Leafy Greens',
    growingSystem: 'Deep Flow Float Bed',
    sensorSetId: 'set-nursery',
    sensorIds: ['temp-c-03', 'humidity-c-03', 'ph-c-03', 'ec-c-03', 'water-c-03', 'lux-c-03'],
    plantingDate: new Date(Date.now() - 310 * 86400000).toISOString(),
    currentStage: 'Harvest Ready',
    harvestCycleDays: 32,
    imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&auto=format&fit=crop&q=80',
    notes: 'Strict chilled root zone maintained below 21°C to completely prevent premature bolting.',
    optimalThresholds: {
      temperature: { min: 19.0, max: 23.0 },
      humidity: { min: 55, max: 65 },
      ph: { min: 5.8, max: 6.3 },
      ec: { min: 1.2, max: 1.6 },
      waterTemp: { min: 17.5, max: 20.5 },
    },
  },
];

/**
 * Determine season from date
 */
export function getSeasonFromDate(date: Date): 'Winter' | 'Spring' | 'Summer' | 'Autumn' {
  const month = date.getMonth();
  if (month === 11 || month === 0 || month === 1) return 'Winter';
  if (month >= 2 && month <= 4) return 'Spring';
  if (month >= 5 && month <= 7) return 'Summer';
  return 'Autumn';
}

/**
 * Generate 52 weekly sensor readings across the past 365 days specifically for a given plant profile
 */
export function generatePlantAnnualSensorReadings(
  profile: PlantProfile,
  baseDate: Date = new Date()
): PlantSensorReadingRecord[] {
  const records: PlantSensorReadingRecord[] = [];
  const baseTime = baseDate.getTime();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const thresh = profile.optimalThresholds;

  const STAGES_CYCLE = ['Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Harvest Ready'];

  for (let week = 52; week >= 1; week--) {
    const weeksAgo = 52 - week;
    const logDate = new Date(baseTime - weeksAgo * ONE_WEEK_MS);
    const season = getSeasonFromDate(logDate);

    // Calculate stage in repetitive cultivation rotation for this plant
    const stageIdx = (week * 2) % STAGES_CYCLE.length;
    const stage = STAGES_CYCLE[stageIdx];

    // Seasonal climate modifiers
    let seasonTempDelta = 0;
    let seasonHumDelta = 0;
    let seasonLightDelta = 0;

    if (season === 'Winter') {
      seasonTempDelta = -1.2;
      seasonHumDelta = -3;
      seasonLightDelta = -2000;
    } else if (season === 'Spring') {
      seasonTempDelta = 0.4;
      seasonHumDelta = 1;
      seasonLightDelta = 1200;
    } else if (season === 'Summer') {
      seasonTempDelta = 1.8;
      seasonHumDelta = 4;
      seasonLightDelta = 3500;
    }

    const midTemp = (thresh.temperature.min + thresh.temperature.max) / 2;
    const midPh = (thresh.ph.min + thresh.ph.max) / 2;
    const midEc = (thresh.ec.min + thresh.ec.max) / 2;
    const midHum = (thresh.humidity.min + thresh.humidity.max) / 2;
    const midWater = (thresh.waterTemp.min + thresh.waterTemp.max) / 2;

    const pseudoWave = Math.sin(week * 1.25);
    const tempVar = pseudoWave * 0.5;
    const humVar = Math.cos(week * 0.95) * 2.5;
    const phVar = Math.sin(week * 0.6) * 0.12;

    // Stage EC offset
    let stageEc = 0;
    if (stage === 'Seedling') stageEc = -0.2;
    else if (stage === 'Fruiting') stageEc = 0.3;
    else if (stage === 'Harvest Ready') stageEc = -0.1;

    const temperature = Number((midTemp + seasonTempDelta * 0.6 + tempVar).toFixed(1));
    const humidity = Math.round(midHum + seasonHumDelta + humVar);
    const ph = Number((midPh + phVar).toFixed(2));
    const ec = Number(Math.max(1.0, midEc + stageEc + (Math.sin(week * 1.8) * 0.06)).toFixed(2));
    const tds = Math.round(ec * 500);
    const waterTemp = Number((midWater + seasonTempDelta * 0.3 + Math.cos(week * 1.1) * 0.25).toFixed(1));
    const waterLevel = Math.round(76 + ((week * 9) % 20));
    const lightIntensity = Math.round(14000 + seasonLightDelta + (Math.sin(week) * 1200));
    const vpd = Number(Math.max(0.75, Math.min(1.4, 1.02 + (temperature - 23.0) * 0.04 - (humidity - 62) * 0.015)).toFixed(2));

    // Check compliance with optimal ranges
    const isTempOpt = temperature >= thresh.temperature.min && temperature <= thresh.temperature.max;
    const isPhOpt = ph >= thresh.ph.min && ph <= thresh.ph.max;
    const isEcOpt = ec >= thresh.ec.min - 0.25 && ec <= thresh.ec.max + 0.35;
    const isOptimal = isTempOpt && isPhOpt && isEcOpt;

    records.push({
      id: `${profile.id}-w${week.toString().padStart(2, '0')}`,
      plantId: profile.id,
      weekNumber: week,
      timestamp: logDate.toISOString(),
      season,
      stage,
      temperature,
      humidity,
      ph,
      ec,
      tds,
      waterTemp,
      waterLevel,
      lightIntensity,
      vpd,
      isOptimal,
    });
  }

  // Sort newest first
  return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Generate photo gallery progression uploaded during this plant's growth
 */
export function generatePlantGrowthPhotos(
  profile: PlantProfile,
  baseDate: Date = new Date()
): PlantGrowthPhotoRecord[] {
  const baseTime = baseDate.getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;

  // Curated photo steps corresponding to growth milestones of this plant
  const milestones = [
    {
      stage: 'Seedling',
      daysAgo: 40,
      image: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800&auto=format&fit=crop&q=80',
      note: 'Rockwool seed plugs sprouted under germination chamber with 12,500 lux gentle spectrum. Root hairs clearly visible through cube mesh.',
      temp: (profile.optimalThresholds.temperature.min + 0.8),
      ph: 5.9,
      ec: (profile.optimalThresholds.ec.min - 0.15),
    },
    {
      stage: 'Vegetative',
      daysAgo: 26,
      image: profile.imageUrl,
      note: 'Transplanted into main production gullies. Vigorous vegetative growth with thick stem caliper and dense chlorophyll accumulation.',
      temp: (profile.optimalThresholds.temperature.min + 1.2),
      ph: 6.05,
      ec: profile.optimalThresholds.ec.min,
    },
    {
      stage: 'Flowering',
      daysAgo: 14,
      image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&auto=format&fit=crop&q=80',
      note: 'Branching nodes canopy fully developed. First floral cluster set pollinated under 18,500 lux light photoperiod with balanced potassium dosing.',
      temp: (profile.optimalThresholds.temperature.min + 1.8),
      ph: 6.15,
      ec: (profile.optimalThresholds.ec.max - 0.1),
    },
    {
      stage: 'Fruiting',
      daysAgo: 6,
      image: profile.imageUrl,
      note: 'Uniform fruit swelling and canopy transpiration peak. Chiller maintaining water reservoir at optimal 20.4°C with pristine nutrient flow.',
      temp: (profile.optimalThresholds.temperature.min + 2.0),
      ph: 6.1,
      ec: profile.optimalThresholds.ec.max,
    },
    {
      stage: 'Harvest Ready',
      daysAgo: 1,
      image: profile.imageUrl,
      note: 'Peak organoleptic maturity achieved. Ready for batch collection. Clean roots with zero brown tips or foliar spotting.',
      temp: (profile.optimalThresholds.temperature.min + 1.5),
      ph: 6.0,
      ec: (profile.optimalThresholds.ec.min + 0.1),
    },
  ];

  return milestones.map((m, idx) => {
    const time = new Date(baseTime - m.daysAgo * DAY_MS).toISOString();
    return {
      id: `${profile.id}-photo-${idx + 1}`,
      plantId: profile.id,
      plantName: `${profile.name} (${profile.zone})`,
      stage: m.stage,
      timestamp: time,
      imageUrl: m.image,
      notes: m.note,
      readings: {
        temperature: Number(m.temp.toFixed(1)),
        humidity: Math.round((profile.optimalThresholds.humidity.min + profile.optimalThresholds.humidity.max) / 2),
        ph: Number(m.ph.toFixed(2)),
        ec: Number(m.ec.toFixed(2)),
        tds: Math.round(m.ec * 500),
        waterTemp: Number(((profile.optimalThresholds.waterTemp.min + profile.optimalThresholds.waterTemp.max) / 2).toFixed(1)),
        waterLevel: 86,
        lightIntensity: m.stage === 'Seedling' ? 12500 : 18500,
        vpd: 1.08,
      },
    };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Calculate summary metrics across this plant's 1-year sensor data and growth photos
 */
export function calculatePlantProfileStats(
  readings: PlantSensorReadingRecord[],
  photos: PlantGrowthPhotoRecord[],
  profile: PlantProfile
): PlantProfileSummaryStats {
  if (!readings || readings.length === 0) {
    const elapsedDays = Math.round((Date.now() - new Date(profile.plantingDate).getTime()) / (24 * 60 * 60 * 1000));
    return {
      totalReadings: 0,
      totalPhotos: photos.length,
      avgTemp: 0,
      avgHumidity: 0,
      avgPh: 0,
      avgEc: 0,
      avgWaterTemp: 0,
      optimalCompliancePercent: 100,
      currentStage: profile.currentStage,
      daysGrown: Math.max(1, elapsedDays || 1),
    };
  }

  const average = (key: keyof PlantSensorReadingRecord, decimals: number) => {
    const values = readings.map((record) => record[key]).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(decimals)) : 0;
  };
  let totalTemp = 0;
  let totalHum = 0;
  let totalPh = 0;
  let totalEc = 0;
  let totalWater = 0;
  let optimalCount = 0;

  for (const r of readings) {
    totalTemp += r.temperature;
    totalHum += r.humidity;
    totalPh += r.ph;
    totalEc += r.ec;
    totalWater += r.waterTemp;
    if (r.isOptimal) optimalCount++;
  }

  const count = readings.length;
  const elapsedDays = Math.round((Date.now() - new Date(profile.plantingDate).getTime()) / (24 * 60 * 60 * 1000));
  const daysGrown = Math.max(1, elapsedDays);

  return {
    totalReadings: count,
    totalPhotos: photos.length,
    avgTemp: average('temperature', 1),
    avgHumidity: average('humidity', 0),
    avgPh: average('ph', 2),
    avgEc: average('ec', 2),
    avgWaterTemp: average('waterTemp', 1),
    optimalCompliancePercent: Math.round((optimalCount / count) * 100),
    currentStage: profile.currentStage,
    daysGrown: Math.max(1, daysGrown),
  };
}

/**
 * Generate day-wise continuous sensor telemetry records (up to 365 days)
 * and automatically bind photos taken on matching days to each day's record.
 */
export function generatePlantDailyLogs(
  profile: PlantProfile,
  photos: PlantGrowthPhotoRecord[] = [],
  totalDays: number = 365,
  baseDate: Date = new Date(),
  dailyAveragesMap: Record<string, any> = {}
): PlantDailyLogRecord[] {
  const records: PlantDailyLogRecord[] = [];
  const baseTime = baseDate.getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const thresh = profile.optimalThresholds;
  const cycleDays = Math.max(28, profile.harvestCycleDays || 42);

  for (let dayIdx = 0; dayIdx < totalDays; dayIdx++) {
    // dayIdx 0 is today, dayIdx 1 is yesterday, etc.
    const logDate = new Date(baseTime - dayIdx * DAY_MS);
    const dateString = logDate.toISOString().split('T')[0];
    const formattedDate = logDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const season = getSeasonFromDate(logDate);

    // Day in crop cycle (1 to cycleDays)
    const dayInCycle = ((totalDays - 1 - dayIdx) % cycleDays) + 1;

    let stage = 'Vegetative';
    const cycleFraction = dayInCycle / cycleDays;
    if (cycleFraction <= 0.2) {
      stage = 'Seedling';
    } else if (cycleFraction <= 0.55) {
      stage = 'Vegetative';
    } else if (cycleFraction <= 0.75) {
      stage = 'Flowering';
    } else if (cycleFraction <= 0.9) {
      stage = 'Fruiting';
    } else {
      stage = 'Harvest Ready';
    }

    // Seasonal deltas
    let seasonTempDelta = 0;
    let seasonHumDelta = 0;
    let seasonLightDelta = 0;
    if (season === 'Winter') {
      seasonTempDelta = -1.0;
      seasonHumDelta = -2;
      seasonLightDelta = -1800;
    } else if (season === 'Spring') {
      seasonTempDelta = 0.3;
      seasonHumDelta = 1;
      seasonLightDelta = 1000;
    } else if (season === 'Summer') {
      seasonTempDelta = 1.6;
      seasonHumDelta = 3;
      seasonLightDelta = 3000;
    }

    const midTemp = (thresh.temperature.min + thresh.temperature.max) / 2;
    const midPh = (thresh.ph.min + thresh.ph.max) / 2;
    const midEc = (thresh.ec.min + thresh.ec.max) / 2;
    const midHum = (thresh.humidity.min + thresh.humidity.max) / 2;
    const midWater = (thresh.waterTemp.min + thresh.waterTemp.max) / 2;

    const pseudoWave = Math.sin(dayIdx * 0.45);
    const tempVar = pseudoWave * 0.4;
    const humVar = Math.cos(dayIdx * 0.35) * 2.2;
    const phVar = Math.sin(dayIdx * 0.2) * 0.08;

    let stageEc = 0;
    if (stage === 'Seedling') stageEc = -0.2;
    else if (stage === 'Fruiting') stageEc = 0.25;
    else if (stage === 'Harvest Ready') stageEc = -0.1;

    const temperature = Number((midTemp + seasonTempDelta * 0.5 + tempVar).toFixed(1));
    const humidity = Math.round(midHum + seasonHumDelta + humVar);
    const ph = Number((midPh + phVar).toFixed(2));
    const ec = Number(Math.max(0.8, midEc + stageEc + Math.sin(dayIdx * 0.5) * 0.05).toFixed(2));
    const tds = Math.round(ec * 500);
    const waterTemp = Number((midWater + seasonTempDelta * 0.3 + Math.cos(dayIdx * 0.4) * 0.2).toFixed(1));
    const waterLevel = Math.round(78 + ((dayIdx * 7) % 18));
    const lightIntensity = Math.round(13500 + seasonLightDelta + Math.sin(dayIdx * 0.6) * 1100);
    const vpd = Number(
      Math.max(0.75, Math.min(1.45, 1.02 + (temperature - 23.0) * 0.04 - (humidity - 62) * 0.015)).toFixed(2)
    );

    const isTempOpt = temperature >= thresh.temperature.min && temperature <= thresh.temperature.max;
    const isPhOpt = ph >= thresh.ph.min && ph <= thresh.ph.max;
    const isEcOpt = ec >= thresh.ec.min - 0.25 && ec <= thresh.ec.max + 0.35;
    const isOptimal = isTempOpt && isPhOpt && isEcOpt;

    // Photos attached to THIS specific day
    const dayEntries = photos.filter((p) => {
      if (!p.timestamp) return false;
      return p.plantId === profile.id && p.timestamp.startsWith(dateString);
    });

    const dayPhotos = dayEntries.filter((entry) => Boolean(entry.imageUrl));
    const dayNotes = dayEntries.find((entry) => entry.notes)?.notes;

    // Check if we have an automated daily average logged for this date
    const legacyRecord = dailyAveragesMap[dateString];
    const loggedAvg = dailyAveragesMap[`${profile.id}_${dateString}`] ||
      (legacyRecord?.plantId === profile.id ? legacyRecord : undefined);
    const finalReadings = loggedAvg?.readings
      ? {
        temperature: loggedAvg.readings.temperature,
        humidity: loggedAvg.readings.humidity,
        ph: loggedAvg.readings.ph,
        ec: loggedAvg.readings.ec,
        tds: loggedAvg.readings.tds,
        waterTemp: loggedAvg.readings.waterTemp,
        waterLevel: loggedAvg.readings.waterLevel,
        lightIntensity: loggedAvg.readings.lightIntensity,
        vpd: loggedAvg.readings.vpd,
      }
      : {
        temperature,
        humidity,
        ph,
        ec,
        tds,
        waterTemp,
        waterLevel,
        lightIntensity,
        vpd,
      };

    const finalOptimal = loggedAvg?.isOptimal !== undefined ? loggedAvg.isOptimal : isOptimal;

    records.push({
      id: `${profile.id}_${dateString}`,
      plantId: profile.id,
      cropName: profile.name,
      variety: profile.variety,
      dayNumber: totalDays - dayIdx,
      dateString,
      formattedDate,
      timestamp: logDate.toISOString(),
      season,
      stage: dayEntries[0]?.stage || stage,
      sensorSetId: loggedAvg?.sensorSetId || profile.sensorSetId || 'set-main',
      zone: loggedAvg?.zone || profile.zone,
      zoneId: loggedAvg?.zoneId || profile.zoneId,
      growingSystem: loggedAvg?.growingSystem || profile.growingSystem,
      source: loggedAvg?.source || (loggedAvg ? 'cloud' : 'simulated'),
      loggingStatus: loggedAvg?.loggingStatus || 'complete',
      isSimulated: !loggedAvg || Boolean(loggedAvg.isSimulated),
      sampleCount: loggedAvg?.sampleCount ?? (dayIdx === 0 ? 1 : 24),
      sensorStatuses: loggedAvg?.sensorStatuses,
      missingMetrics: loggedAvg?.missingMetrics,
      lastFetchedAt: loggedAvg?.lastFetchedAt,
      readings: finalReadings,
      isOptimal: finalOptimal,
      photos: dayPhotos,
      notes: dayNotes || loggedAvg?.notes,
      isAutomatedDailyAvg: Boolean(loggedAvg?.isAutomatedDailyAvg),
      minReadings: loggedAvg?.minReadings,
      maxReadings: loggedAvg?.maxReadings,
      isFirestoreSynced: Boolean(loggedAvg?.isFirestoreSynced),
    });
  }

  // Sorted newest first
  return records;
}

/**
 * Filter day-wise records by timeframe, photos presence, stage, and search query
 */
export function filterPlantDailyLogs(
  dailyLogs: PlantDailyLogRecord[],
  options: {
    timeRange?: string;
    onlyWithPhotos?: boolean;
    stageFilter?: string;
    searchQuery?: string;
  }
): PlantDailyLogRecord[] {
  const { timeRange = '365d', onlyWithPhotos = false, stageFilter = 'All', searchQuery = '' } = options;
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  let maxDays = 365;
  if (timeRange === '7d') maxDays = 7;
  else if (timeRange === '30d') maxDays = 30;
  else if (timeRange === '90d') maxDays = 90;
  else if (timeRange === '180d') maxDays = 180;
  else if (timeRange === 'all' || timeRange === '365d') maxDays = 365;

  const cutoff = now - maxDays * DAY_MS;
  const query = searchQuery.trim().toLowerCase();

  return dailyLogs.filter((log) => {
    const time = new Date(log.timestamp).getTime();
    if (time < cutoff) return false;
    if (onlyWithPhotos && (!log.photos || log.photos.length === 0)) return false;
    if (stageFilter !== 'All' && log.stage !== stageFilter) return false;
    if (query) {
      const matchDate = log.formattedDate.toLowerCase().includes(query);
      const matchDay = `day ${log.dayNumber}`.includes(query);
      const matchStage = log.stage.toLowerCase().includes(query);
      const matchNotes = log.notes && log.notes.toLowerCase().includes(query);
      const matchSeason = log.season.toLowerCase().includes(query);
      if (!matchDate && !matchDay && !matchStage && !matchNotes && !matchSeason) {
        return false;
      }
    }
    return true;
  });
}


export function withMethiProfile(profiles: PlantProfile[], deletedPlantIds: Record<string, boolean> = {}) {
  // Cached and legacy cloud documents can share a logical plant ID.
  // Keep one editable profile per ID, with the last stored version winning.
  profiles = [...new Map(profiles
    .filter((profile) => profile?.id && !deletedPlantIds[profile.id])
    .map((profile) => [profile.id, profile] as const)).values()];
  if (deletedPlantIds[METHI_PROFILE.id]) {
    return profiles.filter((p) => p.id !== METHI_PROFILE.id);
  }
  return profiles.some(
    (profile) =>
      profile.id === METHI_PROFILE.id ||
      profile.name?.trim().toLowerCase().includes('methi') ||
      profile.name?.trim().toLowerCase().includes('fenugreek') ||
      profile.variety?.trim().toLowerCase().includes('fenugreek')
  )
    ? profiles
    : [METHI_PROFILE, ...profiles];
}


/** Build history only from saved measurements or user log entries. */
export function buildRecordedPlantDailyLogs(
  profile: PlantProfile,
  entries: PlantGrowthPhotoRecord[] = [],
  saved: Record<string, any> = {},
  deleted: Record<string, boolean> = {}
): PlantDailyLogRecord[] {
  if (deleted[profile.id + '_all']) return [];
  const days = new Map<string, any>();
  for (const record of Object.values(saved)) {
    if (record?.plantId !== profile.id || record.isSimulated || record.source === 'simulated') continue;
    const date = record.dateString || record.date || record.timestamp?.slice(0, 10);
    if (date) days.set(date, record);
  }
  const realEntries = entries.filter((entry) => entry.plantId === profile.id);
  for (const entry of realEntries) {
    const date = entry.timestamp?.slice(0, 10);
    if (date && !days.has(date)) days.set(date, { readings: entry.readings, stage: entry.stage, notes: entry.notes });
  }
  return [...days].filter(([date]) => !deleted[profile.id + '_' + date]).map(([date, record]) => {
    const timestamp = record.timestamp || date + 'T12:00:00.000Z';
    const dayEntries = realEntries.filter((entry) => entry.timestamp.startsWith(date));
    return {
      ...record,
      id: profile.id + '_' + date,
      plantId: profile.id,
      cropName: profile.name,
      variety: profile.variety,
      dateString: date,
      formattedDate: record.formattedDate || new Date(timestamp).toLocaleDateString(),
      timestamp,
      dayNumber: Math.max(1, Math.floor((Date.parse(date) - Date.parse(profile.plantingDate.slice(0, 10))) / 86400000) + 1),
      season: record.season || getSeasonFromDate(new Date(timestamp)),
      stage: record.stage || dayEntries[0]?.stage || profile.currentStage,
      readings: record.readings || {},
      photos: [...new Map([...(record.photos || []), ...dayEntries.filter((entry) => entry.imageUrl)]
        .map((photo) => [photo.id || photo.timestamp + ':' + photo.imageUrl, photo])).values()],
      notes: record.notes || dayEntries.find((entry) => entry.notes)?.notes,
      source: record.source || 'cloud',
      loggingStatus: record.loggingStatus || 'complete',
      isSimulated: false,
      sampleCount: record.sampleCount || 0,
      isOptimal: record.isOptimal ?? false,
      sensorSetId: record.sensorSetId || profile.sensorSetId,
      zone: record.zone || profile.zone,
    };
  }).sort((a, b) => b.dateString.localeCompare(a.dateString));
}
