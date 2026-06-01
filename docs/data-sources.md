# Data Sources

The public MVP is intentionally limited to the **current Congress** and the **current election cycle**.

The MVP should prefer official public federal sources wherever possible.

## Required MVP Sources

### FEC candidate master file

- Purpose: map House and Senate candidates to campaign committees
- Official source: [Candidate master file description](https://www.fec.gov/campaign-finance-data/candidate-master-file-description/)
- Why it matters: exposes candidate IDs, office, state, district, incumbent status, and principal campaign committee IDs

### FEC committee master file

- Purpose: identify PACs, party committees, campaign committees, connected organizations, and FEC committee metadata
- Official source: [Committee master file description](https://www.fec.gov/campaign-finance-data/committee-master-file-description/)
- Why it matters: provides committee IDs, committee names, committee type, connected organization names, and linked candidate IDs

### FEC committee-to-candidate contributions

- Purpose: ingest committee-origin contributions and independent expenditures tied to candidates
- Official source: [Contributions from committees to candidates file description](https://www.fec.gov/campaign-finance-data/contributions-committees-candidates-file-description/)
- Why it matters: gives the donor committee, recipient candidate, amount, transaction date, and source record IDs

### House member XML

- Purpose: current House roster and committee assignments
- Official source: [House Member Data in XML user guide](https://clerk.house.gov/member_info/MemberData_UserGuide.pdf)
- Note: the House Clerk guide says the XML file contains current House members only and includes committee and subcommittee assignments
- Current runtime note: this feed may intermittently return `403` from some environments, so the ETL keeps a cached raw official snapshot fallback for local runs

### Senate XML feeds

- Purpose: current senators, committee assignments, and vote XML
- Official source: [XML Sources Available on Senate.gov](https://www.senate.gov/general/common/generic/XML_Availability.htm)
- Note: Senate.gov publishes current senator info, committee memberships, roll-call vote lists, and individual vote XML
- Current runtime note: some Senate vote endpoints may intermittently block refresh from this runtime, so the ETL also supports cached raw official snapshot fallback

### House roll-call votes

- Purpose: official House recorded vote metadata and member-level positions
- Official source: [House roll call votes](https://clerk.house.gov/evs/index.htm)
- Current vote example: [Office of the Clerk vote page](https://clerk.house.gov/Votes/202639)
- Current runtime note: detailed House vote endpoints have been returning `403` from this environment, so the repo currently relies on cached raw official vote snapshots when direct refresh is blocked

### Bills and bill status

- Purpose: titles, summaries, official metadata, and legislative status
- Official sources:
  - [Congress.gov API repository overview](https://github.com/LibraryOfCongress/api.congress.gov)
  - [GovInfo Congressional Bills help page](https://www.govinfo.gov/help/bills)
  - [GovInfo Developer Hub](https://www.govinfo.gov/developers)
- Notes:
  - Congress.gov API requires an API key
  - GovInfo bulk data provides official bill text, summaries, and bill status XML

## Delayed or Roadmap Sources

### Lobbying disclosure

- Candidate source for later phase: Senate public disclosure / lobbying filings
- Reason delayed: linking lobbying clients and issues to donors and legislative topics needs careful normalization to avoid weak joins

### Contracts, grants, earmarks, or downstream spending

- Candidate sources for later phase: USAspending and official earmark disclosure pages
- Reason delayed: the linkage logic is significantly more complex and easier to misuse

## Conservative Source Policy

- Prefer official government data first.
- Use third-party data only for enrichment that can be clearly attributed and replaced later.
- Preserve record IDs and source URLs in the database.
- Show freshness dates in the UI.
- If an official endpoint blocks direct refresh from the current runtime, prefer a clearly labeled cached official snapshot over a weak unofficial substitute.
