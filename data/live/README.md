# Live Snapshot Data

This folder stores the live official-data snapshots used by the locked MVP.

## Files

- `current-congress/live-seed.json`
  The checked-in app snapshot used by the Next.js UI.
- `raw/members.json`
  Current official member and committee facts.
- `raw/bills.json`
  Current-Congress official bill status facts.
- `raw/votes.json`
  Cached official vote snapshot used when direct refresh is blocked from this runtime.
- `raw/fec.json`
  Current-cycle FEC candidate, committee, and direct committee-to-candidate contribution facts.

## Important note

Some official House and Senate endpoints intermittently return `403` from this runtime.

When that happens, the ETL prefers the cached raw official snapshots in this folder over an unofficial substitute, and the public signal layer is withheld until the direct refresh path is stable again.
