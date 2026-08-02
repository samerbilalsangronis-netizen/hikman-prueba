# Graph Report - .  (2026-08-02)

## Corpus Check
- 125 files · ~278,400 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 619 nodes · 1144 edges · 36 communities (34 shown, 2 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.72)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Currency Bias & Macro Context
- App Shell & Layout
- Chart & FOMC Components
- Package Dependencies
- Banker Headshot Photos
- Score Panel & Indicators
- NZD Sync Pipeline
- TS App Compiler Config
- TS Node Compiler Config
- EUR Sync Pipeline
- Branding & Entry Doc Notes
- AUD Sync Pipeline
- Sync Entrypoints & Stale README Notes
- FRED Sync Pipeline
- Headlines Sync Pipeline
- Banqueros Page & Types
- CAD Sync Pipeline
- CNY Sync Pipeline
- JPY Sync Pipeline
- AUD/EUR/USD Data Sources
- CHF Sync Pipeline
- GBP/NZD Workflows & Cron Bug
- Equities & RentaVariable
- Headline Translation Feature
- Lint Config (oxlint)
- EUR/JPY GDP Automation Notes
- GBP Sync Pipeline
- Release Stage & Subcomponent Modal
- Equities Quotes API
- CHF Data Sources
- Supabase Persistence
- CAD Data Sources
- Translate Headlines API
- Brand Assets (Logo/Favicon)
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

## Communities (36 total, 2 thin omitted)

### Community 0 - "Currency Bias & Macro Context"
Cohesion: 0.05
Nodes (61): CurrencyBiasCardProps, BIAS_CURRENCIES, formatDateTime(), HeadlineCard(), HeadlineCardProps, MarqueeTickerProps, CurrencyContextValue, BankerNotesMap (+53 more)

### Community 1 - "App Shell & Layout"
Cohesion: 0.09
Nodes (42): UI Icon Sprite Sheet (icons.svg), react, App(), ChartCard, CurrencyBiasCard(), toDateInput(), DocumentUploadList(), DocumentUploadListProps (+34 more)

### Community 2 - "Chart & FOMC Components"
Cohesion: 0.08
Nodes (43): areEqual(), ChartCardInner(), ChartTooltip(), samePoint(), FomcWatchPanel(), CONFIG, FreshnessBadge(), FOMC_MEETINGS_2026 (+35 more)

### Community 3 - "Package Dependencies"
Cohesion: 0.05
Nodes (43): oxlint, dependencies, react, react-dom, react-router-dom, recharts, @supabase/supabase-js, devDependencies (+35 more)

### Community 4 - "Banker Headshot Photos"
Cohesion: 0.05
Nodes (40): alexopoulos.jpg (headshot photo), andrew-hauser.jpg (headshot photo), anna-breman.jpg (headshot photo), barkin.jpg (headshot photo), breeden.jpg (headshot photo), bruce-preston.jpg (headshot photo), Carl Hansen headshot photo, Carolyn Hewson headshot photo (+32 more)

### Community 5 - "Score Panel & Indicators"
Cohesion: 0.09
Nodes (23): ChartCardProps, ScorePanel(), ScorePanelProps, valoracionColor(), SubcomponentModal(), SubcomponentModalProps, FREQUENCY_STALE_DAYS, INDICATORS (+15 more)

### Community 6 - "NZD Sync Pipeline"
Cohesion: 0.18
Nodes (24): cpiQoqSeries(), cpiYoySeries(), currentQuarterEnd(), extractSingleCsvFromZip(), fetchCpiLevel(), fetchEctSeries(), fetchGdpLevel(), fetchLatestMonthlyZipCsv() (+16 more)

### Community 7 - "TS App Compiler Config"
Cohesion: 0.08
Nodes (24): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+16 more)

### Community 8 - "TS Node Compiler Config"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 9 - "EUR Sync Pipeline"
Cohesion: 0.15
Nodes (18): computeSeries(), EUR_FRED_MAPPINGS, EurostatJsonStat, fetchEurostatUnemployment(), fetchFredObservations(), fetchHicpFpd(), fetchNamqContribution(), FredMapping (+10 more)

### Community 10 - "Branding & Entry Doc Notes"
Cohesion: 0.14
Nodes (16): CNY sync step (chinadata.live) → /api/cny-sync, chinadata.live (unofficial NBS/GACC aggregator), Self-hosting central-banker photos instead of hotlinking, Hikman Capital brand identity (logo/watermark), chinadata.live aggregator repeatedly lags weeks/months behind NBS releases, CNY currency pipeline (13 indicators, 13/13 automated — reference/risk-proxy currency), HIKMAN ENDÓGENO dashboard, Multi-currency architecture pattern (+8 more)

### Community 11 - "AUD Sync Pipeline"
Cohesion: 0.35
Nodes (13): AbsObservation, cpiYoySeries(), employmentChangeSeries(), fetchAbsSeries(), fetchRbaCashRate(), gdpYoySeries(), handler(), Observation (+5 more)

### Community 12 - "Sync Entrypoints & Stale README Notes"
Cohesion: 0.16
Nodes (14): api/aud-sync.ts, api/cad-sync.ts, api/chf-sync.ts, api/cny-sync.ts, api/fred-sync.ts, api/gbp-sync.ts, api/jpy-sync.ts, api/nzd-sync.ts (+6 more)

### Community 13 - "FRED Sync Pipeline"
Cohesion: 0.26
Nodes (11): CBBS_MAPPING, computeSeries(), dedupeConsecutive(), fetchObservations(), FRED_MAPPINGS, FredMapping, FredTransform, handler() (+3 more)

### Community 14 - "Headlines Sync Pipeline"
Cohesion: 0.27
Nodes (11): BOND_EQUITY_KEYWORDS, classifyFinnhubHeadline(), CURRENCY_KEYWORDS, fetchFinnhubHeadlines(), FinnhubNewsItem, handler(), HeadlineRow, HIGH_IMPACT_KEYWORDS (+3 more)

### Community 15 - "Banqueros Page & Types"
Cohesion: 0.21
Nodes (11): BankerCard(), initials(), STANCE_LABEL, stanceColor(), StatementBlock(), VOTE_GROUPS, voteBadge(), BankerNote (+3 more)

### Community 16 - "CAD Sync Pipeline"
Cohesion: 0.31
Nodes (10): diffX1000ByMonth(), fetchBocSeries(), fetchStatCanVector(), handler(), levelByMonth(), Observation, pctChangeByMonth(), shiftMonths() (+2 more)

### Community 17 - "CNY Sync Pipeline"
Cohesion: 0.35
Nodes (10): deriveYoyFromChainedMom(), fetchChinaDataSeries(), fetchTradeBalance(), handler(), indexToYoySeries(), normalizeDate(), Observation, pctSeries() (+2 more)

### Community 18 - "JPY Sync Pipeline"
Cohesion: 0.35
Nodes (10): directPctSeries(), employmentChangeSeries(), fetchBojRate(), fetchDashboardSeries(), fetchTradeBalance(), handler(), Observation, parseEstatTime() (+2 more)

### Community 19 - "AUD/EUR/USD Data Sources"
Cohesion: 0.25
Nodes (11): AUD sync step (ABS + RBA) → /api/aud-sync, EUR sync step (FRED + Eurostat) → /api/eur-sync, USD sync step (FRED) → /api/fred-sync, ABS Data API (SDMX 2.1, keyless), Eurostat SDMX API, FRED API (Federal Reserve Bank of St. Louis), RBA public CSV (table F1.1), AUD currency pipeline (20 indicators, 16 automated) (+3 more)

### Community 20 - "CHF Sync Pipeline"
Cohesion: 0.36
Nodes (9): directLevelSeries(), directPctSeries(), fetchKofBarometer(), fetchSnbCube(), fetchSwissdatasSeries(), handler(), Observation, pctChangeSeries() (+1 more)

### Community 21 - "GBP/NZD Workflows & Cron Bug"
Cohesion: 0.27
Nodes (10): GBP sync step (BoE) → /api/gbp-sync, NZD sync step (Stats NZ) → /api/nzd-sync, Sincronizar Divisas (GitHub Actions workflow), Sincronizar Titulares (GitHub Actions workflow), Bank of England IADB (CSV), Stats NZ per-release CSVs, Backup sync Routine (trig_01VigD4t2wgyxh8YCAYDqtg1), GBP currency pipeline (16 indicators, mostly manual) (+2 more)

### Community 22 - "Equities & RentaVariable"
Cohesion: 0.31
Nodes (8): EQUITIES_BY_CURRENCY, EquityGroup, EquitySymbol, formatPrice(), formatTime(), Quote, QuoteCard(), RentaVariable()

### Community 23 - "Headline Translation Feature"
Cohesion: 0.28
Nodes (9): api/headlines-sync.ts, api/translate-headlines.ts, Sincronizar titulares step → /api/headlines-sync, Traducir titulares pendientes step → /api/translate-headlines, Currency Bias feature (CurrencyBiasCard), Forex Factory CDN URL change broke headlines sync, Automatic headline translation via MyMemory, Panel de Control page (/panel-control) (+1 more)

### Community 24 - "Lint Config (oxlint)"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 25 - "EUR/JPY GDP Automation Notes"
Cohesion: 0.29
Nodes (8): api/eur-sync.ts, JPY sync step (e-Stat + BOJ) → /api/jpy-sync, Bank of Japan CSV (stat-search.boj.or.jp), e-Stat Dashboard API (Japan), JPY currency pipeline (16 indicators, 12 automated), EUR GDP-by-component automation via namq_10_gdp (unit=CON_PPCH_PRE), EUR HICP flash→final automation via Eurostat prc_hicp_fpd, GDP subcomponent redesign (Consumo/Inversión/Gasto Público/Exportaciones Netas) across all 9 currencies

### Community 26 - "GBP Sync Pipeline"
Cohesion: 0.53
Nodes (5): fetchBoeBankRate(), fetchTradeBalance(), handler(), Observation, parseMonthlyFromDailyCsv()

### Community 27 - "Release Stage & Subcomponent Modal"
Cohesion: 0.33
Nodes (6): Preliminar/Final release-stage badge (IndicatorMeta.releaseStage), Subcomponent modal UX (SubcomponentModal.tsx + groupByParent), src/components/ChartCard.tsx, src/components/SectionGrid.tsx, src/pages/Actualizar.tsx, src/types.ts

### Community 28 - "Equities Quotes API"
Cohesion: 0.60
Nodes (4): fetchFinnhubQuote(), fetchYahooQuote(), handler(), QuoteResult

### Community 29 - "CHF Data Sources"
Cohesion: 0.50
Nodes (5): CHF sync step (SNB + SECO + KOF) → /api/chf-sync, KOF Economic Barometer API v2, SECO CSV feed (scheduler.swissdatas.ch), SNB Data Portal API (data.snb.ch), CHF currency pipeline (16 indicators, 9 automated)

### Community 30 - "Supabase Persistence"
Cohesion: 0.40
Nodes (5): Migration from HIKMAN CAPITAL SISTEMA 2.0.xlsx, Supabase (Postgres backend), Supabase/localStorage persistence (README), src/data/MacroDataContext.tsx, supabase/schema.sql

### Community 31 - "CAD Data Sources"
Cohesion: 0.83
Nodes (4): CAD sync step (StatCan + BoC) → /api/cad-sync, Bank of Canada Valet API, StatCan Web Data Service (WDS), CAD currency pipeline (17 indicators, 11 automated)

### Community 33 - "Brand Assets (Logo/Favicon)"
Cohesion: 0.67
Nodes (3): Favicon (HC monogram mark), Full Logo Lockup (HC mark + 'HIKMAN CAPITAL' wordmark), Logo Icon (HC monogram mark, standalone)

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
- **187 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+182 more)
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
- **Why does `react` connect `App Shell & Layout` to `Currency Bias & Macro Context`, `Chart & FOMC Components`, `Score Panel & Indicators`, `Banqueros Page & Types`, `Equities & RentaVariable`, `Lint Config (oxlint)`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `Sincronizar Divisas (GitHub Actions workflow)` connect `GBP/NZD Workflows & Cron Bug` to `Branding & Entry Doc Notes`, `Sync Entrypoints & Stale README Notes`, `AUD/EUR/USD Data Sources`, `EUR/JPY GDP Automation Notes`, `CHF Data Sources`, `CAD Data Sources`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `plugins` connect `Lint Config (oxlint)` to `App Shell & Layout`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._