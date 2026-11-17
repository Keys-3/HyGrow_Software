import type { PlantLog, PlantLogReading } from './plantLogUtils.ts';

export interface AnnualStats {
  totalLogs: number;
  avgTemp: number;
  avgHumidity: number;
  avgPh: number;
  avgEc: number;
  avgWaterTemp: number;
  startDate: string;
  endDate: string;
  stageDistribution: Record<string, number>;
}

export type TimeRangeFilter = 'all' | '7d' | '30d' | '90d' | '180d' | '365d';
export type SeasonFilter = 'All' | 'Spring' | 'Summer' | 'Autumn' | 'Winter';

export interface CropProfile {
  name: string;
  zone: string;
  image: string;
  optimalTemp: number;
  optimalPh: number;
  optimalEc: number;
}

export const ANNUAL_CROPS: CropProfile[] = [
  {
    name: 'Butterhead Lettuce',
    zone: 'NFT Bay 1',
    image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=800&auto=format&fit=crop&q=80',
    optimalTemp: 22.5,
    optimalPh: 5.9,
    optimalEc: 1.45,
  },
  {
    name: 'Genovese Basil',
    zone: 'DWC Raft B',
    image: 'https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=800&auto=format&fit=crop&q=80',
    optimalTemp: 24.8,
    optimalPh: 6.1,
    optimalEc: 1.6,
  },
  {
    name: 'Cherry Tomatoes',
    zone: 'Dutch Bucket 3',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80',
    optimalTemp: 25.2,
    optimalPh: 6.0,
    optimalEc: 2.1,
  },
  {
    name: 'Hydro Strawberries',
    zone: 'Vertical Tower A',
    image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800&auto=format&fit=crop&q=80',
    optimalTemp: 21.8,
    optimalPh: 5.8,
    optimalEc: 1.5,
  },
  {
    name: 'Rainbow Swiss Chard',
    zone: 'NFT Bay 2',
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&auto=format&fit=crop&q=80',
    optimalTemp: 23.0,
    optimalPh: 6.2,
    optimalEc: 1.7,
  },
  {
    name: 'Crisp Bell Peppers',
    zone: 'Dutch Bucket 1',
    image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=800&auto=format&fit=crop&q=80',
    optimalTemp: 25.0,
    optimalPh: 6.0,
    optimalEc: 2.0,
  },
  {
    name: 'Fresh Spearmint',
    zone: 'DWC Raft A',
    image: 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=800&auto=format&fit=crop&q=80',
    optimalTemp: 22.0,
    optimalPh: 6.2,
    optimalEc: 1.5,
  },
  {
    name: 'Baby Spinach',
    zone: 'Deep Flow Bed',
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&auto=format&fit=crop&q=80',
    optimalTemp: 21.2,
    optimalPh: 6.0,
    optimalEc: 1.4,
  },
];

const STAGES = ['Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Harvest Ready'];

/**
 * Determine season from date
 */
export function getSeasonForDate(date: Date): 'Winter' | 'Spring' | 'Summer' | 'Autumn' {
  const month = date.getMonth(); // 0-11
  if (month === 11 || month === 0 || month === 1) return 'Winter';
  if (month >= 2 && month <= 4) return 'Spring';
  if (month >= 5 && month <= 7) return 'Summer';
  return 'Autumn';
}

/**
 * Generate 52 weekly logs spanning exactly 365 days backwards from baseDate
 */
export function generateAnnualSensorLogs({
  userId = 'demo-farmer',
  userEmail = 'farmer@hygrow.local',
  baseDate = new Date(),
}: {
  userId?: string;
  userEmail?: string;
  baseDate?: Date;
} = {}): PlantLog[] {
  const logs: PlantLog[] = [];
  const baseTime = baseDate.getTime();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  for (let week = 52; week >= 1; week--) {
    // Week 52 is today (offset 0), Week 1 is 51 weeks ago (~357 days ago)
    const weeksAgo = 52 - week;
    const logTime = new Date(baseTime - weeksAgo * ONE_WEEK_MS);
    const season = getSeasonForDate(logTime);

    // Pick rotating crop profile
    const cropProfile = ANNUAL_CROPS[(week - 1) % ANNUAL_CROPS.length];

    // Determine lifecycle stage based on cycle within crop rotation
    const stageIndex = (week * 2 + 1) % STAGES.length;
    const stage = STAGES[stageIndex];

    // Seasonal climate modifiers
    let tempSeasonalOffset = 0;
    let humiditySeasonalOffset = 0;
    let lightSeasonalOffset = 0;

    switch (season) {
      case 'Winter':
        tempSeasonalOffset = -1.8;
        humiditySeasonalOffset = -4;
        lightSeasonalOffset = -2500;
        break;
      case 'Spring':
        tempSeasonalOffset = 0.5;
        humiditySeasonalOffset = 2;
        lightSeasonalOffset = 1500;
        break;
      case 'Summer':
        tempSeasonalOffset = 2.4;
        humiditySeasonalOffset = 5;
        lightSeasonalOffset = 4500;
        break;
      case 'Autumn':
        tempSeasonalOffset = 0.0;
        humiditySeasonalOffset = 0;
        lightSeasonalOffset = 0;
        break;
    }

    // Realistic pseudo-random variation based on week index
    const pseudoVar = Math.sin(week * 1.3) * 0.6;
    const pseudoHum = Math.cos(week * 0.9) * 2.5;
    const pseudoPh = (Math.sin(week * 0.7) * 0.18);

    const temperature = Number((cropProfile.optimalTemp + tempSeasonalOffset + pseudoVar).toFixed(1));
    const humidity = Math.min(85, Math.max(50, Math.round(63 + humiditySeasonalOffset + pseudoHum)));
    const ph = Number((cropProfile.optimalPh + pseudoPh).toFixed(2));

    // EC scales with stage (seedling lower, fruiting higher)
    let stageEcModifier = 0;
    if (stage === 'Seedling') stageEcModifier = -0.3;
    else if (stage === 'Flowering') stageEcModifier = +0.2;
    else if (stage === 'Fruiting') stageEcModifier = +0.4;
    else if (stage === 'Harvest Ready') stageEcModifier = -0.15;

    const ec = Number(Math.max(1.1, cropProfile.optimalEc + stageEcModifier + (Math.sin(week * 2) * 0.08)).toFixed(2));
    const tds = Math.round(ec * 500);

    // Water reservoir temp (chilled/heated buffer around 20.5°C)
    const waterTemp = Number((20.5 + tempSeasonalOffset * 0.35 + Math.cos(week) * 0.3).toFixed(1));
    const waterLevel = Math.round(75 + ((week * 7) % 20)); // oscillates 75% to 94%

    // Base light
    const baseLux = stage === 'Fruiting' || stage === 'Flowering' ? 18000 : 13500;
    const lightIntensity = Math.round(baseLux + lightSeasonalOffset + (Math.sin(week) * 800));

    // VPD calculation (approximate saturated vapor pressure diff)
    const vpd = Number(Math.max(0.75, Math.min(1.45, 1.05 + (temperature - 23.5) * 0.04 - (humidity - 64) * 0.015)).toFixed(2));

    const readings: PlantLogReading = {
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

    // Agronomic notes tailored to stage & season
    const notes = generateAgronomicNote(cropProfile.name, stage, season, readings, week);

    logs.push({
      id: `annual-log-w${week.toString().padStart(2, '0')}`,
      userId,
      userEmail,
      plantName: `${cropProfile.name} (${cropProfile.zone})`,
      stage,
      notes,
      imageUrl: cropProfile.image,
      readings,
      timestamp: logTime.toISOString(),
    });
  }

  // Sort descending (newest first)
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Generate contextual agronomic observations
 */
function generateAgronomicNote(
  crop: string,
  stage: string,
  season: string,
  readings: PlantLogReading,
  weekNumber: number
): string {
  const weekLabel = `Week ${weekNumber} (${season})`;
  switch (stage) {
    case 'Seedling':
      return `${weekLabel}: Uniform cotyledon emergence in rockwool plugs. Nutrient EC maintained gently at ${readings.ec} mS with roots reaching bottom basin.`;
    case 'Vegetative':
      return `${weekLabel}: Rapid canopy expansion across gully channels. Foliar chlorophyll depth pristine under ${readings.lightIntensity} lux. VPD balanced at ${readings.vpd} kPa.`;
    case 'Flowering':
      return `${weekLabel}: Flower truss set fully established. Elevated potassium ratio in nutrient dosing to support bud density. Reservoir pH stable at ${readings.ph}.`;
    case 'Fruiting':
      return `${weekLabel}: Heavy fruit cluster maturation. Sugar brix development accelerating. Transpiration rate peak with water temp steady at ${readings.waterTemp}°C.`;
    case 'Harvest Ready':
      return `${weekLabel}: Prime commercial maturity achieved. Pristine leaf texture with zero tip-burn. Flush cycle initiated at ${readings.ec} mS prior to collection.`;
    default:
      return `${weekLabel}: Healthy vigorous growth observed across array. Hydroponic telemetry within target thresholds.`;
  }
}

/**
 * Compute statistical aggregates across the annual dataset
 */
export function calculateAnnualStats(logs: PlantLog[]): AnnualStats {
  if (!logs || logs.length === 0) {
    return {
      totalLogs: 0,
      avgTemp: 0,
      avgHumidity: 0,
      avgPh: 0,
      avgEc: 0,
      avgWaterTemp: 0,
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      stageDistribution: {},
    };
  }

  let totalTemp = 0;
  let countTemp = 0;
  let totalHum = 0;
  let countHum = 0;
  let totalPh = 0;
  let countPh = 0;
  let totalEc = 0;
  let countEc = 0;
  let totalWaterTemp = 0;
  let countWaterTemp = 0;

  const stageDistribution: Record<string, number> = {};

  let minTime = Infinity;
  let maxTime = -Infinity;

  for (const log of logs) {
    const time = new Date(log.timestamp).getTime();
    if (!isNaN(time)) {
      if (time < minTime) minTime = time;
      if (time > maxTime) maxTime = time;
    }

    if (log.stage) {
      stageDistribution[log.stage] = (stageDistribution[log.stage] || 0) + 1;
    }

    if (log.readings) {
      if (typeof log.readings.temperature === 'number') {
        totalTemp += log.readings.temperature;
        countTemp++;
      }
      if (typeof log.readings.humidity === 'number') {
        totalHum += log.readings.humidity;
        countHum++;
      }
      if (typeof log.readings.ph === 'number') {
        totalPh += log.readings.ph;
        countPh++;
      }
      if (typeof log.readings.ec === 'number') {
        totalEc += log.readings.ec;
        countEc++;
      }
      if (typeof log.readings.waterTemp === 'number') {
        totalWaterTemp += log.readings.waterTemp;
        countWaterTemp++;
      }
    }
  }

  return {
    totalLogs: logs.length,
    avgTemp: countTemp > 0 ? Number((totalTemp / countTemp).toFixed(1)) : 0,
    avgHumidity: countHum > 0 ? Math.round(totalHum / countHum) : 0,
    avgPh: countPh > 0 ? Number((totalPh / countPh).toFixed(2)) : 0,
    avgEc: countEc > 0 ? Number((totalEc / countEc).toFixed(2)) : 0,
    avgWaterTemp: countWaterTemp > 0 ? Number((totalWaterTemp / countWaterTemp).toFixed(1)) : 0,
    startDate: minTime !== Infinity ? new Date(minTime).toISOString() : new Date().toISOString(),
    endDate: maxTime !== -Infinity ? new Date(maxTime).toISOString() : new Date().toISOString(),
    stageDistribution,
  };
}

/**
 * Filter logs by time window and optional season
 */
export function filterAnnualLogs({
  logs,
  searchQuery = '',
  stageFilter = 'All',
  timeRange = 'all',
  seasonFilter = 'All',
  sortBy = 'newest',
  now = new Date(),
}: {
  logs: PlantLog[];
  searchQuery?: string;
  stageFilter?: string;
  timeRange?: TimeRangeFilter;
  seasonFilter?: SeasonFilter;
  sortBy?: 'newest' | 'oldest' | 'highestTemp' | 'highestEc';
  now?: Date;
}): PlantLog[] {
  const query = searchQuery.trim().toLowerCase();
  const nowMs = now.getTime();

  let cutoffMs = 0;
  if (timeRange === '7d') cutoffMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  else if (timeRange === '30d') cutoffMs = nowMs - 30 * 24 * 60 * 60 * 1000;
  else if (timeRange === '90d') cutoffMs = nowMs - 90 * 24 * 60 * 60 * 1000;
  else if (timeRange === '180d') cutoffMs = nowMs - 180 * 24 * 60 * 60 * 1000;
  else if (timeRange === '365d') cutoffMs = nowMs - 365 * 24 * 60 * 60 * 1000;

  const filtered = logs.filter((log) => {
    const logDate = new Date(log.timestamp);
    const logTime = logDate.getTime();

    // Time cutoff
    if (cutoffMs > 0 && logTime < cutoffMs) {
      return false;
    }

    // Season filter
    if (seasonFilter !== 'All') {
      const logSeason = getSeasonForDate(logDate);
      if (logSeason !== seasonFilter) return false;
    }

    // Stage filter
    if (stageFilter !== 'All' && log.stage !== stageFilter) {
      return false;
    }

    // Search query
    if (query) {
      const matchName = log.plantName.toLowerCase().includes(query);
      const matchNotes = log.notes ? log.notes.toLowerCase().includes(query) : false;
      if (!matchName && !matchNotes) return false;
    }

    return true;
  });

  // Sort
  return filtered.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();

    if (sortBy === 'oldest') {
      return timeA - timeB;
    }
    if (sortBy === 'highestTemp') {
      return (b.readings?.temperature ?? 0) - (a.readings?.temperature ?? 0);
    }
    if (sortBy === 'highestEc') {
      return (b.readings?.ec ?? 0) - (a.readings?.ec ?? 0);
    }
    // Default newest first
    return timeB - timeA;
  });
}
