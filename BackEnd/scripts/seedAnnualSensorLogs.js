import dotenv from 'dotenv';
dotenv.config();

import { getDatabase } from '../services/firebase.js';

const CROPS = [
  { name: 'Butterhead Lettuce', zone: 'NFT Bay 1', image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=800&auto=format&fit=crop&q=80', optimalTemp: 22.5, optimalPh: 5.9, optimalEc: 1.45 },
  { name: 'Genovese Basil', zone: 'DWC Raft B', image: 'https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=800&auto=format&fit=crop&q=80', optimalTemp: 24.8, optimalPh: 6.1, optimalEc: 1.6 },
  { name: 'Cherry Tomatoes', zone: 'Dutch Bucket 3', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80', optimalTemp: 25.2, optimalPh: 6.0, optimalEc: 2.1 },
  { name: 'Hydro Strawberries', zone: 'Vertical Tower A', image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800&auto=format&fit=crop&q=80', optimalTemp: 21.8, optimalPh: 5.8, optimalEc: 1.5 },
  { name: 'Rainbow Swiss Chard', zone: 'NFT Bay 2', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&auto=format&fit=crop&q=80', optimalTemp: 23.0, optimalPh: 6.2, optimalEc: 1.7 },
  { name: 'Crisp Bell Peppers', zone: 'Dutch Bucket 1', image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=800&auto=format&fit=crop&q=80', optimalTemp: 25.0, optimalPh: 6.0, optimalEc: 2.0 },
  { name: 'Fresh Spearmint', zone: 'DWC Raft A', image: 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=800&auto=format&fit=crop&q=80', optimalTemp: 22.0, optimalPh: 6.2, optimalEc: 1.5 },
  { name: 'Baby Spinach', zone: 'Deep Flow Bed', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&auto=format&fit=crop&q=80', optimalTemp: 21.2, optimalPh: 6.0, optimalEc: 1.4 },
];

const STAGES = ['Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Harvest Ready'];

function getSeason(date) {
  const m = date.getMonth();
  if (m === 11 || m === 0 || m === 1) return 'Winter';
  if (m >= 2 && m <= 4) return 'Spring';
  if (m >= 5 && m <= 7) return 'Summer';
  return 'Autumn';
}

export async function seedDatabase(targetUserId = 'demo-farmer', targetUserEmail = 'farmer@hygrow.local') {
  console.log(`[SeedScript] Initializing 1-Year Sensor Logs for user: ${targetUserId} (${targetUserEmail})...`);
  const db = await getDatabase();
  const batch = db.batch();
  const collectionRef = db.collection('plant_logs');

  const now = Date.now();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const seededDocs = [];

  for (let week = 52; week >= 1; week--) {
    const weeksAgo = 52 - week;
    const logTime = new Date(now - weeksAgo * ONE_WEEK_MS);
    const season = getSeason(logTime);
    const crop = CROPS[(week - 1) % CROPS.length];
    const stage = STAGES[(week * 2 + 1) % STAGES.length];

    let tempOffset = season === 'Winter' ? -1.8 : season === 'Summer' ? 2.4 : season === 'Spring' ? 0.5 : 0;
    const temperature = Number((crop.optimalTemp + tempOffset + Math.sin(week * 1.3) * 0.6).toFixed(1));
    const humidity = Math.round(63 + (season === 'Summer' ? 5 : season === 'Winter' ? -4 : 2) + Math.cos(week * 0.9) * 2.5);
    const ph = Number((crop.optimalPh + Math.sin(week * 0.7) * 0.18).toFixed(2));
    const ec = Number(Math.max(1.1, crop.optimalEc + (stage === 'Fruiting' ? 0.4 : stage === 'Seedling' ? -0.3 : 0)).toFixed(2));
    const tds = Math.round(ec * 500);
    const waterTemp = Number((20.5 + tempOffset * 0.35 + Math.cos(week) * 0.3).toFixed(1));
    const waterLevel = Math.round(75 + ((week * 7) % 20));
    const lightIntensity = Math.round((stage === 'Fruiting' ? 18000 : 13500) + (season === 'Summer' ? 4500 : -2000));
    const vpd = Number(Math.max(0.75, Math.min(1.45, 1.05 + (temperature - 23.5) * 0.04 - (humidity - 64) * 0.015)).toFixed(2));

    const readings = {
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

    const notes = `Week ${week} (${season}): ${stage} stage observation for ${crop.name} in ${crop.zone}. Ambient temp ${temperature}°C, pH ${ph}, and EC ${ec} mS within balanced target thresholds.`;

    const docRef = collectionRef.doc(`annual-log-w${week.toString().padStart(2, '0')}-${targetUserId}`);
    const data = {
      userId: targetUserId,
      userEmail: targetUserEmail,
      plantName: `${crop.name} (${crop.zone})`,
      stage,
      notes,
      imageUrl: crop.image,
      readings,
      timestamp: logTime.toISOString(),
      createdAt: new Date(),
    };

    batch.set(docRef, data);
    seededDocs.push({ id: docRef.id, ...data });
  }

  await batch.commit();
  console.log(`[SeedScript] Successfully committed ${seededDocs.length} annual sensor records to Firestore.`);
  return seededDocs;
}

if (process.argv[1] && process.argv[1].endsWith('seedAnnualSensorLogs.js')) {
  const argUser = process.argv.find((a) => a.startsWith('--userId='));
  const userId = argUser ? argUser.split('=')[1] : 'demo-farmer';
  seedDatabase(userId)
    .then((docs) => {
      console.log(`[SeedScript] Done! Seeded ${docs.length} annual records to Firestore. Exiting.`);
      process.exit(0);
    })
    .catch((err) => {
      console.warn('[SeedScript] Firebase Admin notice:', err.message);
      console.log('[SeedScript] Tip: For client app seeding, use the "Sync / Seed 1-Yr Database" button directly inside the HyGrow Plant Photos screen or supply GOOGLE_APPLICATION_CREDENTIALS for Firebase Admin CLI.');
      process.exit(0);
    });
}
