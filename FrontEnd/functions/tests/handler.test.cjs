const test = require('node:test');
const assert = require('node:assert/strict');
let handlers;
try { handlers = require('../handler.cjs'); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
async function invoke(body, options = {}) {
  assert.equal(typeof handlers?.createDiseaseHandler, 'function');
  let status = 200; let result;
  const res = { set() { return this; }, status(value) { status = value; return this; }, json(value) { result = value; return this; }, send() {} };
  const req = { method: 'POST', headers: { authorization: 'Bearer good', 'content-type': 'multipart/form-data; boundary=test' }, rawBody: body, ...options };
  await handlers.createDiseaseHandler({ verifyToken: async () => ({ uid: 'buyer' }), predict: async () => ({ data: [{ label: 'Healthy', confidence: 0.9 }] }) })(req, res);
  return { status, body: result };
}
function multipart(data, type = 'image/png', field = 'image') {
  return Buffer.concat([Buffer.from(`--test\r\nContent-Disposition: form-data; name="${field}"; filename="leaf.png"\r\nContent-Type: ${type}\r\n\r\n`), data, Buffer.from('\r\n--test--\r\n')]);
}
test('cloud function requires a Firebase bearer token', async () => {
  assert.equal((await invoke(Buffer.alloc(0), { headers: {} })).status, 401);
});
test('cloud function accepts bounded images and normalizes model results', async () => {
  const result = await invoke(multipart(Buffer.from('89504e470d0a1a0a', 'hex')));
  assert.equal(result.status, 200); assert.equal(result.body.result.disease, 'Healthy');
});
test('cloud function rejects wrong fields, nonimages, oversize files and malformed forms', async () => {
  const png = Buffer.from('89504e470d0a1a0a', 'hex');
  assert.equal((await invoke(multipart(png, 'image/png', 'other'))).status, 400);
  assert.equal((await invoke(multipart(Buffer.from('not an image')))).status, 400);
  assert.equal((await invoke(multipart(Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png'))).status, 413);
  assert.equal((await invoke(Buffer.from('broken'))).status, 400);
});
