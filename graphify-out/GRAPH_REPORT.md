# Graph Report - .  (2026-08-02)

## Corpus Check
- 125 files · ~278,274 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 583 nodes · 1109 edges · 40 communities (38 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Shell & Panels
- Chart Rendering Components
- Package Dependencies
- FRED Indicator Mappings
- Macro Data Context
- Sync API & Branding Notes
- NZD Sync Pipeline
- TS App Compiler Config
- Central Bankers Data
- TS Node Compiler Config
- Currency Bias Logic
- EUR Sync Pipeline
- Headlines & Titulares
- Score Panel & Seeds
- AUD Sync Pipeline
- FRED Sync Pipeline
- Headlines Sync Pipeline
- CAD Sync Pipeline
- CNY Sync Pipeline
- JPY Sync Pipeline
- CHF Sync Pipeline
- EUR GDP/HICP Automation
- Headline Translation Feature
- CHF/JPY Data Sources
- Lint Config (oxlint)
- Equities & RentaVariable
- EUR/FRED Workflows
- Workflow Cron & Backup
- GBP Sync Pipeline
- Equities Quotes API
- Supabase Persistence
- Document Upload List
- Supabase Client Config
- AUD Data Sources
- CAD Data Sources
- Release Stage Badge
- Translate Headlines API
- GBP Data Source
- TS Root Config

## God Nodes (most connected - your core abstractions)
1. `useCurrency()` - 27 edges
2. `useMacroData()` - 27 edges
3. `compilerOptions` - 19 edges
4. `IndicatorMeta` - 18 edges
5. `MacroDataProvider()` - 16 edges
6. `IndicatorRow()` - 15 edges
7. `compilerOptions` - 15 edges
8. `react` - 14 edges
9. `ScoreRow` - 13 edges
10. `Sincronizar Divisas (GitHub Actions workflow)` - 12 edges

## Surprising Connections (you probably didn't know these)
- `'Sincronizar con FRED' manual button (README)` --conceptually_related_to--> `Sincronizar Divisas (GitHub Actions workflow)`  [AMBIGUOUS]
  README.md → .github/workflows/sync-currencies.yml
- `Tech stack description (README)` --conceptually_related_to--> `HIKMAN ENDÓGENO dashboard`  [INFERRED]
  README.md → HANDOFF.md
- `USD Macro — Seguimiento Fundamental (README project description)` --conceptually_related_to--> `HIKMAN ENDÓGENO dashboard`  [AMBIGUOUS]
  README.md → HANDOFF.md
- `USD Macro — Seguimiento Fundamental (README project description)` --conceptually_related_to--> `index.html entry document (HIKMAN ENDÓGENO)`  [AMBIGUOUS]
  README.md → index.html
- `Backup sync Routine (trig_01VigD4t2wgyxh8YCAYDqtg1)` --references--> `Sincronizar Divisas (GitHub Actions workflow)`  [EXTRACTED]
  HANDOFF.md → .github/workflows/sync-currencies.yml

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Multi-currency architecture pattern shared across all 9 currencies** — handoff_multicurrency_architecture, handoff_currency_usd, handoff_currency_eur, handoff_currency_gbp, handoff_currency_cad, handoff_currency_aud, handoff_currency_nzd, handoff_currency_jpy, handoff_currency_chf, handoff_currency_cny [INFERRED 0.85]
- **Currencies participating in the GDP-by-component (C+I+G+NX) redesign with real coverage** — handoff_gdp_subcomponent_redesign, handoff_currency_usd, handoff_currency_eur, handoff_currency_aud, handoff_currency_jpy, handoff_currency_cny [INFERRED 0.85]
- **Panel de Control page composed of Bias, Titulares ticker, and translation features** — handoff_panel_control, handoff_currency_bias_feature, handoff_titulares_feature, handoff_headline_translation_feature [EXTRACTED 1.00]

## Communities (40 total, 2 thin omitted)

### Community 0 - "App Shell & Panels"
Cohesion: 0.09
Nodes (40): App(), CurrencyBiasCard(), toDateInput(), FomcWatchPanel(), Layout(), navFor(), useTheme(), MarqueeTicker() (+32 more)

### Community 1 - "Chart Rendering Components"
Cohesion: 0.08
Nodes (30): react, areEqual(), ChartCard, ChartCardInner(), ChartCardProps, ChartTooltip(), samePoint(), CONFIG (+22 more)

### Community 2 - "Package Dependencies"
Cohesion: 0.05
Nodes (43): oxlint, dependencies, react, react-dom, react-router-dom, recharts, @supabase/supabase-js, devDependencies (+35 more)

### Community 3 - "FRED Indicator Mappings"
Cohesion: 0.13
Nodes (27): AUD_AUTO_INDICATOR_IDS, CAD_AUTO_INDICATOR_IDS, CBBS_MAPPING, CHF_AUTO_INDICATOR_IDS, CNY_AUTO_INDICATOR_IDS, EUR_EUROSTAT_INDICATOR_ID, EUR_FRED_MAPPINGS, EUR_HICP_FPD_INDICATOR_IDS (+19 more)

### Community 4 - "Macro Data Context"
Cohesion: 0.12
Nodes (25): BankerNotesMap, BiasMap, defaultBiasMap(), fetchAllRows(), FomcWatchMap, ForecastMap, loadLocalBankerNotes(), loadLocalBias() (+17 more)

### Community 5 - "Sync API & Branding Notes"
Cohesion: 0.08
Nodes (26): api/aud-sync.ts, api/cad-sync.ts, api/chf-sync.ts, api/cny-sync.ts, api/fred-sync.ts, api/gbp-sync.ts, api/jpy-sync.ts, api/nzd-sync.ts (+18 more)

### Community 6 - "NZD Sync Pipeline"
Cohesion: 0.18
Nodes (24): cpiQoqSeries(), cpiYoySeries(), currentQuarterEnd(), extractSingleCsvFromZip(), fetchCpiLevel(), fetchEctSeries(), fetchGdpLevel(), fetchLatestMonthlyZipCsv() (+16 more)

### Community 7 - "TS App Compiler Config"
Cohesion: 0.08
Nodes (24): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+16 more)

### Community 8 - "Central Bankers Data"
Cohesion: 0.11
Nodes (19): BOC_BANKERS, BOE_BANKERS, BOJ_BANKERS, ECB_BANKERS, FED_BANKERS, RBA_BANKERS, RBNZ_BANKERS, SNB_BANKERS (+11 more)

### Community 9 - "TS Node Compiler Config"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 10 - "Currency Bias Logic"
Cohesion: 0.17
Nodes (15): CurrencyBiasCardProps, MacroDataContextValue, BIAS_COLORS, BIAS_LABELS, BIAS_LEVELS, CENTRAL_BANK_BY_CURRENCY, formatMonth(), BiasLevel (+7 more)

### Community 11 - "EUR Sync Pipeline"
Cohesion: 0.15
Nodes (18): computeSeries(), EUR_FRED_MAPPINGS, EurostatJsonStat, fetchEurostatUnemployment(), fetchFredObservations(), fetchHicpFpd(), fetchNamqContribution(), FredMapping (+10 more)

### Community 12 - "Headlines & Titulares"
Cohesion: 0.19
Nodes (14): BIAS_CURRENCIES, formatDateTime(), HeadlineCard(), HeadlineCardProps, MarqueeTickerProps, CurrencyContextValue, IMPACT_COLORS, IMPACT_LABELS (+6 more)

### Community 13 - "Score Panel & Seeds"
Cohesion: 0.13
Nodes (10): ScorePanel(), ScorePanelProps, valoracionColor(), AUD_SCORE_SEED, CAD_SCORE_SEED, EUR_SCORE_SEED, GBP_SCORE_SEED, JPY_SCORE_SEED (+2 more)

### Community 14 - "AUD Sync Pipeline"
Cohesion: 0.35
Nodes (13): AbsObservation, cpiYoySeries(), employmentChangeSeries(), fetchAbsSeries(), fetchRbaCashRate(), gdpYoySeries(), handler(), Observation (+5 more)

### Community 15 - "FRED Sync Pipeline"
Cohesion: 0.26
Nodes (11): CBBS_MAPPING, computeSeries(), dedupeConsecutive(), fetchObservations(), FRED_MAPPINGS, FredMapping, FredTransform, handler() (+3 more)

### Community 16 - "Headlines Sync Pipeline"
Cohesion: 0.27
Nodes (11): BOND_EQUITY_KEYWORDS, classifyFinnhubHeadline(), CURRENCY_KEYWORDS, fetchFinnhubHeadlines(), FinnhubNewsItem, handler(), HeadlineRow, HIGH_IMPACT_KEYWORDS (+3 more)

### Community 17 - "CAD Sync Pipeline"
Cohesion: 0.31
Nodes (10): diffX1000ByMonth(), fetchBocSeries(), fetchStatCanVector(), handler(), levelByMonth(), Observation, pctChangeByMonth(), shiftMonths() (+2 more)

### Community 18 - "CNY Sync Pipeline"
Cohesion: 0.35
Nodes (10): deriveYoyFromChainedMom(), fetchChinaDataSeries(), fetchTradeBalance(), handler(), indexToYoySeries(), normalizeDate(), Observation, pctSeries() (+2 more)

### Community 19 - "JPY Sync Pipeline"
Cohesion: 0.35
Nodes (10): directPctSeries(), employmentChangeSeries(), fetchBojRate(), fetchDashboardSeries(), fetchTradeBalance(), handler(), Observation, parseEstatTime() (+2 more)

### Community 20 - "CHF Sync Pipeline"
Cohesion: 0.36
Nodes (9): directLevelSeries(), directPctSeries(), fetchKofBarometer(), fetchSnbCube(), fetchSwissdatasSeries(), handler(), Observation, pctChangeSeries() (+1 more)

### Community 21 - "EUR GDP/HICP Automation"
Cohesion: 0.22
Nodes (10): api/eur-sync.ts, CNY sync step (chinadata.live) → /api/cny-sync, chinadata.live (unofficial NBS/GACC aggregator), chinadata.live aggregator repeatedly lags weeks/months behind NBS releases, CNY currency pipeline (13 indicators, 13/13 automated — reference/risk-proxy currency), EUR GDP-by-component automation via namq_10_gdp (unit=CON_PPCH_PRE), EUR HICP flash→final automation via Eurostat prc_hicp_fpd, GDP subcomponent redesign (Consumo/Inversión/Gasto Público/Exportaciones Netas) across all 9 currencies (+2 more)

### Community 22 - "Headline Translation Feature"
Cohesion: 0.28
Nodes (9): api/headlines-sync.ts, api/translate-headlines.ts, Sincronizar titulares step → /api/headlines-sync, Traducir titulares pendientes step → /api/translate-headlines, Currency Bias feature (CurrencyBiasCard), Forex Factory CDN URL change broke headlines sync, Automatic headline translation via MyMemory, Panel de Control page (/panel-control) (+1 more)

### Community 23 - "CHF/JPY Data Sources"
Cohesion: 0.28
Nodes (9): CHF sync step (SNB + SECO + KOF) → /api/chf-sync, JPY sync step (e-Stat + BOJ) → /api/jpy-sync, Bank of Japan CSV (stat-search.boj.or.jp), e-Stat Dashboard API (Japan), KOF Economic Barometer API v2, SECO CSV feed (scheduler.swissdatas.ch), SNB Data Portal API (data.snb.ch), CHF currency pipeline (16 indicators, 9 automated) (+1 more)

### Community 24 - "Lint Config (oxlint)"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 25 - "Equities & RentaVariable"
Cohesion: 0.33
Nodes (7): EQUITIES_BY_CURRENCY, EquityGroup, EquitySymbol, formatPrice(), formatTime(), Quote, QuoteCard()

### Community 26 - "EUR/FRED Workflows"
Cohesion: 0.43
Nodes (7): EUR sync step (FRED + Eurostat) → /api/eur-sync, USD sync step (FRED) → /api/fred-sync, Eurostat SDMX API, FRED API (Federal Reserve Bank of St. Louis), EUR currency pipeline (21 Eurozone + 18 DE/FR indicators), USD currency pipeline (~43 indicators), Renta Variable (equities) feature (/renta-variable)

### Community 27 - "Workflow Cron & Backup"
Cohesion: 0.38
Nodes (7): NZD sync step (Stats NZ) → /api/nzd-sync, Sincronizar Divisas (GitHub Actions workflow), Sincronizar Titulares (GitHub Actions workflow), Stats NZ per-release CSVs, Backup sync Routine (trig_01VigD4t2wgyxh8YCAYDqtg1), NZD currency pipeline (14 indicators, 6 automated), GitHub Actions scheduled cron never fired on its own

### Community 28 - "GBP Sync Pipeline"
Cohesion: 0.53
Nodes (5): fetchBoeBankRate(), fetchTradeBalance(), handler(), Observation, parseMonthlyFromDailyCsv()

### Community 29 - "Equities Quotes API"
Cohesion: 0.60
Nodes (4): fetchFinnhubQuote(), fetchYahooQuote(), handler(), QuoteResult

### Community 30 - "Supabase Persistence"
Cohesion: 0.40
Nodes (5): Migration from HIKMAN CAPITAL SISTEMA 2.0.xlsx, Supabase (Postgres backend), Supabase/localStorage persistence (README), src/data/MacroDataContext.tsx, supabase/schema.sql

### Community 31 - "Document Upload List"
Cohesion: 0.60
Nodes (4): DocumentUploadList(), DocumentUploadListProps, formatDateTime(), DocumentEntry

### Community 32 - "Supabase Client Config"
Cohesion: 0.40
Nodes (4): anonKey, supabase, supabaseEnabled, url

### Community 33 - "AUD Data Sources"
Cohesion: 0.67
Nodes (4): AUD sync step (ABS + RBA) → /api/aud-sync, ABS Data API (SDMX 2.1, keyless), RBA public CSV (table F1.1), AUD currency pipeline (20 indicators, 16 automated)

### Community 34 - "CAD Data Sources"
Cohesion: 0.83
Nodes (4): CAD sync step (StatCan + BoC) → /api/cad-sync, Bank of Canada Valet API, StatCan Web Data Service (WDS), CAD currency pipeline (17 indicators, 11 automated)

### Community 35 - "Release Stage Badge"
Cohesion: 0.50
Nodes (4): Preliminar/Final release-stage badge (IndicatorMeta.releaseStage), src/components/ChartCard.tsx, src/pages/Actualizar.tsx, src/types.ts

### Community 37 - "GBP Data Source"
Cohesion: 1.00
Nodes (3): GBP sync step (BoE) → /api/gbp-sync, Bank of England IADB (CSV), GBP currency pipeline (16 indicators, mostly manual)

## Ambiguous Edges - Review These
- `Sincronizar Divisas (GitHub Actions workflow)` → `'Sincronizar con FRED' manual button (README)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to
- `HIKMAN ENDÓGENO dashboard` → `stop-hook-git-check.sh 'Unverified' commit warning`  [AMBIGUOUS]
  HANDOFF.md · relation: conceptually_related_to
- `HIKMAN ENDÓGENO dashboard` → `USD Macro — Seguimiento Fundamental (README project description)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to
- `USD Macro — Seguimiento Fundamental (README project description)` → `index.html entry document (HIKMAN ENDÓGENO)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **152 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+147 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Sincronizar Divisas (GitHub Actions workflow)` and `'Sincronizar con FRED' manual button (README)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `HIKMAN ENDÓGENO dashboard` and `stop-hook-git-check.sh 'Unverified' commit warning`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `HIKMAN ENDÓGENO dashboard` and `USD Macro — Seguimiento Fundamental (README project description)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `USD Macro — Seguimiento Fundamental (README project description)` and `index.html entry document (HIKMAN ENDÓGENO)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `react` connect `Chart Rendering Components` to `App Shell & Panels`, `FRED Indicator Mappings`, `Macro Data Context`, `Central Bankers Data`, `Currency Bias Logic`, `Headlines & Titulares`, `Lint Config (oxlint)`, `Equities & RentaVariable`, `Document Upload List`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `Sincronizar Divisas (GitHub Actions workflow)` connect `Workflow Cron & Backup` to `AUD Data Sources`, `CAD Data Sources`, `GBP Data Source`, `Sync API & Branding Notes`, `EUR GDP/HICP Automation`, `CHF/JPY Data Sources`, `EUR/FRED Workflows`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `plugins` connect `Lint Config (oxlint)` to `Chart Rendering Components`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._