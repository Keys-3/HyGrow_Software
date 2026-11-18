export interface PlantLogReading {
  temperature: number | null;
  humidity: number | null;
  ph: number | null;
  ec: number | null;
  tds: number | null;
  waterTemp: number | null;
  waterLevel: number | null;
  lightIntensity: number | null;
  vpd: number | null;
}

export interface PlantLog {
  id: string;
  userId: string;
  userEmail?: string;
  plantName: string;
  stage: string;
  notes?: string;
  imageUrl: string;
  storagePath?: string;
  readings: PlantLogReading;
  timestamp: string; // ISO String
  createdAt?: any;
}

export const INITIAL_DEMO_PLANT_LOGS: PlantLog[] = [
  {
    id: 'demo-log-1',
    userId: 'demo-farmer',
    userEmail: 'farmer@hygrow.local',
    plantName: 'Butterhead Lettuce (NFT Bay 1)',
    stage: 'Vegetative',
    notes: 'Vibrant leaf canopy expansion, healthy root structure with zero tip burn.',
    imageUrl: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=800&auto=format&fit=crop&q=80',
    readings: {
      temperature: 23.8,
      humidity: 62,
      ph: 5.9,
      ec: 1.45,
      tds: 725,
      waterTemp: 20.4,
      waterLevel: 88,
      lightIntensity: 14200,
      vpd: 1.08,
    },
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'demo-log-2',
    userId: 'demo-farmer',
    userEmail: 'farmer@hygrow.local',
    plantName: 'Genovese Basil (DWC Raft B)',
    stage: 'Flowering',
    notes: 'Dense aroma development; pristine chlorophyll pigmentation across apical foliage.',
    imageUrl: 'https://images.unsplash.com/photo-1606103920295-9a091573f160?w=800&auto=format&fit=crop&q=80',
    readings: {
      temperature: 25.1,
      humidity: 68,
      ph: 6.1,
      ec: 1.62,
      tds: 810,
      waterTemp: 21.2,
      waterLevel: 84,
      lightIntensity: 18500,
      vpd: 1.15,
    },
    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: 'demo-log-3',
    userId: 'demo-farmer',
    userEmail: 'farmer@hygrow.local',
    plantName: 'Cherry Tomatoes (Dutch Bucket 3)',
    stage: 'Fruiting',
    notes: 'Uniform cluster set. Calcium uptake optimal with balanced transpirational flow.',
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80',
    readings: {
      temperature: 24.6,
      humidity: 59,
      ph: 6.0,
      ec: 2.1,
      tds: 1050,
      waterTemp: 20.8,
      waterLevel: 79,
      lightIntensity: 22000,
      vpd: 1.22,
    },
    timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
];

export function packagePlantLogEntry({
  userId,
  userEmail,
  plantName,
  stage = 'Vegetative',
  notes = '',
  imageUrl = '',
  telemetry,
  timestamp = new Date().toISOString(),
}: {
  userId: string;
  userEmail?: string;
  plantName: string;
  stage?: string;
  notes?: string;
  imageUrl?: string;
  telemetry: any;
  timestamp?: string;
}): Omit<PlantLog, 'id'> {
  if (!plantName || !plantName.trim()) {
    throw new Error('Plant name is required.');
  }

  return {
    userId,
    userEmail,
    plantName: plantName.trim(),
    stage: stage.trim() || 'Vegetative',
    notes: notes.trim(),
    imageUrl,
    readings: {
      temperature: telemetry?.temperature !== null && telemetry?.temperature !== undefined ? Number(telemetry.temperature) : null,
      humidity: telemetry?.humidity !== null && telemetry?.humidity !== undefined ? Number(telemetry.humidity) : null,
      ph: telemetry?.ph !== null && telemetry?.ph !== undefined ? Number(telemetry.ph) : null,
      ec: telemetry?.ec !== null && telemetry?.ec !== undefined ? Number(telemetry.ec) : null,
      tds: telemetry?.tds !== null && telemetry?.tds !== undefined ? Number(telemetry.tds) : null,
      waterTemp: telemetry?.waterTemp !== null && telemetry?.waterTemp !== undefined ? Number(telemetry.waterTemp) : null,
      waterLevel: telemetry?.waterLevel !== null && telemetry?.waterLevel !== undefined ? Number(telemetry.waterLevel) : null,
      lightIntensity: telemetry?.lightIntensity !== null && telemetry?.lightIntensity !== undefined ? Number(telemetry.lightIntensity) : null,
      vpd: telemetry?.vpd !== null && telemetry?.vpd !== undefined ? Number(telemetry.vpd) : null,
    },
    timestamp,
  };
}

export function filterPlantLogs(
  logs: PlantLog[],
  searchQuery: string = '',
  stageFilter: string = 'All'
): PlantLog[] {
  const query = searchQuery.trim().toLowerCase();
  return logs.filter((log) => {
    const matchesQuery =
      !query ||
      log.plantName.toLowerCase().includes(query) ||
      (log.notes && log.notes.toLowerCase().includes(query));
    const matchesStage = stageFilter === 'All' || log.stage === stageFilter;
    return matchesQuery && matchesStage;
  });
}
