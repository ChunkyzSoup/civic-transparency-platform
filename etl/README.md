# ETL Overview

The MVP ETL layer is split into three concerns:

- `config/`: official dataset registry and runtime settings
- `parsers/`: source-specific parsing helpers
- `jobs/`: ingestion entry points and post-processing tasks

## First Live Sequence

1. ingest House and Senate member data
2. ingest FEC candidate and committee master data
3. ingest committee-to-candidate contributions
4. ingest bills and roll-call votes
5. run deterministic signal generation

## Guardrails

- preserve source record IDs
- avoid weak entity joins
- do not infer industries when confidence is low
- store unresolved classifications explicitly

