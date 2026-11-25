/**
 * Random Forest REAL de la Entrega 3, cargado desde `randomForestData.ts`.
 *
 * Ese archivo se generó a partir de `modelo_abandono.joblib` (Pipeline de scikit-learn:
 * SimpleImputer(median, add_indicator=True) + RandomForestRegressor de 400 árboles) con
 * `exportar_modelo.py`. No se reentrena nada: son los mismos árboles, umbrales y
 * valores de hoja que guardó el notebook, así que las predicciones coinciden con Python.
 */
import modelo from './randomForestData.ts';
import { FEATURE_KEYS } from './schema.ts';

interface ExportedTree {
  l: number[]; // hijo izquierdo (-1 = hoja)
  r: number[]; // hijo derecho
  f: number[]; // índice de la variable que se evalúa
  t: number[]; // umbral (x <= t va a la izquierda)
  v: number[]; // valor del nodo (predicción en escala log1p)
}

interface ExportedModel {
  fuente: string;
  variables: string[];
  medianas_imputacion: number[];
  indicadores_faltante: number[];
  n_features_modelo: number;
  umbral_alto_riesgo_pct: number;
  metricas_prueba: Record<string, number>;
  provincias_entrenamiento: string[];
  provincias_prueba: string[];
  hiperparametros: Record<string, number | string>;
  versiones: Record<string, string>;
  referencia_nacional_pred_pct: number[];
  trees: ExportedTree[];
}

const MODEL = modelo as unknown as ExportedModel;

// El modelo espera las variables en el orden de variables.json (el del notebook), que no es el
// mismo que FEATURE_KEYS en schema.ts. Este índice traduce de un orden al otro, por nombre.
const ORDEN_MODELO = MODEL.variables.map((v) => FEATURE_KEYS.indexOf(v as (typeof FEATURE_KEYS)[number]));
if (ORDEN_MODELO.some((i) => i < 0) || MODEL.variables.length !== FEATURE_KEYS.length) {
  throw new Error('randomForestData.ts no tiene las mismas 20 variables que FEATURE_KEYS.');
}

/** Paso 1 del Pipeline: imputar con la mediana de entrenamiento y agregar indicadores de faltante. */
function imputar(x: number[]): number[] {
  const out = x.map((v, i) => (Number.isFinite(v) ? v : MODEL.medianas_imputacion[i]));
  for (const i of MODEL.indicadores_faltante) {
    out.push(Number.isFinite(x[i]) ? 0 : 1);
  }
  return out;
}

/** Recorre un árbol. scikit-learn compara en float32, por eso Math.fround. */
function predecirArbol(tree: ExportedTree, x: number[]): number {
  let node = 0;
  while (tree.l[node] !== -1) {
    node = Math.fround(x[tree.f[node]]) <= tree.t[node] ? tree.l[node] : tree.r[node];
  }
  return tree.v[node];
}

/**
 * Predice una zona. `x` sigue el orden de FEATURE_KEYS (schema.ts); usar NaN para los datos faltantes.
 * Devuelve la predicción en escala log1p y la tasa en % (expm1 recortado a 0–100), igual que el notebook.
 */
export function predecirZona(x: number[]): { predLog: number; ratePct: number } {
  const xi = imputar(ORDEN_MODELO.map((i) => x[i]));
  let suma = 0;
  for (const tree of MODEL.trees) suma += predecirArbol(tree, xi);
  const predLog = suma / MODEL.trees.length;
  const ratePct = Math.min(100, Math.max(0, Math.expm1(predLog)));
  return { predLog, ratePct };
}

/** Percentil de una tasa estimada frente a las predicciones del modelo para las 1.136 zonas reales. */
export function percentilNacional(ratePct: number): number {
  const arr = MODEL.referencia_nacional_pred_pct;
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= ratePct) lo = mid + 1;
    else hi = mid;
  }
  return Math.round((lo / arr.length) * 100);
}

export const MODELO_INFO = {
  fuente: MODEL.fuente,
  nEstimators: MODEL.trees.length,
  minSamplesLeaf: Number(MODEL.hiperparametros.min_samples_leaf),
  maxFeaturesRatio: Number(MODEL.hiperparametros.max_features),
  zonasReferencia: MODEL.referencia_nacional_pred_pct.length,
  umbralAltoRiesgoPct: MODEL.umbral_alto_riesgo_pct,
  metricasPrueba: MODEL.metricas_prueba,
  provinciasEntrenamiento: MODEL.provincias_entrenamiento,
  provinciasPrueba: MODEL.provincias_prueba,
  versiones: MODEL.versiones,
  medianasImputacion: Object.fromEntries(MODEL.variables.map((k, i) => [k, MODEL.medianas_imputacion[i]])),
};
