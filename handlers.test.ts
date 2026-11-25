import test from 'node:test';
import assert from 'node:assert/strict';
import health from './health.ts';
import metadata from './metadata.ts';
import zones from './zones.ts';
import predict from './predict.ts';
import batch from './batch.ts';
import { callHandler } from './testSupport.ts';

test('las cinco funciones Vercel responden con JSON y el modelo de 400 árboles', () => {
  const h = callHandler(health, undefined, 'GET');
  assert.equal(h.status, 200);
  assert.equal(h.body.runtime.nEstimators, 400);
  assert.equal(callHandler(metadata, undefined, 'GET').body.modelo.hiperparametros.runtimeTreesLoaded, 400);
  assert.equal(callHandler(zones, undefined, 'GET').body.provinces.length, 24);
  assert.equal(callHandler(predict, { provincia: 'Salta' }).status, 200);
  assert.equal(callHandler(batch, { rows: [{ provincia: 'Salta' }] }).status, 200);
});

test('la API usa la provincia al faltar la tasa y devuelve la procedencia del dato', () => {
  const a = callHandler(predict, JSON.stringify({ provincia: 'Buenos Aires' }));
  const b = callHandler(predict, { provincia: 'Salta' });
  assert.equal(a.body.entradaNormalizada.tasa_abandono_2022, 0.2);
  assert.equal(b.body.entradaNormalizada.tasa_abandono_2022, 1.81);
  assert.ok(a.body.prediccion.tasaEstimadaPct < b.body.prediccion.tasaEstimadaPct);
  assert.equal(b.body.prediccion.referenciaProvincial.provincia, 'Salta');
});

test('JSON y CSV usan la misma referencia provincial y respetan la tasa manual', () => {
  const a = callHandler(batch, { rows: [{ provincia: 'Salta' }, { provincia: 'Buenos Aires', tasa_abandono_2022: 0 }] });
  const b = callHandler(batch, { csv: 'provincia,tasa_abandono_2022\nSalta,\nBuenos Aires,0' });
  assert.deepEqual(b.body, a.body);
  assert.equal(b.body.resultados[0].referenciaProvincial.provincia, 'Salta');
  const disabled = callHandler(batch, { csv: 'provincia,tasa_abandono_2022,usarReferenciaProvincial\nSalta,,false' });
  assert.equal(disabled.status, 200);
  assert.equal(disabled.body.resultados[0].referenciaProvincial, null);
});

test('entradas malformadas devuelven 400; métodos incorrectos 405', () => {
  for (const body of ['{bad', [], null, { sector: 22 }, { provincia: 'Atlantis' }, { tasa_abandono_2022: -4 }]) {
    assert.equal(callHandler(predict, body).status, 400);
  }
  assert.equal(callHandler(predict, {}, 'GET').status, 405);
  assert.equal(callHandler(health, {}, 'POST').status, 405);
  assert.equal(callHandler(batch, { rows: [null] }).status, 400);
  assert.equal(callHandler(batch, { rows: Array(501).fill({}) }).status, 400);
});
