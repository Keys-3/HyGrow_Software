/** Drop undefined optional fields while retaining Firestore Timestamp/FieldValue objects. */
export function cleanFirestorePayload(value: any): any {
  if (Array.isArray(value)) return value.map((item) => item === undefined ? null : cleanFirestorePayload(item));
  if (value && typeof value === 'object' && value.constructor?.name === 'Object') return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, cleanFirestorePayload(item)]));
  return value;
}
