import { IncomingMessage, ServerResponse } from 'node:http';
import { PassThrough } from 'node:stream';

export async function request(app, path, body = {}, { method = 'POST', headers = {} } = {}) {
  const req = new IncomingMessage(new PassThrough());
  req.method = method; req.url = path; req.headers = headers; req.body = body;
  const res = new ServerResponse(req);
  return await new Promise(resolve => {
    res.end = data => resolve({ status: res.statusCode, body: data ? JSON.parse(String(data)) : undefined });
    app.handle(req, res);
  });
}

export const authenticated = (req, res, next) => { req.user = { uid: 'buyer', email: 'buyer@example.com' }; next(); };
