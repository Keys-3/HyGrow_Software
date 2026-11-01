import { Client } from '@gradio/client';
export async function withTimeout(promise, milliseconds = 45000) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error('Model request timed out.')), milliseconds); })]);
  } finally { clearTimeout(timer); }
}
export function modelConnection(space) {
  let connection;
  return async () => {
    if (!connection) connection = withTimeout(Client.connect(space())).catch(error => { connection = null; throw error; });
    return connection;
  };
}
