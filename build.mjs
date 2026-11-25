import { build as buildVite } from 'vite';
import { build as buildFunction } from 'esbuild';
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
process.chdir(root);
await buildVite();
const output = path.join(root, '.vercel/output');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
// Sólo se publican el frontend compilado y los documentos del trabajo.
for (const file of await readdir(root)) {
  if (/\.(ipynb|pdf)$/.test(file)) await cp(file, path.join('dist', file));
}
await cp('dist', path.join(output, 'static'), { recursive: true });
const endpoints = {
  'api/health': 'handleHealth',
  'api/model/metadata': 'handleMetadata',
  'api/zones': 'handleZones',
  'api/predict': 'handlePredict',
  'api/predict/batch': 'handlePredictBatch',
  'api-not-found': null,
};
for (const [route, handler] of Object.entries(endpoints)) {
  const dir = path.join(output, 'functions', `${route}.func`);
  await mkdir(dir, { recursive: true });
  const contents = handler
    ? `import { ${handler} } from './handlers.ts'; import { wrapHandler } from './vercelRuntime.ts'; module.exports = wrapHandler(${handler});`
    : `module.exports = (_req, res) => { res.statusCode=404; res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({error:'Ruta de API no encontrada.'})); };`;
  await buildFunction({
    stdin: { contents, resolveDir: root, sourcefile: 'function-entry.ts', loader: 'ts' },
    bundle: true, platform: 'node', format: 'cjs', target: 'node24',
    outfile: path.join(dir, 'index.cjs'), minify: true,
  });
  await writeFile(path.join(dir, '.vc-config.json'), JSON.stringify({
    runtime: 'nodejs24.x', handler: 'index.cjs', launcherType: 'Nodejs',
  }, null, 2));
}
await writeFile(path.join(output, 'config.json'), JSON.stringify({
  version: 3,
  routes: [
    { handle: 'filesystem' },
    { src: '/api(?:/.*)?', dest: '/api-not-found' },
    { src: '/.*', dest: '/index.html' },
  ],
}, null, 2));
console.log('SATED listo: frontend y API generados automáticamente para Vercel.');
