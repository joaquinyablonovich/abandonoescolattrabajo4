import type {
  DimensionErrorRow,
  HeatmapCell,
  ModelComparisonRow,
  PermutationImportanceRow,
  PrioritizedZoneRecord,
  ProvinceAblationRow,
  ProvinceCycleRecord,
  ZonePreset,
} from './data.ts';
import type {
  BatchPredictionResponse,
  PredictionOutput,
} from './model.ts';
import type { FeatureKey, FeatureSpec, FeatureVector } from './schema.ts';

export type {
  BatchPredictionResponse,
  DimensionErrorRow,
  FeatureKey,
  FeatureSpec,
  FeatureVector,
  HeatmapCell,
  ModelComparisonRow,
  PermutationImportanceRow,
  PredictionOutput,
  PrioritizedZoneRecord,
  ProvinceAblationRow,
  ProvinceCycleRecord,
  ZonePreset,
};

export interface ModelMetadataResponse {
  modelo: {
    nombre: string;
    hiperparametros: {
      n_estimators: number;
      min_samples_leaf: number;
      max_features: number;
      random_state: number;
      runtimeTreesLoaded: number;
    };
    objetivo: string;
    umbralAltoRiesgoPct: number;
    criterioPriorizacionPrincipal: string;
  };
  variables: FeatureSpec[];
  variablesJson: FeatureKey[];
  resumenDataset: {
    totalZonasOriginal: number;
    totalZonasValidas: number;
    medianaTasaPct: number;
    mediaTasaPct: number;
    umbralAltoRiesgoPct: number;
    zonasEntrenamiento: number;
    provinciasEntrenamiento: number;
    zonasPrueba: number;
    provinciasPrueba: number;
    correlacionNoPromovidosVsRep2023: number;
    correlacionNoPromovidosVsRep2024: number;
    correlacionProvincialCiclos: number;
    spearmanZonasCiclos: number;
    umbralFijoPrueba: {
      accuracy: number;
      precision: number;
      recall: number;
      f1: number;
    };
  };
  comparacionCV: ModelComparisonRow[];
  comparacionPrueba: ModelComparisonRow[];
  ablacionProvincial: ProvinceAblationRow[];
  importanciaPermutacion: PermutationImportanceRow[];
  erroresPorDimension: DimensionErrorRow[];
  ejemploLote: Array<
    {
      zonaId: string;
      provincia: string;
      departamento: string;
      sector: 'Estatal' | 'Privado';
      ambito: 'Urbano' | 'Rural';
    } & FeatureVector
  >;
}

export interface ZonesCatalogResponse {
  provinces: ProvinceCycleRecord[];
  prioritizedZones: PrioritizedZoneRecord[];
  highestErrorZones: PrioritizedZoneRecord[];
  heatmapMatrix: HeatmapCell[];
  presets: ZonePreset[];
}

export interface PredictApiResponse {
  zona: {
    provincia: string;
    departamento: string;
    sector: string;
    ambito: string;
  };
  entradaNormalizada: FeatureVector;
  prediccion: PredictionOutput;
}
