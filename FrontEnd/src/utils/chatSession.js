// Account-scoped chat state. Generation tokens invalidate pending loads and AI replies.
export function createChatSession(storage, onChange, initialMessages) {
  let uid = null;
  let generation = 0;
  let ready = false;
  let messages = initialMessages;
  let writes = Promise.resolve();
  const publish = () => onChange({ messages, ready });
  const enqueue = operation => {
    writes = writes.then(operation).catch(() => { /* A storage failure must not leak or crash the conversation. */ });
  };
  return {
    async switchUser(nextUid) {
      uid = nextUid;
      const request = ++generation;
      ready = false;
      messages = initialMessages;
      publish();
      if (!uid) return;
      let saved;
      try { saved = JSON.parse(await storage.getItem(`chat_history_${uid}`)); } catch { saved = null; }
      if (request !== generation) return;
      if (Array.isArray(saved)) {
        const valid = saved.filter(m => m && typeof m.id === 'string' && ['user', 'assistant'].includes(m.role) && typeof m.text === 'string' && m.text.length <= 20000);
        messages = valid.length ? valid.slice(-100) : initialMessages;
      }
      ready = true;
      publish();
    },
    token: () => generation,
    append(request, message) {
      if (!uid || !ready || request !== generation) return false;
      messages = [...messages, message].slice(-100);
      const key = `chat_history_${uid}`;
      const data = JSON.stringify(messages);
      publish();
      enqueue(() => storage.setItem(key, data));
      return true;
    },
    clear() {
      ++generation;
      messages = initialMessages;
      publish();
      if (uid) {
        const key = `chat_history_${uid}`;
        enqueue(() => storage.removeItem(key));
      }
    },
    flush: () => writes,
  };
}

// The backend accepts complete user/model pairs only, with at most 20 entries.
export function chatRequestHistory(messages) {
  const pairs = [];
  let pending = null;
  for (const message of messages) {
    if (typeof message?.text !== 'string' || !message.text.trim()) continue;
    if (message.role === 'user') pending = { role: 'user', text: message.text.slice(0, 4000) };
    else if (message.role === 'assistant' && pending) {
      pairs.push(pending, { role: 'model', text: message.text.slice(0, 4000) });
      pending = null;
    }
  }
  return pairs.slice(-20);
}
