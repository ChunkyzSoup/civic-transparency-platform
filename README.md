# Civic Transparency Platform

An open-source, federal-first civic transparency app for exploring campaign money, committee relationships, bills, roll-call votes, and explainable review signals without making unsupported accusations.

## MVP

The first usable version is intentionally narrow:

- U.S. House and Senate members only
- current Congress only
- current election cycle only
- official House and Senate member data
- official bill data
- official roll-call vote data where the source can be refreshed safely from this runtime
- direct committee-to-candidate contribution facts from current-cycle FEC bulk files
- profile-level review signals only when the public rules are met
- live-first dataset loading with demo fallback if the live snapshot is missing

What is explicitly out of scope for the first public release:

- Crime or corruption labels
- Opaque AI scoring
- Aggressive entity matching
- Lobbying influence claims without strong linkage
- Contract, grant, or earmark inference unless the data path is solid

## Product Principles

- Use plain English before insider terminology.
- Treat surfaced patterns as review prompts, not verdicts.
- Show exact factors and weights for every signal.
- Link every real data point back to a source.
- Mark synthetic demo fallback and cached live snapshots clearly.
- Prefer insufficient evidence to score over weak joins.

## Stack

- Frontend and API: Next.js + TypeScript
- Database: PostgreSQL + Prisma
- ETL: Node TypeScript scripts
- Styling: Tailwind-compatible setup plus semantic CSS tokens
- Deployment target: Vercel + managed Postgres or Docker Compose

## Local Setup

### Prerequisites

- Node.js 20+ or current LTS
- npm
- PostgreSQL locally, or Docker Desktop if you want to run Postgres in a container

If you just installed Node.js and PowerShell still says `node` or `npm` is not recognized, close the terminal and open a fresh one before continuing.

### Easiest Beginner Path

If you want the fewest moving parts for the current live snapshot:

1. Install Node.js LTS
2. Run `npm install`
3. Run `npm run dev`
4. Open `http://localhost:3000`

### Quick Start Without Docker

PowerShell:

```powershell
Copy-Item .env.example .env
npm install
npm run etl:live
npm run dev
```

Bash:

```bash
cp .env.example .env
npm install
npm run etl:live
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If you only want to check the web app first, you can stop after `npm install` and `npm run dev`. The app will use the checked-in live snapshot when it exists, and fall back to the synthetic demo snapshot only if the live file is missing.

### Quick Start With Docker

```bash
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000).

The Docker setup now runs the production Next.js server, mounts `data/live` so refreshed
snapshots survive container rebuilds, and attempts a live ETL refresh when the web container
starts. A companion `data-refresh` container reruns the live ETL on an interval.

Optional environment variables:

```bash
CONGRESS_API_KEY=your_key
GOVINFO_API_KEY=your_key
CIVIC_REFRESH_INTERVAL_SECONDS=21600
CIVIC_DATA_CACHE_TTL_MS=300000
```

If a public source blocks refresh, the app keeps serving the last cached snapshot instead of
failing closed. Check [http://localhost:3000/api/health](http://localhost:3000/api/health)
for the loaded data mode and source freshness dates.

## Demo Mode

The repo still keeps the original synthetic demo seed as a fallback. It is used only if the live current-Congress snapshot is missing.

The live loader looks for:

- `data/live/current-congress/live-seed.json`

If that file is not present, the app falls back to:

- `data/demo/mvp-seed.json`

## Core Pages

- `/` home and search
- `/search` results
- `/people/[slug]` politician profile
- `/donors/[slug]` donor organization profile
- `/bills/[slug]` bill detail
- `/votes/[id]` vote detail
- `/signals` review signal guide
- `/methodology` scoring and safeguards
- `/sources` data source registry
- `/about` project purpose and guardrails

## Repo Layout

```text
src/
  app/              Next.js routes and API handlers
  components/       UI building blocks
  lib/              shared utilities, scoring rules, demo loaders
  types/            domain types
prisma/             schema and seeding
etl/                ingestion jobs, parsers, mappings
data/demo/          synthetic seed snapshot
docs/               spec, methodology, data sources, wireframes
scripts/            optional setup helpers
```

## First ETL Targets

- FEC candidate master file
- FEC committee master file
- FEC committee-to-candidate contributions
- House Clerk member XML
- Senate current senators and committee XML
- Congress.gov or GovInfo bill metadata
- House and Senate roll-call vote feeds

Details live in [docs/data-sources.md](./docs/data-sources.md).

## Current Status

The current repo is wired to a live official-data snapshot for the locked MVP facts layer:

- live current House and Senate member profiles
- live current-Congress bills
- live current-cycle FEC direct committee-to-candidate contributions
- live lawmaker photos where a reliable official path is available
- current live review-signal sections that correctly resolve to `Insufficient evidence to score` when the signal layer is withheld

Important runtime limitation:

- some official House and Senate feeds intermittently block direct refresh from this runtime with `403`
- when that happens, `npm run etl:live` falls back to the cached raw official snapshots already stored under `data/live/raw/`
- while vote/member refresh is relying on cached source snapshots, the app withholds public review signals and keeps the facts visible

## What You Should See

When the app is running, start with a lawmaker profile. The MVP is designed around this page order:

1. Facts
2. Connection map
3. Review signals
4. Why not scored

The public MVP does not rank politicians or publish cross-profile signal lists.

The connection map is factual, not accusatory: it joins donor committee money to a recipient,
then shows related legislative surfaces through roll-call timing, committee referrals, and
clearly labeled interest clues. Refunds and negative FEC records are netted separately so the
visible support total is easier to understand.

## Live Data Commands

PowerShell:

```powershell
npm install
npm run etl:live
npm run dev
```

Useful ETL commands:

```powershell
npm run etl:members
npm run etl:bills
npm run etl:votes
npm run etl:fec
npm run etl:live
```

## License

Recommended for publication: MIT for code, with clear attribution notes for third-party data sources in the docs.
