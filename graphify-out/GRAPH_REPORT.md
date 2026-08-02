# Graph Report - .  (2026-08-02)

## Corpus Check
- 45 files · ~282,441 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 689 nodes · 1254 edges · 36 communities (32 shown, 4 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.74)
- Token cost: 223,082 input · 0 output

## Community Hubs (Navigation)
- App Shell & Layout
- Freshness & Subcomponent UI
- Score Panel & Macro Context
- Chart & FOMC Components
- Package Dependencies
- Banker Headshot Photos
- Currency Bias & Headlines
- Sync Entrypoints Overview
- EUR Sync & Data-Integrity Lessons
- NZD Sync Pipeline
- TS App Compiler Config
- Multi-Currency Data Sources
- TS Node Compiler Config
- EUR Sync Pipeline
- Handoff Doc & App Sections
- AUD Sync Pipeline
- Central Banks & Generic Fixes
- PMI/ISM Data Lessons
- FRED Sync Pipeline
- Headlines Sync Pipeline
- Central Banks & Country Pages
- CAD Sync Pipeline
- CNY Sync Pipeline
- JPY Sync Pipeline
- CHF Sync Pipeline
- CNY Data Source Lessons
- GBP Sync Pipeline
- Lint Config (oxlint)
- Equities Quotes API
- Translate Headlines API
- App Entry Point
- Brand Assets (Logo/Favicon)
- TS Root Config
- Session Start Hook
- Headline Impact & Titulares

## God Nodes (most connected - your core abstractions)
1. `useCurrency()` - 26 edges
2. `useMacroData()` - 26 edges
3. `HIKMAN ENDÓGENO — Dashboard Macro Multi-Divisa (README)` - 23 edges
4. `IndicatorMeta` - 20 edges
5. `compilerOptions` - 19 edges
6. `MacroDataProvider()` - 16 edges
7. `react` - 15 edges
8. `IndicatorRow()` - 15 edges
9. `compilerOptions` - 15 edges
10. `MacroDataContext.tsx` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Multi-currency architecture pattern (shared components + id prefix namespacing)` --rationale_for--> `IndicatorMeta`  [EXTRACTED]
  HANDOFF.md → src/types.ts
- `Dynamic per-point preliminar/final release stage mechanism` --rationale_for--> `IndicatorMeta`  [EXTRACTED]
  HANDOFF.md → src/types.ts
- `IndicatorMeta` --references--> `INDICATORS[] aggregator (src/data/indicators.ts)`  [EXTRACTED]
  src/types.ts → HANDOFF.md
- `plugins` --extends--> `typescript`  [EXTRACTED]
  .oxlintrc.json → package.json
- `Chose GitHub Actions over paying for Vercel Pro cron` --rationale_for--> `Sincronizar Divisas (GitHub Actions workflow)`  [EXTRACTED]
  HANDOFF.md → .github/workflows/sync-currencies.yml

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Nine per-currency serverless sync pipelines feeding the shared INDICATORS architecture** — api_fred_sync_module, api_eur_sync_module, api_gbp_sync_module, api_cad_sync_module, api_aud_sync_module, api_nzd_sync_module, api_jpy_sync_module, api_chf_sync_module, api_cny_sync_module, src_data_indicators_module [INFERRED 0.85]
- **Eight central-bank governing-board profiles modeled in centralBankers.ts (CNY excluded on purpose)** — handoff_fed, handoff_ecb, handoff_boe, handoff_boc, handoff_rba, handoff_rbnz, handoff_boj, handoff_snb, src_data_centralbankers_module [INFERRED 0.75]
- **PMI flash/final date-integrity bug cluster (ISM month-shift, publication-vs-period-date duplicates, dynamic release-stage fix)** — handoff_rationale_pmi_date_duplication, handoff_rationale_ism_date_shift_bug, handoff_rationale_upsert_by_period_date, handoff_rationale_release_stage_dynamic [INFERRED 0.85]

## Communities (36 total, 4 thin omitted)

### Community 0 - "App Shell & Layout"
Cohesion: 0.07
Nodes (48): plugins, UI Icon Sprite Sheet (icons.svg), oxc, react, App(), ChartCard, DocumentUploadList(), DocumentUploadListProps (+40 more)

### Community 1 - "Freshness & Subcomponent UI"
Cohesion: 0.08
Nodes (36): CONFIG, FreshnessBadge(), SubcomponentModal(), SubcomponentModalProps, bankersForCurrency(), FREQUENCY_STALE_DAYS, SECTION_LABELS, USD_INDICATORS (+28 more)

### Community 2 - "Score Panel & Macro Context"
Cohesion: 0.07
Nodes (39): ScorePanel(), ScorePanelProps, valoracionColor(), BankerNotesMap, BiasMap, defaultBiasMap(), fetchAllRows(), FomcWatchMap (+31 more)

### Community 3 - "Chart & FOMC Components"
Cohesion: 0.07
Nodes (40): areEqual(), ChartCardProps, samePoint(), FomcWatchPanel(), FOMC_MEETINGS_2026, FomcMeeting, upcomingFomcMeetings(), AUD_AUTO_INDICATOR_IDS (+32 more)

### Community 4 - "Package Dependencies"
Cohesion: 0.05
Nodes (43): oxlint, dependencies, react, react-dom, react-router-dom, recharts, @supabase/supabase-js, devDependencies (+35 more)

### Community 5 - "Banker Headshot Photos"
Cohesion: 0.05
Nodes (40): alexopoulos.jpg (headshot photo), andrew-hauser.jpg (headshot photo), anna-breman.jpg (headshot photo), barkin.jpg (headshot photo), breeden.jpg (headshot photo), bruce-preston.jpg (headshot photo), Carl Hansen headshot photo, Carolyn Hewson headshot photo (+32 more)

### Community 6 - "Currency Bias & Headlines"
Cohesion: 0.10
Nodes (27): CurrencyBiasCard(), CurrencyBiasCardProps, toDateInput(), BIAS_CURRENCIES, formatDateTime(), HeadlineCard(), HeadlineCardProps, MarqueeTicker() (+19 more)

### Community 7 - "Sync Entrypoints Overview"
Cohesion: 0.08
Nodes (33): api/equities-quotes.ts, api/gbp-sync.ts (GBP), api/headlines-sync.ts, api/market-quotes.ts (removed), api/translate-headlines.ts, AUD sync step (ABS + RBA) → /api/aud-sync, CAD sync step (StatCan + BoC) → /api/cad-sync, CHF sync step (SNB + SECO + KOF) → /api/chf-sync (+25 more)

### Community 8 - "EUR Sync & Data-Integrity Lessons"
Cohesion: 0.07
Nodes (33): api/eur-sync.ts (EUR), Eurostat SDMX API, "Cargando…" could hang forever if fetch never resolves/rejects, Controlled input broke because setState ran after await Supabase, Excel-to-Supabase migration mapping decisions (SESGOS/MOTIVOS/TITULARES/DATOS_ECO), EUR HICP flash→final auto-replacement via Eurostat prc_hicp_fpd, parentId + groupByParent subcomponent-modal pattern (generalized from ISM), Multi-currency architecture pattern (shared components + id prefix namespacing) (+25 more)

### Community 9 - "NZD Sync Pipeline"
Cohesion: 0.18
Nodes (24): cpiQoqSeries(), cpiYoySeries(), currentQuarterEnd(), extractSingleCsvFromZip(), fetchCpiLevel(), fetchEctSeries(), fetchGdpLevel(), fetchLatestMonthlyZipCsv() (+16 more)

### Community 10 - "TS App Compiler Config"
Cohesion: 0.08
Nodes (24): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+16 more)

### Community 11 - "Multi-Currency Data Sources"
Cohesion: 0.11
Nodes (20): api/aud-sync.ts (AUD), api/cad-sync.ts (CAD), api/chf-sync.ts (CHF), api/fred-sync.ts (USD), api/jpy-sync.ts (JPY), api/nzd-sync.ts (NZD), ABS Data API (SDMX 2.1), Bank of Canada Valet API (+12 more)

### Community 12 - "TS Node Compiler Config"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 13 - "EUR Sync Pipeline"
Cohesion: 0.15
Nodes (18): computeSeries(), EUR_FRED_MAPPINGS, EurostatJsonStat, fetchEurostatUnemployment(), fetchFredObservations(), fetchHicpFpd(), fetchNamqContribution(), FredMapping (+10 more)

### Community 14 - "Handoff Doc & App Sections"
Cohesion: 0.11
Nodes (18): HANDOFF.md — Session Handoff Log, Core project philosophy: verify every series against the real official number before automating, Graphify knowledge graph of the repo, HIKMAN ENDÓGENO — Dashboard Macro Multi-Divisa (README), Sección Actualizar Datos (/actualizar), Sección Alemania (/alemania), Sección Banqueros (/banqueros), Sección Confianza/Sentimiento (/confianza) (+10 more)

### Community 15 - "AUD Sync Pipeline"
Cohesion: 0.35
Nodes (13): AbsObservation, cpiYoySeries(), employmentChangeSeries(), fetchAbsSeries(), fetchRbaCashRate(), gdpYoySeries(), handler(), Observation (+5 more)

### Community 16 - "Central Banks & Generic Fixes"
Cohesion: 0.18
Nodes (13): Bank of Canada (BoC), Bank of Japan (BOJ), CNY deliberately scoped to Inflación+Crecimiento only, as a risk-proxy currency, Generic hiding of empty sections/Score/Bankers per currency (data-driven nav), CSS stacking-context bug: watermark hidden behind positioned root div without isolate, ScorePanel <select> only supports -2..2 integer range bug, Self-host banker photos instead of hotlinking (CORP/anti-hotlink blocking), Reserve Bank of Australia (RBA) (+5 more)

### Community 17 - "PMI/ISM Data Lessons"
Cohesion: 0.26
Nodes (13): ISM Manufacturing/Services PMI (USD), procure.ch PMI (Switzerland), "Core CPI" definition ambiguity varies per country, ISM historical series shifted one month (2015-2026, root cause bug), PMI headline duplicate points: publication-date overrides vs period-date backfill, SA vs NSA series convention ambiguity lesson (CAD CPI), Verify against user's real reference source, not just the official release, Swiss National Bank (SNB) (+5 more)

### Community 18 - "FRED Sync Pipeline"
Cohesion: 0.26
Nodes (11): CBBS_MAPPING, computeSeries(), dedupeConsecutive(), fetchObservations(), FRED_MAPPINGS, FredMapping, FredTransform, handler() (+3 more)

### Community 19 - "Headlines Sync Pipeline"
Cohesion: 0.27
Nodes (11): BOND_EQUITY_KEYWORDS, classifyFinnhubHeadline(), CURRENCY_KEYWORDS, fetchFinnhubHeadlines(), FinnhubNewsItem, handler(), HeadlineRow, HIGH_IMPACT_KEYWORDS (+3 more)

### Community 20 - "Central Banks & Country Pages"
Cohesion: 0.21
Nodes (12): Bank of England (BoE), BusinessNZ PMI/PSI, European Central Bank (BCE), Federal Reserve (Fed), Which countries publish a precomputed GDP growth-contribution breakdown vs. not, Reserve Bank of New Zealand (RBNZ), INDICATORS[] aggregator (src/data/indicators.ts), CountryPage.tsx (+4 more)

### Community 21 - "CAD Sync Pipeline"
Cohesion: 0.31
Nodes (10): diffX1000ByMonth(), fetchBocSeries(), fetchStatCanVector(), handler(), levelByMonth(), Observation, pctChangeByMonth(), shiftMonths() (+2 more)

### Community 22 - "CNY Sync Pipeline"
Cohesion: 0.35
Nodes (10): deriveYoyFromChainedMom(), fetchChinaDataSeries(), fetchTradeBalance(), handler(), indexToYoySeries(), normalizeDate(), Observation, pctSeries() (+2 more)

### Community 23 - "JPY Sync Pipeline"
Cohesion: 0.35
Nodes (10): directPctSeries(), employmentChangeSeries(), fetchBojRate(), fetchDashboardSeries(), fetchTradeBalance(), handler(), Observation, parseEstatTime() (+2 more)

### Community 24 - "CHF Sync Pipeline"
Cohesion: 0.36
Nodes (9): directLevelSeries(), directPctSeries(), fetchKofBarometer(), fetchSnbCube(), fetchSwissdatasSeries(), handler(), Observation, pctChangeSeries() (+1 more)

### Community 25 - "CNY Data Source Lessons"
Cohesion: 0.38
Nodes (7): api/cny-sync.ts (CNY), chinadata.live (unofficial NBS/GACC aggregator), NBS official API blocked by WAF for non-China IPs, NBS official PMI (China), chinadata.live repeatedly goes stale across most CNY datasets at once, Never fabricate false series continuity across a methodology break, Currency: CNY

### Community 26 - "GBP Sync Pipeline"
Cohesion: 0.53
Nodes (5): fetchBoeBankRate(), fetchTradeBalance(), handler(), Observation, parseMonthlyFromDailyCsv()

### Community 27 - "Lint Config (oxlint)"
Cohesion: 0.33
Nodes (5): rules, react/only-export-components, react/rules-of-hooks, $schema, warn

### Community 28 - "Equities Quotes API"
Cohesion: 0.60
Nodes (4): fetchFinnhubQuote(), fetchYahooQuote(), handler(), QuoteResult

### Community 30 - "App Entry Point"
Cohesion: 0.67
Nodes (3): index.html entry document (HIKMAN ENDÓGENO), /favicon.png (browser tab icon), /src/main.tsx (script entry point)

### Community 31 - "Brand Assets (Logo/Favicon)"
Cohesion: 0.67
Nodes (3): Favicon (HC monogram mark), Full Logo Lockup (HC mark + 'HIKMAN CAPITAL' wordmark), Logo Icon (HC monogram mark, standalone)

## Knowledge Gaps
- **233 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `Observation` (+228 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `IndicatorMeta` connect `Freshness & Subcomponent UI` to `EUR Sync & Data-Integrity Lessons`, `App Shell & Layout`, `Chart & FOMC Components`, `Central Banks & Country Pages`?**
  _High betweenness centrality (0.219) - this node is a cross-community bridge._
- **Why does `INDICATORS[] aggregator (src/data/indicators.ts)` connect `Central Banks & Country Pages` to `Freshness & Subcomponent UI`, `EUR Sync & Data-Integrity Lessons`, `Central Banks & Generic Fixes`, `PMI/ISM Data Lessons`, `CNY Data Source Lessons`?**
  _High betweenness centrality (0.158) - this node is a cross-community bridge._
- **Why does `react` connect `App Shell & Layout` to `Freshness & Subcomponent UI`, `Score Panel & Macro Context`, `Chart & FOMC Components`, `Currency Bias & Headlines`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _233 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & Layout` be split into smaller, more focused modules?**
  _Cohesion score 0.07372229760289462 - nodes in this community are weakly interconnected._
- **Should `Freshness & Subcomponent UI` be split into smaller, more focused modules?**
  _Cohesion score 0.07529411764705882 - nodes in this community are weakly interconnected._
- **Should `Score Panel & Macro Context` be split into smaller, more focused modules?**
  _Cohesion score 0.06857142857142857 - nodes in this community are weakly interconnected._