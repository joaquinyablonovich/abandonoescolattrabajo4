import type { FeatureKey, FeatureVector } from './schema.ts';

export interface ProvinceCycleRecord {
  provincia: string;
  ciclo2022Pct: number;
  ciclo2023Pct: number;
  split: 'train' | 'test';
  zonasPrueba?: number;
  estimadaPruebaPct?: number;
  maePruebaPp?: number;
}

export interface ModelComparisonRow {
  variables: string;
  modelo: string;
  maePp: number;
  maeDesvio: number | null;
  r2Log: number;
  spearman: number | null;
  recallTop25: number | null;
  elegido?: boolean;
}

export interface ProvinceAblationRow {
  etiqueta: string;
  maePp: number;
  r2Log: number;
  spearman: number;
  recallTop25: number;
}

export interface PrioritizedZoneRecord {
  rank: number;
  provincia: string;
  departamento: string;
  sector: 'Estatal' | 'Privado';
  ambito: 'Urbano' | 'Rural';
  tasaEstimadaPct: number;
  tasaRealPct: number;
  esAltoRiesgoReal: boolean;
  errorAbsPp: number;
}

export interface DimensionErrorRow {
  dimension: 'provincia' | 'sector' | 'ambito';
  categoria: string;
  zonas: number;
  maePp: number;
}

export interface PermutationImportanceRow {
  variable: FeatureKey;
  label: string;
  grupo: 'Contexto 2023' | 'Matrícula 2023' | 'Ciclo anterior 2022';
  importanciaLog: number;
  desvio: number;
}

export interface HeatmapCell {
  provincia: string;
  tipoZona: 'Estatal rural' | 'Estatal urbano' | 'Privado urbano';
  realPct: number | null;
  estimadaPct: number | null;
}

export interface ZonePreset {
  id: string;
  nombre: string;
  provincia: string;
  departamento: string;
  sector: 'Estatal' | 'Privado';
  ambito: 'Urbano' | 'Rural';
  resumen: string;
  tasaRealReferenciaPct?: number;
  features: FeatureVector;
}

/**
 * Sección 4 del notebook: 24 jurisdicciones con tasa ponderada por matrícula expuesta (ciclo 2022 y ciclo 2023),
 * más resultados de evaluación en las 5 provincias reservadas para prueba (422 zonas).
 */
export const PROVINCE_RECORDS: ProvinceCycleRecord[] = [
  { provincia: 'Buenos Aires', ciclo2022Pct: 0.20, ciclo2023Pct: 0.18, split: 'test', zonasPrueba: 319, estimadaPruebaPct: 0.33, maePruebaPp: 0.277 },
  { provincia: 'Mendoza', ciclo2022Pct: 0.26, ciclo2023Pct: 0.21, split: 'train' },
  { provincia: 'San Luis', ciclo2022Pct: 0.27, ciclo2023Pct: 0.22, split: 'test', zonasPrueba: 18, estimadaPruebaPct: 0.45, maePruebaPp: 0.341 },
  { provincia: 'Ciudad de Buenos Aires', ciclo2022Pct: 0.28, ciclo2023Pct: 0.26, split: 'train' },
  { provincia: 'Río Negro', ciclo2022Pct: 0.28, ciclo2023Pct: 0.29, split: 'train' },
  { provincia: 'La Pampa', ciclo2022Pct: 0.42, ciclo2023Pct: 0.34, split: 'train' },
  { provincia: 'Tucumán', ciclo2022Pct: 0.47, ciclo2023Pct: 0.48, split: 'train' },
  { provincia: 'Tierra del Fuego', ciclo2022Pct: 0.15, ciclo2023Pct: 0.49, split: 'train' },
  { provincia: 'Chubut', ciclo2022Pct: 0.19, ciclo2023Pct: 0.54, split: 'train' },
  { provincia: 'Jujuy', ciclo2022Pct: 0.68, ciclo2023Pct: 0.60, split: 'train' },
  { provincia: 'Córdoba', ciclo2022Pct: 0.75, ciclo2023Pct: 0.64, split: 'train' },
  { provincia: 'La Rioja', ciclo2022Pct: 0.62, ciclo2023Pct: 0.70, split: 'test', zonasPrueba: 25, estimadaPruebaPct: 0.51, maePruebaPp: 0.521 },
  { provincia: 'Santiago del Estero', ciclo2022Pct: 0.72, ciclo2023Pct: 0.71, split: 'train' },
  { provincia: 'Neuquén', ciclo2022Pct: 0.76, ciclo2023Pct: 0.72, split: 'train' },
  { provincia: 'Corrientes', ciclo2022Pct: 0.81, ciclo2023Pct: 0.76, split: 'train' },
  { provincia: 'Santa Cruz', ciclo2022Pct: 0.52, ciclo2023Pct: 1.00, split: 'train' },
  { provincia: 'San Juan', ciclo2022Pct: 1.24, ciclo2023Pct: 1.24, split: 'train' },
  { provincia: 'Chaco', ciclo2022Pct: 1.16, ciclo2023Pct: 1.25, split: 'train' },
  { provincia: 'Catamarca', ciclo2022Pct: 1.49, ciclo2023Pct: 1.27, split: 'train' },
  { provincia: 'Entre Ríos', ciclo2022Pct: 1.36, ciclo2023Pct: 1.38, split: 'train' },
  { provincia: 'Santa Fe', ciclo2022Pct: 1.62, ciclo2023Pct: 1.55, split: 'train' },
  { provincia: 'Formosa', ciclo2022Pct: 1.47, ciclo2023Pct: 1.65, split: 'test', zonasPrueba: 20, estimadaPruebaPct: 1.15, maePruebaPp: 1.047 },
  { provincia: 'Salta', ciclo2022Pct: 1.81, ciclo2023Pct: 1.88, split: 'test', zonasPrueba: 40, estimadaPruebaPct: 1.41, maePruebaPp: 0.538 },
  { provincia: 'Misiones', ciclo2022Pct: 1.97, ciclo2023Pct: 2.23, split: 'train' },
];

export const DATASET_SUMMARY = {
  totalZonasOriginal: 1209,
  totalZonasValidas: 1136,
  medianaTasaPct: 0.39,
  mediaTasaPct: 0.81,
  umbralAltoRiesgoPct: 1.39,
  zonasEntrenamiento: 714,
  provinciasEntrenamiento: 19,
  zonasPrueba: 422,
  provinciasPrueba: 5,
  correlacionNoPromovidosVsRep2023: 0.977,
  correlacionNoPromovidosVsRep2024: 0.962,
  correlacionProvincialCiclos: 0.96,
  spearmanZonasCiclos: 0.77,
  umbralFijoPrueba: {
    accuracy: 0.90,
    precision: 0.52,
    recall: 0.50,
    f1: 0.51,
  },
};

export const CV_COMPARISON: ModelComparisonRow[] = [
  { variables: '—', modelo: 'Línea base (mediana)', maePp: 0.771, maeDesvio: 0.231, r2Log: -0.097, spearman: null, recallTop25: null },
  { variables: 'A. Contexto 2023', modelo: 'Ridge', maePp: 0.780, maeDesvio: 0.222, r2Log: -0.111, spearman: 0.316, recallTop25: 0.357 },
  { variables: 'A. Contexto 2023', modelo: 'Random Forest', maePp: 0.714, maeDesvio: 0.194, r2Log: 0.059, spearman: 0.412, recallTop25: 0.371 },
  { variables: 'A. Contexto 2023', modelo: 'Gradient Boosting', maePp: 0.732, maeDesvio: 0.182, r2Log: 0.008, spearman: 0.388, recallTop25: 0.348 },
  { variables: 'B. + Matrícula 2023', modelo: 'Ridge', maePp: 0.764, maeDesvio: 0.205, r2Log: -0.082, spearman: 0.384, recallTop25: 0.425 },
  { variables: 'B. + Matrícula 2023', modelo: 'Random Forest', maePp: 0.691, maeDesvio: 0.187, r2Log: 0.120, spearman: 0.493, recallTop25: 0.435 },
  { variables: 'B. + Matrícula 2023', modelo: 'Gradient Boosting', maePp: 0.721, maeDesvio: 0.173, r2Log: 0.050, spearman: 0.441, recallTop25: 0.433 },
  { variables: 'C. + Abandono ciclo 2022', modelo: 'Ridge', maePp: 0.670, maeDesvio: 0.265, r2Log: 0.228, spearman: 0.633, recallTop25: 0.631 },
  { variables: 'C. + Abandono ciclo 2022', modelo: 'Random Forest', maePp: 0.523, maeDesvio: 0.139, r2Log: 0.454, spearman: 0.712, recallTop25: 0.647, elegido: true },
  { variables: 'C. + Abandono ciclo 2022', modelo: 'Gradient Boosting', maePp: 0.536, maeDesvio: 0.133, r2Log: 0.437, spearman: 0.701, recallTop25: 0.610 },
];

export const TEST_COMPARISON: ModelComparisonRow[] = [
  { variables: '—', modelo: 'Línea base (mediana)', maePp: 0.602, maeDesvio: null, r2Log: -0.176, spearman: null, recallTop25: null },
  { variables: 'A. Contexto 2023', modelo: 'Random Forest · solo contexto', maePp: 0.585, maeDesvio: null, r2Log: -0.151, spearman: 0.423, recallTop25: 0.522 },
  { variables: 'C. + Abandono ciclo 2022', modelo: 'Random Forest · modelo final', maePp: 0.355, maeDesvio: null, r2Log: 0.517, spearman: 0.693, recallTop25: 0.870, elegido: true },
];

export const PROVINCE_ABLATION: ProvinceAblationRow[] = [
  { etiqueta: 'Sin variables provinciales (Modelo elegido)', maePp: 0.523, r2Log: 0.454, spearman: 0.712, recallTop25: 0.647 },
  { etiqueta: 'Con variables provinciales (desempleo, salario, región)', maePp: 0.533, r2Log: 0.442, spearman: 0.708, recallTop25: 0.641 },
];

export const TOP_PRIORITIZED_ZONES: PrioritizedZoneRecord[] = [
  { rank: 1, provincia: 'Formosa', departamento: 'RAMÓN LISTA', sector: 'Estatal', ambito: 'Rural', tasaEstimadaPct: 2.54, tasaRealPct: 7.19, esAltoRiesgoReal: true, errorAbsPp: 4.66 },
  { rank: 2, provincia: 'Formosa', departamento: 'PATIÑO', sector: 'Estatal', ambito: 'Rural', tasaEstimadaPct: 2.53, tasaRealPct: 4.63, esAltoRiesgoReal: true, errorAbsPp: 2.10 },
  { rank: 3, provincia: 'Formosa', departamento: 'BERMEJO', sector: 'Estatal', ambito: 'Rural', tasaEstimadaPct: 2.34, tasaRealPct: 5.35, esAltoRiesgoReal: true, errorAbsPp: 3.02 },
  { rank: 4, provincia: 'Salta', departamento: 'RIVADAVIA', sector: 'Estatal', ambito: 'Rural', tasaEstimadaPct: 2.32, tasaRealPct: 3.15, esAltoRiesgoReal: true, errorAbsPp: 0.83 },
  { rank: 5, provincia: 'Salta', departamento: 'GENERAL JOSÉ DE SAN MARTÍN', sector: 'Estatal', ambito: 'Rural', tasaEstimadaPct: 2.23, tasaRealPct: 3.85, esAltoRiesgoReal: true, errorAbsPp: 1.62 },
  { rank: 6, provincia: 'Salta', departamento: 'GENERAL GÜEMES', sector: 'Estatal', ambito: 'Rural', tasaEstimadaPct: 2.21, tasaRealPct: 1.35, esAltoRiesgoReal: false, errorAbsPp: 0.86 },
  { rank: 7, provincia: 'Formosa', departamento: 'PIRANÉ', sector: 'Estatal', ambito: 'Rural', tasaEstimadaPct: 2.18, tasaRealPct: 1.83, esAltoRiesgoReal: true, errorAbsPp: 0.35 },
  { rank: 8, provincia: 'Salta', departamento: 'RIVADAVIA', sector: 'Estatal', ambito: 'Urbano', tasaEstimadaPct: 2.06, tasaRealPct: 4.03, esAltoRiesgoReal: true, errorAbsPp: 1.97 },
  { rank: 9, provincia: 'Salta', departamento: 'CAFAYATE', sector: 'Estatal', ambito: 'Urbano', tasaEstimadaPct: 2.04, tasaRealPct: 3.27, esAltoRiesgoReal: true, errorAbsPp: 1.23 },
  { rank: 10, provincia: 'Buenos Aires', departamento: 'RIVADAVIA', sector: 'Estatal', ambito: 'Urbano', tasaEstimadaPct: 1.99, tasaRealPct: 0.98, esAltoRiesgoReal: false, errorAbsPp: 1.01 },
  { rank: 11, provincia: 'Buenos Aires', departamento: 'TRES LOMAS', sector: 'Estatal', ambito: 'Rural', tasaEstimadaPct: 1.98, tasaRealPct: 0.53, esAltoRiesgoReal: false, errorAbsPp: 1.45 },
  { rank: 12, provincia: 'Formosa', departamento: 'PILAGÁS', sector: 'Estatal', ambito: 'Urbano', tasaEstimadaPct: 1.94, tasaRealPct: 1.36, esAltoRiesgoReal: false, errorAbsPp: 0.58 },
  { rank: 13, provincia: 'Salta', departamento: 'ORÁN', sector: 'Estatal', ambito: 'Urbano', tasaEstimadaPct: 1.87, tasaRealPct: 2.29, esAltoRiesgoReal: true, errorAbsPp: 0.42 },
  { rank: 14, provincia: 'Buenos Aires', departamento: 'GENERAL PAZ', sector: 'Estatal', ambito: 'Urbano', tasaEstimadaPct: 1.87, tasaRealPct: 0.00, esAltoRiesgoReal: false, errorAbsPp: 1.87 },
  { rank: 15, provincia: 'Salta', departamento: 'SANTA VICTORIA', sector: 'Estatal', ambito: 'Rural', tasaEstimadaPct: 1.85, tasaRealPct: 1.50, esAltoRiesgoReal: true, errorAbsPp: 0.35 },
];

export const HIGHEST_ERROR_ZONES: PrioritizedZoneRecord[] = [
  TOP_PRIORITIZED_ZONES[0],
  TOP_PRIORITIZED_ZONES[2],
  { rank: 16, provincia: 'Formosa', departamento: 'MATACOS', sector: 'Estatal', ambito: 'Rural', tasaEstimadaPct: 1.11, tasaRealPct: 3.95, esAltoRiesgoReal: true, errorAbsPp: 2.83 },
  TOP_PRIORITIZED_ZONES[1],
  TOP_PRIORITIZED_ZONES[7],
  { rank: 17, provincia: 'Formosa', departamento: 'FORMOSA', sector: 'Estatal', ambito: 'Rural', tasaEstimadaPct: 1.55, tasaRealPct: 3.49, esAltoRiesgoReal: true, errorAbsPp: 1.94 },
  { rank: 18, provincia: 'La Rioja', departamento: 'CHAMICAL', sector: 'Estatal', ambito: 'Rural', tasaEstimadaPct: 1.81, tasaRealPct: 3.74, esAltoRiesgoReal: true, errorAbsPp: 1.93 },
  TOP_PRIORITIZED_ZONES[13],
];

export const DIMENSION_ERRORS: DimensionErrorRow[] = [
  { dimension: 'provincia', categoria: 'Buenos Aires', zonas: 319, maePp: 0.277 },
  { dimension: 'provincia', categoria: 'San Luis', zonas: 18, maePp: 0.341 },
  { dimension: 'provincia', categoria: 'La Rioja', zonas: 25, maePp: 0.521 },
  { dimension: 'provincia', categoria: 'Salta', zonas: 40, maePp: 0.538 },
  { dimension: 'provincia', categoria: 'Formosa', zonas: 20, maePp: 1.047 },
  { dimension: 'sector', categoria: 'Estatal', zonas: 324, maePp: 0.427 },
  { dimension: 'sector', categoria: 'Privado', zonas: 98, maePp: 0.117 },
  { dimension: 'ambito', categoria: 'Rural', zonas: 158, maePp: 0.525 },
  { dimension: 'ambito', categoria: 'Urbano', zonas: 264, maePp: 0.254 },
];

export const PERMUTATION_IMPORTANCE: PermutationImportanceRow[] = [
  { variable: 'tasa_abandono_2022', label: 'Abandono ciclo anterior (2022)', grupo: 'Ciclo anterior 2022', importanciaLog: 0.0958, desvio: 0.0075 },
  { variable: 'tasa_abandono_2022_sec', label: 'Abandono secundaria 2022', grupo: 'Ciclo anterior 2022', importanciaLog: 0.0209, desvio: 0.0021 },
  { variable: 'pct_sobreedad_2023', label: 'Sobreedad inicio 2023', grupo: 'Matrícula 2023', importanciaLog: 0.0044, desvio: 0.0010 },
  { variable: 'appri_pct_sin_internet', label: 'Hogares sin internet', grupo: 'Contexto 2023', importanciaLog: 0.0044, desvio: 0.0009 },
  { variable: 'appri_pct_nse_bajo', label: 'NSE bajo (Aprender Prim.)', grupo: 'Contexto 2023', importanciaLog: 0.0028, desvio: 0.0006 },
  { variable: 'appri_pct_madre_sin_sec', label: 'Madre sin secundario', grupo: 'Contexto 2023', importanciaLog: 0.0019, desvio: 0.0005 },
  { variable: 'car_sec_pct_hs_vacantes', label: 'Horas vacantes secundaria', grupo: 'Contexto 2023', importanciaLog: 0.0017, desvio: 0.0004 },
  { variable: 'pob_tasa_indigena_prim_sec', label: 'Pueblos originarios', grupo: 'Contexto 2023', importanciaLog: 0.0010, desvio: 0.0002 },
  { variable: 'pct_mujeres', label: 'Participación de mujeres', grupo: 'Contexto 2023', importanciaLog: 0.0007, desvio: 0.0003 },
  { variable: 'pct_repitentes_2023', label: 'Repitentes inicio 2023', grupo: 'Matrícula 2023', importanciaLog: 0.0006, desvio: 0.0007 },
  { variable: 'pob_tasa_discapacidad_prim_sec', label: 'Alumnos con discapacidad', grupo: 'Contexto 2023', importanciaLog: 0.0004, desvio: 0.0004 },
  { variable: 'sector_privado', label: 'Sector privado', grupo: 'Contexto 2023', importanciaLog: 0.0004, desvio: 0.0000 },
];

export const HEATMAP_TEST_MATRIX: HeatmapCell[] = [
  { provincia: 'Salta', tipoZona: 'Estatal rural', realPct: 2.29, estimadaPct: 1.72 },
  { provincia: 'Salta', tipoZona: 'Estatal urbano', realPct: 2.12, estimadaPct: 1.59 },
  { provincia: 'Salta', tipoZona: 'Privado urbano', realPct: 0.37, estimadaPct: 0.28 },
  { provincia: 'Formosa', tipoZona: 'Estatal rural', realPct: 4.09, estimadaPct: 2.09 },
  { provincia: 'Formosa', tipoZona: 'Estatal urbano', realPct: 1.12, estimadaPct: 0.99 },
  { provincia: 'Formosa', tipoZona: 'Privado urbano', realPct: 0.39, estimadaPct: 0.34 },
  { provincia: 'La Rioja', tipoZona: 'Estatal rural', realPct: 1.23, estimadaPct: 0.77 },
  { provincia: 'La Rioja', tipoZona: 'Estatal urbano', realPct: 0.63, estimadaPct: 0.53 },
  { provincia: 'La Rioja', tipoZona: 'Privado urbano', realPct: 0.52, estimadaPct: 0.14 },
  { provincia: 'San Luis', tipoZona: 'Estatal rural', realPct: 0.35, estimadaPct: 0.65 },
  { provincia: 'San Luis', tipoZona: 'Estatal urbano', realPct: 0.21, estimadaPct: 0.45 },
  { provincia: 'San Luis', tipoZona: 'Privado urbano', realPct: 0.12, estimadaPct: 0.18 },
  { provincia: 'Buenos Aires', tipoZona: 'Estatal rural', realPct: 0.27, estimadaPct: 0.47 },
  { provincia: 'Buenos Aires', tipoZona: 'Estatal urbano', realPct: 0.24, estimadaPct: 0.43 },
  { provincia: 'Buenos Aires', tipoZona: 'Privado urbano', realPct: 0.03, estimadaPct: 0.12 },
];

/**
 * Zonas representativas listas para probar en el Evaluador de Zona y en el Lote de Ejemplo
 */
export const ZONE_PRESETS: ZonePreset[] = [
  {
    id: 'ramon-lista-rural',
    nombre: 'Ramón Lista · Estatal Rural (Formosa)',
    provincia: 'Formosa',
    departamento: 'RAMÓN LISTA',
    sector: 'Estatal',
    ambito: 'Rural',
    resumen: 'Zona prioritaria #1 en provincias de prueba: alta ruralidad, población originaria, vulnerabilidad socioeconómica y persistencia histórica.',
    tasaRealReferenciaPct: 7.19,
    features: {
      sector_privado: 0.0,
      ambito_rural: 1.0,
      es_conurbano: 0.0,
      log_matricula_inicial: 3.7202,
      pct_matricula_8a12: 0.2931,
      pct_mujeres: 0.4903,
      appri_pct_nse_bajo: 0.7568,
      appri_pct_madre_sin_sec: 0.7177,
      appri_pct_sin_internet: 0.511,
      appri_pct_sin_agua_potable: 0.3276,
      car_pri_pct_cargos_vacantes: 0.0099,
      car_sec_pct_hs_vacantes: 0.0,
      car_sec_pct_hs_fuera_planta: 0.0,
      pob_tasa_alumnos_con_almuerzo: 0.9133,
      pob_tasa_discapacidad_prim_sec: 0.0044,
      pob_tasa_indigena_prim_sec: 0.657,
      pct_sobreedad_2023: 0.3881,
      pct_repitentes_2023: 0.1354,
      tasa_abandono_2022: 4.186,
      tasa_abandono_2022_sec: 9.1837,
    },
  },
  {
    id: 'oran-urbano',
    nombre: 'Orán · Estatal Urbano (Salta)',
    provincia: 'Salta',
    departamento: 'ORÁN',
    sector: 'Estatal',
    ambito: 'Urbano',
    resumen: 'Cabecera departamental urbana con alta matrícula secundaria, sobreedad elevada y riesgo crítico sostenido.',
    tasaRealReferenciaPct: 2.29,
    features: {
      sector_privado: 0.0,
      ambito_rural: 0.0,
      es_conurbano: 0.0,
      log_matricula_inicial: 4.5375,
      pct_matricula_8a12: 0.3856,
      pct_mujeres: 0.4892,
      appri_pct_nse_bajo: 0.2731,
      appri_pct_madre_sin_sec: 0.4125,
      appri_pct_sin_internet: 0.2829,
      appri_pct_sin_agua_potable: 0.1694,
      car_pri_pct_cargos_vacantes: 0.0016,
      car_sec_pct_hs_vacantes: 0.0014,
      car_sec_pct_hs_fuera_planta: 0.0258,
      pob_tasa_alumnos_con_almuerzo: 0.2121,
      pob_tasa_discapacidad_prim_sec: 0.0275,
      pob_tasa_indigena_prim_sec: 0.013,
      pct_sobreedad_2023: 0.1865,
      pct_repitentes_2023: 0.0576,
      tasa_abandono_2022: 3.0345,
      tasa_abandono_2022_sec: 7.7152,
    },
  },
  {
    id: 'chamical-rural',
    nombre: 'Chamical · Estatal Rural (La Rioja)',
    provincia: 'La Rioja',
    departamento: 'CHAMICAL',
    sector: 'Estatal',
    ambito: 'Rural',
    resumen: 'Departamento rural con baja escala de matrícula, vacantes docentes y riesgo por encima del umbral P75.',
    tasaRealReferenciaPct: 3.74,
    features: {
      sector_privado: 0.0,
      ambito_rural: 1.0,
      es_conurbano: 0.0,
      log_matricula_inicial: 2.3181,
      pct_matricula_8a12: 0.1298,
      pct_mujeres: 0.476,
      appri_pct_nse_bajo: 0.1818,
      appri_pct_madre_sin_sec: 0.3409,
      appri_pct_sin_internet: 0.2273,
      appri_pct_sin_agua_potable: 0.0455,
      car_pri_pct_cargos_vacantes: 0.0476,
      car_sec_pct_hs_vacantes: 0.0,
      car_sec_pct_hs_fuera_planta: 0.0,
      pob_tasa_alumnos_con_almuerzo: 0.9663,
      pob_tasa_discapacidad_prim_sec: 0.0096,
      pob_tasa_indigena_prim_sec: 0.0,
      pct_sobreedad_2023: 0.2344,
      pct_repitentes_2023: 0.0431,
      tasa_abandono_2022: 2.6432,
      tasa_abandono_2022_sec: 6.6667,
    },
  },
  {
    id: 'la-matanza-conurbano',
    nombre: 'La Matanza · Estatal Urbano (Conurbano)',
    provincia: 'Buenos Aires',
    departamento: 'LA MATANZA',
    sector: 'Estatal',
    ambito: 'Urbano',
    resumen: 'Zona de altísimo volumen de matrícula en el Conurbano Bonaerense: tasa porcentual moderada pero impacto nominal alto.',
    tasaRealReferenciaPct: 0.25,
    features: {
      sector_privado: 0.0,
      ambito_rural: 0.0,
      es_conurbano: 1.0,
      log_matricula_inicial: 5.3486,
      pct_matricula_8a12: 0.4062,
      pct_mujeres: 0.4865,
      appri_pct_nse_bajo: 0.1739,
      appri_pct_madre_sin_sec: 0.4245,
      appri_pct_sin_internet: 0.0578,
      appri_pct_sin_agua_potable: 0.1175,
      car_pri_pct_cargos_vacantes: 0.0235,
      car_sec_pct_hs_vacantes: 0.0032,
      car_sec_pct_hs_fuera_planta: 0.0,
      pob_tasa_alumnos_con_almuerzo: 0.4048,
      pob_tasa_discapacidad_prim_sec: 0.0114,
      pob_tasa_indigena_prim_sec: 0.0,
      pct_sobreedad_2023: 0.1387,
      pct_repitentes_2023: 0.0442,
      tasa_abandono_2022: 0.2229,
      tasa_abandono_2022_sec: 0.3417,
    },
  },
  {
    id: 'san-isidro-privado',
    nombre: 'San Isidro · Privado Urbano (Conurbano)',
    provincia: 'Buenos Aires',
    departamento: 'SAN ISIDRO',
    sector: 'Privado',
    ambito: 'Urbano',
    resumen: 'Zona urbana de gestión privada con plena conectividad, baja sobreedad y mínimo riesgo de desvinculación.',
    tasaRealReferenciaPct: 0.01,
    features: {
      sector_privado: 1.0,
      ambito_rural: 0.0,
      es_conurbano: 1.0,
      log_matricula_inicial: 4.5114,
      pct_matricula_8a12: 0.4352,
      pct_mujeres: 0.497,
      appri_pct_nse_bajo: 0.044,
      appri_pct_madre_sin_sec: 0.1081,
      appri_pct_sin_internet: 0.0077,
      appri_pct_sin_agua_potable: 0.0587,
      car_pri_pct_cargos_vacantes: 0.0,
      car_sec_pct_hs_vacantes: 0.0,
      car_sec_pct_hs_fuera_planta: 0.0135,
      pob_tasa_alumnos_con_almuerzo: 0.023,
      pob_tasa_discapacidad_prim_sec: 0.0161,
      pob_tasa_indigena_prim_sec: 0.0,
      pct_sobreedad_2023: 0.0272,
      pct_repitentes_2023: 0.0075,
      tasa_abandono_2022: 0.0474,
      tasa_abandono_2022_sec: 0.0347,
    },
  },
];

/**
 * 5 filas equivalentes a modelo_entrega3/ejemplo_entrada.csv (sección 10 del notebook)
 */
export const SAMPLE_BATCH_ROWS: Array<{
  zonaId: string;
  provincia: string;
  departamento: string;
  sector: 'Estatal' | 'Privado';
  ambito: 'Urbano' | 'Rural';
} & FeatureVector> = [
  {
    zonaId: 'BA-MORON-EST-URB',
    provincia: 'Buenos Aires',
    departamento: 'MORÓN',
    sector: 'Estatal',
    ambito: 'Urbano',
    sector_privado: 0.0,
    ambito_rural: 0.0,
    es_conurbano: 1.0,
    log_matricula_inicial: 4.5002,
    pct_matricula_8a12: 0.4844,
    pct_mujeres: 0.4585,
    appri_pct_nse_bajo: 0.1069,
    appri_pct_madre_sin_sec: 0.3377,
    appri_pct_sin_internet: 0.03,
    appri_pct_sin_agua_potable: 0.0975,
    car_pri_pct_cargos_vacantes: 0.0021,
    car_sec_pct_hs_vacantes: 0.0056,
    car_sec_pct_hs_fuera_planta: 0.0,
    pob_tasa_alumnos_con_almuerzo: 0.1871,
    pob_tasa_discapacidad_prim_sec: 0.0272,
    pob_tasa_indigena_prim_sec: 0.0,
    pct_sobreedad_2023: 0.1572,
    pct_repitentes_2023: 0.0569,
    tasa_abandono_2022: 0.6281,
    tasa_abandono_2022_sec: 1.1231,
  },
  {
    zonaId: 'SL-PEDERNERA-EST-URB',
    provincia: 'San Luis',
    departamento: 'GENERAL PEDERNERA',
    sector: 'Estatal',
    ambito: 'Urbano',
    sector_privado: 0.0,
    ambito_rural: 0.0,
    es_conurbano: 0.0,
    log_matricula_inicial: 4.3478,
    pct_matricula_8a12: 0.386,
    pct_mujeres: 0.4977,
    appri_pct_nse_bajo: 0.1402,
    appri_pct_madre_sin_sec: 0.3074,
    appri_pct_sin_internet: 0.0544,
    appri_pct_sin_agua_potable: 0.0831,
    car_pri_pct_cargos_vacantes: 0.0109,
    car_sec_pct_hs_vacantes: 0.0455,
    car_sec_pct_hs_fuera_planta: 0.0078,
    pob_tasa_alumnos_con_almuerzo: 0.2427,
    pob_tasa_discapacidad_prim_sec: 0.0472,
    pob_tasa_indigena_prim_sec: 0.0,
    pct_sobreedad_2023: 0.1757,
    pct_repitentes_2023: 0.0507,
    tasa_abandono_2022: 0.2095,
    tasa_abandono_2022_sec: 0.3962,
  },
  {
    zonaId: 'BA-VICENTE-PRI-URB',
    provincia: 'Buenos Aires',
    departamento: 'VICENTE LÓPEZ',
    sector: 'Privado',
    ambito: 'Urbano',
    sector_privado: 1.0,
    ambito_rural: 0.0,
    es_conurbano: 1.0,
    log_matricula_inicial: 4.4416,
    pct_matricula_8a12: 0.4241,
    pct_mujeres: 0.5002,
    appri_pct_nse_bajo: 0.0616,
    appri_pct_madre_sin_sec: 0.0843,
    appri_pct_sin_internet: 0.0049,
    appri_pct_sin_agua_potable: 0.0472,
    car_pri_pct_cargos_vacantes: 0.0016,
    car_sec_pct_hs_vacantes: 0.001,
    car_sec_pct_hs_fuera_planta: 0.0122,
    pob_tasa_alumnos_con_almuerzo: 0.0145,
    pob_tasa_discapacidad_prim_sec: 0.0172,
    pob_tasa_indigena_prim_sec: 0.0,
    pct_sobreedad_2023: 0.0402,
    pct_repitentes_2023: 0.0091,
    tasa_abandono_2022: 0.0587,
    tasa_abandono_2022_sec: 0.0759,
  },
  {
    zonaId: 'LR-CHILECITO-EST-RUR',
    provincia: 'La Rioja',
    departamento: 'CHILECITO',
    sector: 'Estatal',
    ambito: 'Rural',
    sector_privado: 0.0,
    ambito_rural: 1.0,
    es_conurbano: 0.0,
    log_matricula_inicial: 3.2125,
    pct_matricula_8a12: 0.4427,
    pct_mujeres: 0.488,
    appri_pct_nse_bajo: 0.226,
    appri_pct_madre_sin_sec: 0.4499,
    appri_pct_sin_internet: 0.102,
    appri_pct_sin_agua_potable: 0.069,
    car_pri_pct_cargos_vacantes: 0.0,
    car_sec_pct_hs_vacantes: 0.0083,
    car_sec_pct_hs_fuera_planta: 0.0,
    pob_tasa_alumnos_con_almuerzo: 0.3191,
    pob_tasa_discapacidad_prim_sec: 0.007,
    pob_tasa_indigena_prim_sec: 0.0,
    pct_sobreedad_2023: 0.1222,
    pct_repitentes_2023: 0.0104,
    tasa_abandono_2022: 0.9821,
    tasa_abandono_2022_sec: 1.7473,
  },
  {
    zonaId: 'SA-METAN-EST-URB',
    provincia: 'Salta',
    departamento: 'METÁN',
    sector: 'Estatal',
    ambito: 'Urbano',
    sector_privado: 0.0,
    ambito_rural: 0.0,
    es_conurbano: 0.0,
    log_matricula_inicial: 3.839,
    pct_matricula_8a12: 0.406,
    pct_mujeres: 0.4964,
    appri_pct_nse_bajo: 0.1977,
    appri_pct_madre_sin_sec: 0.3291,
    appri_pct_sin_internet: 0.0671,
    appri_pct_sin_agua_potable: 0.0933,
    car_pri_pct_cargos_vacantes: 0.0171,
    car_sec_pct_hs_vacantes: 0.0,
    car_sec_pct_hs_fuera_planta: 0.0003,
    pob_tasa_alumnos_con_almuerzo: 0.1913,
    pob_tasa_discapacidad_prim_sec: 0.0215,
    pob_tasa_indigena_prim_sec: 0.0088,
    pct_sobreedad_2023: 0.1859,
    pct_repitentes_2023: 0.034,
    tasa_abandono_2022: 1.6068,
    tasa_abandono_2022_sec: 3.9014,
  },
];
