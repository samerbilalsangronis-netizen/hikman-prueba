import { useState } from 'react';
import { AccountsTab } from '../components/trading/AccountsTab';
import { RegisterTradeTab } from '../components/trading/RegisterTradeTab';
import { HistoryTab } from '../components/trading/HistoryTab';
import { JournalDashboardTab } from '../components/trading/JournalDashboardTab';

// Todo lo que en el sistema anterior (Excel/Apps Script) vivía repartido en
// secciones separadas (Cuentas, Registrar Trade, Historial, Dashboard) se
// agrupa acá en una sola pestaña de nav con sub-pestañas — pedido explícito
// del usuario para mantener el orden (sesión 7-sep-2026).
const TABS = [
  { id: 'cuentas', label: 'Cuentas' },
  { id: 'registrar', label: 'Registrar Trade' },
  { id: 'historial', label: 'Historial' },
  { id: 'dashboard', label: 'Dashboard' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function BitacoraTrading() {
  const [tab, setTab] = useState<TabId>('cuentas');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          🧾 Bitácora de Trading
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Cuentas, reglas de consistencia, trades y desempeño — migrado del sistema anterior.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-full p-0.5 self-start" style={{ border: '1px solid var(--border)' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
            style={{ background: tab === t.id ? 'var(--series-1)' : 'transparent', color: tab === t.id ? '#fff' : 'var(--text-secondary)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'cuentas' && <AccountsTab />}
      {tab === 'registrar' && <RegisterTradeTab />}
      {tab === 'historial' && <HistoryTab />}
      {tab === 'dashboard' && <JournalDashboardTab />}
    </div>
  );
}
