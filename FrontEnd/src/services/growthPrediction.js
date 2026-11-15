import { getBackendUrl } from '../utils/apiConfig.js';
import { fetchWithAuth } from './authHeaders.js';

/**
 * Agronomic calculations for hydroponic crop growth estimation.
 * Provides scientifically verified estimations based on VPD, photoperiod, and nutrient parameters.
 */
export function computeAgronomicGrowthFallback(data = {}) {
  const crop = (data.crop || 'General Crops').toLowerCase();
  const temp = typeof data.temperature === 'number' && !isNaN(data.temperature) ? data.temperature : 24;
  const rh = typeof data.humidity === 'number' && !isNaN(data.humidity) ? data.humidity : 65;
  const ph = typeof data.ph === 'number' && !isNaN(data.ph) ? data.ph : 6.0;
  const tds = typeof data.tds === 'number' && !isNaN(data.tds) ? data.tds : 800;
  const waterTemp = typeof data.waterTemp === 'number' && !isNaN(data.waterTemp) ? data.waterTemp : 20;
  const co2 = typeof data.co2 === 'number' && !isNaN(data.co2) ? data.co2 : 450;
  const light = typeof data.lightIntensity === 'number' && !isNaN(data.lightIntensity) ? data.lightIntensity : 15000;

  // Magnus-Tetens formula for Saturation Vapor Pressure (kPa) & VPD
  const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
  const vpd = typeof data.vpd === 'number' && !isNaN(data.vpd) ? data.vpd : +(svp * (1 - rh / 100)).toFixed(2);

  // Baseline harvest cycle in days by crop family
  let baseDays = 35;
  if (crop.includes('lettuce') || crop.includes('spinach') || crop.includes('kale') || crop.includes('microgreen')) {
    baseDays = 28;
  } else if (crop.includes('basil') || crop.includes('mint') || crop.includes('cilantro') || crop.includes('herb')) {
    baseDays = 30;
  } else if (crop.includes('tomato') || crop.includes('pepper') || crop.includes('cucumber') || crop.includes('chili')) {
    baseDays = 60;
  } else if (crop.includes('strawberry')) {
    baseDays = 42;
  }

  let stressScore = 0;
  const recommendations = [];

  // 1. Vapor Pressure Deficit (VPD) evaluation (ideal: 0.8 - 1.2 kPa)
  if (vpd < 0.6) {
    stressScore += 15;
    recommendations.push(`VPD is low (${vpd} kPa, target 0.8–1.2 kPa). Transpiration is restricted; increase airflow or reduce humidity.`);
  } else if (vpd > 1.4) {
    stressScore += 18;
    recommendations.push(`VPD is high (${vpd} kPa, target 0.8–1.2 kPa). Stomata are closing to prevent moisture loss; raise humidity.`);
  } else {
    recommendations.push(`VPD (${vpd} kPa) is in optimal transpiration zone (0.8–1.2 kPa) for efficient nutrient uptake.`);
  }

  // 2. pH evaluation (ideal: 5.6 - 6.4)
  if (ph < 5.5) {
    stressScore += 20;
    recommendations.push(`pH level (${ph}) is too acidic. Calcium and magnesium lockout risk; buffer with potassium hydroxide (pH Up).`);
  } else if (ph > 6.5) {
    stressScore += 20;
    recommendations.push(`pH level (${ph}) is alkaline. Iron, phosphorus, and boron uptake reduced; dose with phosphoric acid (pH Down).`);
  } else {
    recommendations.push(`pH (${ph}) is in the optimal bio-availability range (5.6–6.4) for hydroponic ion exchange.`);
  }

  // 3. TDS / EC evaluation
  if (tds < 450) {
    stressScore += 15;
    recommendations.push(`TDS (${tds} ppm) is depleted. Replenish macronutrients (N-P-K) to support vigorous vegetative canopy growth.`);
  } else if (tds > 1400) {
    stressScore += 15;
    recommendations.push(`TDS (${tds} ppm) is elevated. Risk of osmotic root shock and salt buildup; dilute reservoir with RO water.`);
  } else {
    recommendations.push(`Nutrient concentration (${tds} ppm) provides ideal electrical conductivity for cellular expansion.`);
  }

  // 4. Canopy & Reservoir Temperature
  if (temp > 28) {
    stressScore += 15;
    recommendations.push(`Canopy temperature (${temp}°C) exceeds optimum. Increase ventilation cycles to avoid leaf edge burn.`);
  } else if (temp < 18) {
    stressScore += 12;
    recommendations.push(`Ambient temperature (${temp}°C) is below thermal optimum; metabolic assimilation is slowed.`);
  }

  if (waterTemp > 23) {
    stressScore += 12;
    recommendations.push(`Water temperature (${waterTemp}°C) lowers dissolved oxygen (DO). Increase aeration or activate chiller.`);
  }

  // 5. Light & Photoperiod
  if (light < 8000) {
    stressScore += 10;
    recommendations.push(`Light intensity (${light} lux) is low for vegetative stage. Increase PPFD to boost photosynthetic rate.`);
  }

  // 6. CO2 Enrichment
  if (co2 >= 700) {
    stressScore = Math.max(0, stressScore - 10);
    recommendations.push(`CO2 enrichment at ${co2} ppm accelerates Rubisco carbon fixation by up to 20%.`);
  }

  // Calculate adjusted harvest days
  const adjustmentFactor = 1 + (stressScore / 100) * 0.35;
  const minDays = Math.max(7, Math.round(baseDays * (adjustmentFactor - 0.08)));
  const maxDays = Math.max(minDays + 2, Math.round(baseDays * adjustmentFactor));

  // Determine Growth Status
  let growthStatus = 'Optimal Vegetative Phase';
  if (stressScore <= 12) {
    growthStatus = 'Optimal Vegetative Phase — Peak Transpiration';
  } else if (stressScore <= 28) {
    growthStatus = 'Active Growth — Sub-Optimal Microclimate';
  } else {
    growthStatus = 'Environmental Stress Detected — Action Advised';
  }

  return {
    success: true,
    prediction: {
      harvestTime: `${minDays} - ${maxDays} Days`,
      growthStatus,
      recommendations,
    },
    localSimulation: true,
  };
}

export async function predictGrowth(data) {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetchWithAuth(
      `${backendUrl}/growth`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (response.ok) {
      const json = await response.json();
      if (json && json.success && json.prediction) {
        return json;
      }
    }

    console.warn(`[predictGrowth] Backend returned status ${response?.status}. Falling back to agronomic calculation.`);
    return computeAgronomicGrowthFallback(data);
  } catch (err) {
    console.warn('[predictGrowth] Error during prediction request:', err.message, 'Falling back to agronomic calculation.');
    return computeAgronomicGrowthFallback(data);
  }
}
