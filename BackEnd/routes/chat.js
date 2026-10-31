import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { text } from '../utils/validation.js';
import { HttpError } from '../utils/errors.js';
export function createChatRouter(deps = {}) {
  const router = express.Router();
  router.use(deps.authenticate || requireAuth);
  router.post('/', async (req, res) => {
    const message = text(req.body?.message, 'message', 4000);
    const history = req.body?.history ?? [];
    if (!Array.isArray(history) || history.length > 20) throw new HttpError(400, 'Chat history may contain at most 20 messages.');
    const contents = history.map((entry, index) => {
      if (!entry || !['user', 'model'].includes(entry.role) || entry.role !== (index % 2 ? 'model' : 'user')) throw new HttpError(400, 'Invalid chat history.');
      return { role: entry.role, parts: [{ text: text(entry.text, 'history message', 4000) }] };
    });
    if (contents.length % 2) throw new HttpError(400, 'Chat history must end with a model reply.');
    const apiKey = (deps.apiKey || (() => process.env.GEMINI_API_KEY))();
    const model = (deps.model || (() => process.env.GEMINI_MODEL))();
    if (!apiKey || !model) throw new HttpError(503, 'Chat is not configured.');
    if (!/^[A-Za-z0-9._-]+$/.test(model)) throw new HttpError(503, 'Invalid chat model configuration.');
    contents.push({ role: 'user', parts: [{ text: message }] });
    let response;
    try {
      response = await (deps.fetch || fetch)(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        signal: AbortSignal.timeout(30000), body: JSON.stringify({ contents,
          systemInstruction: { parts: [{ text: 'You are HyGrow, a helpful hydroponic farming assistant. Give clear, practical answers. Ask for missing growing conditions and recommend confirming plant diagnoses before treatment.' }] },
          generationConfig: { maxOutputTokens: 1500 } }),
      });
      if (!response.ok) throw new Error('Provider request failed.');
      const payload = await response.json();
      const reply = payload.candidates?.[0]?.content?.parts?.filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('');
      if (!reply) throw new Error('Provider returned no answer.');
      res.json({ success: true, reply });
    } catch { throw new HttpError(502, 'Chat is temporarily unavailable. Please try again later.'); }
  });
  return router;
}
export default createChatRouter();
