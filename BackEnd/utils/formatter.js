export function normalizeResult(response) {
  let result = response?.data ?? response;
  if (Array.isArray(result)) result = result[0];
  const candidate = typeof result === 'string' ? result : result?.label || result?.class || result?.disease || result?.prediction;
  const label = typeof candidate === 'string' && candidate.trim() ? candidate.slice(0, 200) : 'Unknown disease';
  const score = result?.confidences?.find?.(entry => entry.label === label)?.confidence ?? result?.confidence ?? result?.score ?? 0;
  const confidence = typeof score === 'number' && Number.isFinite(score) ? Math.min(1, Math.max(0, score)) : 0;
  return { disease: label, confidence, severity: confidence > 0.9 ? 'high' : confidence > 0.7 ? 'moderate' : 'low',
    description: `Detected ${label}`, recommendations: ['Inspect nearby plants.', 'Compare visible symptoms and confirm the diagnosis before treatment.', 'Monitor humidity, nutrients, pH and airflow.'] };
}
