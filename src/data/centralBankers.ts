import type { CentralBanker } from '../types';

// Composición verificada por búsqueda web (jul-2026) — no inventada. Fuentes:
// federalreserve.gov/monetarypolicy/fomc.htm, federalreserve.gov/aboutthefed/bios,
// ecb.europa.eu/ecb/orga. Cambios de personas (renuncias, rotaciones anuales de
// voto) requieren revisión periódica — no asumir que esto queda fijo para siempre.
export const FED_BANKERS: CentralBanker[] = [
  // Junta de Gobernadores — votan siempre en el FOMC.
  {
    id: 'fed_warsh',
    name: 'Kevin Warsh',
    title: 'Presidente de la Reserva Federal (Chair)',
    vote: 'voting',
    currency: 'USD',
    bioUrl: 'https://www.federalreserve.gov/aboutthefed/bios/board/warsh.htm',
  },
  {
    id: 'fed_jefferson',
    name: 'Philip N. Jefferson',
    title: 'Vicepresidente de la Reserva Federal (Vice Chair)',
    vote: 'voting',
    currency: 'USD',
    bioUrl: 'https://www.federalreserve.gov/aboutthefed/bios/board/jefferson.htm',
  },
  {
    id: 'fed_barr',
    name: 'Michael S. Barr',
    title: 'Gobernador de la Reserva Federal',
    vote: 'voting',
    currency: 'USD',
    bioUrl: 'https://www.federalreserve.gov/aboutthefed/bios/board/barr.htm',
  },
  {
    id: 'fed_bowman',
    name: 'Michelle W. Bowman',
    title: 'Gobernadora de la Reserva Federal',
    vote: 'voting',
    currency: 'USD',
    bioUrl: 'https://www.federalreserve.gov/aboutthefed/bios/board/bowman.htm',
  },
  {
    id: 'fed_cook',
    name: 'Lisa D. Cook',
    title: 'Gobernadora de la Reserva Federal (situación legal en disputa — puede no participar en reuniones del FOMC)',
    vote: 'voting',
    currency: 'USD',
    bioUrl: 'https://www.federalreserve.gov/aboutthefed/bios/board/cook.htm',
  },
  {
    id: 'fed_powell',
    name: 'Jerome H. Powell',
    title: 'Gobernador de la Reserva Federal (ex Presidente)',
    vote: 'voting',
    currency: 'USD',
    bioUrl: 'https://www.federalreserve.gov/aboutthefed/bios/board/powell.htm',
  },
  {
    id: 'fed_waller',
    name: 'Christopher J. Waller',
    title: 'Gobernador de la Reserva Federal',
    vote: 'voting',
    currency: 'USD',
    bioUrl: 'https://www.federalreserve.gov/aboutthefed/bios/board/waller.htm',
  },
  // Nueva York vota siempre (asiento permanente, Vicepresidente del FOMC).
  {
    id: 'fed_williams',
    name: 'John C. Williams',
    title: 'Presidente de la Fed de Nueva York (Vicepresidente del FOMC — voto permanente)',
    vote: 'voting',
    currency: 'USD',
    bioUrl: 'https://www.newyorkfed.org/aboutthefed/williams_bio',
  },
  // Los otros 4 votos rotan cada año entre los 11 bancos regionales restantes.
  // Turno 2026:
  {
    id: 'fed_hammack',
    name: 'Beth M. Hammack',
    title: 'Presidenta de la Fed de Cleveland (voto rotativo 2026)',
    vote: 'rotating',
    currency: 'USD',
    bioUrl: 'https://www.clevelandfed.org/people/beth-hammack',
  },
  {
    id: 'fed_kashkari',
    name: 'Neel Kashkari',
    title: 'Presidente de la Fed de Minneapolis (voto rotativo 2026)',
    vote: 'rotating',
    currency: 'USD',
    bioUrl: 'https://www.minneapolisfed.org/people/neel-kashkari',
  },
  {
    id: 'fed_logan',
    name: 'Lorie K. Logan',
    title: 'Presidenta de la Fed de Dallas (voto rotativo 2026)',
    vote: 'rotating',
    currency: 'USD',
    bioUrl: 'https://www.dallasfed.org/about/people/logan',
  },
  {
    id: 'fed_paulson',
    name: 'Anna Paulson',
    title: 'Presidenta de la Fed de Filadelfia (voto rotativo 2026)',
    vote: 'rotating',
    currency: 'USD',
    bioUrl: 'https://www.philadelphiafed.org/the-fed/anna-paulson',
  },
  // No votan este año (rotan en 2027).
  {
    id: 'fed_collins',
    name: 'Susan M. Collins',
    title: 'Presidenta de la Fed de Boston (no vota en 2026)',
    vote: 'nonvoting',
    currency: 'USD',
    bioUrl: 'https://www.bostonfed.org/about-us/susan-collins.aspx',
  },
  {
    id: 'fed_barkin',
    name: 'Thomas I. Barkin',
    title: 'Presidente de la Fed de Richmond (no vota en 2026)',
    vote: 'nonvoting',
    currency: 'USD',
    bioUrl: 'https://www.richmondfed.org/about_us/leadership/president/barkin_bio',
  },
  {
    id: 'fed_goolsbee',
    name: 'Austan D. Goolsbee',
    title: 'Presidente de la Fed de Chicago (no vota en 2026)',
    vote: 'nonvoting',
    currency: 'USD',
    bioUrl: 'https://www.chicagofed.org/people/g/goolsbee-austan',
  },
  {
    id: 'fed_musalem',
    name: 'Alberto Musalem',
    title: 'Presidente de la Fed de St. Louis (no vota en 2026)',
    vote: 'nonvoting',
    currency: 'USD',
    bioUrl: 'https://www.stlouisfed.org/en/about-us/leadership/alberto-musalem',
  },
  {
    id: 'fed_schmid',
    name: 'Jeffrey R. Schmid',
    title: 'Presidente de la Fed de Kansas City (no vota en 2026)',
    vote: 'nonvoting',
    currency: 'USD',
    bioUrl: 'https://www.kansascityfed.org/about-us/leadership/jeffrey-r-schmid/',
  },
  {
    id: 'fed_daly',
    name: 'Mary C. Daly',
    title: 'Presidenta de la Fed de San Francisco (no vota en 2026)',
    vote: 'nonvoting',
    currency: 'USD',
    bioUrl: 'https://www.frbsf.org/about-us/leadership/mary-c-daly/',
  },
  // Atlanta: Raphael Bostic renunció (efectivo fines de feb-2026); búsqueda de
  // sucesor en curso. No se agrega banquero hasta confirmarse el reemplazo.
];

export const ECB_BANKERS: CentralBanker[] = [
  // Comité Ejecutivo — participan y votan siempre.
  {
    id: 'ecb_lagarde',
    name: 'Christine Lagarde',
    title: 'Presidenta del BCE',
    vote: 'voting',
    currency: 'EUR',
    bioUrl: 'https://www.ecb.europa.eu/ecb/orga/decisions/eb/html/cvs/lagarde/profile.en.html',
  },
  {
    id: 'ecb_vujcic',
    name: 'Boris Vujčić',
    title: 'Vicepresidente del BCE',
    vote: 'voting',
    currency: 'EUR',
    bioUrl: 'https://www.ecb.europa.eu/ecb/orga/decisions/eb/html/index.en.html',
  },
  {
    id: 'ecb_lane',
    name: 'Philip R. Lane',
    title: 'Economista Jefe del BCE (Comité Ejecutivo)',
    vote: 'voting',
    currency: 'EUR',
    bioUrl: 'https://www.ecb.europa.eu/ecb/orga/decisions/eb/html/index.en.html',
  },
  {
    id: 'ecb_schnabel',
    name: 'Isabel Schnabel',
    title: 'Miembro del Comité Ejecutivo del BCE',
    vote: 'voting',
    currency: 'EUR',
    bioUrl: 'https://www.ecb.europa.eu/ecb/orga/decisions/eb/html/index.en.html',
  },
  {
    id: 'ecb_elderson',
    name: 'Frank Elderson',
    title: 'Miembro del Comité Ejecutivo del BCE',
    vote: 'voting',
    currency: 'EUR',
    bioUrl: 'https://www.ecb.europa.eu/ecb/orga/decisions/eb/html/index.en.html',
  },
  {
    id: 'ecb_cipollone',
    name: 'Piero Cipollone',
    title: 'Miembro del Comité Ejecutivo del BCE',
    vote: 'voting',
    currency: 'EUR',
    bioUrl: 'https://www.ecb.europa.eu/ecb/orga/decisions/eb/html/index.en.html',
  },
  // Gobernadores de bancos centrales nacionales del "Grupo 1" (los 5 países
  // más grandes): rotan 4 votos entre 5 — no siempre vota el mismo mes.
  // Faltan los otros ~16 gobernadores nacionales (Grupo 2, rotación más
  // amplia) — pendiente de agregar.
  {
    id: 'ecb_nagel',
    name: 'Joachim Nagel',
    title: 'Presidente del Bundesbank (Alemania) — Grupo 1, voto rotativo',
    vote: 'rotating',
    currency: 'EUR',
    bioUrl: 'https://www.bundesbank.de/en/bundesbank/organisation/executive-board/joachim-nagel',
  },
  {
    id: 'ecb_moulin',
    name: 'Emmanuel Moulin',
    title: 'Gobernador del Banque de France (Francia) — Grupo 1, voto rotativo',
    vote: 'rotating',
    currency: 'EUR',
    bioUrl: 'https://www.banque-france.fr/en/banque-de-france/governance-advisory-committees',
  },
  {
    id: 'ecb_panetta',
    name: 'Fabio Panetta',
    title: 'Gobernador de la Banca d’Italia (Italia) — Grupo 1, voto rotativo',
    vote: 'rotating',
    currency: 'EUR',
    bioUrl: 'https://www.bancaditalia.it/chi-siamo/organizzazione/vertice/governatore/index.html',
  },
  {
    id: 'ecb_escriva',
    name: 'José Luis Escrivá',
    title: 'Gobernador del Banco de España (España) — Grupo 1, voto rotativo',
    vote: 'rotating',
    currency: 'EUR',
    bioUrl: 'https://www.bde.es/wbe/en/sobre-banco/organizacion/gobernador/',
  },
];

export function bankersForCurrency(currency: 'USD' | 'EUR'): CentralBanker[] {
  return currency === 'EUR' ? ECB_BANKERS : FED_BANKERS;
}
