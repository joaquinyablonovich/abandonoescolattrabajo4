import { PROVINCE_RECORDS } from './data.ts';

export interface ProvinceReference {
  provincia: string;
  ciclo: 2022;
  tasaPct: number;
  fuente: string;
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** La provincia aporta una referencia histórica; no agrega un coeficiente al modelo. */
export function getProvinceReference(value: unknown): ProvinceReference | null {
  if (typeof value !== 'string') return null;
  const name = normalize(value);
  const alias = ['caba', 'capital federal', 'ciudad autonoma de buenos aires'].includes(name)
    ? 'ciudad de buenos aires' : name;
  const record = PROVINCE_RECORDS.find((p) => normalize(p.provincia) === alias);
  if (!record) return null;
  return {
    provincia: record.provincia,
    ciclo: 2022,
    tasaPct: record.ciclo2022Pct,
    fuente: 'Entrega 3, sección 4: tasa provincial de 2022 ponderada por matrícula; tabla redondeada a 2 decimales.',
  };
}
