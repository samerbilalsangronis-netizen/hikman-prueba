import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useMacroData } from '../data/MacroDataContext';
import { CURRENCIES, useCurrency } from '../data/CurrencyContext';
import { indicatorsBySection } from '../data/indicators';
import { bankersForCurrency } from '../data/centralBankers';
import type { Currency } from '../types';

// Data-driven: una divisa sin indicadores en una sección (ej. CNY, que
// solo tiene Inflación/Crecimiento) no muestra esa pestaña — evita hardcodear
// una lista de divisas "incompletas" y funciona automáticamente para
// cualquier divisa futura con el mismo patrón.
function navFor(currency: Currency) {
  const items: { to: string; label: string; end?: boolean }[] = [
    { to: '/', label: 'Resumen', end: true },
    { to: '/titulares', label: 'Titulares' },
  ];

  if (indicatorsBySection('tasas', currency).length > 0) {
    items.push({
      to: '/tasas',
      label:
        currency === 'EUR'
          ? 'Tasas y BCE'
          : currency === 'GBP'
            ? 'Tasas y BoE'
            : currency === 'CAD'
              ? 'Tasas y BoC'
              : currency === 'AUD'
                ? 'Tasas y RBA'
                : currency === 'NZD'
                  ? 'Tasas y RBNZ'
                  : currency === 'JPY'
                    ? 'Tasas y BOJ'
                    : currency === 'CHF'
                      ? 'Tasas y SNB'
                      : 'Tasas y Fed',
    });
  }
  items.push({ to: '/inflacion', label: 'Inflación' });
  if (indicatorsBySection('empleo', currency).length > 0) items.push({ to: '/empleo', label: 'Empleo' });
  items.push({ to: '/crecimiento', label: 'Crecimiento' });
  if (indicatorsBySection('confianza', currency).length > 0) items.push({ to: '/confianza', label: 'Confianza / Sentimiento' });
  if (bankersForCurrency(currency).length > 0) items.push({ to: '/banqueros', label: 'Banqueros' });
  items.push({ to: '/actualizar', label: 'Actualizar Datos' });

  return items;
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
    <div className="relative isolate min-h-screen" style={{ background: 'var(--page)' }}>
      <img
        src="/logo-icon.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 right-0 -z-10 w-[38vw] max-w-2xl opacity-[0.05] select-none"
      />
      <header
        className="sticky top-0 z-10 backdrop-blur"
        style={{ background: 'color-mix(in srgb, var(--page) 85%, transparent)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="Hikman Capital" className="h-7 w-auto" />
            <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {currency}
            </span>
            <span className="hidden text-sm sm:inline" style={{ color: 'var(--text-muted)' }}>
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
