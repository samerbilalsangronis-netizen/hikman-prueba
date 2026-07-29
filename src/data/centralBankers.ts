import type { CentralBanker } from '../types';

// Composición verificada por búsqueda web (jul-2026) — no inventada. Fuentes:
// federalreserve.gov/monetarypolicy/fomc.htm, federalreserve.gov/aboutthefed/bios,
// ecb.europa.eu/ecb/orga. Cambios de personas (renuncias, rotaciones anuales de
// voto) requieren revisión periódica — no asumir que esto queda fijo para siempre.
//
// Fotos en public/bankers/*.jpg: son copias locales, no hotlinks. Logan, Paulson,
// Barkin, Musalem y Lane no tienen foto en Wikimedia Commons; hotlinkear directo al
// sitio oficial del banco se probó primero y falló en el navegador real (curl daba
// 200 pero Chrome mostraba ícono roto — Philadelphia Fed manda
// Cross-Origin-Resource-Policy: same-origin, y los demás bancos parecen tener
// protección anti-hotlinking similar que curl no detecta). Se autohospedan las
// imágenes en su lugar. Si se agrega una foto nueva para otro banquero sin Commons,
// replicar este patrón (descargar a public/bankers/, referenciar con ruta relativa).
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
    photoUrl: '/bankers/logan.jpg',
    bioUrl: 'https://www.dallasfed.org/fed/leadership/logan',
  },
  {
    id: 'fed_paulson',
    name: 'Anna Paulson',
    title: 'Presidenta de la Fed de Filadelfia (voto rotativo 2026)',
    vote: 'rotating',
    currency: 'USD',
    photoUrl: '/bankers/paulson.jpg',
    bioUrl: 'https://www.philadelphiafed.org/our-people/anna-paulson',
  },
  // No votan este año (rotan en 2027).
  {
    id: 'fed_collins',
    name: 'Susan M. Collins',
    title: 'Presidenta de la Fed de Boston (no vota en 2026)',
    vote: 'nonvoting',
    currency: 'USD',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Susan_M_Collins_Official_Portrait.jpg/500px-Susan_M_Collins_Official_Portrait.jpg',
    bioUrl: 'https://www.bostonfed.org/about-us/susan-collins.aspx',
  },
  {
    id: 'fed_barkin',
    name: 'Thomas I. Barkin',
    title: 'Presidente de la Fed de Richmond (no vota en 2026)',
    vote: 'nonvoting',
    currency: 'USD',
    photoUrl: '/bankers/barkin.jpg',
    bioUrl: 'https://www.richmondfed.org/about_us/our_leadership/tom_barkin',
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
    photoUrl: '/bankers/musalem.jpg',
    bioUrl: 'https://www.stlouisfed.org/about-us/leadership-governance/bank-officers/executive-bios/alberto-musalem',
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
    photoUrl: '/bankers/lane.jpg',
    bioUrl: 'https://www.ecb.europa.eu/ecb/decisions/html/cvlane.en.html',
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

// MPC del Banco de Inglaterra — verificado por WebSearch + página oficial
// (jul-2026, no inventada): bankofengland.co.uk/about/people/monetary-policy-committee.
// A diferencia de la Fed (rotación regional) y el BCE (rotación por grupos
// de países), el MPC no tiene rotación: los 9 miembros votan siempre —
// Governor, 3 Vicegobernadores (Política Monetaria, Estabilidad Financiera,
// Mercados y Banca), el Economista Jefe, y 4 miembros externos nombrados
// directo por el Chancellor (Ministro de Hacienda).
export const BOE_BANKERS: CentralBanker[] = [
  {
    id: 'boe_bailey',
    name: 'Andrew Bailey',
    title: 'Gobernador del Banco de Inglaterra',
    vote: 'voting',
    currency: 'GBP',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Andrew_Bailey_and_Jane_Hartley_%28Andrew_Bailey_3x4_cropped%29.jpg/500px-Andrew_Bailey_and_Jane_Hartley_%28Andrew_Bailey_3x4_cropped%29.jpg',
    bioUrl: 'https://www.bankofengland.co.uk/about/people/andrew-bailey/biography',
  },
  {
    id: 'boe_lombardelli',
    name: 'Clare Lombardelli',
    title: 'Vicegobernadora de Política Monetaria',
    vote: 'voting',
    currency: 'GBP',
    photoUrl: '/bankers/lombardelli.jpg',
    bioUrl: 'https://www.bankofengland.co.uk/about/people/clare-lombardelli/biography',
  },
  {
    id: 'boe_breeden',
    name: 'Sarah Breeden',
    title: 'Vicegobernadora de Estabilidad Financiera',
    vote: 'voting',
    currency: 'GBP',
    photoUrl: '/bankers/breeden.jpg',
    bioUrl: 'https://www.bankofengland.co.uk/about/people/sarah-breeden/biography',
  },
  {
    id: 'boe_ramsden',
    name: 'Sir Dave Ramsden',
    title: 'Vicegobernador de Mercados y Banca',
    vote: 'voting',
    currency: 'GBP',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Dave_Ramsden.jpg/500px-Dave_Ramsden.jpg',
    bioUrl: 'https://www.bankofengland.co.uk/about/people/david-ramsden/biography',
  },
  {
    id: 'boe_pill',
    name: 'Huw Pill',
    title: 'Economista Jefe del Banco de Inglaterra',
    vote: 'voting',
    currency: 'GBP',
    photoUrl: '/bankers/pill.jpg',
    bioUrl: 'https://www.bankofengland.co.uk/about/people/huw-pill/biography',
  },
  {
    id: 'boe_dhingra',
    name: 'Swati Dhingra',
    title: 'Miembro Externa del MPC',
    vote: 'voting',
    currency: 'GBP',
    photoUrl: '/bankers/dhingra.jpg',
    bioUrl: 'https://www.bankofengland.co.uk/about/people/swati-dhingra/biography',
  },
  {
    id: 'boe_greene',
    name: 'Megan Greene',
    title: 'Miembro Externa del MPC',
    vote: 'voting',
    currency: 'GBP',
    photoUrl: '/bankers/greene.jpg',
    bioUrl: 'https://www.bankofengland.co.uk/about/people/megan-greene/biography',
  },
  {
    id: 'boe_mann',
    name: 'Catherine L. Mann',
    title: 'Miembro Externa del MPC',
    vote: 'voting',
    currency: 'GBP',
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Catherine_L._Mann_in_the_online_discussion_%27ACLF_2021_%E2%80%93_After_the_recession_%E2%80%93_how_should_we_renew_our_economies%27.png/500px-Catherine_L._Mann_in_the_online_discussion_%27ACLF_2021_%E2%80%93_After_the_recession_%E2%80%93_how_should_we_renew_our_economies%27.png",
    bioUrl: 'https://www.bankofengland.co.uk/about/people/catherine-mann/biography',
  },
  {
    id: 'boe_taylor',
    name: 'Prof. Alan M. Taylor',
    title: 'Miembro Externo del MPC',
    vote: 'voting',
    currency: 'GBP',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Alan_M._Taylor%2C_Bank_of_England%2C_15_September_2011.jpeg/500px-Alan_M._Taylor%2C_Bank_of_England%2C_15_September_2011.jpeg',
    bioUrl: 'https://www.bankofengland.co.uk/about/people/alan-taylor/biography',
  },
];

// Governing Council del Bank of Canada — verificado con la página oficial
// (jul-2026): bankofcanada.ca/about/governing-council/. A diferencia de la
// Fed/BCE/BoE, el BoC no vota formalmente — decide por consenso, todos sus
// 6 miembros participan siempre (se usa 'voting' igual que el MPC del BoE,
// no hay categoría de "consenso" separada en el tipo).
//
// OJO Nicolas Vincent: al momento de escribir esto (jul-2026) todavía es
// "External Deputy Governor" (rol part-time, en el Council desde 2023) —
// pasa a "Deputy Governor" full-time recién el 3-ago-2026. Si esta sesión
// se retoma después de esa fecha, actualizar el título.
export const BOC_BANKERS: CentralBanker[] = [
  {
    id: 'boc_macklem',
    name: 'Tiff Macklem',
    title: 'Gobernador del Banco de Canadá',
    vote: 'voting',
    currency: 'CAD',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Tiff_Macklem_2018_%28cropped_3-4%29.jpg/500px-Tiff_Macklem_2018_%28cropped_3-4%29.jpg',
    bioUrl: 'https://www.bankofcanada.ca/profile/tiff-macklem/',
  },
  {
    id: 'boc_rogers',
    name: 'Carolyn Rogers',
    title: 'Vicegobernadora Principal (Senior Deputy Governor)',
    vote: 'voting',
    currency: 'CAD',
    photoUrl: '/bankers/rogers.jpg',
    bioUrl: 'https://www.bankofcanada.ca/profile/carolyn-rogers/',
  },
  {
    id: 'boc_gravelle',
    name: 'Toni Gravelle',
    title: 'Vicegobernador',
    vote: 'voting',
    currency: 'CAD',
    photoUrl: '/bankers/gravelle.jpg',
    bioUrl: 'https://www.bankofcanada.ca/profile/toni-gravelle/',
  },
  {
    id: 'boc_gosselin',
    name: 'Marc-André Gosselin',
    title: 'Vicegobernador',
    vote: 'voting',
    currency: 'CAD',
    photoUrl: '/bankers/gosselin.jpg',
    bioUrl: 'https://www.bankofcanada.ca/profile/marc-andre-gosselin/',
  },
  {
    id: 'boc_alexopoulos',
    name: 'Michelle Alexopoulos',
    title: 'Vicegobernadora Externa (External Deputy Governor)',
    vote: 'voting',
    currency: 'CAD',
    photoUrl: '/bankers/alexopoulos.jpg',
    bioUrl: 'https://www.bankofcanada.ca/profile/michelle-alexopoulos/',
  },
  {
    id: 'boc_vincent',
    name: 'Nicolas Vincent',
    title: 'Vicegobernador Externo (External Deputy Governor — pasa a tiempo completo el 3-ago-2026)',
    vote: 'voting',
    currency: 'CAD',
    photoUrl: '/bankers/vincent.jpg',
    bioUrl: 'https://www.bankofcanada.ca/profile/nicolas-vincent/',
  },
];

// Monetary Policy Board del RBA — verificado con la página oficial (jul-2026):
// rba.gov.au/about-rba/boards/monetary-policy-board/. Creado el 1-mar-2025
// en reemplazo del antiguo "Reserve Bank Board" (reforma de gobernanza del
// RBA): separa las decisiones de política monetaria de las de gobernanza
// institucional (esta última quedó en un "Governance Board" aparte, no
// modelado acá — solo nos importa quién decide la tasa). 9 miembros, todos
// votan siempre (no hay rotación, igual que el MPC del BoE): 3 ex officio
// (Governor=Chair, Deputy Governor=Deputy Chair, Secretary to the Treasury)
// + 6 no-ejecutivos designados por el Tesorero.
//
// OJO Ian Harper: su mandato termina el 31-ago-2026 — si esta sesión se
// retoma después de esa fecha, verificar si sigue en el board o hay
// reemplazo.
export const RBA_BANKERS: CentralBanker[] = [
  {
    id: 'rba_bullock',
    name: 'Michele Bullock',
    title: 'Gobernadora del RBA (Chair)',
    vote: 'voting',
    currency: 'AUD',
    photoUrl: '/bankers/michele-bullock.jpg',
    bioUrl: 'https://www.rba.gov.au/about-rba/our-people/executive/governor.html',
  },
  {
    id: 'rba_hauser',
    name: 'Andrew Hauser',
    title: 'Vicegobernador del RBA (Deputy Chair)',
    vote: 'voting',
    currency: 'AUD',
    photoUrl: '/bankers/andrew-hauser.jpg',
    bioUrl: 'https://www.rba.gov.au/about-rba/our-people/executive/deputy-governor.html',
  },
  {
    id: 'rba_wilkinson',
    name: 'Jenny Wilkinson PSM',
    title: 'Secretaria del Tesoro (miembro ex officio)',
    vote: 'voting',
    currency: 'AUD',
    photoUrl: '/bankers/jenny-wilkinson.jpg',
    bioUrl: 'https://www.rba.gov.au/about-rba/boards/monetary-policy-board/jenny-wilkinson.html',
  },
  {
    id: 'rba_baker',
    name: 'Marnie Baker AM',
    title: 'Miembro No Ejecutiva del Monetary Policy Board',
    vote: 'voting',
    currency: 'AUD',
    photoUrl: '/bankers/marnie-baker.jpg',
    bioUrl: 'https://www.rba.gov.au/about-rba/boards/monetary-policy-board/marnie-baker.html',
  },
  {
    id: 'rba_fry_mckibbin',
    name: 'Renée Fry-McKibbin',
    title: 'Miembro No Ejecutiva del Monetary Policy Board',
    vote: 'voting',
    currency: 'AUD',
    photoUrl: '/bankers/renee-fry-mckibbin.jpg',
    bioUrl: 'https://www.rba.gov.au/about-rba/boards/monetary-policy-board/renee-fry-mckibbin.html',
  },
  {
    id: 'rba_harper',
    name: 'Ian Harper AO',
    title: 'Miembro No Ejecutivo del Monetary Policy Board (mandato termina 31-ago-2026)',
    vote: 'voting',
    currency: 'AUD',
    photoUrl: '/bankers/ian-harper.jpg',
    bioUrl: 'https://www.rba.gov.au/about-rba/boards/monetary-policy-board/ian-harper.html',
  },
  {
    id: 'rba_hewson',
    name: 'Carolyn Hewson AO',
    title: 'Miembro No Ejecutiva del Monetary Policy Board',
    vote: 'voting',
    currency: 'AUD',
    photoUrl: '/bankers/carolyn-hewson.jpg',
    bioUrl: 'https://www.rba.gov.au/about-rba/boards/monetary-policy-board/carolyn-hewson.html',
  },
  {
    id: 'rba_ross',
    name: 'Iain Ross AO',
    title: 'Miembro No Ejecutivo del Monetary Policy Board',
    vote: 'voting',
    currency: 'AUD',
    photoUrl: '/bankers/iain-ross.jpg',
    bioUrl: 'https://www.rba.gov.au/about-rba/boards/monetary-policy-board/iain-ross.html',
  },
  {
    id: 'rba_preston',
    name: 'Bruce Preston',
    title: 'Miembro No Ejecutivo del Monetary Policy Board',
    vote: 'voting',
    currency: 'AUD',
    photoUrl: '/bankers/bruce-preston.jpg',
    bioUrl: 'https://www.rba.gov.au/about-rba/boards/monetary-policy-board/bruce-preston.html',
  },
];

// Monetary Policy Committee del RBNZ — verificado vía WebSearch (jul-2026);
// la web oficial (rbnz.govt.nz) bloquea todo fetch automatizado (Cloudflare
// devuelve 403 incluso en la portada, con headers de navegador reales — no
// es un problema del proxy, se confirmó también con WebFetch). 6 miembros,
// todos votan siempre (no hay rotación, igual que el MPC del BoE/RBA): 3
// internos (Gobernadora=Chair, Assistant Governor, Chief Economist) + 3
// externos designados a término fijo.
export const RBNZ_BANKERS: CentralBanker[] = [
  {
    id: 'rbnz_breman',
    name: 'Anna Breman',
    title: 'Gobernadora del RBNZ (Chair) — mandato hasta 30-nov-2030',
    vote: 'voting',
    currency: 'NZD',
    photoUrl: '/bankers/anna-breman.jpg',
    bioUrl: 'https://www.rbnz.govt.nz/about-us/our-people/our-executive-leadership-team/anna-breman',
  },
  {
    id: 'rbnz_silk',
    name: 'Karen Silk',
    title: 'Assistant Governor Money (miembro interno) — mandato hasta 15-may-2027',
    vote: 'voting',
    currency: 'NZD',
    photoUrl: '/bankers/karen-silk.jpg',
    bioUrl: 'https://www.rbnz.govt.nz/about-us/our-people/monetary-policy-committee',
  },
  {
    id: 'rbnz_conway',
    name: 'Paul Conway',
    title: 'Chief Economist (miembro interno) — mandato hasta 10-sep-2027',
    vote: 'voting',
    currency: 'NZD',
    photoUrl: '/bankers/paul-conway.jpg',
    bioUrl: 'https://www.rbnz.govt.nz/about-us/our-people/monetary-policy-committee',
  },
  {
    id: 'rbnz_gourley',
    name: 'Hayley Gourley',
    title: 'Miembro Externa del Monetary Policy Committee — mandato hasta 30-sep-2029',
    vote: 'voting',
    currency: 'NZD',
    photoUrl: '/bankers/hayley-gourley.jpg',
    bioUrl: 'https://www.rbnz.govt.nz/about-us/our-people/monetary-policy-committee',
  },
  {
    id: 'rbnz_gai',
    name: 'Prasanna Gai',
    title: 'Miembro Externo del Monetary Policy Committee — mandato hasta 30-jun-2028',
    vote: 'voting',
    currency: 'NZD',
    photoUrl: '/bankers/prasanna-gai.jpg',
    bioUrl: 'https://www.rbnz.govt.nz/about-us/our-people/monetary-policy-committee',
  },
  {
    id: 'rbnz_hansen',
    name: 'Carl Hansen',
    title: 'Miembro Externo del Monetary Policy Committee — mandato hasta 31-mar-2027',
    vote: 'voting',
    currency: 'NZD',
    photoUrl: '/bankers/carl-hansen.jpg',
    bioUrl: 'https://www.rbnz.govt.nz/about-us/our-people/monetary-policy-committee',
  },
];

// Policy Board del BOJ — verificado con la página oficial (jul-2026):
// boj.or.jp/en/about/organization/policyboard/ (boj.or.jp NO está
// bloqueado, a diferencia de rbnz.govt.nz). 9 miembros, todos votan
// siempre (no hay rotación, igual que RBA/RBNZ/BoE): Gobernador + 2
// Vicegobernadores + 6 Miembros. Términos verificados en la bio oficial
// de cada uno (página "Present Term of Office").
//
// OJO: un resumen de WebSearch listaba a "NAKAGAWA Junko" como miembro
// vigente — la página oficial (fuente primaria) NO la lista, su mandato
// terminó jun-2026 y fue reemplazada por SATO Ayano. Lección: confirmar
// siempre contra la fuente primaria, no un resumen de búsqueda.
export const BOJ_BANKERS: CentralBanker[] = [
  {
    id: 'boj_ueda',
    name: 'Kazuo Ueda',
    title: 'Gobernador del BOJ (Chairperson) — mandato hasta 8-abr-2028',
    vote: 'voting',
    currency: 'JPY',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Kazuo_Ueda_on_October_2%2C_2024.jpg',
    bioUrl: 'https://www.boj.or.jp/en/about/organization/policyboard/gv_ueda.htm',
  },
  {
    id: 'boj_uchida',
    name: 'Shinichi Uchida',
    title: 'Vicegobernador del BOJ — mandato hasta 19-mar-2028',
    vote: 'voting',
    currency: 'JPY',
    bioUrl: 'https://www.boj.or.jp/en/about/organization/policyboard/dg_uchida.htm',
  },
  {
    id: 'boj_himino',
    name: 'Ryozo Himino',
    title: 'Vicegobernador del BOJ — mandato hasta 19-mar-2028',
    vote: 'voting',
    currency: 'JPY',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Ryozo_Himino_20230410meeting03.jpg',
    bioUrl: 'https://www.boj.or.jp/en/about/organization/policyboard/dg_himino.htm',
  },
  {
    id: 'boj_takata',
    name: 'Hajime Takata',
    title: 'Miembro del Policy Board — mandato hasta 23-jul-2027',
    vote: 'voting',
    currency: 'JPY',
    bioUrl: 'https://www.boj.or.jp/en/about/organization/policyboard/bm_takata.htm',
  },
  {
    id: 'boj_tamura',
    name: 'Naoki Tamura',
    title: 'Miembro del Policy Board — mandato hasta 23-jul-2027',
    vote: 'voting',
    currency: 'JPY',
    bioUrl: 'https://www.boj.or.jp/en/about/organization/policyboard/bm_tamura.htm',
  },
  {
    id: 'boj_koeda',
    name: 'Junko Koeda',
    title: 'Miembro del Policy Board — mandato hasta 25-mar-2030',
    vote: 'voting',
    currency: 'JPY',
    bioUrl: 'https://www.boj.or.jp/en/about/organization/policyboard/bm_koeda.htm',
  },
  {
    id: 'boj_masu',
    name: 'Kazuyuki Masu',
    title: 'Miembro del Policy Board — mandato hasta 30-jun-2030',
    vote: 'voting',
    currency: 'JPY',
    bioUrl: 'https://www.boj.or.jp/en/about/organization/policyboard/bm_masu.htm',
  },
  {
    id: 'boj_asada',
    name: 'Toichiro Asada',
    title: 'Miembro del Policy Board — mandato hasta 31-mar-2031',
    vote: 'voting',
    currency: 'JPY',
    bioUrl: 'https://www.boj.or.jp/en/about/organization/policyboard/bm_asada.htm',
  },
  {
    id: 'boj_sato',
    name: 'Ayano Sato',
    title: 'Miembro del Policy Board — mandato hasta 29-jun-2031',
    vote: 'voting',
    currency: 'JPY',
    bioUrl: 'https://www.boj.or.jp/en/about/organization/policyboard/bm_asato.htm',
  },
];

// SNB (3, agregado en esta sesión): Governing Board — el cuerpo que
// efectivamente decide la política monetaria de Suiza son solo estos 3
// miembros (Schlegel, Martin, Tschudin), verificado con
// snb.ch/en/the-snb/mandates-goals/monetary-policy ("Monetary policy is set
// by the SNB's three-member Governing Board"). El SNB tiene además 4
// miembros suplentes que junto a los 3 titulares forman el "Enlarged
// Governing Board" (Schlup, Zanetti, Kraenzlin, Moser) — pero ese cuerpo
// ampliado define lineamientos estratégicos/operativos, no decide la tasa,
// así que no se incluyen acá (mismo criterio que "no modelar" el
// Governance Board separado del RBA, ver lección AUD #20). Deciden por
// consenso, sin votación formal publicada — mismo tratamiento que BoC
// (`vote: 'voting'`, sin categoría de "consenso" separada). Fotos: Schlegel
// tiene foto propia en Wikimedia Commons (con permiso VRT verificado);
// Martin y Tschudin se autohospedaron desde snb.ch/en/the-snb/organisation/
// history/short-biographies (no están en Wikimedia Commons).
export const SNB_BANKERS: CentralBanker[] = [
  {
    id: 'snb_schlegel',
    name: 'Martin Schlegel',
    title: 'Presidente del Directorio (Chairman) del SNB — desde 1-oct-2024',
    vote: 'voting',
    currency: 'CHF',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Schlegel_Martin.jpg/500px-Schlegel_Martin.jpg',
    bioUrl: 'https://www.snb.ch/en/the-snb/organisation/history/short-biographies',
  },
  {
    id: 'snb_martin',
    name: 'Antoine Martin',
    title: 'Vicepresidente del Directorio (Vice Chairman) del SNB — miembro desde 1-ene-2024, Vicepresidente desde 1-oct-2024',
    vote: 'voting',
    currency: 'CHF',
    photoUrl: '/bankers/snb-martin.jpg',
    bioUrl: 'https://www.snb.ch/en/the-snb/organisation/history/short-biographies',
  },
  {
    id: 'snb_tschudin',
    name: 'Petra Tschudin',
    title: 'Miembro del Directorio del SNB — desde 1-oct-2024',
    vote: 'voting',
    currency: 'CHF',
    photoUrl: '/bankers/snb-tschudin.jpg',
    bioUrl: 'https://www.snb.ch/en/the-snb/organisation/history/short-biographies',
  },
];

export function bankersForCurrency(currency: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'NZD' | 'JPY' | 'CHF'): CentralBanker[] {
  if (currency === 'EUR') return ECB_BANKERS;
  if (currency === 'GBP') return BOE_BANKERS;
  if (currency === 'CAD') return BOC_BANKERS;
  if (currency === 'AUD') return RBA_BANKERS;
  if (currency === 'NZD') return RBNZ_BANKERS;
  if (currency === 'JPY') return BOJ_BANKERS;
  if (currency === 'CHF') return SNB_BANKERS;
  return FED_BANKERS;
}
