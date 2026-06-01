# Product Spec

## 1. Smallest Useful Version

The smallest useful version is a **federal member transparency explorer**.

A user can search a sitting House or Senate member and see:

- which donor committees or PACs gave money to that member's campaign committee
- how much was given and when
- which committees the member sits on
- which recent bills and roll-call votes are tied to those committees or bill topics
- whether the system found a contextual review signal worth showing
- why each signal was highlighted, including limitations

The MVP is useful because it helps a normal person answer one core question:

> "Was there a notable pattern between campaign money, committee position, and a later vote or bill area?"

## 2. Deliberate Scope Cuts

To keep the first version realistic:

- federal only
- current House and Senate members first
- committee/PAC/campaign-committee money first
- bill and roll-call vote coverage first
- lobbying, contracts, grants, earmarks, and spending outcomes moved to the roadmap unless the linkage is direct and defensible
- no automatic merging of weakly matched entities
- no predictive claims

## 3. Safety Guardrails

- Never use "corrupt," "bribed," or equivalent language in UI copy.
- Use "review signal," "signal strength," and "pattern indicator" language instead of wrongdoing language.
- Every signal must show its factors and weights.
- Real source links must be attached to every non-demo record.
- Missing data must be visible.
- Synthetic demo data must be labeled clearly.
- If linkage confidence is not high, show insufficient evidence to score.

## 4. Simplest Architecture

Use a single Next.js codebase with App Router.

- Next.js handles the frontend and basic API routes
- Prisma models the domain and talks to PostgreSQL
- ETL runs as standalone TypeScript scripts under `etl/`
- scoring runs as deterministic application code, not a black-box ML service
- deployment can stay simple with Vercel + managed Postgres

Why this is the right MVP architecture:

- one deployment unit
- one language across UI, API, and ETL
- easy contributor onboarding
- no queue or worker service required on day one
- clean path to future extraction if ETL volume grows

## 5. MVP User Stories

1. Search for a federal lawmaker by name.
2. Open a member profile and understand the top money sources in plain English.
3. See the member's current committee assignments.
4. Inspect a list of related bills and roll-call votes.
5. See which items triggered a review signal and why.
6. Open a donor organization page and see which lawmakers received money.
7. Open a bill page and see related votes, topics, and linked donor signals.
8. Read the methodology and understand the scoring.
9. Read the data source registry and freshness notes.
10. Run the app locally in demo mode without special data access.

## 6. First 10 Screens

1. Home page with search bar, sample queries, and safety framing
2. Search results page grouped by people, donors, bills, and votes
3. Politician profile overview page
4. Donor organization profile page
5. Bill detail page
6. Vote detail page
7. Review signal guide page
8. Methodology page
9. Data sources page
10. About / FAQ / guardrails page

## 7. Profile Page Structure

Every lawmaker profile page should have:

1. Facts
   Donations, committees, votes, and bills with source links and freshness context.
2. Review signals
   Contextual profile-only review signals with exact factors, weights, limitations, and sources.
3. Why not scored
   Explicit non-scored assessments explaining why the system withheld a review signal.

## 8. API Surface for MVP

- `GET /api/health`
- `GET /api/search?q=...`
- `GET /api/people/:slug`
- `GET /api/donors/:slug`
- `GET /api/bills/:slug`
- `GET /api/votes/:id`
- `GET /api/signals`
- `GET /api/assessments`

## 9. Future Expansion

- lobbying clients, firms, issues, and filing periods
- contracts, grants, earmarks, and spending recipients
- saved searches and alerts
- public data freshness dashboard
- contributor moderation for industry mappings

## 10. Repo Foundations

The first files should give contributors a full mental model immediately:

- `README.md`
- `docs/product-spec.md`
- `docs/methodology.md`
- `docs/data-sources.md`
- `docs/wireframes.md`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `data/demo/mvp-seed.json`
- `src/lib/scoring/methodology.ts`
- `src/app/page.tsx`
