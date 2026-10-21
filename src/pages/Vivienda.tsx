import { useCurrency } from '../data/CurrencyContext';
import { SectionGrid } from '../components/SectionGrid';

// Sección exclusiva de USD (pedido explícito del usuario) — Layout.tsx
// oculta la pestaña para el resto de las divisas, pero si se cambia de
// divisa estando parado acá, se muestra un aviso en vez de una grilla vacía.
export function Vivienda() {
  const { currency } = useCurrency();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Sector Inmobiliario
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {currency === 'USD'
            ? 'Inicios de viviendas, permisos de construcción, ventas de viviendas nuevas y existentes, precios (Case-Shiller y FHFA) y tasa hipotecaria a 30 años — el sector más sensible a las tasas de la Fed.'
            : 'Esta sección solo está disponible para USD.'}
        </p>
      </div>
      {currency === 'USD' && <SectionGrid section="vivienda" months={36} />}
    </div>
  );
}
