import { AlertTriangle, Download, FileSpreadsheet, Play, Search, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FEATURE_KEYS } from './schema.ts';
import type { BatchPredictionResponse, ModelMetadataResponse } from './api.ts';

interface BatchEvaluatorProps {
  metadata: ModelMetadataResponse | null;
}

function escapeCsvCell(val: string | number | boolean | null): string {
  const raw = val === null || val === undefined ? '' : String(val);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function buildCsvFromEjemplo(rows: ModelMetadataResponse['ejemploLote']): string {
  const headers = ['zonaId', 'provincia', 'departamento', 'sector', 'ambito', ...FEATURE_KEYS];
  const lines = [headers.join(',')];
  rows.forEach((r) => {
    const vals = headers.map((h) => String((r as Record<string, unknown>)[h] ?? ''));
    lines.push(vals.join(','));
  });
  return lines.join('\n');
}

export function BatchEvaluator({ metadata }: BatchEvaluatorProps) {
  const [csvText, setCsvText] = useState('');
  const [batchResult, setBatchResult] = useState<BatchPredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'top25' | 'threshold'>('all');
  const [search, setSearch] = useState('');

  // Carga automática de ejemplo_entrada.csv al abrir la pestaña por primera vez
  useEffect(() => {
    if (!metadata || csvText.trim() !== '') return;
    const sample = buildCsvFromEjemplo(metadata.ejemploLote);
    setCsvText(sample);
    void evaluateCsv(sample);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadata]);

  const evaluateCsv = async (textToSend: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/predict/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: textToSend }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(
          Array.isArray(data.detalles) ? data.detalles.join(' ') : data.error || 'Error al procesar lote.'
        );
        return;
      }
      setBatchResult(data as BatchPredictionResponse);
    } catch {
      setErrorMsg('No se pudo conectar con /api/predict/batch.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setCsvText(content);
      void evaluateCsv(content);
    };
    reader.readAsText(file);
  };

  const downloadTemplateCsv = () => {
    if (!metadata) return;
    const content = buildCsvFromEjemplo(metadata.ejemploLote);
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ejemplo_entrada_sated.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadRankedResults = () => {
    if (!batchResult) return;
    const headers = [
      'rankingLote',
      'zonaId',
      'provincia',
      'departamento',
      'sector',
      'ambito',
      'tasaEstimadaPct',
      'percentilNacional',
      'prioridadTop25Lote',
      'altoRiesgoUmbralFijo',
      'principalFactor',
    ];
    const lines = [
      headers.join(','),
      ...batchResult.resultados.map((r) =>
        [
          r.rankingLote,
          r.zonaId,
          r.provincia,
          r.departamento,
          r.sector,
          r.ambito,
          r.tasaEstimadaPct,
          r.percentilNacional,
          r.prioridadTop25Lote ? 'SI' : 'NO',
          r.altoRiesgoUmbralFijo ? 'SI' : 'NO',
          r.principalFactor,
        ]
          .map(escapeCsvCell)
          .join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ranking_prioridad_sated.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadExpandedMinistryBatch = () => {
    if (!metadata) return;
    // Simula un despacho jurisdiccional ampliado de 10 zonas combinando ejemplos + nuevas variantes con faltantes
    const base = metadata.ejemploLote;
    const extraRows = [
      {
        ...base[3],
        zonaId: 'FO-BERMEJO-EST-RUR',
        provincia: 'Formosa',
        departamento: 'BERMEJO',
        tasa_abandono_2022: 3.45,
        tasa_abandono_2022_sec: 5.8,
        pct_sobreedad_2023: 0.29,
        appri_pct_nse_bajo: 0.66,
      },
      {
        ...base[4],
        zonaId: 'SA-TARTAGAL-EST-RUR',
        provincia: 'Salta',
        departamento: 'SAN MARTÍN',
        ambito: 'Rural' as const,
        ambito_rural: 1,
        tasa_abandono_2022: 2.85,
        tasa_abandono_2022_sec: 4.9,
        pct_sobreedad_2023: 0.26,
      },
      {
        ...base[0],
        zonaId: 'BA-TIGRE-EST-URB',
        provincia: 'Buenos Aires',
        departamento: 'TIGRE',
        tasa_abandono_2022: 0.55,
        pct_sobreedad_2023: 0.14,
      },
      {
        ...base[2],
        zonaId: 'CBA-CAPITAL-PRI-URB',
        provincia: 'Córdoba',
        departamento: 'CAPITAL',
        es_conurbano: 0,
        tasa_abandono_2022: 0.16,
      },
      {
        ...base[3],
        zonaId: 'MI-OBERÁ-EST-RUR',
        provincia: 'Misiones',
        departamento: 'OBERÁ',
        tasa_abandono_2022: 2.35,
        tasa_abandono_2022_sec: 4.1,
        pct_sobreedad_2023: 0.23,
      },
    ];
    const text = buildCsvFromEjemplo([...base, ...extraRows]);
    setCsvText(text);
    void evaluateCsv(text);
  };

  const filteredRows = useMemo(() => {
    if (!batchResult) return [];
    const q = search.trim().toLowerCase();
    return batchResult.resultados.filter((r) => {
      if (filterMode === 'top25' && !r.prioridadTop25Lote && !r.prioridadTop25Nacional) return false;
      if (filterMode === 'threshold' && !r.altoRiesgoUmbralFijo) return false;
      if (
        q &&
        !r.provincia.toLowerCase().includes(q) &&
        !r.departamento.toLowerCase().includes(q) &&
        !r.zonaId.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [batchResult, filterMode, search]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#2c5282]">
              Evaluación Masiva y Priorización · POST /api/predict/batch
            </p>
            <h1 className="font-display text-xl font-bold text-slate-900">
              Carga de Lotes CSV y Ranking Jurisdiccional
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Procesa hasta 500 zonas educativas por archivo con las 20 columnas de{' '}
              <code className="font-mono text-slate-800">variables.json</code>, imputa valores faltantes y devuelve el ranking ordenado de mayor a menor riesgo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 xl:flex-nowrap">
            <button
              type="button"
              onClick={loadExpandedMinistryBatch}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#2c5282]" />
              Simular lote 10 zonas
            </button>
            <button
              type="button"
              onClick={downloadTemplateCsv}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Plantilla CSV
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[#1e3a5f] px-3.5 py-1.5 text-xs font-semibold text-white whitespace-nowrap hover:bg-[#162d4a]">
              <Upload className="h-3.5 w-3.5" />
              Subir .CSV
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="csv-textarea" className="text-xs font-semibold text-slate-700">
              Contenido CSV de entrada (modificable antes de ejecutar)
            </label>
            <button
              type="button"
              onClick={() => void evaluateCsv(csvText)}
              disabled={loading || csvText.trim() === ''}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#1e3a5f] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#162d4a] disabled:opacity-60"
            >
              <Play className="h-3.5 w-3.5" />
              {loading ? 'Procesando lote...' : 'Evaluar CSV'}
            </button>
          </div>
          <textarea
            id="csv-textarea"
            rows={5}
            wrap="off"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            spellCheck={false}
            className="w-full overflow-x-auto whitespace-pre rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-800 focus:border-[#1e3a5f] focus:bg-white focus:outline-none"
          />
          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </section>

      {batchResult && (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">Zonas Evaluadas</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900">
                {batchResult.totalZonas}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">En Prioridad Top 25%</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#1e3a5f]">
                {batchResult.zonasPrioridadTop25}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">Superan Umbral 1,39%</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-red-700">
                {batchResult.zonasSobreUmbralFijo}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">Mediana / Media Estimada</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900">
                {batchResult.tasaMedianaEstimadaPct.toFixed(2)}%{' '}
                <span className="text-sm font-normal text-slate-500">
                  / {batchResult.tasaPromedioEstimadaPct.toFixed(2)}%
                </span>
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar en resultados..."
                    className="rounded-md border border-slate-300 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-[#1e3a5f] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1">
                  {(
                    [
                      { id: 'all', label: 'Todas' },
                      { id: 'top25', label: 'Prioridad Top 25%' },
                      { id: 'threshold', label: 'Tasa ≥ 1,39%' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilterMode(f.id)}
                      className={`rounded px-2.5 py-1 text-xs font-medium ${
                        filterMode === f.id
                          ? 'bg-white text-[#1e3a5f] shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={downloadRankedResults}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar ranking CSV
              </button>
            </div>

            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-3 py-2.5 font-semibold">Ranking</th>
                    <th className="px-3 py-2.5 font-semibold">Código Zona</th>
                    <th className="px-3 py-2.5 font-semibold">Provincia / Depto</th>
                    <th className="px-3 py-2.5 font-semibold">Tipo</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Tasa Estimada</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Percentil Nac.</th>
                    <th className="px-3 py-2.5 font-semibold">Clasificación</th>
                    <th className="px-3 py-2.5 font-semibold">Factor Principal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No hay zonas en el lote que coincidan con el filtro aplicado.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r) => (
                      <tr key={`${r.rankingLote}-${r.zonaId}`} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-mono font-semibold tabular-nums text-slate-500">
                          #{r.rankingLote}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-700">{r.zonaId}</td>
                        <td className="px-3 py-2.5">
                          <span className="font-semibold text-slate-900">{r.provincia}</span>
                          <span className="text-slate-500"> · {r.departamento}</span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {r.sector} {r.ambito.toLowerCase()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-slate-900">
                          {r.tasaEstimadaPct.toFixed(3)}%
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-700">
                          P{r.percentilNacional}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`font-semibold ${
                              r.nivelRiesgo === 'critico'
                                ? 'text-red-700'
                                : r.nivelRiesgo === 'alto'
                                  ? 'text-amber-700'
                                  : r.nivelRiesgo === 'medio'
                                    ? 'text-amber-600'
                                    : 'text-emerald-700'
                            }`}
                          >
                            {r.etiquetaRiesgo}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">{r.principalFactor}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
