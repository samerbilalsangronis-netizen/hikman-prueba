import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

// Barra lateral fija con los módulos principales de navegación — pedido
// explícito del usuario (2-oct-2026) para sacar la navegación del header y
// dejarlo solo con divisa/sincronización/tema. El módulo "grande" Macro
// Fundamental agrupa varias rutas existentes; cuál ruta pertenece a ese
// grupo se define en MACRO_PATHS más abajo (usado también por Layout.tsx
// para decidir qué sub-nav y qué barra de divisas mostrar).
// Análisis Técnico/Avanzado (Fortaleza + Renta Variable) se quitó a pedido
// del usuario (4-oct-2026, "realmente no lo uso") — ver HANDOFF.md.
// "Banqueros" salió de este grupo (5-oct-2026, a pedido del usuario) y pasó
// a ser su propia entrada en ITEMS más abajo — sigue dependiendo de la
// divisa seleccionada, por eso Layout.tsx también lo trata como "página con
// selector de divisa" aunque ya no sea parte de Macro Fundamental.
export const MACRO_PATHS = ['/', '/tasas', '/inflacion', '/empleo', '/crecimiento', '/confianza', '/alemania', '/francia', '/titulares', '/actualizar'];

const COLLAPSED_KEY = 'hikman:sidebar-collapsed';

interface SidebarItem {
  to: string;
  icon: string;
  label: string;
  activePaths?: readonly string[];
}

const ITEMS: SidebarItem[] = [
  { to: '/panel-control', icon: '📊', label: 'Panel de Control' },
  { to: '/bitacora-trading', icon: '🧾', label: 'Bitácora de Trading' },
  { to: '/', icon: '🏛️', label: 'Análisis Macro Fundamental', activePaths: MACRO_PATHS },
  { to: '/banqueros', icon: '🏦', label: 'Banqueros Centrales' },
];

export function Sidebar() {
  const { pathname } = useLocation();
  // Colapsado a voluntad (botón ☰) además del colapso automático por
  // pantalla angosta — pedido explícito del usuario para liberar ancho en
  // pantallas grandes también, no solo en mobile.
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === '1');

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col items-center gap-1 overflow-y-auto py-4 ${collapsed ? 'w-16' : 'w-16 sm:w-64 sm:items-stretch sm:px-3'}`}
      style={{ background: 'var(--surface-1)', borderRight: '1px solid var(--border)' }}
    >
      <div className={`mb-4 flex w-full shrink-0 items-center gap-2 px-1 ${collapsed ? 'justify-center' : 'justify-between sm:px-2'}`}>
        <div className="flex items-center gap-2 overflow-hidden">
          <img src="/logo-icon.png" alt="Hikman Capital" className="h-7 w-auto shrink-0" />
          {!collapsed && (
            <span className="hidden text-sm font-bold sm:inline" style={{ color: 'var(--text-primary)' }}>
              Hikman Capital
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="hidden shrink-0 rounded-md p-1.5 text-base leading-none sm:block"
          style={{ color: 'var(--text-muted)' }}
        >
          {collapsed ? '»' : '☰'}
        </button>
      </div>
      <nav className="flex w-full flex-col gap-1">
        {ITEMS.map((item) => {
          const isActive = (item.activePaths ?? [item.to]).includes(pathname);
          return (
            <NavLink
              key={item.label}
              to={item.to}
              title={item.label}
              className={`flex items-center gap-2.5 rounded-lg px-0 py-2.5 text-sm font-medium transition-colors ${collapsed ? 'justify-center' : 'justify-center sm:justify-start sm:px-3'}`}
              style={{
                background: isActive ? 'var(--series-1)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
              }}
            >
              <span className="shrink-0 text-lg leading-none">{item.icon}</span>
              {!collapsed && <span className="hidden leading-tight sm:inline">{item.label}</span>}
            </NavLink>
          );
        })}
        {/* Enlace externo a TraderMind (bitácora personal) — movido del
            header acá a pedido del usuario (4-oct-2026). No es una ruta
            interna (abre en pestaña nueva), por eso es un <a> suelto en vez
            de un NavLink más dentro de ITEMS. */}
        <a
          href="https://bitacora-personal-hc.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          title="Bitácora Personal (TraderMind)"
          className={`flex items-center gap-2.5 rounded-lg px-0 py-2.5 text-sm font-medium transition-colors ${collapsed ? 'justify-center' : 'justify-center sm:justify-start sm:px-3'}`}
          style={{ color: 'var(--text-secondary)' }}
        >
          <span className="shrink-0 text-lg leading-none">🧠</span>
          {!collapsed && <span className="hidden leading-tight sm:inline">Bitácora Personal</span>}
        </a>
      </nav>

      {/* Logo grande en el espacio libre de abajo — pedido del usuario
          (4-oct-2026). Se oculta colapsado: a 64px de ancho no entra bien. */}
      {!collapsed && (
        <div className="mt-auto hidden w-full justify-center pt-6 sm:flex">
          <img src="/logo-icon.png" alt="Hikman Capital" className="h-24 w-auto opacity-90" />
        </div>
      )}
    </aside>
  );
}
