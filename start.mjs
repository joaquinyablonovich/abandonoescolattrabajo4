import { spawn } from 'node:child_process';

// Misma API que en desarrollo, sirviendo el frontend compilado. También funciona en Windows.
const server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
  stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' },
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 1));
server.on('error', (error) => { console.error(error.message); process.exit(1); });
