import test from 'node:test';
import assert from 'node:assert/strict';
import { preprocessZoneInput, FEATURE_KEYS, HIGH_RISK_THRESHOLD_PCT } from './schema.ts';
import { ZONE_PRESETS, SAMPLE_BATCH_ROWS } from './data.ts';
import {
  getModelRuntimeSummary,
  parseBatchCsv,
  predictBatchZones,
  predictSingleZone,
} from './model.ts';
import { predecirZona } from './realForest.ts';
import CASOS_PARIDAD from './casos_paridad.json';

test('usa el Random Forest real de la Entrega 3 (400 árboles, sin reentrenar)', () => {
  const summary = getModelRuntimeSummary();
  assert.equal(summary.nEstimators, 400);
  assert.equal(summary.minSamplesLeaf, 10);
  assert.equal(summary.maxFeaturesRatio, 0.5);
  assert.equal(summary.p75Pct, 1.39);
  assert.equal(summary.zonasReferencia, 1136);
  assert.ok(Math.abs(summary.metricasPrueba.Recall_top25 - 0.8696) < 1e-4);
});

test('da las mismas predicciones que modelo_abandono.joblib en Python (60 zonas reales)', () => {
  for (const caso of CASOS_PARIDAD) {
    const x = FEATURE_KEYS.map((k) => (caso[k] === null ? Number.NaN : (caso[k] as number)));
    const { ratePct } = predecirZona(x);
    assert.ok(
      Math.abs(ratePct - (caso.esperado_pct as number)) < 1e-6,
      `TS=${ratePct} vs Python=${caso.esperado_pct}`
    );
  }
});

test('Ramón Lista da 2,54% como en el notebook (real 7,19%)', () => {
  const ramon = ZONE_PRESETS.find((z) => z.id === 'ramon-lista-rural')!;
  const r = predictSingleZone(ramon.features);
  assert.equal(r.ok, true);
  if (r.ok) assert.ok(Math.abs(r.prediction.tasaEstimadaPct - 2.54) < 0.01, `${r.prediction.tasaEstimadaPct}`);
});

test('preprocessZoneInput aplica recorte de almuerzo <= 1, imputación por mediana y derivación de conteos', () => {
  const prep = preprocessZoneInput({
    sector: 'Estatal',
    ambito: 'Rural',
    matricula_inicial: 1000,
    entrados: 50,
    salidos_sin_pase_2022: 24,
    matricula_expuesta_2022: 1000,
    alumnos_sobreedad: 210,
    alumnos_repitentes: 60,
    pob_tasa_alumnos_con_almuerzo: 1.38,
  });

  assert.equal(prep.errors.length, 0);
  assert.equal(prep.features.sector_privado, 0);
  assert.equal(prep.features.ambito_rural, 1);
  assert.equal(prep.features.log_matricula_inicial, 3);
  assert.ok(Math.abs(prep.features.tasa_abandono_2022 - 2.4) < 1e-6);
  assert.ok(Math.abs(prep.features.pct_sobreedad_2023 - 0.21) < 1e-6);
  assert.ok(Math.abs(prep.features.pct_repitentes_2023 - 0.06) < 1e-6);
  assert.equal(prep.features.pob_tasa_alumnos_con_almuerzo, 1);
  assert.ok(prep.clippedFields.includes('pob_tasa_alumnos_con_almuerzo'));
  assert.ok(prep.missingIndicators.includes('appri_pct_nse_bajo'));
  assert.ok(prep.derivedFields.includes('tasa_abandono_2022'));
});

test('preprocessZoneInput rechaza entradas inválidas y emite advertencia cuando matrícula < 100', () => {
  const bad = preprocessZoneInput({
    tasa_abandono_2022: -3,
    sector_privado: 2,
  });
  assert.ok(bad.errors.length >= 2);

  const small = preprocessZoneInput({
    matricula_inicial: 60,
    entrados: 10,
    tasa_abandono_2022: 0.5,
  });
  assert.equal(small.errors.length, 0);
  assert.equal(small.warnings.length, 1);
});

test('predictSingleZone ordena coherentemente zonas críticas frente a zonas de bajo riesgo', () => {
  const ramonLista = ZONE_PRESETS.find((z) => z.id === 'ramon-lista-rural')!;
  const sanIsidro = ZONE_PRESETS.find((z) => z.id === 'san-isidro-privado')!;
  const laMatanza = ZONE_PRESETS.find((z) => z.id === 'la-matanza-conurbano')!;

  const rCrit = predictSingleZone(ramonLista.features);
  const rLow = predictSingleZone(sanIsidro.features);
  const rMed = predictSingleZone(laMatanza.features);

  assert.equal(rCrit.ok, true);
  assert.equal(rLow.ok, true);
  assert.equal(rMed.ok, true);

  if (rCrit.ok && rLow.ok && rMed.ok) {
    assert.ok(
      rCrit.prediction.tasaEstimadaPct > rMed.prediction.tasaEstimadaPct &&
        rMed.prediction.tasaEstimadaPct > rLow.prediction.tasaEstimadaPct,
      `Orden inválido: Crit=${rCrit.prediction.tasaEstimadaPct}, Med=${rMed.prediction.tasaEstimadaPct}, Low=${rLow.prediction.tasaEstimadaPct}`
    );
    assert.ok(rCrit.prediction.tasaEstimadaPct >= HIGH_RISK_THRESHOLD_PCT);
    assert.equal(rCrit.prediction.altoRiesgoUmbralFijo, true);
    assert.equal(rCrit.prediction.prioridadTop25, true);
    assert.ok(rCrit.prediction.advertenciaSubestimacion !== null);

    assert.equal(rLow.prediction.altoRiesgoUmbralFijo, false);
    assert.equal(rLow.prediction.prioridadTop25, false);
    assert.ok(rLow.prediction.tasaEstimadaPct < 0.35);

    // Verifica transformación expm1 exacta
    const expectedRate = Math.max(0, Math.min(100, Math.expm1(rCrit.prediction.prediccionLog)));
    assert.ok(Math.abs(rCrit.prediction.tasaEstimadaPct - expectedRate) < 0.01);
    assert.ok(rCrit.prediction.contribuciones.length > 0);
    assert.ok(rCrit.prediction.recomendaciones.length > 0);
  }
});

test('predictBatchZones ordena descendente por riesgo y marca correctamente el Top 25% del lote', () => {
  const res = predictBatchZones(SAMPLE_BATCH_ROWS);
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.batch.totalZonas, 5);
    const rates = res.batch.resultados.map((r) => r.tasaEstimadaPct);
    for (let i = 1; i < rates.length; i++) {
      assert.ok(rates[i - 1] >= rates[i], 'El lote debe estar ordenado de mayor a menor tasa estimada');
    }
    assert.equal(res.batch.resultados[0].rankingLote, 1);
    assert.equal(res.batch.resultados[0].prioridadTop25Lote, true);
    assert.equal(res.batch.resultados[4].prioridadTop25Lote, false);
  }
});

test('parseBatchCsv interpreta CSV con columnas de variables.json y rechaza formatos corruptos', () => {
  const header = ['zonaId', 'provincia', ...FEATURE_KEYS].join(',');
  const row1 = ['Z-1', 'Salta', ...FEATURE_KEYS.map((k) => (k === 'tasa_abandono_2022' ? '2.4' : ''))].join(',');
  const parsed = parseBatchCsv(`${header}\n${row1}`);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.rows.length, 1);
    assert.equal(parsed.rows[0].provincia, 'Salta');
    assert.equal(parsed.rows[0].tasa_abandono_2022, '2.4');
  }

  const invalid = parseBatchCsv('col_desconocida,otra\n1,2');
  assert.equal(invalid.ok, false);
});
