import { zipSync, strToU8 } from 'fflate';
import { buildPlantLogCsv } from './plantLogCsv';
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
const safeName = (value: unknown) => String(value || 'photo').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 70);
/** Portable archive: readable CSV references, real image files, and an offline gallery. */
export function buildPlantLogExport(plant: any, records: any[], photoData: Record<string, string>) {
  const files: Record<string, Uint8Array> = {};
  const links: Record<string, string> = {};
  const captions: string[] = [];
  for (const record of records) for (const photo of record.photos || []) {
    const reference = photo.imageUrl;
    if (!reference || links[reference]) continue;
    const index = Object.keys(links).length + 1;
    let link: string;
    const data = photoData[reference] || (reference.startsWith('data:image/') ? reference : '');
    if (data) {
      const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(data);
      if (!match) throw new Error('A photo could not be exported. Please select a JPEG, PNG or WebP image.');
      link = 'photos/' + index + '_' + safeName(record.dateString) + '_' + safeName(photo.id) + '.' + (match[1] === 'jpeg' ? 'jpg' : match[1]);
      const bytes = atob(match[2].replace(/\s/g, ''));
      files[link] = Uint8Array.from(bytes, character => character.charCodeAt(0));
    } else if (/^https:\/\//i.test(reference)) link = reference;
    else throw new Error('A saved photo has not loaded. Reconnect and try exporting again.');
    links[reference] = link;
    captions.push('<figure id="photo-' + index + '"><a href="' + escapeHtml(link) + '"><img loading="lazy" src="' + escapeHtml(link) + '" alt="Plant log photo ' + index + '"></a><figcaption><strong>Photo ' + index + '</strong> · ' + escapeHtml(photo.timestamp || record.dateString) + '<br>' + escapeHtml(photo.notes) + '<br><a href="' + escapeHtml(link) + '">Open original image</a></figcaption></figure>');
  }
  const csv = buildPlantLogCsv(plant, records, links);
  files['plant_logs.csv'] = strToU8(csv);
  files['photos.html'] = strToU8('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Plant log photos</title><style>body{font:16px system-ui;margin:24px auto;padding:0 16px;max-width:900px;color:#163a2c}figure{margin:24px 0;padding:16px;border:1px solid #ccc;border-radius:12px}img{max-width:100%;max-height:600px;object-fit:contain}figcaption{line-height:1.7;overflow-wrap:anywhere}</style></head><body><h1>' + escapeHtml(plant.name) + ' — log photos</h1><p>Extract the entire ZIP first. Open plant_logs.csv for readings, or open an image below. Keep the photos folder beside these files.</p>' + (captions.join('') || '<p>No photos attached to these logs.</p>') + '</body></html>');
  files['README.txt'] = strToU8('Extract the entire ZIP. Open plant_logs.csv in your spreadsheet app and photos.html in a browser to view photos. PhotoLinks contains paths relative to the extracted folder. HTTPS photos remain online links; photos in the photos folder work offline. Keep all extracted files together.');
  return { csv, archive: zipSync(files, { level: 0 }) };
}
