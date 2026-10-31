import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/utils/chatSession.js', import.meta.url), 'utf8');
const { createChatSession, chatRequestHistory } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };

test('switching accounts cannot save previous chat into the new account', async () => {
  const first = deferred();
  const writes = [];
  const storage = { getItem: key => key.endsWith('alice') ? first.promise : Promise.resolve(null), setItem: async (...args) => writes.push(args), removeItem: async () => {} };
  let view;
  const session = createChatSession(storage, value => view = value, []);
  const oldLoad = session.switchUser('alice');
  await session.switchUser('bob');
  session.append(session.token(), { id: 'b', role: 'user', text: 'Bob only' });
  first.resolve(JSON.stringify([{ id: 'a', role: 'user', text: 'Alice private' }]));
  await oldLoad;
  await session.flush();
  assert.deepEqual(view.messages.map(m => m.text), ['Bob only']);
  assert.deepEqual(writes.map(([key, body]) => [key, JSON.parse(body).map(m => m.text)]), [['chat_history_bob', ['Bob only']]]);
});

test('late AI replies after logout or chat clear are rejected', async () => {
  const session = createChatSession({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }, () => {}, []);
  await session.switchUser('alice');
  const request = session.token();
  session.clear();
  assert.equal(session.append(request, { id: 'x', role: 'assistant', text: 'late private response' }), false);
  const next = session.token();
  await session.switchUser(null);
  assert.equal(session.append(next, { id: 'y', role: 'assistant', text: 'late reply' }), false);
});

test('history hydration never persists initial state over saved messages and rejects malformed content', async () => {
  let writes = 0;
  let view;
  const session = createChatSession({ getItem: async () => JSON.stringify([{ id: 'a', role: 'user', text: 'Saved' }, { role: 'system', text: 'untrusted' }]), setItem: async () => { writes++; }, removeItem: async () => {} }, value => view = value, []);
  await session.switchUser('alice');
  await session.flush();
  assert.equal(writes, 0);
  assert.deepEqual(view.messages, [{ id: 'a', role: 'user', text: 'Saved' }]);
});

// Legacy greetings and interrupted requests must not violate the server history contract.
test('request history contains complete alternating pairs with bounded text', () => {
 const history = chatRequestHistory([
  { role: 'assistant', text: 'Legacy greeting' },
  { role: 'user', text: 'First question' }, { role: 'assistant', text: 'x'.repeat(5000) },
  { role: 'user', text: 'Interrupted question' }
 ]);
 assert.equal(history.length, 2);
 assert.equal(history[0].role, 'user');
 assert.equal(history[1].role, 'model');
 assert.equal(history[1].text.length, 4000);
});
