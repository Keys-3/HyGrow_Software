import { predictGrowth } from '../services/growthPrediction.js';
import { HttpError } from '../utils/errors.js';
export function createGrowthPrediction(predict = predictGrowth) {
  return async function growthPrediction(req, res) {
    const values = {};
    for (const [key, min, max] of [['temperature', -20, 80], ['humidity', 0, 100], ['tds', 0, 10000], ['ph', 0, 14]]) {
      const value = req.body?.[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new HttpError(400, `Invalid ${key}: expected a number between ${min} and ${max}.`);
      values[key] = value;
    }
    let prediction;
    try { prediction = await predict(values); }
    catch { throw new HttpError(502, 'Growth prediction is unavailable.'); }
    if (!Array.isArray(prediction) || prediction.length < 3 || typeof prediction[2] !== 'string') throw new HttpError(502, 'Growth model returned an invalid response.');
    res.json({ success: true, prediction: { harvestTime: prediction[0], growthStatus: prediction[1], recommendations: prediction[2].split('\n').map(line => line.trim()).filter(Boolean) } });
  };
}
export const growthPrediction = createGrowthPrediction();
