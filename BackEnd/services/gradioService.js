import { handle_file } from '@gradio/client';
import { readFile } from 'node:fs/promises';
import { modelConnection, withTimeout } from './modelClient.js';
const getClient = modelConnection(() => process.env.HF_SPACE || 'sam120904/hydro-disease-detector');
export async function detectDisease(imagePath) {
  // Read before inference so a timeout cannot leave a provider referring to a deleted file.
  const image = new Blob([await readFile(imagePath)]);
  const client = await getClient();
  return withTimeout(client.predict('/predict', { image: handle_file(image) }));
}
