import type { Currency } from '../types';

// Símbolos de renta variable por divisa — un índice representativo + un
// puñado de acciones influyentes. Dos fuentes posibles (ver
// api/equities-sync.ts, que es la que realmente hace el fetch):
// - 'finnhub': API oficial, soportada, con key gratuita (ya la usa
//   Titulares) — pero su tier gratis SOLO cubre EE.UU., por eso se usa
//   nada más para las acciones de USD.
// - 'yahoo': API no oficial de Yahoo Finance (query1.finance.yahoo.com,
//   sin key) — cubre los otros 8 mercados + TODOS los índices (incluido
//   el de USD, ya que Finnhub free no cotiza bien los índices). Formato
//   de símbolo "Ticker.Sufijo" por bolsa (ver cada entrada).
export interface EquitySymbol {
  symbol: string;
  label: string;
  source: 'finnhub' | 'yahoo';
}

export interface EquityGroup {
  index: EquitySymbol;
  stocks: EquitySymbol[];
}

export const EQUITIES_BY_CURRENCY: Record<Currency, EquityGroup> = {
  USD: {
    index: { symbol: '^GSPC', label: 'S&P 500', source: 'yahoo' },
    stocks: [
      { symbol: 'AAPL', label: 'Apple', source: 'finnhub' },
      { symbol: 'MSFT', label: 'Microsoft', source: 'finnhub' },
      { symbol: 'NVDA', label: 'Nvidia', source: 'finnhub' },
    ],
  },
  EUR: {
    index: { symbol: '^STOXX50E', label: 'Euro Stoxx 50', source: 'yahoo' },
    stocks: [
      { symbol: 'SAP.DE', label: 'SAP', source: 'yahoo' },
      { symbol: 'MC.PA', label: 'LVMH', source: 'yahoo' },
      { symbol: 'ASML.AS', label: 'ASML', source: 'yahoo' },
    ],
  },
  GBP: {
    index: { symbol: '^FTSE', label: 'FTSE 100', source: 'yahoo' },
    stocks: [
      { symbol: 'AZN.L', label: 'AstraZeneca', source: 'yahoo' },
      { symbol: 'SHEL.L', label: 'Shell', source: 'yahoo' },
      { symbol: 'HSBA.L', label: 'HSBC', source: 'yahoo' },
    ],
  },
  CAD: {
    index: { symbol: '^GSPTSE', label: 'S&P/TSX Composite', source: 'yahoo' },
    stocks: [
      { symbol: 'RY.TO', label: 'Royal Bank of Canada', source: 'yahoo' },
      { symbol: 'SHOP.TO', label: 'Shopify', source: 'yahoo' },
      { symbol: 'TD.TO', label: 'TD Bank', source: 'yahoo' },
    ],
  },
  AUD: {
    index: { symbol: '^AXJO', label: 'ASX 200', source: 'yahoo' },
    stocks: [
      { symbol: 'BHP.AX', label: 'BHP Group', source: 'yahoo' },
      { symbol: 'CBA.AX', label: 'Commonwealth Bank', source: 'yahoo' },
      { symbol: 'CSL.AX', label: 'CSL Limited', source: 'yahoo' },
    ],
  },
  NZD: {
    index: { symbol: '^NZ50', label: 'NZX 50', source: 'yahoo' },
    stocks: [
      { symbol: 'FPH.NZ', label: 'Fisher & Paykel Healthcare', source: 'yahoo' },
      { symbol: 'AIA.NZ', label: 'Auckland International Airport', source: 'yahoo' },
    ],
  },
  JPY: {
    index: { symbol: '^N225', label: 'Nikkei 225', source: 'yahoo' },
    stocks: [
      { symbol: '7203.T', label: 'Toyota', source: 'yahoo' },
      { symbol: '6758.T', label: 'Sony', source: 'yahoo' },
      { symbol: '9984.T', label: 'SoftBank Group', source: 'yahoo' },
    ],
  },
  CHF: {
    index: { symbol: '^SSMI', label: 'SMI (Swiss Market Index)', source: 'yahoo' },
    stocks: [
      { symbol: 'NESN.SW', label: 'Nestlé', source: 'yahoo' },
      { symbol: 'ROG.SW', label: 'Roche', source: 'yahoo' },
      { symbol: 'NOVN.SW', label: 'Novartis', source: 'yahoo' },
    ],
  },
  CNY: {
    index: { symbol: '000300.SS', label: 'CSI 300', source: 'yahoo' },
    stocks: [
      { symbol: '600519.SS', label: 'Kweichow Moutai', source: 'yahoo' },
      { symbol: '601988.SS', label: 'Bank of China', source: 'yahoo' },
    ],
  },
};
