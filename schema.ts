import { getProvinceReference, type ProvinceReference } from './provinces.ts';

export type FeatureGroup = 'contexto' | 'matricula' | 'ciclo_anterior';

export type FeatureKind = 'binary' | 'proportion' | 'percentage' | 'log_enrollment';

export interface FeatureSpec {
  key: FeatureKey;
  label: string;
  shortLabel: string;
  group: FeatureGroup;
  kind: FeatureKind;
  unit: string;
  description: string;
  median: number;
  min: number;
  max: number;
  step: number;
  uiAsPercent?: boolean;
}

export const FEATURE_KEYS = [
  'sector_privado',
  'ambito_rural',
  'es_conurbano',
  'log_matricula_inicial',
  'pct_matricula_8a12',
  'pct_mujeres',
  'appri_pct_nse_bajo',
  'appri_pct_madre_sin_sec',
  'appri_pct_sin_internet',
  'appri_pct_sin_agua_potable',
  'car_pri_pct_cargos_vacantes',
  'car_sec_pct_hs_vacantes',
  'car_sec_pct_hs_fuera_planta',
  'pob_tasa_alumnos_con_almuerzo',
  'pob_tasa_discapacidad_prim_sec',
  'pob_tasa_indigena_prim_sec',
  'tasa_abandono_2022',
  'tasa_abandono_2022_sec',
  'pct_sobreedad_2023',
  'pct_repitentes_2023',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type FeatureVector = Record<FeatureKey, number>;

export type RawFeatureInput = Partial<Record<FeatureKey, number | null | undefined>> & {
  provincia?: string;
  departamento?: string;
  sector?: 'Estatal' | 'Privado' | string;
  ambito?: 'Urbano' | 'Rural' | string;
  matricula_inicial?: number;
  entrados?: number;
  matricula_8a12?: number;
  matricula_mujeres?: number;
  salidos_sin_pase_2022?: number;
  matricula_expuesta_2022?: number;
  salidos_sin_pase_2022_sec?: number;
  matricula_expuesta_2022_sec?: number;
  alumnos_sobreedad?: number;
  alumnos_repitentes?: number;
  usarReferenciaProvincial?: boolean;
};

export const HIGH_RISK_THRESHOLD_PCT = 1.39; // P75 del conjunto de entrenamiento (19 provincias); medianas = SimpleImputer del Pipeline
export const MIN_EXPOSED_ENROLLMENT = 100;

export const FEATURE_SPECS: FeatureSpec[] = [
  {
    key: 'tasa_abandono_2022',
    label: 'Tasa de abandono ciclo anterior (2022)',
    shortLabel: 'Abandono 2022 (%)',
    group: 'ciclo_anterior',
    kind: 'percentage',
    unit: '% (0–100)',
    description: 'Salidos sin pase sobre matrícula expuesta (1° a 12°) en el ciclo lectivo previo.',
    median: 0.7022,
    min: 0,
    max: 25,
    step: 0.05,
  },
  {
    key: 'tasa_abandono_2022_sec',
    label: 'Tasa de abandono secundaria ciclo anterior (2022)',
    shortLabel: 'Abandono sec. 2022 (%)',
    group: 'ciclo_anterior',
    kind: 'percentage',
    unit: '% (0–100)',
    description: 'Tasa de abandono específica de años 8° a 12° en el ciclo anterior.',
    median: 1.5199,
    min: 0,
    max: 35,
    step: 0.05,
  },
  {
    key: 'pct_sobreedad_2023',
    label: 'Alumnos con sobreedad al inicio del ciclo',
    shortLabel: 'Sobreedad al inicio',
    group: 'matricula',
    kind: 'proportion',
    unit: 'Proporción 0–1',
    description: 'Proporción de matrícula con edad superior a la teórica del grado/año al comenzar el ciclo.',
    median: 0.1174,
    min: 0,
    max: 0.85,
    step: 0.01,
    uiAsPercent: true,
  },
  {
    key: 'pct_repitentes_2023',
    label: 'Alumnos repitentes al inicio del ciclo',
    shortLabel: 'Repitentes al inicio',
    group: 'matricula',
    kind: 'proportion',
    unit: 'Proporción 0–1',
    description: 'Proporción de estudiantes recursantes registrados en Matrícula al inicio del ciclo.',
    median: 0.036,
    min: 0,
    max: 0.5,
    step: 0.005,
    uiAsPercent: true,
  },
  {
    key: 'sector_privado',
    label: 'Sector de gestión privado',
    shortLabel: 'Sector privado',
    group: 'contexto',
    kind: 'binary',
    unit: '0 = Estatal / 1 = Privado',
    description: 'Indicador binario del sector educativo de la zona (Estatal = 0, Privado = 1).',
    median: 0.0,
    min: 0,
    max: 1,
    step: 1,
  },
  {
    key: 'ambito_rural',
    label: 'Ámbito rural',
    shortLabel: 'Ámbito rural',
    group: 'contexto',
    kind: 'binary',
    unit: '0 = Urbano / 1 = Rural',
    description: 'Indicador binario del ámbito geográfico de los establecimientos de la zona.',
    median: 0.0,
    min: 0,
    max: 1,
    step: 1,
  },
  {
    key: 'es_conurbano',
    label: 'Pertenece al Conurbano Bonaerense',
    shortLabel: 'Conurbano',
    group: 'contexto',
    kind: 'binary',
    unit: '0 / 1',
    description: 'Indicador territorial de partidos del Gran Buenos Aires.',
    median: 0.0,
    min: 0,
    max: 1,
    step: 1,
  },
  {
    key: 'log_matricula_inicial',
    label: 'Tamaño de matrícula inicial (log10)',
    shortLabel: 'Log10 matrícula',
    group: 'contexto',
    kind: 'log_enrollment',
    unit: 'log10(alumnos)',
    description: 'Logaritmo decimal de la matrícula inicial de la zona (ej. 1.000 alumnos = 3,00).',
    median: 3.419,
    min: 2.0,
    max: 5.5,
    step: 0.05,
  },
  {
    key: 'pct_matricula_8a12',
    label: 'Participación de secundaria (8° a 12°)',
    shortLabel: 'Peso secundaria',
    group: 'contexto',
    kind: 'proportion',
    unit: 'Proporción 0–1',
    description: 'Proporción de la matrícula inicial concentrada en el nivel secundario (años 8° a 12°).',
    median: 0.3776,
    min: 0,
    max: 1,
    step: 0.01,
    uiAsPercent: true,
  },
  {
    key: 'pct_mujeres',
    label: 'Proporción de estudiantes mujeres',
    shortLabel: 'Participación mujeres',
    group: 'contexto',
    kind: 'proportion',
    unit: 'Proporción 0–1',
    description: 'Participación femenina sobre la matrícula inicial de 1° a 12°.',
    median: 0.495,
    min: 0.2,
    max: 0.8,
    step: 0.01,
    uiAsPercent: true,
  },
  {
    key: 'appri_pct_nse_bajo',
    label: 'Nivel socioeconómico bajo (Aprender Primaria)',
    shortLabel: 'NSE bajo (Aprender)',
    group: 'contexto',
    kind: 'proportion',
    unit: 'Proporción 0–1',
    description: 'Proporción de hogares en el estrato de NSE bajo relevado en Aprender Primaria.',
    median: 0.1549,
    min: 0,
    max: 1,
    step: 0.01,
    uiAsPercent: true,
  },
  {
    key: 'appri_pct_madre_sin_sec',
    label: 'Madre sin secundario completo',
    shortLabel: 'Madre sin secundario',
    group: 'contexto',
    kind: 'proportion',
    unit: 'Proporción 0–1',
    description: 'Proporción de estudiantes cuya madre no completó el nivel secundario.',
    median: 0.3963,
    min: 0,
    max: 1,
    step: 0.01,
    uiAsPercent: true,
  },
  {
    key: 'appri_pct_sin_internet',
    label: 'Hogares sin conexión a internet',
    shortLabel: 'Hogares sin internet',
    group: 'contexto',
    kind: 'proportion',
    unit: 'Proporción 0–1',
    description: 'Proporción de alumnos sin conectividad domiciliaria según Aprender Primaria.',
    median: 0.0996,
    min: 0,
    max: 1,
    step: 0.01,
    uiAsPercent: true,
  },
  {
    key: 'appri_pct_sin_agua_potable',
    label: 'Hogares sin agua potable',
    shortLabel: 'Sin agua potable',
    group: 'contexto',
    kind: 'proportion',
    unit: 'Proporción 0–1',
    description: 'Proporción de alumnos sin acceso a red de agua potable en el hogar.',
    median: 0.0837,
    min: 0,
    max: 1,
    step: 0.01,
    uiAsPercent: true,
  },
  {
    key: 'car_pri_pct_cargos_vacantes',
    label: 'Cargos docentes vacantes en primaria',
    shortLabel: 'Cargos vacantes prim.',
    group: 'contexto',
    kind: 'proportion',
    unit: 'Proporción 0–1',
    description: 'Proporción de cargos sin cubrir en nivel primario.',
    median: 0.0,
    min: 0,
    max: 0.6,
    step: 0.005,
    uiAsPercent: true,
  },
  {
    key: 'car_sec_pct_hs_vacantes',
    label: 'Horas cátedra vacantes en secundaria',
    shortLabel: 'Hs. vacantes sec.',
    group: 'contexto',
    kind: 'proportion',
    unit: 'Proporción 0–1',
    description: 'Proporción de horas cátedra vacantes en el nivel secundario.',
    median: 0.0,
    min: 0,
    max: 0.7,
    step: 0.005,
    uiAsPercent: true,
  },
  {
    key: 'car_sec_pct_hs_fuera_planta',
    label: 'Horas cátedra fuera de planta en secundaria',
    shortLabel: 'Hs. fuera de planta',
    group: 'contexto',
    kind: 'proportion',
    unit: 'Proporción 0–1',
    description: 'Proporción de horas en secundaria cubiertas fuera de planta orgánica funcional.',
    median: 0.0,
    min: 0,
    max: 1,
    step: 0.01,
    uiAsPercent: true,
  },
  {
    key: 'pob_tasa_alumnos_con_almuerzo',
    label: 'Tasa de alumnos con servicio de almuerzo',
    shortLabel: 'Cobertura almuerzo',
    group: 'contexto',
    kind: 'proportion',
    unit: 'Proporción 0–1 (recortada a 1)',
    description: 'Cobertura de comedor/almuerzo escolar sobre matrícula; recortada en 1,0 según regla de calidad.',
    median: 0.2683,
    min: 0,
    max: 1,
    step: 0.01,
    uiAsPercent: true,
  },
  {
    key: 'pob_tasa_discapacidad_prim_sec',
    label: 'Tasa de estudiantes con discapacidad',
    shortLabel: 'Tasa discapacidad',
    group: 'contexto',
    kind: 'proportion',
    unit: 'Proporción 0–1',
    description: 'Proporción registrada de alumnos con discapacidad en primaria y secundaria.',
    median: 0.0183,
    min: 0,
    max: 0.25,
    step: 0.002,
    uiAsPercent: true,
  },
  {
    key: 'pob_tasa_indigena_prim_sec',
    label: 'Tasa de estudiantes de pueblos originarios',
    shortLabel: 'Pueblos originarios',
    group: 'contexto',
    kind: 'proportion',
    unit: 'Proporción 0–1',
    description: 'Proporción registrada de alumnos pertenecientes a pueblos indígenas en primaria y secundaria.',
    median: 0.0,
    min: 0,
    max: 1,
    step: 0.01,
    uiAsPercent: true,
  },
];

export const FEATURE_SPEC_MAP: Record<FeatureKey, FeatureSpec> = Object.fromEntries(
  FEATURE_SPECS.map((spec) => [spec.key, spec])
) as Record<FeatureKey, FeatureSpec>;

export interface PreprocessResult {
  referenciaProvincial: ProvinceReference | null;
  features: FeatureVector;
  missingIndicators: FeatureKey[];
  clippedFields: string[];
  warnings: string[];
  derivedFields: string[];
  errors: string[];
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return null;
  }
  if (typeof value !== 'number' && typeof value !== 'string') return Number.NaN;
  const num = typeof value === 'number' ? value : Number(String(value).replace(',', '.').trim());
  return Number.isFinite(num) ? num : Number.NaN;
}

/**
 * Replica y mejora el preprocesamiento del notebook (secciones 3.2, 3.3, 3.4 y Pipeline SimpleImputer):
 * - Deriva variables a partir de conteos crudos si se informan (matrícula, salidos sin pase, sobreedad, repitentes).
 * - Normaliza sector y ámbito a indicadores binarios.
 * - Aplica reglas fijas sin leakage: recorte superior a 1 en pob_tasa_alumnos_con_almuerzo.
 * - Imputa faltantes con la mediana del conjunto de entrenamiento registrando indicadores de imputación.
 */
export function preprocessZoneInput(raw: RawFeatureInput): PreprocessResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingIndicators: FeatureKey[] = [];
  const clippedFields: string[] = [];
  const derivedFields: string[] = [];
  let referenciaProvincial: ProvinceReference | null = null;

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      referenciaProvincial: null,
      features: Object.fromEntries(FEATURE_SPECS.map((s) => [s.key, s.median])) as FeatureVector,
      missingIndicators: [...FEATURE_KEYS],
      clippedFields: [],
      warnings: [],
      derivedFields: [],
      errors: ['El cuerpo enviado debe ser un objeto JSON válido con las variables de la zona.'],
    };
  }

  const working: Partial<Record<FeatureKey, number | null>> = {};
  for (const key of ['provincia', 'departamento', 'sector', 'ambito'] as const) {
    if (raw[key] != null && typeof raw[key] !== 'string') errors.push(`El campo "${key}" debe ser texto.`);
  }
  if (raw.usarReferenciaProvincial !== undefined && typeof raw.usarReferenciaProvincial !== 'boolean') {
    errors.push('usarReferenciaProvincial debe ser true o false.');
  }
  for (const key of FEATURE_KEYS) {
    const parsed = toFiniteNumber(raw[key]);
    if (Number.isNaN(parsed)) {
      errors.push(`El campo "${key}" contiene un valor no numérico inválido.`);
    } else {
      working[key] = parsed;
    }
  }

  // Derivaciones categóricas
  if (working.sector_privado === null && typeof raw.sector === 'string' && raw.sector) {
    const norm = raw.sector.trim().toLowerCase();
    if (norm === 'privado') {
      working.sector_privado = 1;
      derivedFields.push('sector_privado');
    } else if (norm === 'estatal') {
      working.sector_privado = 0;
      derivedFields.push('sector_privado');
    } else {
      errors.push(`Sector inválido "${raw.sector}". Debe ser "Estatal" o "Privado".`);
    }
  }

  if (working.ambito_rural === null && typeof raw.ambito === 'string' && raw.ambito) {
    const norm = raw.ambito.trim().toLowerCase();
    if (norm === 'rural') {
      working.ambito_rural = 1;
      derivedFields.push('ambito_rural');
    } else if (norm === 'urbano') {
      working.ambito_rural = 0;
      derivedFields.push('ambito_rural');
    } else {
      errors.push(`Ámbito inválido "${raw.ambito}". Debe ser "Urbano" o "Rural".`);
    }
  }

  // Derivación de matrícula expuesta y log_matricula_inicial
  const matriculaInicial = toFiniteNumber(raw.matricula_inicial);
  const entrados = toFiniteNumber(raw.entrados) ?? 0;
  if (matriculaInicial !== null) {
    if (Number.isNaN(matriculaInicial) || matriculaInicial <= 0) {
      errors.push('matricula_inicial debe ser un número positivo.');
    } else {
      const expuesta = matriculaInicial + Math.max(0, entrados);
      if (expuesta < MIN_EXPOSED_ENROLLMENT) {
        warnings.push(
          `Matrícula expuesta (${Math.round(expuesta)} alumnos) es menor al mínimo recomendado de ${MIN_EXPOSED_ENROLLMENT} alumnos del filtro de calidad.`
        );
      }
      if (working.log_matricula_inicial === null) {
        working.log_matricula_inicial = Number(Math.log10(matriculaInicial).toFixed(4));
        derivedFields.push('log_matricula_inicial');
      }
      const mat8a12 = toFiniteNumber(raw.matricula_8a12);
      if (mat8a12 !== null && !Number.isNaN(mat8a12) && working.pct_matricula_8a12 === null) {
        working.pct_matricula_8a12 = mat8a12 / matriculaInicial;
        derivedFields.push('pct_matricula_8a12');
      }
      const matMuj = toFiniteNumber(raw.matricula_mujeres);
      if (matMuj !== null && !Number.isNaN(matMuj) && working.pct_mujeres === null) {
        working.pct_mujeres = matMuj / matriculaInicial;
        derivedFields.push('pct_mujeres');
      }
      const alSobre = toFiniteNumber(raw.alumnos_sobreedad);
      if (alSobre !== null && !Number.isNaN(alSobre) && working.pct_sobreedad_2023 === null) {
        working.pct_sobreedad_2023 = alSobre / matriculaInicial;
        derivedFields.push('pct_sobreedad_2023');
      }
      const alRep = toFiniteNumber(raw.alumnos_repitentes);
      if (alRep !== null && !Number.isNaN(alRep) && working.pct_repitentes_2023 === null) {
        working.pct_repitentes_2023 = alRep / matriculaInicial;
        derivedFields.push('pct_repitentes_2023');
      }
    }
  }

  // Derivación tasa_abandono_2022 desde salidos_sin_pase_2022 / matricula_expuesta_2022
  const ssp22 = toFiniteNumber(raw.salidos_sin_pase_2022);
  const exp22 = toFiniteNumber(raw.matricula_expuesta_2022);
  if (working.tasa_abandono_2022 === null && ssp22 !== null && exp22 !== null) {
    if (Number.isNaN(ssp22) || Number.isNaN(exp22) || exp22 <= 0 || ssp22 < 0) {
      errors.push('salidos_sin_pase_2022 y matricula_expuesta_2022 deben ser valores válidos y positivos.');
    } else {
      working.tasa_abandono_2022 = (100 * ssp22) / exp22;
      derivedFields.push('tasa_abandono_2022');
    }
  }

  const ssp22Sec = toFiniteNumber(raw.salidos_sin_pase_2022_sec);
  const exp22Sec = toFiniteNumber(raw.matricula_expuesta_2022_sec);
  if (working.tasa_abandono_2022_sec === null && ssp22Sec !== null && exp22Sec !== null) {
    if (Number.isNaN(ssp22Sec) || Number.isNaN(exp22Sec) || exp22Sec <= 0 || ssp22Sec < 0) {
      errors.push('salidos_sin_pase_2022_sec y matricula_expuesta_2022_sec deben ser valores válidos y positivos.');
    } else {
      working.tasa_abandono_2022_sec = (100 * ssp22Sec) / exp22Sec;
      derivedFields.push('tasa_abandono_2022_sec');
    }
  }

  // Solo completa un dato ausente. Una tasa propia (incluso 0) o una tasa derivada de
  // conteos tiene prioridad. Nunca se usa ciclo2023Pct, que sería la variable objetivo.
  if (working.tasa_abandono_2022 === null && raw.usarReferenciaProvincial !== false &&
      (raw.provincia || raw.usarReferenciaProvincial === true)) {
    referenciaProvincial = getProvinceReference(raw.provincia);
    if (referenciaProvincial) {
      working.tasa_abandono_2022 = referenciaProvincial.tasaPct;
      derivedFields.push('tasa_abandono_2022:referencia_provincial_2022');
      warnings.push(`Se usó la referencia provincial de ${referenciaProvincial.provincia} de 2022 (${referenciaProvincial.tasaPct}%). Es un valor agregado de referencia, no la tasa observada de esta zona.`);
    } else {
      errors.push('Seleccione una provincia válida para usar su referencia de 2022, o informe la tasa propia de la zona.');
    }
  }

  // Regla fija del notebook (3.3): recortar pob_tasa_alumnos_con_almuerzo en 1.0
  const almuerzo = working.pob_tasa_alumnos_con_almuerzo;
  if (almuerzo !== null && almuerzo !== undefined && almuerzo > 1) {
    working.pob_tasa_alumnos_con_almuerzo = 1;
    clippedFields.push('pob_tasa_alumnos_con_almuerzo');
  }

  const finalFeatures = {} as FeatureVector;
  for (const spec of FEATURE_SPECS) {
    let val = working[spec.key];
    if (val === null || val === undefined) {
      val = spec.median;
      missingIndicators.push(spec.key);
    } else {
      if (spec.kind === 'binary' && val !== 0 && val !== 1) {
        errors.push(`La variable binaria "${spec.key}" debe valer 0 o 1 (recibido: ${val}).`);
      }
      if (spec.kind === 'proportion' && (val < 0 || val > 1.0001)) {
        errors.push(
          `La proporción "${spec.key}" debe estar entre 0 y 1 (recibido: ${val}).`
        );
      }
      if (spec.kind === 'percentage' && (val < 0 || val > 100)) {
        errors.push(`La tasa "${spec.key}" debe estar entre 0 y 100% (recibido: ${val}).`);
      }
      if (spec.kind === 'log_enrollment' && (val < 1 || val > 7)) {
        errors.push(`"log_matricula_inicial" debe estar entre 1.0 y 7.0 (recibido: ${val}).`);
      }
    }
    finalFeatures[spec.key] = Number(val);
  }

  return {
    referenciaProvincial,
    features: finalFeatures,
    missingIndicators,
    clippedFields,
    warnings,
    derivedFields,
    errors,
  };
}
