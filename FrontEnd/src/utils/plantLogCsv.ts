function cell(value: unknown) {
  const text = value == null ? '' : String(value);
  const safe = typeof value === 'string' && /^[=+@-]/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
}
export function buildPlantLogCsv(plant: any, records: any[], photoData: Record<string, string> = {}) {
  const headers = ['PlantId','PlantName','Category','DayNumber','Date','Timestamp','Stage','SensorSetId','Zone','Source','AirTemp_C','Humidity_Pct','pH','EC_mS','TDS_ppm','WaterTemp_C','WaterLevel_Pct','Light_Lux','VPD_kPa','OptimalStatus','SampleCount','TargetPeriod','TargetTimezone','AppliedTargets_JSON','DayAverages_JSON','NightAverages_JSON','CompliancePercent','PhotosCount','Photos_JSON','Notes'];
  const rows = records.map((record) => {
    const readings = record.readings || {};
    const photos = (record.photos || []).map((photo: any) => ({ id: photo.id, timestamp: photo.timestamp, reference: photo.imageUrl, firestorePath: photo.imageUrl?.startsWith('hygrow-photo:') ? 'plant_log_photos/' + photo.imageUrl.slice('hygrow-photo:'.length).replace('/', '/images/') : '', dataUri: photoData[photo.imageUrl] || '', notes: photo.notes || '' }));
    return [plant.id,plant.name,plant.category,record.dayNumber,record.dateString,record.timestamp,record.stage,record.sensorSetId || plant.sensorSetId,record.zone || plant.zone,record.source,
      readings.temperature,readings.humidity,readings.ph,readings.ec,readings.tds,readings.waterTemp,readings.waterLevel,readings.lightIntensity,readings.vpd,
      record.isOptimal ? 'Optimal' : 'Sub-Optimal',record.sampleCount ?? 0,record.thresholdContext?.period,record.thresholdContext?.timeZone,
      JSON.stringify(record.thresholdContext?.thresholds || {}),JSON.stringify(record.periodAverages?.day?.readings || {}),JSON.stringify(record.periodAverages?.night?.readings || {}),record.compliancePercent,photos.length,JSON.stringify(photos),record.notes];
  });
  return String.fromCharCode(0xfeff) + [headers, ...rows].map((row) => row.map(cell).join(',')).join(String.fromCharCode(13, 10));
}
