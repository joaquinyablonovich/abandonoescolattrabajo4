import { Check, Copy, Play, X } from 'lucide-react';
import { useState } from 'react';

interface ApiContractModalProps {
  open: boolean;
  onClose: () => void;
}

const CURL_PREDICT = `curl -X POST http://localhost:3000/api/predict \\
  -H "Content-Type: application/json" \\
  -d '{
    "provincia": "Salta",
    "departamento": "ORAN",
    "sector": "Estatal",
    "ambito": "Urbano",
    "log_matricula_inicial": 4.38,
    "tasa_abandono_2022": 2.15,
    "tasa_abandono_2022_sec": 4.10,
    "pct_sobreedad_2023": 0.22,
    "pct_repitentes_2023": 0.085,
    "appri_pct_nse_bajo": 0.48
  }'`;

const CURL_BATCH = `curl -X POST http://localhost:3000/api/predict/batch \\
  -H "Content-Type: application/json" \\
  -d '{"rows":[{"zonaId":"Z-01","provincia":"Formosa","sector":"Estatal","ambito":"Rural","tasa_abandono_2022":3.2,"pct_sobreedad_2023":0.28}]}'`;

export function ApiContractModal({ open, onClose }: ApiContractModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [healthOutput, setHealthOutput] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  if (!open) return null;

  const copyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthOutput(JSON.stringify(data, null, 2));
    } catch {
      setHealthOutput('Error al consultar /api/health');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="api-modal-title" className="text-lg font-bold text-slate-900">
              Contrato del Servicio REST (/api/*)
            </h2>
            <p className="text-xs text-slate-600">
              Separación entre capa de servicio Express y lógica de inferencia Random Forest
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar diálogo"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5 text-sm text-slate-700">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">Endpoints disponibles</p>
                <p className="text-xs text-slate-600">
                  Entradas tipadas, imputación automática de faltantes y manejo estructurado de errores HTTP 400.
                </p>
              </div>
              <button
                type="button"
                onClick={runHealthCheck}
                disabled={checking}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#1e3a5f] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#162d4a] disabled:opacity-60"
              >
                <Play className="h-3.5 w-3.5" />
                {checking ? 'Consultando...' : 'Probar GET /api/health'}
              </button>
            </div>
            <ul className="mt-3 space-y-1.5 font-mono text-xs text-slate-800">
              <li>GET  /api/health              → Estado del modelo cargado en memoria</li>
              <li>GET  /api/model/metadata      → 20 variables, métricas CV/prueba e importancia</li>
              <li>GET  /api/zones               → Catálogo de 24 provincias y zonas priorizadas</li>
              <li>POST /api/predict             → Predicción individual + drivers + recomendaciones</li>
              <li>POST /api/predict/batch       → Evaluación y ranking Top 25% desde JSON o CSV</li>
            </ul>
            {healthOutput && (
              <pre className="mt-3 overflow-x-auto rounded border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800">
                {healthOutput}
              </pre>
            )}
            <p className="mt-3 text-xs text-slate-600">
              Si se informa provincia y falta tasa_abandono_2022, se usa su referencia provincial de 2022.
              Una tasa propia o derivada de conteos tiene prioridad. Para desactivar esa referencia, enviá
              usarReferenciaProvincial: false. La salida prediccion.referenciaProvincial informa qué se utilizó.
            </p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Ejemplo POST /api/predict (zona individual)
              </h3>
              <button
                type="button"
                onClick={() => copyText('predict', CURL_PREDICT)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#2c5282] hover:underline"
              >
                {copiedId === 'predict' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedId === 'predict' ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-md border border-slate-200 bg-slate-900 p-3.5 font-mono text-xs text-slate-100">
              {CURL_PREDICT}
            </pre>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Ejemplo POST /api/predict/batch (evaluación y ranking)
              </h3>
              <button
                type="button"
                onClick={() => copyText('batch', CURL_BATCH)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#2c5282] hover:underline"
              >
                {copiedId === 'batch' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedId === 'batch' ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-md border border-slate-200 bg-slate-900 p-3.5 font-mono text-xs text-slate-100">
              {CURL_BATCH}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
