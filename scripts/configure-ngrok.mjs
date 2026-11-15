import { spawnSync } from 'node:child_process';

const token = process.env.NGROK_AUTHTOKEN?.trim();
if (token) {
  if (!/^[A-Za-z0-9_-]+$/.test(token) || !process.env.npm_execpath) {
    console.error('Set NGROK_AUTHTOKEN to an ngrok agent token and run npm run start-frontend.');
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [
    process.env.npm_execpath, 'exec', '--yes', '--package=ngrok', '--',
    'ngrok', 'config', 'add-authtoken', token,
  ], {
    stdio: 'ignore',
    env: { ...process.env, npm_config_loglevel: 'silent', npm_config_logs_max: '0' },
  });

  if (result.status !== 0) {
    console.error('Could not configure ngrok. Check the agent installation and your NGROK_AUTHTOKEN.');
    process.exit(1);
  }
}
