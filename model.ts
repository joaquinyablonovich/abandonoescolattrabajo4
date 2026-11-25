import { MODELO_INFO, percentilNacional, predecirZona } from './realForest.ts';
import type { ProvinceReference } from './provinces.ts';
import {
  FEATURE_KEYS,
  FEATURE_SPEC_MAP,
  FEATURE_SPECS,
  HIGH_RISK_THRESHOLD_PCT,
  preprocessZoneInput,
  type FeatureKey,
  type FeatureVector,
  type RawFeatureInput,
} from './schema.ts';

export interface RiskDriver {
  key: FeatureKey;
  label: string;
  valorActual: number;
  medianaNacional: number;
  impactoPp: number;
  direccion: 'aumenta' | 'reduce';
}

export interface InterventionRecommendation {
  titulo: string;
  justificacion: string;
  prioridad: 'inmediata' | 'focalizada' | 'preventiva';
}

export type RiskTier = 'critico' | 'alto' | 'medio' | 'bajo';

export interface PredictionOutput {
  referenciaProvincial: ProvinceReference | null;
  tasaEstimadaPct: number;
  prediccionLog: number;
  umbralAltoRiesgoPct: number;
  altoRiesgoUmbralFijo: boolean;
  percentilNacional: number;
  prioridadTop25: boolean;
  nivelRiesgo: RiskTier;
  etiquetaRiesgo: string;
  advertenciaSubestimacion: string | null;
  contribuciones: RiskDriver[];
  recomendaciones: InterventionRecommendation[];
  imputacionesAplicadas: FeatureKey[];
  camposRecortados: string[];
  camposDerivados: string[];
  advertenciasEntrada: string[];
}

export interface BatchRowResult {
  referenciaProvincial: ProvinceReference | null;
  indiceOriginal: number;
  zonaId: string;
  provincia: string;
  departamento: string;
  sector: string;
  ambito: string;
  rankingLote: number;
  prioridadTop25Lote: boolean;
  tasaEstimadaPct: number;
  altoRiesgoUmbralFijo: boolean;
  percentilNacional: number;
  prioridadTop25Nacional: boolean;
  nivelRiesgo: RiskTier;
  etiquetaRiesgo: string;
  principalFactor: string;
  imputacionesCount: number;
  advertencia: string | null;
}

export interface BatchPredictionResponse {
  totalZonas: number;
  zonasPrioridadTop25: number;
  zonasSobreUmbralFijo: number;
  tasaPromedioEstimadaPct: number;
  tasaMedianaEstimadaPct: number;
  umbralAltoRiesgoPct: number;
  resultados: BatchRowResult[];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// El modelo es el Random Forest real de la Entrega 3 (ver realForest.ts). No se entrena nada acá.
export function getModelRuntimeSummary() {
  return {
    fuente: MODELO_INFO.fuente,
    nEstimators: MODELO_INFO.nEstimators,
    minSamplesLeaf: MODELO_INFO.minSamplesLeaf,
    maxFeaturesRatio: MODELO_INFO.maxFeaturesRatio,
    zonasReferencia: MODELO_INFO.zonasReferencia,
    p75Pct: HIGH_RISK_THRESHOLD_PCT,
    metricasPrueba: MODELO_INFO.metricasPrueba,
  };
}

function buildRecommendations(
  features: FeatureVector,
  drivers: RiskDriver[],
  prioridadTop25: boolean,
  altoRiesgoUmbral: boolean
): InterventionRecommendation[] {
  const recs: InterventionRecommendation[] = [];

  if (prioridadTop25 || altoRiesgoUmbral || features.tasa_abandono_2022 >= 1.2) {
    recs.push({
      titulo: 'Despliegue de seguimiento territorial nominal en jurisdicción',
      justificacion:
        'La persistencia interanual explica la mayor parte del riesgo proyectado. Se sugiere activar mesas locales de revinculación temprana al inicio del ciclo.',
      prioridad: 'inmediata',
    });
  }

  if (features.pct_sobreedad_2023 >= 0.16 || features.pct_repitentes_2023 >= 0.055) {
    recs.push({
      titulo: 'Tutorías de acompañamiento para trayectorias con sobreedad y repitencia',
      justificacion:
        'La concentración de sobreedad y repitencia al inicio del ciclo anticipa desgranamiento en 8°–12° año; conviene reforzar dispositivos de aceleración y tutorías.',
      prioridad: 'inmediata',
    });
  }

  if (features.ambito_rural === 1 && features.sector_privado === 0) {
    recs.push({
      titulo: 'Refuerzo de transporte, conectividad y cobertura docente en escuelas rurales',
      justificacion:
        'Las zonas estatales rurales concentran las tasas reales más elevadas y la mayor variabilidad territorial del país.',
      prioridad: 'focalizada',
    });
  }

  if (features.appri_pct_sin_internet >= 0.35 || features.appri_pct_nse_bajo >= 0.45) {
    recs.push({
      titulo: 'Articulación de becas de permanencia y equipamiento de conectividad',
      justificacion:
        'La vulnerabilidad socioeconómica y falta de conectividad domiciliaria elevan el riesgo cuando coinciden con transiciones de nivel.',
      prioridad: 'focalizada',
    });
  }

  if (features.car_sec_pct_hs_vacantes >= 0.08 || features.car_pri_pct_cargos_vacantes >= 0.06) {
    recs.push({
      titulo: 'Cobertura prioritaria de cargos y horas cátedra vacantes',
      justificacion:
        'Se observa proporción elevada de horas vacantes o fuera de planta, factor operativo que debilita la continuidad pedagógica.',
      prioridad: 'focalizada',
    });
  }

  if (recs.length === 0) {
    recs.push({
      titulo: 'Monitoreo preventivo estándar por cohorte anual',
      justificacion:
        'Los indicadores de trayectoria previa, matrícula y contexto se ubican en rango bajo; mantener seguimiento nominal rutinario sin alerta crítica.',
      prioridad: 'preventiva',
    });
  }

  // Asegura no perder drivers positivos si hay espacio
  if (drivers.length > 0 && recs.length < 2 && drivers[0].impactoPp > 0.1) {
    recs.push({
      titulo: `Seguimiento focalizado en "${drivers[0].label}"`,
      justificacion: `Variable con mayor aporte incremental (+${drivers[0].impactoPp.toFixed(2)} pp respecto de la mediana nacional).`,
      prioridad: 'preventiva',
    });
  }

  return recs.slice(0, 4);
}

export function predictSingleZone(rawInput: RawFeatureInput): {
  ok: true;
  prediction: PredictionOutput;
  normalizedFeatures: FeatureVector;
} | {
  ok: false;
  errors: string[];
} {
  const prep = preprocessZoneInput(rawInput);
  if (prep.errors.length > 0) {
    return { ok: false, errors: prep.errors };
  }

  // Los datos que no se informaron van como NaN: el imputador del Pipeline los completa con la
  // mediana de entrenamiento y marca el indicador de faltante, igual que en scikit-learn.
  const faltantes = new Set(prep.missingIndicators);
  for (const key of faltantes) prep.features[key] = MODELO_INFO.medianasImputacion[key];
  const xArr = FEATURE_KEYS.map((k) => (faltantes.has(k) ? Number.NaN : prep.features[k]));
  const { predLog, ratePct } = predecirZona(xArr);
  const percentil = percentilNacional(ratePct);
  const prioridadTop25 = percentil >= 75;
  const altoRiesgoUmbralFijo = ratePct >= HIGH_RISK_THRESHOLD_PCT;

  // Nivel de riesgo semántico unificado
  let nivelRiesgo: RiskTier = 'bajo';
  let etiquetaRiesgo = 'Riesgo bajo (seguimiento estándar)';
  if (altoRiesgoUmbralFijo) {
    nivelRiesgo = 'critico';
    etiquetaRiesgo = 'Crítico · Supera umbral P75 (≥ 1,39%)';
  } else if (prioridadTop25) {
    nivelRiesgo = 'alto';
    etiquetaRiesgo = 'Prioridad Top 25% nacional';
  } else if (percentil >= 50 || ratePct >= 0.45) {
    nivelRiesgo = 'medio';
    etiquetaRiesgo = 'Riesgo medio · Monitoreo focalizado';
  }

  // Explicabilidad local: diferencia al reemplazar cada variable por su mediana nacional
  const drivers: RiskDriver[] = [];
  for (let idx = 0; idx < FEATURE_KEYS.length; idx++) {
    const key = FEATURE_KEYS[idx];
    const spec = FEATURE_SPEC_MAP[key];
    if (!Number.isFinite(xArr[idx]) || Math.abs(xArr[idx] - spec.median) < 1e-6) continue;

    const counterfactual = [...xArr];
    counterfactual[idx] = spec.median;
    const { ratePct: baseRate } = predecirZona(counterfactual);
    const delta = ratePct - baseRate;
    if (Math.abs(delta) >= 0.005) {
      drivers.push({
        key,
        label: spec.shortLabel,
        valorActual: Number(xArr[idx].toFixed(4)),
        medianaNacional: spec.median,
        impactoPp: Number(delta.toFixed(3)),
        direccion: delta >= 0 ? 'aumenta' : 'reduce',
      });
    }
  }
  drivers.sort((a, b) => Math.abs(b.impactoPp) - Math.abs(a.impactoPp));

  const advertenciaSubestimacion =
    ratePct >= 1.75 || prep.features.tasa_abandono_2022 >= 3.0
      ? 'Aviso: en zonas con abandono previo alto el modelo tiende a quedarse corto (promedia entre zonas parecidas). Ej.: Ramón Lista, estimado 2,5% vs. real 7,2%. Usá la posición en el ranking (percentil / Top 25%) como criterio principal para priorizar.'
      : null;

  return {
    ok: true,
    normalizedFeatures: prep.features,
    prediction: {
      referenciaProvincial: prep.referenciaProvincial,
      tasaEstimadaPct: Number(ratePct.toFixed(3)),
      prediccionLog: Number(predLog.toFixed(4)),
      umbralAltoRiesgoPct: HIGH_RISK_THRESHOLD_PCT,
      altoRiesgoUmbralFijo,
      percentilNacional: percentil,
      prioridadTop25,
      nivelRiesgo,
      etiquetaRiesgo,
      advertenciaSubestimacion,
      contribuciones: drivers.slice(0, 6),
      recomendaciones: buildRecommendations(
        prep.features,
        drivers,
        prioridadTop25,
        altoRiesgoUmbralFijo
      ),
      imputacionesAplicadas: prep.missingIndicators,
      camposRecortados: prep.clippedFields,
      camposDerivados: prep.derivedFields,
      advertenciasEntrada: prep.warnings,
    },
  };
}

export interface BatchInputItem extends RawFeatureInput {
  zonaId?: string;
}

export function predictBatchZones(items: BatchInputItem[]): {
  ok: true;
  batch: BatchPredictionResponse;
} | {
  ok: false;
  errors: string[];
} {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, errors: ['Debe enviar al menos una zona válida para evaluar en lote.'] };
  }
  if (items.length > 500) {
    return { ok: false, errors: ['El límite por lote es de 500 zonas educativas por solicitud.'] };
  }

  const rowErrors: string[] = [];
  const rawResults: Array<Omit<BatchRowResult, 'rankingLote' | 'prioridadTop25Lote'>> = [];

  items.forEach((item, idx) => {
    const res = predictSingleZone(item);
    if (!res.ok) {
      rowErrors.push(`Fila ${idx + 1}: ${res.errors.join(' ')}`);
      return;
    }
    const p = res.prediction;
    const sector =
      item.sector ||
      (res.normalizedFeatures.sector_privado === 1 ? 'Privado' : 'Estatal');
    const ambito =
      item.ambito ||
      (res.normalizedFeatures.ambito_rural === 1 ? 'Rural' : 'Urbano');

    rawResults.push({
      referenciaProvincial: p.referenciaProvincial,
      indiceOriginal: idx + 1,
      zonaId: item.zonaId ? String(item.zonaId) : `ZONA-${String(idx + 1).padStart(3, '0')}`,
      provincia: item.provincia ? String(item.provincia) : 'Sin especificar',
      departamento: item.departamento ? String(item.departamento) : 'Sin especificar',
      sector,
      ambito,
      tasaEstimadaPct: p.tasaEstimadaPct,
      altoRiesgoUmbralFijo: p.altoRiesgoUmbralFijo,
      percentilNacional: p.percentilNacional,
      prioridadTop25Nacional: p.prioridadTop25,
      nivelRiesgo: p.nivelRiesgo,
      etiquetaRiesgo: p.etiquetaRiesgo,
      principalFactor:
        p.contribuciones[0]?.label ??
        FEATURE_SPEC_MAP['tasa_abandono_2022'].shortLabel,
      imputacionesCount: p.imputacionesAplicadas.length,
      advertencia: p.advertenciaSubestimacion ?? p.advertenciasEntrada[0] ?? null,
    });
  });

  if (rowErrors.length > 0) {
    return { ok: false, errors: rowErrors.slice(0, 8) };
  }

  // Ordenar de mayor a menor riesgo estimado (uso principal del Ministerio: priorización territorial)
  const sorted = [...rawResults].sort((a, b) => b.tasaEstimadaPct - a.tasaEstimadaPct);
  const topCutoffCount = Math.max(1, Math.ceil(sorted.length * 0.25));

  const ranked: BatchRowResult[] = sorted.map((row, idx) => ({
    ...row,
    rankingLote: idx + 1,
    prioridadTop25Lote: idx < topCutoffCount,
  }));

  const ratesAsc = ranked.map((r) => r.tasaEstimadaPct).sort((a, b) => a - b);
  const avg = ratesAsc.reduce((s, v) => s + v, 0) / ratesAsc.length;
  const median = ratesAsc[Math.floor(ratesAsc.length / 2)];

  return {
    ok: true,
    batch: {
      totalZonas: ranked.length,
      zonasPrioridadTop25: ranked.filter((r) => r.prioridadTop25Nacional || r.prioridadTop25Lote).length,
      zonasSobreUmbralFijo: ranked.filter((r) => r.altoRiesgoUmbralFijo).length,
      tasaPromedioEstimadaPct: Number(avg.toFixed(3)),
      tasaMedianaEstimadaPct: Number(median.toFixed(3)),
      umbralAltoRiesgoPct: HIGH_RISK_THRESHOLD_PCT,
      resultados: ranked,
    },
  };
}

/**
 * Parser CSV seguro para archivos con encabezados equivalentes a variables.json / ejemplo_entrada.csv
 */
export function parseBatchCsv(csvText: string): {
  ok: true;
  rows: BatchInputItem[];
} | {
  ok: false;
  errors: string[];
} {
  if (typeof csvText !== 'string' || csvText.trim().length === 0) {
    return { ok: false, errors: ['El archivo CSV está vacío.'] };
  }
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      ok: false,
      errors: ['El CSV debe incluir fila de encabezados y al menos una fila de datos.'],
    };
  }
  if (lines.length - 1 > 500) {
    return { ok: false, errors: ['El CSV excede el máximo permitido de 500 zonas por lote.'] };
  }

  const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''));

  const knownSet = new Set<string>([
    ...FEATURE_KEYS,
    'zonaId',
    'provincia',
    'departamento',
    'sector',
    'ambito',
    'matricula_inicial',
    'entrados',
    'salidos_sin_pase_2022',
    'matricula_expuesta_2022',
    'alumnos_sobreedad',
    'alumnos_repitentes',
    'usarReferenciaProvincial',
  ]);

  const hasAnyFeature = headers.some((h) => FEATURE_KEYS.includes(h as FeatureKey) || h === 'tasa_abandono_2022' || h === 'salidos_sin_pase_2022');
  if (!hasAnyFeature) {
    return {
      ok: false,
      errors: [
        'Los encabezados del CSV no coinciden con las columnas esperadas del modelo (variables.json). Descargue la plantilla de ejemplo para verificar el formato.',
      ],
    };
  }

  const rows: BatchInputItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cells.length !== headers.length) {
      return {
        ok: false,
        errors: [
          `Fila ${i + 1}: cantidad de columnas (${cells.length}) no coincide con los encabezados (${headers.length}).`,
        ],
      };
    }
    const item: Record<string, unknown> = {};
    headers.forEach((h, colIdx) => {
      if (!knownSet.has(h)) return;
      const val = cells[colIdx];
      if (val === '' || val.toLowerCase() === 'na' || val.toLowerCase() === 'null') {
        return;
      }
      if (h === 'usarReferenciaProvincial' && ['true', 'false'].includes(val.toLowerCase())) {
        item[h] = val.toLowerCase() === 'true';
      } else {
        item[h] = val;
      }
    });
    rows.push(item as BatchInputItem);
  }

  return { ok: true, rows };
}

export function serializeSampleCsv(): string {
  const headers = ['zonaId', 'provincia', 'departamento', 'sector', 'ambito', ...FEATURE_KEYS];
  return headers.join(',');
}
