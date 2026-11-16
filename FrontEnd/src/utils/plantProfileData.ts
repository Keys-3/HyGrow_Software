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
  category: string;
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
  readings: {
    temperature: number;
    humidity: number;
    ph: number;
    ec: number;
    tds: number;
    waterTemp: number;
    waterLevel: number;
    lightIntensity: number;
    vpd: number;
  };
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

export const INITIAL_PLANT_PROFILES: PlantProfile[] = [
  {
    id: 'plant-butterhead-lettuce',
    name: 'Butterhead Lettuce',
    variety: 'Rex Butterhead',
    zone: 'NFT Bay 1 (Channel A)',
    category: 'Leafy Greens',
    plantingDate: new Date(Date.now() - 365 * 86400000).toISOString(),
    currentStage: 'Harvest Ready',
    harvestCycleDays: 42,
    imageUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=800&auto=format&fit=crop&q=80',
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
    category: 'Aromatic Culinary Herbs',
    plantingDate: new Date(Date.now() - 330 * 86400000).toISOString(),
    currentStage: 'Flowering',
    harvestCycleDays: 35,
    imageUrl: 'https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=800&auto=format&fit=crop&q=80',
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
    category: 'Vine Fruiting Crops',
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
    category: 'Soft Berries',
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
    category: 'Leafy Greens',
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
    category: 'Fruiting Crops',
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
    category: 'Aromatic Culinary Herbs',
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
    category: 'Leafy Greens',
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
      daysGrown: 365,
    };
  }

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
  const daysGrown = Math.round((Date.now() - new Date(profile.plantingDate).getTime()) / (24 * 60 * 60 * 1000));

  return {
    totalReadings: count,
    totalPhotos: photos.length,
    avgTemp: Number((totalTemp / count).toFixed(1)),
    avgHumidity: Math.round(totalHum / count),
    avgPh: Number((totalPh / count).toFixed(2)),
    avgEc: Number((totalEc / count).toFixed(2)),
    avgWaterTemp: Number((totalWater / count).toFixed(1)),
    optimalCompliancePercent: Math.round((optimalCount / count) * 100),
    currentStage: profile.currentStage,
    daysGrown: Math.max(1, daysGrown),
  };
}
