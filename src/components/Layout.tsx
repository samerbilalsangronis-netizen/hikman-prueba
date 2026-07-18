import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useMacroData } from '../data/MacroDataContext';
import { CURRENCIES, useCurrency } from '../data/CurrencyContext';
import type { Currency } from '../types';

function navFor(currency: Currency) {
  return [
    { to: '/', label: 'Resumen', end: true },
    { to: '/tasas', label: currency === 'EUR' ? 'Tasas y BCE' : currency === 'GBP' ? 'Tasas y BoE' : 'Tasas y Fed' },
    { to: '/inflacion', label: 'Inflación' },
    { to: '/empleo', label: 'Empleo' },
    { to: '/crecimiento', label: 'Crecimiento' },
    { to: '/confianza', label: 'Confianza / Sentimiento' },
    { to: '/banqueros', label: 'Banqueros' },
    { to: '/actualizar', label: 'Actualizar Datos' },
  ];
}

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('macro-dashboard:theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('macro-dashboard:theme', theme);
  }, [theme]);

  return [theme, setTheme] as const;
}

export function Layout() {
  const [theme, setTheme] = useTheme();
  const { syncMode, loading } = useMacroData();
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="min-h-screen" style={{ background: 'var(--page)' }}>
      <header
        className="sticky top-0 z-10 backdrop-blur"
        style={{ background: 'color-mix(in srgb, var(--page) 85%, transparent)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {currency}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Seguimiento Macro Fundamental
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full p-0.5" style={{ border: '1px solid var(--border)' }}>
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                  style={{
                    background: currency === c ? 'var(--series-1)' : 'transparent',
                    color: currency === c ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            <span
              className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline-flex"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              title={
                syncMode === 'cloud'
                  ? 'Los datos se guardan en Supabase y se sincronizan entre dispositivos'
                  : 'Los datos se guardan solo en este navegador (configura Supabase para sincronizar)'
              }
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: syncMode === 'cloud' ? 'var(--status-good)' : 'var(--status-warning)' }}
              />
              {loading ? 'Cargando…' : syncMode === 'cloud' ? 'Sincronizado (Supabase)' : 'Guardado local'}
            </span>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              {theme === 'dark' ? '☀ Claro' : '● Oscuro'}
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {navFor(currency).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${isActive ? '' : ''}`
              }
              style={({ isActive }) => ({
                background: isActive ? 'var(--series-1)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-7xl px-4 py-8 text-xs sm:px-6" style={{ color: 'var(--text-muted)' }}>
        Datos actualizados manualmente. Revisa las insignias de frescura en cada tarjeta antes de operar con ellos.
      </footer>
    </div>
  );
}
