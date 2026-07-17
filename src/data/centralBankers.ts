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
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Official_portrait_of_Kevin_M._Warsh.jpg/500px-Official_portrait_of_Kevin_M._Warsh.jpg',
    bioUrl: 'https://www.federalreserve.gov/aboutthefed/bios/board/warsh.htm',
  },
  {
    id: 'fed_jefferson',
    name: 'Philip N. Jefferson',
    title: 'Vicepresidente de la Reserva Federal (Vice Chair)',
    vote: 'voting',
    currency: 'USD',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Jefferson_Philip_BDM_June_16_22-091_8x10_%2852247534443%29.jpg/500px-Jefferson_Philip_BDM_June_16_22-091_8x10_%2852247534443%29.jpg',
    bioUrl: 'https://www.federalreserve.gov/aboutthefed/bios/board/jefferson.htm',
  },
  {
    id: 'fed_barr',
    name: 'Michael S. Barr',
    title: 'Gobernador de la Reserva Federal',
    vote: 'voting',
    currency: 'USD',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Michael_S._Barr%2C_Federal_Reserve_Member.jpg/500px-Michael_S._Barr%2C_Federal_Reserve_Member.jpg',
    bioUrl: 'https://www.federalreserve.gov/aboutthefed/bios/board/barr.htm',
  },
  {
    id: 'fed_bowman',
    name: 'Michelle W. Bowman',
    title: 'Gobernadora de la Reserva Federal',
    vote: 'voting',
    currency: 'USD',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Michelle_Bowman.jpg/500px-Michelle_Bowman.jpg',
    bioUrl: 'https://www.federalreserve.gov/aboutthefed/bios/board/bowman.htm',
  },
  {
    id: 'fed_cook',
    name: 'Lisa D. Cook',
    title: 'Gobernadora de la Reserva Federal (situación legal en disputa — puede no participar en reuniones del FOMC)',
    vote: 'voting',
    currency: 'USD',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Lisa_D._Cook%2C_Federal_Reserve_Governor.jpg/500px-Lisa_D._Cook%2C_Federal_Reserve_Governor.jpg',
    bioUrl: 'https://www.federalreserve.gov/aboutthefed/bios/board/cook.htm',
  },
  {
    id: 'fed_powell',
    name: 'Jerome H. Powell',
    title: 'Gobernador de la Reserva Federal (ex Presidente)',
    vote: 'voting',
    currency: 'USD',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Jerome_H._Powell%2C_Federal_Reserve_Chair_%28cropped%29.jpg/500px-Jerome_H._Powell%2C_Federal_Reserve_Chair_%28cropped%29.jpg',
    bioUrl: 'https://www.federalreserve.gov/aboutthefed/bios/board/powell.htm',
  },
  {
    id: 'fed_waller',
    name: 'Christopher J. Waller',
    title: 'Gobernador de la Reserva Federal',
    vote: 'voting',
    currency: 'USD',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Christopher_J._Waller%2C_Federal_Reserve_Governor_2.jpg/500px-Christopher_J._Waller%2C_Federal_Reserve_Governor_2.jpg',
    bioUrl: 'https://www.federalreserve.gov/aboutthefed/bios/board/waller.htm',
  },
  // Nueva York vota siempre (asiento permanente, Vicepresidente del FOMC).
  {
    id: 'fed_williams',
    name: 'John C. Williams',
    title: 'Presidente de la Fed de Nueva York (Vicepresidente del FOMC — voto permanente)',
    vote: 'voting',
    currency: 'USD',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/John_C._Williams_%28cropped%29.jpg/500px-John_C._Williams_%28cropped%29.jpg',
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
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Beth_M._Hammack.jpg/500px-Beth_M._Hammack.jpg',
    bioUrl: 'https://www.clevelandfed.org/people/beth-hammack',
  },
  {
    id: 'fed_kashkari',
    name: 'Neel Kashkari',
    title: 'Presidente de la Fed de Minneapolis (voto rotativo 2026)',
    vote: 'rotating',
    currency: 'USD',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Neel-kashkari.jpg/500px-Neel-kashkari.jpg',
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
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/09/Austan_Goolsbee_official_portrait_2.jpg',
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
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/101st_Annual_Agricultural_Outlook_Forum%2C_titled_%E2%80%9CMeeting_Tomorrow%E2%80%99s_Challenges%2C_Today%E2%80%9D_on_February_27%2C_2025_in_Arlington%2C_Virginia_-_54.jpg/500px-101st_Annual_Agricultural_Outlook_Forum%2C_titled_%E2%80%9CMeeting_Tomorrow%E2%80%99s_Challenges%2C_Today%E2%80%9D_on_February_27%2C_2025_in_Arlington%2C_Virginia_-_54.jpg',
    bioUrl: 'https://www.kansascityfed.org/about-us/leadership/jeffrey-r-schmid/',
  },
  {
    id: 'fed_daly',
    name: 'Mary C. Daly',
    title: 'Presidenta de la Fed de San Francisco (no vota en 2026)',
    vote: 'nonvoting',
    currency: 'USD',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Mary_C._Daly_2024-10-09.jpg/500px-Mary_C._Daly_2024-10-09.jpg',
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
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Lagarde_ECB_Portrait_2019.jpg/500px-Lagarde_ECB_Portrait_2019.jpg',
    bioUrl: 'https://www.ecb.europa.eu/ecb/orga/decisions/eb/html/cvs/lagarde/profile.en.html',
  },
  {
    id: 'ecb_vujcic',
    name: 'Boris Vujčić',
    title: 'Vicepresidente del BCE',
    vote: 'voting',
    currency: 'EUR',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Boris_Vujcic.png/500px-Boris_Vujcic.png',
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
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Prof._Dr._Isabel_Schnabel%2C_2017.jpg/500px-Prof._Dr._Isabel_Schnabel%2C_2017.jpg',
    bioUrl: 'https://www.ecb.europa.eu/ecb/orga/decisions/eb/html/index.en.html',
  },
  {
    id: 'ecb_elderson',
    name: 'Frank Elderson',
    title: 'Miembro del Comité Ejecutivo del BCE',
    vote: 'voting',
    currency: 'EUR',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Frank_Elderson_in_2023.jpg/500px-Frank_Elderson_in_2023.jpg',
    bioUrl: 'https://www.ecb.europa.eu/ecb/orga/decisions/eb/html/index.en.html',
  },
  {
    id: 'ecb_cipollone',
    name: 'Piero Cipollone',
    title: 'Miembro del Comité Ejecutivo del BCE',
    vote: 'voting',
    currency: 'EUR',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Piero_Cipollone_2024.jpg/500px-Piero_Cipollone_2024.jpg',
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
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Joachim_Nagel_at_WDR_Europaforum_of_Republica25_2025-05-26_10_%28cropped%29.jpg/500px-Joachim_Nagel_at_WDR_Europaforum_of_Republica25_2025-05-26_10_%28cropped%29.jpg',
    bioUrl: 'https://www.bundesbank.de/en/bundesbank/organisation/executive-board/joachim-nagel',
  },
  {
    id: 'ecb_moulin',
    name: 'Emmanuel Moulin',
    title: 'Gobernador del Banque de France (Francia) — Grupo 1, voto rotativo',
    vote: 'rotating',
    currency: 'EUR',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Emmanuel_Moulin_%28cropped%29.jpg/500px-Emmanuel_Moulin_%28cropped%29.jpg',
    bioUrl: 'https://www.banque-france.fr/en/banque-de-france/governance-advisory-committees',
  },
  {
    id: 'ecb_panetta',
    name: 'Fabio Panetta',
    title: 'Gobernador de la Banca d’Italia (Italia) — Grupo 1, voto rotativo',
    vote: 'rotating',
    currency: 'EUR',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Fabio_Panetta_2023_%28cropped%29.jpg/500px-Fabio_Panetta_2023_%28cropped%29.jpg',
    bioUrl: 'https://www.bancaditalia.it/chi-siamo/organizzazione/vertice/governatore/index.html',
  },
  {
    id: 'ecb_escriva',
    name: 'José Luis Escrivá',
    title: 'Gobernador del Banco de España (España) — Grupo 1, voto rotativo',
    vote: 'rotating',
    currency: 'EUR',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Jos%C3%A9_Luis_Escriv%C3%A1_2023_%28cropped%29.jpg/500px-Jos%C3%A9_Luis_Escriv%C3%A1_2023_%28cropped%29.jpg',
    bioUrl: 'https://www.bde.es/wbe/en/sobre-banco/organizacion/gobernador/',
  },
];

export function bankersForCurrency(currency: 'USD' | 'EUR'): CentralBanker[] {
  return currency === 'EUR' ? ECB_BANKERS : FED_BANKERS;
}
