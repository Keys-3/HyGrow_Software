import { useEffect, useMemo, useState } from 'react';
import { getPlantTargets } from '../utils/plantThresholds';
/** Recompute at a day/night boundary even when no new reading arrives. */
export function usePlantTargets(plant: any) {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime((previous) => getPlantTargets(plant, previous).period === getPlantTargets(plant).period ? previous : new Date()), 30_000);
    return () => clearInterval(timer);
  }, [plant]);
  return useMemo(() => getPlantTargets(plant, new Date()), [plant, time]);
}
