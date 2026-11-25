import type { FeatureSpec, FeatureVector, ProvinceCycleRecord, ZonePreset } from './api.ts';

export interface FriendlyFormState {
  abandonoSource: 'provincial' | 'manual';
  provincia: string;
  departamento: string;
  sector: 'Estatal' | 'Privado';
  ambito: 'Urbano' | 'Rural';
  esConurbano: boolean;
  matriculaAlumnos: number;
  abandonoInputMode: 'pct' | 'count';
  abandonoPrevioPct: number;
  abandonoPrevioAlumnos: number;
  abandonoSecPrevioPct: number;
  sobreedadPct: number;
  repitentesPct: number;
  nseBajoPct: number;
  sinInternetPct: number;
  madreSinSecPct: number;
  vacantesSecPct: number;
  almuerzoPct: number;
  // Opcionales / avanzadas (en % o 0-100 según corresponda)
  pesoSecundariaPct: number;
  mujeresPct: number;
  sinAguaPct: number;
  vacantesPrimPct: number;
  fueraPlantaSecPct: number;
  discapacidadPct: number;
  indigenaPct: number;
}

export function presetToFriendlyState(preset: ZonePreset): FriendlyFormState {
  const f = preset.features;
  const matricula = Math.max(100, Math.round(Math.pow(10, f.log_matricula_inicial)));
  const abandonoPct = Number(f.tasa_abandono_2022.toFixed(2));
  return {
    abandonoSource: 'manual',
    provincia: preset.provincia,
    departamento: preset.departamento,
    sector: preset.sector,
    ambito: preset.ambito,
    esConurbano: f.es_conurbano === 1,
    matriculaAlumnos: matricula,
    abandonoInputMode: 'pct',
    abandonoPrevioPct: abandonoPct,
    abandonoPrevioAlumnos: Math.round((matricula * abandonoPct) / 100),
    abandonoSecPrevioPct: Number(f.tasa_abandono_2022_sec.toFixed(2)),
    sobreedadPct: Number((f.pct_sobreedad_2023 * 100).toFixed(2)),
    repitentesPct: Number((f.pct_repitentes_2023 * 100).toFixed(2)),
    nseBajoPct: Number((f.appri_pct_nse_bajo * 100).toFixed(2)),
    sinInternetPct: Number((f.appri_pct_sin_internet * 100).toFixed(2)),
    madreSinSecPct: Number((f.appri_pct_madre_sin_sec * 100).toFixed(2)),
    vacantesSecPct: Number((f.car_sec_pct_hs_vacantes * 100).toFixed(2)),
    almuerzoPct: Number((f.pob_tasa_alumnos_con_almuerzo * 100).toFixed(2)),
    pesoSecundariaPct: Number((f.pct_matricula_8a12 * 100).toFixed(2)),
    mujeresPct: Number((f.pct_mujeres * 100).toFixed(2)),
    sinAguaPct: Number((f.appri_pct_sin_agua_potable * 100).toFixed(2)),
    vacantesPrimPct: Number((f.car_pri_pct_cargos_vacantes * 100).toFixed(2)),
    fueraPlantaSecPct: Number((f.car_sec_pct_hs_fuera_planta * 100).toFixed(2)),
    discapacidadPct: Number((f.pob_tasa_discapacidad_prim_sec * 100).toFixed(2)),
    indigenaPct: Number((f.pob_tasa_indigena_prim_sec * 100).toFixed(2)),
  };
}

export function buildCustomState(specs: FeatureSpec[], provinces: ProvinceCycleRecord[]): FriendlyFormState {
  const features = Object.fromEntries(specs.map((spec) => [spec.key, spec.median])) as FeatureVector;
  const state = presetToFriendlyState({
    id: 'custom', nombre: 'Mis propios datos', provincia: 'Buenos Aires', departamento: 'Mi zona',
    sector: 'Estatal', ambito: 'Urbano', resumen: '', features,
  });
  return useProvinceHistory(state, provinces);
}

export function useProvinceHistory(state: FriendlyFormState, provinces: ProvinceCycleRecord[]): FriendlyFormState {
  const reference = provinces.find((p) => p.provincia === state.provincia);
  if (!reference) return state;
  return {
    ...state,
    abandonoSource: 'provincial',
    abandonoInputMode: 'pct',
    abandonoPrevioPct: reference.ciclo2022Pct,
    abandonoPrevioAlumnos: Math.round(state.matriculaAlumnos * reference.ciclo2022Pct / 100),
  };
}

export function changeProvince(state: FriendlyFormState, provincia: string, provinces: ProvinceCycleRecord[]): FriendlyFormState {
  const next = {
    ...state, provincia, departamento: 'Mi zona',
    esConurbano: provincia === 'Buenos Aires' ? state.esConurbano : false,
  };
  return state.abandonoSource === 'provincial' ? useProvinceHistory(next, provinces) : next;
}

export function toApiPayload(state: FriendlyFormState): Record<string, unknown> {
    const mat = Math.max(1, state.matriculaAlumnos);
    const abPrev =
      state.abandonoInputMode === 'count'
        ? (state.abandonoPrevioAlumnos / mat) * 100
        : state.abandonoPrevioPct;

    return {
      provincia: state.provincia,
      departamento: state.departamento || 'Zona evaluada',
      sector: state.sector,
      ambito: state.ambito,
      sector_privado: state.sector === 'Privado' ? 1 : 0,
      ambito_rural: state.ambito === 'Rural' ? 1 : 0,
      es_conurbano: state.esConurbano ? 1 : 0,
      matricula_inicial: mat,
      usarReferenciaProvincial: state.abandonoSource === 'provincial',
      tasa_abandono_2022: state.abandonoSource === 'provincial' ? undefined : Number(Math.max(0, abPrev).toFixed(3)),
      tasa_abandono_2022_sec: Number(Math.max(0, state.abandonoSecPrevioPct).toFixed(3)),
      pct_sobreedad_2023: Number((state.sobreedadPct / 100).toFixed(4)),
      pct_repitentes_2023: Number((state.repitentesPct / 100).toFixed(4)),
      appri_pct_nse_bajo: Number((state.nseBajoPct / 100).toFixed(4)),
      appri_pct_sin_internet: Number((state.sinInternetPct / 100).toFixed(4)),
      appri_pct_madre_sin_sec: Number((state.madreSinSecPct / 100).toFixed(4)),
      car_sec_pct_hs_vacantes: Number((state.vacantesSecPct / 100).toFixed(4)),
      pob_tasa_alumnos_con_almuerzo: Number((state.almuerzoPct / 100).toFixed(4)),
      pct_matricula_8a12: Number((state.pesoSecundariaPct / 100).toFixed(4)),
      pct_mujeres: Number((state.mujeresPct / 100).toFixed(4)),
      appri_pct_sin_agua_potable: Number((state.sinAguaPct / 100).toFixed(4)),
      car_pri_pct_cargos_vacantes: Number((state.vacantesPrimPct / 100).toFixed(4)),
      car_sec_pct_hs_fuera_planta: Number((state.fueraPlantaSecPct / 100).toFixed(4)),
      pob_tasa_discapacidad_prim_sec: Number((state.discapacidadPct / 100).toFixed(4)),
      pob_tasa_indigena_prim_sec: Number((state.indigenaPct / 100).toFixed(4)),
    };
  };

