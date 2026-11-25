import { FileCode2, Menu, X } from 'lucide-react';
import { useState } from 'react';

export type ActiveTab = 'tablero' | 'evaluador' | 'lote' | 'metodologia';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenApiModal: () => void;
}

const NAV_ITEMS: Array<{ id: ActiveTab; label: string }> = [
  { id: 'tablero', label: 'Tablero Territorial' },
  { id: 'evaluador', label: 'Evaluador de Zona' },
  { id: 'lote', label: 'Carga por Lote' },
  { id: 'metodologia', label: 'Modelo y Metodología' },
];

export function TopBar({ activeTab, onSelectTab, onOpenApiModal }: TopBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Zona 1: Marca */}
        <button
          type="button"
          onClick={() => onSelectTab('tablero')}
          className="flex items-center gap-3 text-left whitespace-nowrap shrink-0 focus:outline-none"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1e3a5f] text-xs font-bold tracking-wider text-white">
            SA
          </span>
          <span className="font-display text-base font-bold tracking-tight text-slate-900">
            SATED
          </span>
          <span className="hidden text-xs font-medium text-slate-500 xl:inline">
            Alerta Temprana Escolar · Argentina
          </span>
        </button>

        {/* Zona 2: Navegación horizontal limpia */}
        <nav aria-label="Navegación principal" className="hidden items-center gap-7 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'text-[#1e3a5f] font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#1e3a5f]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zona 3: Acción primaria + botón móvil */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenApiModal}
            className="hidden items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:inline-flex"
          >
            <FileCode2 className="h-3.5 w-3.5 text-[#2c5282]" />
            API REST
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('evaluador')}
            className="rounded-md bg-[#1e3a5f] px-3.5 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors hover:bg-[#162d4a]"
          >
            Evaluar Zona
          </button>
          <button
            type="button"
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-md border border-slate-200 p-2 text-slate-700 md:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="Navegación móvil"
          className="border-t border-slate-200 bg-white px-4 py-3 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileOpen(false);
                  }}
                  className={`rounded-md px-3 py-2 text-left text-sm font-medium ${
                    isActive
                      ? 'bg-slate-100 text-[#1e3a5f] font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                onOpenApiModal();
                setMobileOpen(false);
              }}
              className="mt-1 flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-700"
            >
              <FileCode2 className="h-3.5 w-3.5 text-[#2c5282]" />
              Documentación API REST
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
