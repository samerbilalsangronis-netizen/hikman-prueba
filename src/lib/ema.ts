// Media móvil exponencial simple — se usa para suavizar el precio spot
// diario antes de calcular el retorno acumulado por divisa (mismo estilo
// "EMA" que las herramientas de fortaleza de divisa basadas en precio).
export function ema(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}
