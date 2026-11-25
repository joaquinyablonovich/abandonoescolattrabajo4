import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

// Prueba los bundles reales generados para Vercel, no los handlers fuente.
const require = createRequire(import.meta.url);
const output = path.resolve('.vercel/output');
const config = JSON.parse(await readFile(path.join(output, 'config.json'), 'utf8'));
assert.equal(config.version, 3);
assert.equal(config.routes[0].handle, 'filesystem');
const endpoints = ['/api/health', '/api/model/metadata', '/api/zones', '/api/predict', '/api/predict/batch'];
const functions = {};
for (const endpoint of [...endpoints, '/api-not-found']) {
  const dir = path.join(output, 'functions', `${endpoint.slice(1)}.func`);
  const runtime = JSON.parse(await readFile(path.join(dir, '.vc-config.json'), 'utf8'));
  assert.equal(runtime.runtime, 'nodejs24.x');
  functions[endpoint] = require(path.join(dir, runtime.handler));
  assert.equal(typeof functions[endpoint], 'function');
}
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (functions[pathname]) return functions[pathname](req, res);
  if (/^\/api(?:\/.*)?$/.test(pathname)) return functions['/api-not-found'](req, res);
  let file = path.join(output, 'static', pathname === '/' ? 'index.html' : pathname);
  try { assert.ok((await stat(file)).isFile()); } catch { file = path.join(output, 'static/index.html'); }
  res.end(await readFile(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
async function request(route, body, method = body === undefined ? 'GET' : 'POST') {
  const response = await fetch(base + route, {method, headers: {'Content-Type':'application/json'}, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)});
  return { status:response.status, body:await response.json(), cache:response.headers.get('cache-control') };
}
try {
  const health = await request('/api/health');
  assert.equal(health.status,200);
  assert.equal(health.body.version,'1.2.0-sin-carpetas');
  assert.equal(health.body.runtime.nEstimators,400);
  assert.equal((await request('/api/model/metadata')).status,200);
  assert.equal((await request('/api/zones')).body.provinces.length,24);
  const ba = await request('/api/predict',{provincia:'Buenos Aires'});
  const salta = await request('/api/predict',{provincia:'Salta'});
  assert.equal(ba.status,200); assert.equal(salta.status,200);
  assert.equal(ba.body.entradaNormalizada.tasa_abandono_2022,0.2);
  assert.equal(salta.body.entradaNormalizada.tasa_abandono_2022,1.81);
  assert.ok(ba.body.prediccion.tasaEstimadaPct < salta.body.prediccion.tasaEstimadaPct);
  assert.equal(salta.cache,'no-store');
  const manual = await request('/api/predict',{provincia:'Salta',tasa_abandono_2022:0});
  assert.equal(manual.body.entradaNormalizada.tasa_abandono_2022,0);
  const batch = await request('/api/predict/batch',{rows:[{provincia:'Salta'},{provincia:'Buenos Aires'}]});
  assert.equal(batch.status,200); assert.equal(batch.body.resultados.length,2);
  const csv = await request('/api/predict/batch',{csv:'provincia,tasa_abandono_2022\nSalta,\nBuenos Aires,'});
  assert.deepEqual(csv.body,batch.body);
  assert.equal((await request('/api/predict','{broken')).status,400);
  assert.equal((await request('/api/predict')).status,405);
  assert.equal((await request('/api/does-not-exist')).status,404);
  assert.equal((await request('/api/predict',JSON.stringify({x:'x'.repeat(1024*1024+1)}))).status,413);
  const html = await (await fetch(base)).text();
  assert.ok(html.includes('id="root"')); assert.ok(!html.includes('/src/main.tsx'));
  const asset = html.match(/src="([^\"]+\.js)"/)[1];
  assert.ok((await (await fetch(base + asset)).text()).length > 10000);
  assert.equal(await (await fetch(base + '/una-pagina')).text(),html);
  console.log('OK: 5 endpoints compilados, 24 provincias, cambio provincial, tasa manual, JSON/CSV, errores HTTP, límite 1 MB, frontend y rutas.');
  console.log(`Escenario API con otros campos ausentes: Buenos Aires ${ba.body.prediccion.tasaEstimadaPct}%; Salta ${salta.body.prediccion.tasaEstimadaPct}%.`);
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
