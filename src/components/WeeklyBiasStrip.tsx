import { useNavigate } from 'react-router-dom';
import { CURRENCIES } from '../data/CurrencyContext';
import { useMacroData } from '../data/MacroDataContext';
import { BIAS_COLORS, BIAS_LABELS } from '../lib/bias';
import type { BiasLevel } from '../types';

// Sesgo sugerido a partir del Score Compuesto cuando todavía no se definió
// uno a mano — heurística gruesa (el score va de -26 a +26 aprox.), solo
// para no arrancar la semana con las 9 divisas en "Sin definir".
function suggestFromScore(total: number): BiasLevel {
  if (total > 5) return 'hawkish';
  if (total > 1) return 'neutral_alcista';
  if (total < -5) return 'dovish';
  if (total < -1) return 'neutral_bajista';
  return 'neutral';
}

export function WeeklyBiasStrip() {
  const { biases, scoreRows } = useMacroData();
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-9">
      {CURRENCIES.map((currency) => {
        const bias = biases[currency];
        if (!bias) return null;
        const manual = bias.current.level;
        const total = scoreRows.filter((r) => (r.currency ?? 'USD') === currency).reduce((sum, r) => sum + r.valoracion, 0);
        const level = manual ?? suggestFromScore(total);
        const isSuggested = manual === null;

        return (
          <button
            key={currency}
            onClick={() => navigate('/panel-control')}
            className="flex flex-col items-center gap-1 rounded-lg p-2 text-center transition-colors hover:bg-[var(--surface-2)]"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
            title={isSuggested ? 'Sugerido por el Score Compuesto — sin sesgo manual definido todavía' : 'Sesgo definido a mano'}
          >
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              {currency}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ color: '#fff', background: BIAS_COLORS[level], opacity: isSuggested ? 0.65 : 1 }}
            >
              {BIAS_LABELS[level]}
            </span>
            {isSuggested && (
              <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                sugerido
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
