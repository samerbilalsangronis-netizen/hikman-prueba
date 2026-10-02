import { NavLink, useLocation } from 'react-router-dom';

// Barra lateral fija con los 4 módulos principales de navegación — pedido
// explícito del usuario (2-oct-2026) para sacar la navegación del header y
// dejarlo solo con divisa/sincronización/tema. Cada módulo "grande" (Macro
// Fundamental, Técnico/Avanzado) agrupa varias rutas existentes; cuál ruta
// pertenece a cuál grupo se define en MACRO_PATHS/TECNICO_PATHS más abajo
// (usado también por Layout.tsx para decidir qué sub-nav mostrar).
export const MACRO_PATHS = ['/', '/tasas', '/inflacion', '/empleo', '/crecimiento', '/confianza', '/alemania', '/francia', '/banqueros', '/titulares', '/actualizar'];
export const TECNICO_PATHS = ['/fortaleza', '/renta-variable'];

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
  { to: '/fortaleza', icon: '🕯️', label: 'Análisis Técnico/Avanzado', activePaths: TECNICO_PATHS },
];

export function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside
      className="sticky top-0 flex h-screen w-16 shrink-0 flex-col items-center gap-1 overflow-y-auto py-4 sm:w-64 sm:items-stretch sm:px-3"
      style={{ background: 'var(--surface-1)', borderRight: '1px solid var(--border)' }}
    >
      <div className="mb-4 flex shrink-0 items-center gap-2 px-1 sm:px-2">
        <img src="/logo-icon.png" alt="Hikman Capital" className="h-7 w-auto shrink-0" />
        <span className="hidden text-sm font-bold sm:inline" style={{ color: 'var(--text-primary)' }}>
          Hikman Capital
        </span>
      </div>
      <nav className="flex w-full flex-col gap-1">
        {ITEMS.map((item) => {
          const isActive = (item.activePaths ?? [item.to]).includes(pathname);
          return (
            <NavLink
              key={item.label}
              to={item.to}
              title={item.label}
              className="flex items-center justify-center gap-2.5 rounded-lg px-0 py-2.5 text-sm font-medium transition-colors sm:justify-start sm:px-3"
              style={{
                background: isActive ? 'var(--series-1)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
              }}
            >
              <span className="shrink-0 text-lg leading-none">{item.icon}</span>
              <span className="hidden leading-tight sm:inline">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
