import { useState } from 'react';
import type { ModelMetadataResponse, ZonesCatalogResponse } from './api.ts';

interface MethodologyViewProps {
  metadata: ModelMetadataResponse | null;
  zonesData: ZonesCatalogResponse | null;
}

export function MethodologyView({ metadata, zonesData }: MethodologyViewProps) {
  const [evalView, setEvalView] = useState<'cv' | 'test'>('cv');

  if (!metadata || !zonesData) {
    return <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />;
  }

  const rows = evalView === 'cv' ? metadata.comparacionCV : metadata.comparacionPrueba;
  const maxImp = Math.max(...metadata.importanciaPermutacion.map((x) => x.importanciaLog));

  return (
    <div className="space-y-6">
      {/* Resumen de arquitectura y decisiones */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#2c5282]">
          Documentación Técnica y Soporte para Presentación Oral
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">
          Estrategia de Modelado, Validación Provincial y Mejoras en Producción
        </h1>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-600">
          El objetivo es anticipar la tasa de abandono escolar (<code className="font-mono text-slate-800">salidos_sin_pase / matrícula_expuesta</code>) en cada zona educativa argentina. Debido a la fuerte asimetría de la tasa (mediana 0,39%, media 0,81%), el modelo entrena sobre{' '}
          <code className="font-mono text-slate-800">log(1 + tasa %)</code> y prioriza el{' '}
          <strong className="font-semibold text-slate-900">ordenamiento de zonas (Spearman y Recall del Top 25%)</strong> por encima de la exactitud puntual bajo un umbral rígido.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700">
              1. Validación por Provincia
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              División estricta con <code className="font-mono">GroupShuffleSplit</code> (19 provincias / 714 zonas para entrenar; 5 provincias / 422 zonas reservadas para prueba) + 5-fold <code className="font-mono">GroupKFold</code>. Ninguna provincia aparece en ambos lados.
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700">
              2. Prevención de Data Leakage
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Se excluyó Aprender Secundaria 2024 (posterior al ciclo 2023), se verificó que los &quot;no promovidos&quot; del archivo de Trayectoria correlacionan 0,977 con repitentes 2023 (ciclo 2022), y la imputación por mediana se aprende dentro del <code className="font-mono">Pipeline</code>.
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700">
              3. Hiperparámetros Elegidos
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Random Forest Regressor (<code className="font-mono">min_samples_leaf=10</code>, <code className="font-mono">max_features=0.5</code>, 20 variables del conjunto C). Supera a Ridge y Gradient Boosting tanto en MAE (0,523 pp CV / 0,355 pp prueba) como en Spearman (0,712 CV).
            </p>
          </div>
        </div>
      </section>

      {/* Comparación de modelos A / B / C */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Evolución de Modelos y Conjuntos de Variables (A, B, C)
            </h2>
            <p className="text-xs text-slate-500">
              Incorporar el ciclo anterior (Conjunto C) reduce el error un 30% en validación cruzada y lleva el Recall Top 25% a 87,0% en prueba.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setEvalView('cv')}
              className={`rounded px-3 py-1 text-xs font-medium ${
                evalView === 'cv'
                  ? 'bg-white text-[#1e3a5f] shadow-xs font-semibold'
                  : 'text-slate-600'
              }`}
            >
              Validación Cruzada (19 prov.)
            </button>
            <button
              type="button"
              onClick={() => setEvalView('test')}
              className={`rounded px-3 py-1 text-xs font-medium ${
                evalView === 'test'
                  ? 'bg-white text-[#1e3a5f] shadow-xs font-semibold'
                  : 'text-slate-600'
              }`}
            >
              Prueba Final (5 prov.)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-3 py-2.5 font-semibold">Conjunto de Variables</th>
                <th className="px-3 py-2.5 font-semibold">Modelo</th>
                <th className="px-3 py-2.5 text-right font-semibold">MAE (pp)</th>
                {evalView === 'cv' && (
                  <th className="px-3 py-2.5 text-right font-semibold">Desvío MAE</th>
                )}
                <th className="px-3 py-2.5 text-right font-semibold">R² (log)</th>
                <th className="px-3 py-2.5 text-right font-semibold">Spearman</th>
                <th className="px-3 py-2.5 text-right font-semibold">Recall Top 25%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, idx) => (
                <tr
                  key={idx}
                  className={r.elegido ? 'bg-blue-50/70 font-semibold text-slate-900' : 'hover:bg-slate-50'}
                >
                  <td className="px-3 py-2.5">{r.variables}</td>
                  <td className="px-3 py-2.5">
                    {r.modelo} {r.elegido && '· Elegido'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {r.maePp.toFixed(3)}
                  </td>
                  {evalView === 'cv' && (
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-600">
                      {r.maeDesvio !== null ? `±${r.maeDesvio.toFixed(3)}` : '—'}
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {r.r2Log.toFixed(3)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {r.spearman !== null ? r.spearman.toFixed(3) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {r.recallTop25 !== null ? `${(r.recallTop25 * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ablación variables provinciales */}
        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">
            Verificación de Identificadores Encubiertos (Sección 6.3 del Notebook)
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Al incluir desempleo provincial, remuneración relativa y región EPH, el modelo empeora en provincias nuevas: dichas variables actúan como reconocimiento encubierto de provincia y se excluyen del modelo productivo.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {metadata.ablacionProvincial.map((ab) => (
              <div
                key={ab.etiqueta}
                className="flex items-center justify-between rounded border border-slate-200 bg-white px-3.5 py-2.5 text-xs"
              >
                <span className="font-medium text-slate-800">{ab.etiqueta}</span>
                <span className="font-mono tabular-nums text-slate-900">
                  MAE {ab.maePp.toFixed(3)} · R² {ab.r2Log.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Importancia por permutación + Análisis de errores */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-6">
          <h2 className="font-display text-base font-bold text-slate-900">
            Importancia por Permutación (12 Variables Principales)
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Aumento del error (escala log) en provincias de prueba al desordenar cada predictor. No implica causalidad.
          </p>
          <div className="mt-4 space-y-2.5">
            {metadata.importanciaPermutacion.map((item) => {
              const widthPct = Math.max(3, (item.importanciaLog / maxImp) * 100);
              const isTemporal = item.grupo !== 'Contexto 2023';
              return (
                <div key={item.variable} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">
                      {item.label}{' '}
                      <span className="text-[11px] font-normal text-slate-400">({item.grupo})</span>
                    </span>
                    <span className="font-mono tabular-nums text-slate-700">
                      {item.importanciaLog.toFixed(3)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded bg-slate-100">
                    <div
                      className={`h-full rounded ${isTemporal ? 'bg-[#c53030]' : 'bg-[#2c5282]'}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-5 lg:col-span-6">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-display text-base font-bold text-slate-900">
              Análisis de Error por Dimensión (422 Zonas de Prueba)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              El error es mayor en el sector estatal (0,427 pp) y ámbito rural (0,525 pp), donde existen tasas extremas y mayor dispersión.
            </p>
            <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-3 py-2 font-semibold">Dimensión</th>
                    <th className="px-3 py-2 font-semibold">Categoría</th>
                    <th className="px-3 py-2 text-right font-semibold">Zonas</th>
                    <th className="px-3 py-2 text-right font-semibold">MAE (pp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metadata.erroresPorDimension.map((row) => (
                    <tr key={`${row.dimension}-${row.categoria}`}>
                      <td className="px-3 py-2 capitalize text-slate-500">{row.dimension}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">{row.categoria}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600">
                        {row.zonas}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-slate-900">
                        {row.maePp.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-display text-base font-bold text-slate-900">
              Reflexión Crítica y Mejoras Implementadas en SATED
            </h2>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-700">
              <li>
                <strong className="text-slate-900">Subestimación de extremos corregida en operación:</strong>{' '}
                cuando el modelo estima tasas altas (p. ej. 2,54% en Ramón Lista frente a 7,19% real), la aplicación emite aviso metodológico y prioriza mediante percentil nacional (Top 25%).
              </li>
              <li>
                <strong className="text-slate-900">Proyección al ciclo siguiente y foco en secundaria:</strong>{' '}
                se incorporó la estimación derivada para nivel secundario (8°–12°) y la proyección recursiva para el ciclo 2024 desde el servicio API.
              </li>
              <li>
                <strong className="text-slate-900">Próximos pasos institucionales:</strong>{' '}
                sumar serie histórica multiprovincial (evitando 2020–2021), ponderar por matrícula expuesta durante el ajuste y auditar criterios de registro de &quot;salidos sin pase&quot; entre jurisdicciones.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
