import { modelConnection, withTimeout } from './modelClient.js';
const getClient = modelConnection(() => process.env.HF_GROWTH_SPACE || 'sam120904/hydrogrow-ai-growth-prediction');
export async function predictGrowth({ temperature, humidity, tds, ph }) {
  const client = await getClient();
  const result = await withTimeout(client.predict('/predict', { temperature, humidity, tds, ph }));
  return result.data;
}
