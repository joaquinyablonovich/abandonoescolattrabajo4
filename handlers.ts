import {
  CV_COMPARISON,
  DATASET_SUMMARY,
  DIMENSION_ERRORS,
  HEATMAP_TEST_MATRIX,
  HIGHEST_ERROR_ZONES,
  PERMUTATION_IMPORTANCE,
  PROVINCE_ABLATION,
  PROVINCE_RECORDS,
  SAMPLE_BATCH_ROWS,
  TEST_COMPARISON,
  TOP_PRIORITIZED_ZONES,
  ZONE_PRESETS,
} from './data.ts';
import {
  getModelRuntimeSummary,
  parseBatchCsv,
  predictBatchZones,
  predictSingleZone,
  type BatchInputItem,
} from './model.ts';
import { FEATURE_KEYS, FEATURE_SPECS, HIGH_RISK_THRESHOLD_PCT } from './schema.ts';

export interface ApiRequest {
  method?: string;
  query?: Record<string, unknown>;
  body?: unknown;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(payload: unknown): void;
  setHeader?(name: string, value: string): void;
}

function parseBodyObject(rawBody: unknown): Record<string, unknown> | null {
  if (typeof rawBody === 'string') {
    try {
      const parsed = JSON.parse(rawBody);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
  if (rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)) {
    return rawBody as Record<string, unknown>;
  }
  return null;
}

export function handleHealth(req: ApiRequest, res: ApiResponse): void {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido. Use GET.' });
    return;
  }
  const runtime = getModelRuntimeSummary();
  res.status(200).json({
    ok: true,
    version: '1.2.0-sin-carpetas',
    service: 'SATED · API de Predicción de Desvinculación Escolar',
    model: 'RandomForestRegressor (log1p -> expm1)',
    featuresCount: FEATURE_KEYS.length,
    umbralAltoRiesgoPct: HIGH_RISK_THRESHOLD_PCT,
    runtime,
  });
}

export function handleMetadata(req: ApiRequest, res: ApiResponse): void {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido. Use GET.' });
    return;
  }
  res.status(200).json({
    modelo: {
      nombre: 'Random Forest Regressor (Conjunto C: Contexto 2023 + Matrícula 2023 + Ciclo 2022)',
      hiperparametros: {
        n_estimators: 400,
        min_samples_leaf: 10,
        max_features: 0.5,
        random_state: 42,
        runtimeTreesLoaded: getModelRuntimeSummary().nEstimators,
      },
      objetivo: 'log1p(tasa_abandono_pct); predicción invertida con clip(expm1(y_log), 0, 100)',
      umbralAltoRiesgoPct: HIGH_RISK_THRESHOLD_PCT,
      criterioPriorizacionPrincipal:
        'Top 25% de mayor riesgo predicho (Recall = 87,0% en provincias de prueba)',
    },
    variables: FEATURE_SPECS,
    variablesJson: FEATURE_KEYS,
    resumenDataset: DATASET_SUMMARY,
    comparacionCV: CV_COMPARISON,
    comparacionPrueba: TEST_COMPARISON,
    ablacionProvincial: PROVINCE_ABLATION,
    importanciaPermutacion: PERMUTATION_IMPORTANCE,
    erroresPorDimension: DIMENSION_ERRORS,
    ejemploLote: SAMPLE_BATCH_ROWS,
  });
}

export function handleZones(req: ApiRequest, res: ApiResponse): void {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido. Use GET.' });
    return;
  }
  const q = req.query ?? {};
  const provinciaFilter = typeof q.provincia === 'string' ? q.provincia.trim() : '';
  const splitFilter = typeof q.split === 'string' ? q.split.trim() : '';

  const provinces = PROVINCE_RECORDS.filter((p) => {
    if (splitFilter === 'train' || splitFilter === 'test') {
      if (p.split !== splitFilter) return false;
    }
    if (provinciaFilter && !p.provincia.toLowerCase().includes(provinciaFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  const prioritized = TOP_PRIORITIZED_ZONES.filter((z) =>
    provinciaFilter ? z.provincia.toLowerCase().includes(provinciaFilter.toLowerCase()) : true
  );

  res.status(200).json({
    provinces,
    prioritizedZones: prioritized,
    highestErrorZones: HIGHEST_ERROR_ZONES,
    heatmapMatrix: HEATMAP_TEST_MATRIX,
    presets: ZONE_PRESETS,
  });
}

export function handlePredict(req: ApiRequest, res: ApiResponse): void {
  res.setHeader?.('Cache-Control', 'no-store');
  if (req.method && req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido. Use POST.' });
    return;
  }
  try {
    const body = parseBodyObject(req.body);
    if (!body) {
      res.status(400).json({ error: 'Debe enviar un objeto JSON con los atributos de la zona.' });
      return;
    }
    const result = predictSingleZone(body);
    if (!result.ok) {
      res.status(400).json({
        error: 'Validación fallida en los datos de entrada.',
        detalles: result.errors,
      });
      return;
    }
    res.status(200).json({
      zona: {
        provincia: typeof body.provincia === 'string' ? body.provincia : 'No especificada',
        departamento: typeof body.departamento === 'string' ? body.departamento : 'No especificado',
        sector: result.normalizedFeatures.sector_privado === 1 ? 'Privado' : 'Estatal',
        ambito: result.normalizedFeatures.ambito_rural === 1 ? 'Rural' : 'Urbano',
      },
      entradaNormalizada: result.normalizedFeatures,
      prediccion: result.prediction,
    });
  } catch {
    res.status(500).json({ error: 'Error interno al procesar la predicción territorial.' });
  }
}

export function handlePredictBatch(req: ApiRequest, res: ApiResponse): void {
  res.setHeader?.('Cache-Control', 'no-store');
  if (req.method && req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido. Use POST.' });
    return;
  }
  try {
    const body = parseBodyObject(req.body);
    if (!body) {
      res.status(400).json({ error: 'Cuerpo inválido. Envíe { rows: [...] } o { csv: "..." }.' });
      return;
    }

    let items: BatchInputItem[] = [];
    if (typeof body.csv === 'string') {
      const parsed = parseBatchCsv(body.csv);
      if (!parsed.ok) {
        res.status(400).json({ error: 'Error al leer el archivo CSV.', detalles: parsed.errors });
        return;
      }
      items = parsed.rows;
    } else if (Array.isArray(body.rows)) {
      items = body.rows as BatchInputItem[];
    } else {
      res.status(400).json({ error: 'Debe especificar "rows" (arreglo) o "csv" (texto CSV).' });
      return;
    }

    const result = predictBatchZones(items);
    if (!result.ok) {
      res.status(400).json({
        error: 'Error de validación en las filas del lote.',
        detalles: result.errors,
      });
      return;
    }

    res.status(200).json(result.batch);
  } catch {
    res.status(500).json({ error: 'Error interno al procesar el lote de zonas.' });
  }
}
