import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Sparkles,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  FeatureKey,
  FeatureSpec,
  FeatureVector,
  PredictApiResponse,
  ZonePreset,
  ProvinceCycleRecord,
} from './api.ts';

import { buildCustomState, changeProvince, presetToFriendlyState, toApiPayload, useProvinceHistory, type FriendlyFormState } from './evaluatorState.ts';

interface SinglePageEvaluatorProps {
  specs: FeatureSpec[];
  presets: ZonePreset[];
  provinces: ProvinceCycleRecord[];
}

const HUMAN_DRIVER_LABELS: Record<FeatureKey, string> = {
  tasa_abandono_2022: 'Abandono registrado el año pasado',
  tasa_abandono_2022_sec: 'Abandono previo en secundaria',
  pct_sobreedad_2023: 'Alumnos con sobreedad al iniciar el año',
  pct_repitentes_2023: 'Alumnos repitentes al iniciar el año',
  appri_pct_nse_bajo: 'Hogares con bajos recursos (NSE bajo)',
  appri_pct_sin_internet: 'Estudiantes sin internet en el hogar',
  appri_pct_madre_sin_sec: 'Madres sin secundario completo',
  appri_pct_sin_agua_potable: 'Hogares sin agua potable',
  sector_privado: 'Tipo de gestión (Estatal vs. Privada)',
  ambito_rural: 'Ubicación geográfica (Rural vs. Urbana)',
  es_conurbano: 'Pertenencia al Conurbano Bonaerense',
  log_matricula_inicial: 'Cantidad de alumnos de la zona',
  pct_matricula_8a12: 'Peso de matrícula secundaria',
  pct_mujeres: 'Proporción de estudiantes mujeres',
  car_pri_pct_cargos_vacantes: 'Cargos docentes vacantes en primaria',
  car_sec_pct_hs_vacantes: 'Horas docentes vacantes en secundaria',
  car_sec_pct_hs_fuera_planta: 'Horas docentes fuera de planta',
  pob_tasa_alumnos_con_almuerzo: 'Cobertura de comedor escolar',
  pob_tasa_discapacidad_prim_sec: 'Estudiantes con discapacidad',
  pob_tasa_indigena_prim_sec: 'Estudiantes de pueblos originarios',
};

function getVisualRiskTheme(nivel: string) {
  switch (nivel) {
    case 'critico':
      return {
        card: 'border-red-300 bg-red-50/90',
        badge: 'bg-red-700 text-white',
        title: 'text-red-900',
        number: 'text-red-700',
        bar: 'bg-red-600',
        headline: 'Riesgo Crítico · Prioridad Máxima',
        summary:
          'Supera el umbral nacional de alerta (1,39%) y se ubica entre las zonas más vulnerables del país. Requiere intervención territorial urgente.',
      };
    case 'alto':
      return {
        card: 'border-amber-300 bg-amber-50/90',
        badge: 'bg-amber-700 text-white',
        title: 'text-amber-950',
        number: 'text-amber-800',
        bar: 'bg-amber-600',
        headline: 'Alerta Alta · Top 25% Prioritario',
        summary:
          'Aunque no supera el umbral fijo de 1,39%, está dentro del 25% de mayor riesgo relativo nacional y amerita seguimiento preventivo.',
      };
    case 'medio':
      return {
        card: 'border-amber-200 bg-amber-50/40',
        badge: 'bg-amber-600 text-white',
        title: 'text-slate-900',
        number: 'text-amber-700',
        bar: 'bg-amber-500',
        headline: 'Riesgo Moderado · Seguimiento Focalizado',
        summary:
          'Presenta señales intermedias por encima de la mediana nacional (0,39%). Conviene monitorear asistencia y repitencia en secundaria.',
      };
    default:
      return {
        card: 'border-emerald-200 bg-emerald-50/60',
        badge: 'bg-emerald-700 text-white',
        title: 'text-emerald-950',
        number: 'text-emerald-700',
        bar: 'bg-emerald-600',
        headline: 'Riesgo Bajo · Situación Controlada',
        summary:
          'Los indicadores de trayectoria y contexto se encuentran por debajo de los niveles de alerta. Mantener seguimiento escolar habitual.',
      };
  }
}

export function SinglePageEvaluator({ specs, presets, provinces }: SinglePageEvaluatorProps) {
  const defaultPreset = presets[0];
  const [activePresetId, setActivePresetId] = useState<string>(defaultPreset?.id ?? 'custom');
  const [form, setForm] = useState<FriendlyFormState>(() =>
    defaultPreset ? presetToFriendlyState(defaultPreset) : buildCustomState(specs, provinces)
  );
  const [matriculaText, setMatriculaText] = useState<string>(() =>
    String((defaultPreset ? presetToFriendlyState(defaultPreset) : buildCustomState(specs, provinces)).matriculaAlumnos)
  );
  const [abPctText, setAbPctText] = useState<string>(() =>
    String((defaultPreset ? presetToFriendlyState(defaultPreset) : buildCustomState(specs, provinces)).abandonoPrevioPct)
  );
  const [abCountText, setAbCountText] = useState<string>(() =>
    String((defaultPreset ? presetToFriendlyState(defaultPreset) : buildCustomState(specs, provinces)).abandonoPrevioAlumnos)
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Simulador de medidas de retención
  const [simSeguimientoPct, setSimSeguimientoPct] = useState(0);
  const [simTutoriasPct, setSimTutoriasPct] = useState(0);
  const [simConectividadPct, setSimConectividadPct] = useState(0);

  const [completedPrediction, setCompletedPrediction] = useState<{ key: string; data: PredictApiResponse } | null>(null);
  const [completedSimulation, setCompletedSimulation] = useState<{ key: string; data: PredictApiResponse } | null>(null);
  const [requestError, setRequestError] = useState<{ key: string; message: string } | null>(null);
  const requestBody = useMemo(() => JSON.stringify(toApiPayload(form)), [form]);
  const result = completedPrediction?.key === requestBody ? completedPrediction.data : null;
  const errorMsg = requestError?.key === requestBody ? requestError.message : null;
  const loading = !result && !errorMsg;
  const simulationKey = JSON.stringify([requestBody, simSeguimientoPct, simTutoriasPct, simConectividadPct]);
  const simResult = result && completedSimulation?.key === simulationKey ? completedSimulation.data : null;

  const effectiveAbandonoPrevioPct = useMemo(() => {
    if (form.abandonoInputMode === 'count') {
      const mat = Math.max(1, form.matriculaAlumnos);
      return Number(((form.abandonoPrevioAlumnos / mat) * 100).toFixed(2));
    }
    return form.abandonoPrevioPct;
  }, [form.abandonoInputMode, form.abandonoPrevioAlumnos, form.abandonoPrevioPct, form.matriculaAlumnos]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/predict', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: requestBody, signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(Array.isArray(data.detalles) ? data.detalles.join(' ') : data.error || 'Error al calcular.');
        if (active) {
          setCompletedPrediction({ key: requestBody, data });
          setRequestError(null);
        }
      } catch (error) {
        if (active) setRequestError({ key: requestBody, message: error instanceof Error && error.name !== 'TypeError' ? error.message : 'No se pudo conectar con el servidor de predicción (/api/predict).' });
      }
    }, 180);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [requestBody]);

  // Simulador "¿Qué pasa si intervenimos?" en vivo
  useEffect(() => {
    if (!result) return;
    const controller = new AbortController();
    let active = true;
    if (simSeguimientoPct === 0 && simTutoriasPct === 0 && simConectividadPct === 0) {
      setCompletedSimulation(null);
      return;
    }

    const base = result.entradaNormalizada;
    const simulated: FeatureVector = {
      ...base,
      tasa_abandono_2022: Number((base.tasa_abandono_2022 * (1 - simSeguimientoPct / 100)).toFixed(3)),
      tasa_abandono_2022_sec: Number(
        (base.tasa_abandono_2022_sec * (1 - simSeguimientoPct / 100)).toFixed(3)
      ),
      pct_sobreedad_2023: Number((base.pct_sobreedad_2023 * (1 - simTutoriasPct / 100)).toFixed(4)),
      pct_repitentes_2023: Number((base.pct_repitentes_2023 * (1 - simTutoriasPct / 150)).toFixed(4)),
      appri_pct_sin_internet: Number(
        (base.appri_pct_sin_internet * (1 - simConectividadPct / 100)).toFixed(4)
      ),
    };

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/predict', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provincia: form.provincia,
            departamento: form.departamento,
            ...simulated,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as PredictApiResponse;
          if (active) setCompletedSimulation({ key: simulationKey, data });
        }
      } catch {
        // Silencioso en debounce
      }
    }, 140);

    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [simSeguimientoPct, simTutoriasPct, simConectividadPct, result, simulationKey, form.provincia, form.departamento]);

  const syncDraftStrings = (next: FriendlyFormState) => {
    setMatriculaText(String(next.matriculaAlumnos));
    setAbPctText(String(next.abandonoPrevioPct));
    setAbCountText(String(next.abandonoPrevioAlumnos));
  };

  const selectPreset = (preset: ZonePreset) => {
    const next = presetToFriendlyState(preset);
    setActivePresetId(preset.id);
    setSimSeguimientoPct(0);
    setSimTutoriasPct(0);
    setSimConectividadPct(0);
    setForm(next);
    syncDraftStrings(next);
  };

  const resetToCustom = () => {
    const next = buildCustomState(specs, provinces);
    setActivePresetId('custom');
    setSimSeguimientoPct(0);
    setSimTutoriasPct(0);
    setSimConectividadPct(0);
    setForm(next);
    syncDraftStrings(next);
  };

  const pred = result?.prediccion;
  const theme = getVisualRiskTheme(pred?.nivelRiesgo ?? 'bajo');
  const alumnosEnRiesgo = pred ? Math.round((form.matriculaAlumnos * pred.tasaEstimadaPct) / 100) : 0;
  const simAlumnosEnRiesgo = simResult
    ? Math.round((form.matriculaAlumnos * simResult.prediccion.tasaEstimadaPct) / 100)
    : alumnosEnRiesgo;
  const alumnosRetenidos = Math.max(0, alumnosEnRiesgo - simAlumnosEnRiesgo);

  const activePresetObj = presets.find((p) => p.id === activePresetId);
  const provincialReference = provinces.find((p) => p.provincia === form.provincia);

  return (
    <div className="space-y-6">
      {/* Cabecera simple con ejemplos reales en 1 clic */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Evaluador de Riesgo de Abandono Escolar
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Cargá los datos de una zona (departamento × sector × ámbito) y el modelo Random Forest de la Entrega 3 estima su tasa de abandono, la ubica en el ranking nacional y muestra qué factores pesan más.
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-3.5 py-2.5 text-xs text-slate-700 lg:max-w-xs">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#2c5282]" />
            <span>
              <strong>Uso recomendado:</strong> Ministerio de Educación, para decidir en qué zonas intervenir primero. El modelo trabaja por zona, no por escuela.
            </span>
          </div>
        </div>

        {/* Botones rápidos de ejemplos reales */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Probar con un caso real de Argentina o cargar datos propios:
          </p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => {
              const selected = activePresetId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPreset(p)}
                  className={`rounded-lg border px-3.5 py-2 text-left text-xs transition-colors ${
                    selected
                      ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white font-semibold'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 font-medium'
                  }`}
                >
                  {p.departamento} ({p.provincia} · {p.sector} {p.ambito})
                </button>
              );
            })}
            <button
              type="button"
              onClick={resetToCustom}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors ${
                activePresetId === 'custom'
                  ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white font-semibold'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Mis propios datos
            </button>
          </div>
          {activePresetId === 'custom' && (
            <p className="mt-3 text-xs leading-relaxed text-slate-600">
              Elegí la provincia para usar su referencia de abandono de 2022, o ingresá la tasa de tu zona.
              Los demás valores iniciales son referencias de entrenamiento: ajustalos con tus propios datos.
            </p>
          )}
        </div>
      </section>

      {/* Cuerpo principal: Formulario intuitivo (izq) + Resultado claro (der) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* IZQUIERDA: FORMULARIO EN LENGUAJE HUMANO */}
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-6">
          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* PASO 1: IDENTIFICACIÓN */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1e3a5f] text-xs font-bold text-white">
                1
              </span>
              <h2 className="font-display text-base font-bold text-slate-900">
                ¿Dónde está la zona?
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="inp-prov" className="block text-xs font-semibold text-slate-700">
                  Provincia
                </label>
                <select
                  id="inp-prov"
                  value={form.provincia}
                  onChange={(e) => {
                    setActivePresetId('custom');
                    const next = changeProvince(form, e.target.value, provinces);
                    setForm(next);
                    syncDraftStrings(next);
                    setSimSeguimientoPct(0);
                    setSimTutoriasPct(0);
                    setSimConectividadPct(0);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1e3a5f] focus:outline-none"
                >
                  {provinces.map((prov) => (
                    <option key={prov.provincia} value={prov.provincia}>
                      {prov.provincia}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="inp-depto" className="block text-xs font-semibold text-slate-700">
                  Departamento
                </label>
                <input
                  id="inp-depto"
                  type="text"
                  value={form.departamento}
                  onChange={(e) => {
                    setActivePresetId('custom');
                    setForm((s) => ({ ...s, departamento: e.target.value }));
                  }}
                  placeholder="Ej. Orán, La Matanza"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#1e3a5f] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1">Gestión</span>
                <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  {(['Estatal', 'Privado'] as const).map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        setActivePresetId('custom');
                        setForm((s) => ({ ...s, sector: sec }));
                      }}
                      className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                        form.sector === sec
                          ? 'bg-white text-[#1e3a5f] shadow-xs font-semibold'
                          : 'text-slate-600'
                      }`}
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1">Ámbito</span>
                <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  {(['Urbano', 'Rural'] as const).map((amb) => (
                    <button
                      key={amb}
                      type="button"
                      onClick={() => {
                        setActivePresetId('custom');
                        setForm((s) => ({ ...s, ambito: amb }));
                      }}
                      className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                        form.ambito === amb
                          ? 'bg-white text-[#1e3a5f] shadow-xs font-semibold'
                          : 'text-slate-600'
                      }`}
                    >
                      {amb}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1">Conurbano GBA</span>
                <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  {[
                    { val: false, label: 'No' },
                    { val: true, label: 'Sí' },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      disabled={opt.val && form.provincia !== 'Buenos Aires'}
                      onClick={() => {
                        setActivePresetId('custom');
                        setForm((s) => ({ ...s, esConurbano: opt.val }));
                      }}
                      className={`rounded-md py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                        form.esConurbano === opt.val
                          ? 'bg-white text-[#1e3a5f] shadow-xs font-semibold'
                          : 'text-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* PASO 2: MATRÍCULA Y TRAYECTORIA (LO MÁS IMPORTANTE) */}
          <section className="space-y-4 border-t border-slate-200 pt-5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1e3a5f] text-xs font-bold text-white">
                2
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Alumnos y trayectoria escolar (lo que más influye)
                </h2>
              </div>
            </div>

            {/* Cantidad total de alumnos */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="inp-mat" className="text-xs font-semibold text-slate-800">
                  ¿Cuántos alumnos hay inscriptos en total (1° a 12° año)?
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="inp-mat"
                    type="number"
                    min={10}
                    max={300000}
                    step={50}
                    value={matriculaText}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setMatriculaText(raw);
                      const parsed = Number(raw);
                      if (raw.trim() !== '' && Number.isFinite(parsed) && parsed >= 10) {
                        const val = Math.min(300000, Math.round(parsed));
                        setActivePresetId('custom');
                        setForm((s) => {
                          if (s.abandonoInputMode === 'count') {
                            const nextPct = Number(((s.abandonoPrevioAlumnos / val) * 100).toFixed(2));
                            setAbPctText(String(nextPct));
                            return {
                              ...s,
                              matriculaAlumnos: val,
                              abandonoPrevioPct: nextPct,

                            };
                          }
                          const nextCount = Math.round((val * s.abandonoPrevioPct) / 100);
                          setAbCountText(String(nextCount));
                          return {
                            ...s,
                            matriculaAlumnos: val,
                            abandonoPrevioAlumnos: nextCount,
                          };
                        });
                      }
                    }}
                    onBlur={() => {
                      const parsed = Number(matriculaText);
                      const valid = Number.isFinite(parsed) && parsed >= 10 ? Math.min(300000, Math.round(parsed)) : form.matriculaAlumnos;
                      setMatriculaText(String(valid));
                    }}
                    className="w-28 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-right font-mono text-sm font-semibold tabular-nums text-slate-900 focus:border-[#1e3a5f] focus:outline-none"
                  />
                  <span className="text-xs text-slate-500">alumnos</span>
                </div>
              </div>
            </div>

            {/* Abandono del año anterior (toggle % vs cantidad de alumnos) */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-slate-700">
                <label className="flex cursor-pointer items-center gap-2 font-semibold text-[#1e3a5f]">
                  <input
                    type="checkbox"
                    checked={form.abandonoSource === 'provincial'}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? useProvinceHistory(form, provinces)
                        : { ...form, abandonoSource: 'manual' as const };
                      setActivePresetId('custom');
                      setForm(next);
                      syncDraftStrings(next);
                    }}
                  />
                  Usar referencia provincial de 2022
                </label>
                <p className="mt-2" data-testid="history-source">
                  {form.abandonoSource === 'provincial'
                    ? `Referencia de ${form.provincia}: ${provincialReference?.ciclo2022Pct.toFixed(2).replace('.', ',')}%. Se actualiza al cambiar de provincia. Es un promedio provincial, no un dato observado de esta zona.`
                    : 'Estás usando una tasa propia. Se conserva al cambiar de provincia; con las mismas variables, el modelo puede dar la misma estimación.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="inp-ab-prev" className="text-xs font-semibold text-slate-800">
                  Abandono del ciclo anterior (2022)
                </label>
                <div className="flex items-center rounded-md border border-slate-200 bg-white p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setAbPctText(String(effectiveAbandonoPrevioPct));
                      setForm((s) => ({ ...s, abandonoInputMode: 'pct', abandonoPrevioPct: effectiveAbandonoPrevioPct }));
                    }}
                    className={`rounded px-2 py-1 font-medium ${
                      form.abandonoInputMode === 'pct'
                        ? 'bg-[#1e3a5f] text-white'
                        : 'text-slate-600'
                    }`}
                  >
                    En porcentaje (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAbCountText(String(form.abandonoPrevioAlumnos));
                      setForm((s) => ({ ...s, abandonoInputMode: 'count', abandonoSource: 'manual' }));
                    }}
                    className={`rounded px-2 py-1 font-medium ${
                      form.abandonoInputMode === 'count'
                        ? 'bg-[#1e3a5f] text-white'
                        : 'text-slate-600'
                    }`}
                  >
                    En cant. alumnos
                  </button>
                </div>
              </div>

              {form.abandonoInputMode === 'pct' ? (
                <div className="flex items-center gap-3">
                  <input
                    id="inp-ab-prev"
                    type="range"
                    min={0}
                    max={15}
                    step={0.1}
                    value={Math.min(15, form.abandonoPrevioPct)}
                    onChange={(e) => {
                      const pct = Number(e.target.value);
                      setActivePresetId('custom');
                      setAbPctText(String(pct));
                      const cnt = Math.round((form.matriculaAlumnos * pct) / 100);
                      setAbCountText(String(cnt));
                      setForm((s) => ({
                        ...s,
                        abandonoSource: 'manual',
                        abandonoPrevioPct: pct,
                        abandonoPrevioAlumnos: cnt,

                      }));
                    }}
                    className="flex-1 accent-[#c53030]"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      aria-label="Porcentaje de abandono año anterior"
                      type="number"
                      min={0}
                      max={50}
                      step={0.1}
                      value={abPctText}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setAbPctText(raw);
                        const parsed = Number(raw);
                        if (raw.trim() !== '' && Number.isFinite(parsed)) {
                          const pct = Math.max(0, Math.min(50, parsed));
                          const cnt = Math.round((form.matriculaAlumnos * pct) / 100);
                          setAbCountText(String(cnt));
                          setActivePresetId('custom');
                          setForm((s) => ({
                            ...s,
                            abandonoSource: 'manual',
                        abandonoPrevioPct: pct,
                            abandonoPrevioAlumnos: cnt,

                          }));
                        }
                      }}
                      onBlur={() => setAbPctText(String(form.abandonoPrevioPct))}
                      className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-right font-mono text-sm font-semibold tabular-nums"
                    />
                    <span className="text-xs font-semibold text-slate-600">%</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-600">
                    Equivale a{' '}
                    <strong className="font-mono text-slate-900">
                      {effectiveAbandonoPrevioPct.toFixed(2)}%
                    </strong>{' '}
                    de los {form.matriculaAlumnos.toLocaleString('es-AR')} alumnos
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="inp-ab-prev"
                      type="number"
                      min={0}
                      max={form.matriculaAlumnos}
                      value={abCountText}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setAbCountText(raw);
                        const parsed = Number(raw);
                        if (raw.trim() !== '' && Number.isFinite(parsed)) {
                          const cnt = Math.max(0, Math.min(form.matriculaAlumnos, Math.round(parsed)));
                          const pct = Number(((cnt / Math.max(1, form.matriculaAlumnos)) * 100).toFixed(2));
                          setAbPctText(String(pct));
                          setActivePresetId('custom');
                          setForm((s) => ({
                            ...s,
                            abandonoPrevioAlumnos: cnt,
                            abandonoSource: 'manual',
                        abandonoPrevioPct: pct,

                          }));
                        }
                      }}
                      onBlur={() => setAbCountText(String(form.abandonoPrevioAlumnos))}
                      className="w-24 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-right font-mono text-sm font-semibold tabular-nums"
                    />
                    <span className="text-xs text-slate-500">chicos</span>
                  </div>
                </div>
              )}
            </div>

            {/* Sliders claros para Sobreedad y Repitentes */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex justify-between text-xs">
                  <label htmlFor="sld-sobreedad" className="font-semibold text-slate-800">
                    Alumnos con sobreedad
                  </label>
                  <span className="font-mono font-bold tabular-nums text-[#1e3a5f]">
                    {form.sobreedadPct}%
                  </span>
                </div>
                <input
                  id="sld-sobreedad"
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={form.sobreedadPct}
                  onChange={(e) => {
                    setActivePresetId('custom');
                    setForm((s) => ({ ...s, sobreedadPct: Number(e.target.value) }));
                  }}
                  className="mt-2 w-full accent-[#1e3a5f]"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Chicos con mayor edad que la esperada para su grado (≈{' '}
                  {Math.round((form.matriculaAlumnos * form.sobreedadPct) / 100)} alumnos).
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex justify-between text-xs">
                  <label htmlFor="sld-repitentes" className="font-semibold text-slate-800">
                    Alumnos repitentes
                  </label>
                  <span className="font-mono font-bold tabular-nums text-[#1e3a5f]">
                    {form.repitentesPct}%
                  </span>
                </div>
                <input
                  id="sld-repitentes"
                  type="range"
                  min={0}
                  max={35}
                  step={1}
                  value={form.repitentesPct}
                  onChange={(e) => {
                    setActivePresetId('custom');
                    setForm((s) => ({ ...s, repitentesPct: Number(e.target.value) }));
                  }}
                  className="mt-2 w-full accent-[#1e3a5f]"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Estudiantes que recursan este año (≈{' '}
                  {Math.round((form.matriculaAlumnos * form.repitentesPct) / 100)} alumnos).
                </p>
              </div>
            </div>
          </section>

          {/* PASO 3: CONTEXTO SOCIAL Y ESCOLAR */}
          <section className="space-y-3.5 border-t border-slate-200 pt-5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1e3a5f] text-xs font-bold text-white">
                3
              </span>
              <h2 className="font-display text-base font-bold text-slate-900">
                Contexto social de las familias y la zona
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    id: 'nseBajoPct',
                    label: 'Familias de bajos recursos',
                    value: form.nseBajoPct,
                    max: 100,
                  },
                  {
                    id: 'sinInternetPct',
                    label: 'Hogares sin internet',
                    value: form.sinInternetPct,
                    max: 100,
                  },
                  {
                    id: 'madreSinSecPct',
                    label: 'Madres sin secundario completo',
                    value: form.madreSinSecPct,
                    max: 100,
                  },
                  {
                    id: 'vacantesSecPct',
                    label: 'Horas docentes sin cubrir (Sec.)',
                    value: form.vacantesSecPct,
                    max: 50,
                  },
                  {
                    id: 'almuerzoPct',
                    label: 'Alumnos con comedor escolar',
                    value: form.almuerzoPct,
                    max: 100,
                  },
                ] as const
              ).map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 px-3 py-2.5">
                  <div className="flex justify-between text-xs">
                    <label htmlFor={`sld-${item.id}`} className="font-medium text-slate-800">
                      {item.label}
                    </label>
                    <span className="font-mono font-semibold tabular-nums text-slate-900">
                      {item.value}%
                    </span>
                  </div>
                  <input
                    id={`sld-${item.id}`}
                    type="range"
                    min={0}
                    max={item.max}
                    step={1}
                    value={item.value}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setActivePresetId('custom');
                      setForm((s) => ({ ...s, [item.id]: v }));
                    }}
                    className="mt-1.5 w-full accent-[#2c5282]"
                  />
                </div>
              ))}
            </div>

            {/* Desplegable opcional para analistas */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2c5282] hover:underline"
              >
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {showAdvanced
                  ? 'Ocultar variables complementarias'
                  : 'Ajustar variables complementarias (opcional)'}
              </button>

              {showAdvanced && (
                <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 sm:grid-cols-2">
                  {(
                    [
                      { key: 'abandonoSecPrevioPct', label: 'Abandono previo en secundaria (%)', max: 25, step: 0.1 },
                      { key: 'pesoSecundariaPct', label: 'Peso de matrícula secundaria (%)', max: 100, step: 1 },
                      { key: 'mujeresPct', label: 'Estudiantes mujeres (%)', max: 80, step: 1 },
                      { key: 'sinAguaPct', label: 'Hogares sin agua potable (%)', max: 100, step: 1 },
                      { key: 'vacantesPrimPct', label: 'Cargos vacantes primaria (%)', max: 50, step: 1 },
                      { key: 'fueraPlantaSecPct', label: 'Horas fuera de planta sec. (%)', max: 100, step: 1 },
                      { key: 'discapacidadPct', label: 'Estudiantes con discapacidad (%)', max: 20, step: 0.2 },
                      { key: 'indigenaPct', label: 'Pueblos originarios (%)', max: 100, step: 1 },
                    ] as const
                  ).map((adv) => (
                    <div key={adv.key}>
                      <label htmlFor={`adv-${adv.key}`} className="block text-[11px] font-medium text-slate-700">
                        {adv.label}
                      </label>
                      <input
                        id={`adv-${adv.key}`}
                        type="number"
                        min={0}
                        max={adv.max}
                        step={adv.step}
                        value={form[adv.key]}
                        onChange={(e) => {
                          setActivePresetId('custom');
                          setForm((s) => ({ ...s, [adv.key]: Number(e.target.value) || 0 }));
                        }}
                        className="mt-1 w-full rounded border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs tabular-nums"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* DERECHA: DIAGNÓSTICO CLARO Y SIMULADOR ACCIONABLE */}
        <div className="space-y-5 lg:col-span-6" aria-busy={loading}>
          {loading && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-sm text-blue-900">Calculando la estimación para {form.provincia}…</div>}
          {pred && result && (
            <>
              {/* Tarjeta principal semáforo */}
              <section className={`rounded-xl border p-6 ${theme.card}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${theme.badge}`}
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {theme.headline}
                  </span>
                  <span className="text-xs font-medium text-slate-600">
                    {form.provincia} · {form.departamento} ({form.sector} {form.ambito})
                  </span>
                </div>

                {/* Cifras grandes en lenguaje humano */}
                <div className="mt-5 grid grid-cols-1 gap-4 border-y border-slate-200/80 py-5 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Tasa estimada de abandono
                    </p>
                    <p data-testid="estimated-rate" className={`mt-1 font-mono text-4xl font-bold tabular-nums ${theme.number}`}>
                      {pred.tasaEstimadaPct.toFixed(2).replace('.', ',')}%
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200/80 bg-white/85 p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <Users className="h-4 w-4 text-[#1e3a5f]" />
                      Impacto estimado en alumnos
                    </div>
                    <p className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">
                      ≈ {alumnosEnRiesgo.toLocaleString('es-AR')} alumnos
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Aproximación: tasa estimada × matrícula de {form.matriculaAlumnos.toLocaleString('es-AR')} estudiantes
                      {loading ? ' · Actualizando...' : '.'}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-slate-700">{theme.summary}</p>
                {pred.referenciaProvincial && (
                  <p className="mt-3 rounded-lg border border-blue-200 bg-white/90 p-3 text-xs text-slate-700">
                    Para calcular esta estimación se usó el abandono provincial de 2022 de {pred.referenciaProvincial.provincia}: {' '}
                    <strong>{pred.referenciaProvincial.tasaPct.toFixed(2).replace('.', ',')}%</strong>.
                    La predicción corresponde a una zona con los datos del formulario, no al promedio de toda la provincia.
                  </p>
                )}
                {pred.advertenciasEntrada.filter((warning) => !warning.startsWith('Se usó la referencia provincial')).map((warning) => (
                  <p key={warning} className="mt-2 text-xs text-amber-900">{warning}</p>
                ))}

                {/* Comparación visual simple contra el país */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">
                      Comparación con el resto de Argentina
                    </span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      Más riesgoso que el {pred.percentilNacional}% de las zonas
                    </span>
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full border border-slate-200 bg-white">
                    <div
                      className={`h-full ${theme.bar}`}
                      style={{ width: `${Math.min(100, Math.max(4, pred.percentilNacional))}%` }}
                    />
                    <div
                      title="Corte Top 25% prioritario"
                      className="absolute inset-y-0 left-[75%] w-0.5 bg-slate-900/70"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>0% (Menor riesgo)</span>
                    <span>Zona de alerta (Top 25%)</span>
                    <span>100%</span>
                  </div>
                </div>

                {activePresetObj?.tasaRealReferenciaPct !== undefined && (
                  <p className="mt-3 text-xs text-slate-700">
                    Referencia histórica real (2023):{' '}
                    <strong className="font-mono">
                      {activePresetObj.tasaRealReferenciaPct.toFixed(2).replace('.', ',')}%
                    </strong>
                  </p>
                )}

                {pred.advertenciaSubestimacion && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-white/90 p-3 text-xs text-amber-950">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <span>
                      <strong>Nota importante:</strong> en zonas con abandono histórico elevado, priorizá la intervención por su posición en el ranking nacional (Percentil {pred.percentilNacional}).
                    </span>
                  </div>
                )}
              </section>

              {/* ¿POR QUÉ DA ESTE RESULTADO? */}
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-display text-base font-bold text-slate-900">
                  ¿Por qué el modelo da este nivel de riesgo?
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Principales factores que suben o bajan la probabilidad respecto de una zona promedio del país.
                </p>

                <div className="mt-4 space-y-3">
                  {(() => {
                    const topDrivers = pred.contribuciones.slice(0, 5);
                    const maxDriverAbs = Math.max(
                      0.4,
                      ...topDrivers.map((item) => Math.abs(item.impactoPp))
                    );
                    return topDrivers.map((d) => {
                      const isUp = d.direccion === 'aumenta';
                      const widthPct = Math.min(
                        100,
                        Math.max(10, Math.round((Math.abs(d.impactoPp) / maxDriverAbs) * 100))
                      );
                      return (
                        <div key={d.key} className="space-y-1 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-800">
                              {HUMAN_DRIVER_LABELS[d.key] ?? d.label}
                            </span>
                            <span
                              className={`font-mono font-semibold tabular-nums shrink-0 ${
                                isUp ? 'text-red-700' : 'text-emerald-700'
                              }`}
                            >
                              {isUp ? 'Sube +' : 'Baja '}
                              {d.impactoPp.toFixed(2).replace('.', ',')} pts
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${isUp ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </section>

              {/* SIMULADOR DE MEDIDAS ("¿QUÉ PASA SI INTERVENIMOS?") */}
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-[#1e3a5f]" />
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Simulador: ¿cómo cambia el riesgo estimado si mejoran estos indicadores?
                    </h3>
                  </div>
                  {(simSeguimientoPct > 0 || simTutoriasPct > 0 || simConectividadPct > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSimSeguimientoPct(0);
                        setSimTutoriasPct(0);
                        setSimConectividadPct(0);
                      }}
                      className="text-xs font-semibold text-[#2c5282] hover:underline"
                    >
                      Reiniciar
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Mové los controles para ver cómo cambia la predicción si bajan estos indicadores. Ojo: el modelo aprende asociaciones, no causas, así que esto no mide el efecto real de una política.
                </p>

                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between font-medium text-slate-700">
                      <label htmlFor="sim-seg">
                        Abandono del año anterior
                      </label>
                      <span className="font-mono font-semibold tabular-nums">−{simSeguimientoPct}%</span>
                    </div>
                    <input
                      id="sim-seg"
                      type="range"
                      min={0}
                      max={60}
                      step={5}
                      value={simSeguimientoPct}
                      onChange={(e) => setSimSeguimientoPct(Number(e.target.value))}
                      className="mt-1 w-full accent-[#1e3a5f]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-medium text-slate-700">
                      <label htmlFor="sim-tut">
                        Sobreedad y repitencia
                      </label>
                      <span className="font-mono font-semibold tabular-nums">−{simTutoriasPct}%</span>
                    </div>
                    <input
                      id="sim-tut"
                      type="range"
                      min={0}
                      max={50}
                      step={5}
                      value={simTutoriasPct}
                      onChange={(e) => setSimTutoriasPct(Number(e.target.value))}
                      className="mt-1 w-full accent-[#1e3a5f]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-medium text-slate-700">
                      <label htmlFor="sim-con">
                        Hogares sin internet
                      </label>
                      <span className="font-mono font-semibold tabular-nums">−{simConectividadPct}%</span>
                    </div>
                    <input
                      id="sim-con"
                      type="range"
                      min={0}
                      max={70}
                      step={5}
                      value={simConectividadPct}
                      onChange={(e) => setSimConectividadPct(Number(e.target.value))}
                      className="mt-1 w-full accent-[#1e3a5f]"
                    />
                  </div>
                </div>

                {simResult && (
                  <div className="mt-4 flex flex-col justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50/80 p-3.5 sm:flex-row sm:items-center">
                    <div className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#1e3a5f]" />
                      <div className="text-xs">
                        <p className="font-bold text-slate-900">
                          Con estos indicadores, la estimación sería{' '}
                          <span className="font-mono text-[#1e3a5f]">
                            {simResult.prediccion.tasaEstimadaPct.toFixed(2).replace('.', ',')}%
                          </span>{' '}
                          (≈ {simAlumnosEnRiesgo.toLocaleString('es-AR')} alumnos)
                        </p>
                        <p className="text-slate-600">
                          Percentil nacional {simResult.prediccion.percentilNacional} (antes {pred.percentilNacional})
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-bold text-emerald-700 shrink-0 tabular-nums">
                      {alumnosRetenidos > 0
                        ? `−${alumnosRetenidos} alumnos estimados`
                        : `${(simResult.prediccion.tasaEstimadaPct - pred.tasaEstimadaPct).toFixed(2)} pp`}
                    </span>
                  </div>
                )}
              </section>

              {/* RECOMENDACIONES CONCRETAS */}
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Acciones sugeridas para esta zona
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {pred.recomendaciones.map((rec, i) => (
                    <li key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2c5282]" />
                        <div>
                          <p className="font-semibold text-slate-900">{rec.titulo}</p>
                          <p className="mt-0.5 leading-relaxed text-slate-600">{rec.justificacion}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
