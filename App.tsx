import { FileCode2, FileSpreadsheet, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiContractModal } from './ApiContractModal.tsx';
import { BatchEvaluator } from './BatchEvaluator.tsx';
import { MethodologyView } from './MethodologyView.tsx';
import { SinglePageEvaluator } from './SinglePageEvaluator.tsx';
import type { ModelMetadataResponse, ZonesCatalogResponse } from './api.ts';

export default function App() {
  const [metadata, setMetadata] = useState<ModelMetadataResponse | null>(null);
  const [zonesData, setZonesData] = useState<ZonesCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadInitial() {
      setLoading(true);
      setLoadError(null);
      try {
        const [metaRes, zonesRes] = await Promise.all([
          fetch('/api/model/metadata'),
          fetch('/api/zones'),
        ]);
        if (!metaRes.ok || !zonesRes.ok) {
          throw new Error('Error al consultar la API');
        }
        const [metaJson, zonesJson] = await Promise.all([metaRes.json(), zonesRes.json()]);
        if (active) {
          setMetadata(metaJson as ModelMetadataResponse);
          setZonesData(zonesJson as ZonesCatalogResponse);
        }
      } catch {
        if (active) {
          setLoadError('No se pudo conectar con el servicio /api/* del modelo.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadInitial();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Barra superior minimalista y enfocada */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1e3a5f] text-xs font-bold tracking-wider text-white">
              SA
            </span>
            <div>
              <span className="font-display text-base font-bold tracking-tight text-slate-900">
                SATED
              </span>
              <span className="ml-2.5 hidden text-xs font-medium text-slate-500 sm:inline">
                Alerta Temprana de Abandono Escolar · Prototipo académico ITBA
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#2c5282]" />
              <span className="hidden sm:inline">Evaluar varios (CSV)</span>
              <span className="sm:hidden">CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setShowMethodModal(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap hover:bg-slate-50"
            >
              <Info className="h-3.5 w-3.5 text-[#2c5282]" />
              <span className="hidden sm:inline">Cómo funciona el modelo</span>
              <span className="sm:hidden">Modelo</span>
            </button>
            <button
              type="button"
              onClick={() => setShowApiModal(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#1e3a5f] px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap hover:bg-[#162d4a]"
            >
              <FileCode2 className="h-3.5 w-3.5" />
              API
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {loadError && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {loadError}
          </div>
        )}

        {loading || !metadata || !zonesData ? (
          <div className="space-y-5">
            <div className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-6" />
              <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-6" />
            </div>
          </div>
        ) : (
          <SinglePageEvaluator
            specs={metadata.variables}
            presets={zonesData.presets}
            provinces={[...zonesData.provinces].sort((a, b) => a.provincia.localeCompare(b.provincia, 'es'))}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <span>
            SATED · Random Forest de la Entrega 3 (1.136 zonas) · Prueba en 5 provincias: MAE 0,36 pp · Recall Top 25%: 87,0%
          </span>
          <span>Entrega 04 · ITBA · Yablonovich, Castilla y Bagnacedri · Prototipo académico, no es un sistema oficial del Ministerio</span>
        </div>
      </footer>

      {/* Modal opcional: Carga por Lote CSV */}
      {showBatchModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Evaluar lote de zonas por CSV"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Evaluación Masiva por Archivo CSV
              </h2>
              <button
                type="button"
                aria-label="Cerrar evaluación por lote"
                onClick={() => setShowBatchModal(false)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <BatchEvaluator metadata={metadata} />
            </div>
          </div>
        </div>
      )}

      {/* Modal opcional: Metodología y Validación */}
      {showMethodModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cómo funciona el modelo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Cómo funciona el modelo (Validación y Resultados)
              </h2>
              <button
                type="button"
                aria-label="Cerrar explicación del modelo"
                onClick={() => setShowMethodModal(false)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <MethodologyView metadata={metadata} zonesData={zonesData} />
            </div>
          </div>
        </div>
      )}

      <ApiContractModal open={showApiModal} onClose={() => setShowApiModal(false)} />
    </div>
  );
}
