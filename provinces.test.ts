import test from 'node:test';
import assert from 'node:assert/strict';
import { PROVINCE_RECORDS, ZONE_PRESETS } from './data.ts';
import { FEATURE_SPECS, preprocessZoneInput } from './schema.ts';
import { getProvinceReference } from './provinces.ts';
import { predictSingleZone } from './model.ts';
import { buildCustomState, changeProvince, presetToFriendlyState, toApiPayload } from './evaluatorState.ts';

test('las 24 jurisdicciones usan su referencia 2022, nunca la tasa objetivo de 2023', () => {
  assert.equal(PROVINCE_RECORDS.length, 24);
  for (const p of PROVINCE_RECORDS) {
    const res = predictSingleZone({ provincia: p.provincia });
    assert.equal(res.ok, true);
    if (!res.ok) continue;
    assert.equal(res.normalizedFeatures.tasa_abandono_2022, p.ciclo2022Pct);
    assert.equal(res.prediction.referenciaProvincial?.ciclo, 2022);
    assert.ok(!res.prediction.imputacionesAplicadas.includes('tasa_abandono_2022'));
    assert.ok(Number.isFinite(res.prediction.tasaEstimadaPct));
  }
  assert.equal(getProvinceReference('  RIO NEGRO  ')?.provincia, 'Río Negro');
  assert.equal(getProvinceReference('CABA')?.provincia, 'Ciudad de Buenos Aires');
});

test('Mis propios datos cambia entradas y predicción al pasar de Buenos Aires a Salta', () => {
  const ba = buildCustomState(FEATURE_SPECS, PROVINCE_RECORDS);
  const salta = changeProvince(ba, 'Salta', PROVINCE_RECORDS);
  assert.equal(ba.abandonoPrevioPct, 0.20);
  assert.equal(salta.abandonoPrevioPct, 1.81);
  assert.equal(salta.abandonoPrevioAlumnos, Math.round(salta.matriculaAlumnos * 1.81 / 100));
  const a = predictSingleZone(toApiPayload(ba));
  const b = predictSingleZone(toApiPayload(salta));
  assert.equal(a.ok && b.ok, true);
  if (a.ok && b.ok) assert.ok(b.prediction.tasaEstimadaPct > a.prediction.tasaEstimadaPct);
});

test('datos propios y conteos tienen prioridad; cero es un dato válido', () => {
  for (const rate of [0, 0.7, 2.4]) {
    const ba = predictSingleZone({ provincia: 'Buenos Aires', tasa_abandono_2022: rate });
    const salta = predictSingleZone({ provincia: 'Salta', tasa_abandono_2022: rate });
    assert.ok(ba.ok && salta.ok);
    assert.equal(ba.prediction.tasaEstimadaPct, salta.prediction.tasaEstimadaPct);
    assert.equal(ba.prediction.referenciaProvincial, null);
    assert.equal(ba.normalizedFeatures.tasa_abandono_2022, rate);
  }
  const counts = preprocessZoneInput({ provincia: 'Salta', salidos_sin_pase_2022: 10, matricula_expuesta_2022: 1000 });
  assert.equal(counts.features.tasa_abandono_2022, 1);
  assert.equal(counts.referenciaProvincial, null);
  const disabled = preprocessZoneInput({ provincia: 'Salta', usarReferenciaProvincial: false });
  assert.ok(disabled.missingIndicators.includes('tasa_abandono_2022'));
  assert.equal(disabled.referenciaProvincial, null);
});

test('cambiar provincia conserva la tasa manual y secundaria, y limpia Conurbano y departamento', () => {
  const initial = presetToFriendlyState(ZONE_PRESETS.find((p) => p.id === 'la-matanza-conurbano')!);
  const next = changeProvince(initial, 'Salta', PROVINCE_RECORDS);
  assert.equal(next.abandonoPrevioPct, initial.abandonoPrevioPct);
  assert.equal(next.abandonoSecPrevioPct, initial.abandonoSecPrevioPct);
  assert.equal(next.esConurbano, false);
  assert.equal(next.departamento, 'Mi zona');
});

test('provincia desconocida, tipo incorrecto y tasa inválida fallan de forma clara', () => {
  for (const input of [
    { provincia: 'Atlantis' },
    { provincia: 123 },
    { provincia: 'Salta', tasa_abandono_2022: -1 },
    { provincia: 'Salta', tasa_abandono_2022: 'texto' },
    { provincia: 'Salta', usarReferenciaProvincial: 'false' },
    { provincia: 'Salta', sector: 123 },
  ]) assert.equal(predictSingleZone(input as never).ok, false);
});
