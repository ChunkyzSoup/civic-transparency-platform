# Methodology

## Purpose

The MVP surfaces **review signals** and **pattern indicators** that may help a user decide whether a public-record pattern deserves additional review.

The system does **not** attempt to determine motive, ethics, legality, or wrongdoing.

## Locked MVP Scope

The public MVP uses only:

- the current Congress scope
- the current election cycle
- FEC committee and PAC to candidate contributions
- official House and Senate member data
- official committee assignments
- official roll-call votes
- official bill data

The public MVP does **not** use:

- individual donors
- lobbying
- downstream spending
- weak or fuzzy joins
- undocumented industry matching

## Layer Separation

The system is intentionally split into three layers:

1. Facts layer
   Raw sourced records such as contributions, committee assignments, bills, and votes.
2. Linkage layer
   High-confidence joins that connect facts with explicit confidence, timing direction, and exclusion reasons.
3. Signal layer
   Derived review signals and non-scored assessments that explain exactly why something was or was not shown.

The product should never blur these layers in either the data model or the UI.

## Public Eligibility Rules

A review signal may appear **only** when all of the following are true:

1. There is a verified committee or PAC contribution to a candidate.
2. There is a verified legislative action in scope for the MVP.
3. The contribution happened before the vote.
4. At least two independent factors are present.
5. Linkage confidence is high.
6. Any documented topic alignment is supported by a documented, high-confidence classification.

If any of these conditions fail, the result should be:

`Insufficient evidence to score`

## Current Live Implementation Note

The current live build only activates two public factors:

- timing proximity
- repeat support pattern

Other documented factors remain withheld until their linkage path is strong enough for the public MVP.

If the official vote or member feeds cannot be refreshed directly from the current runtime and the app has to rely on cached official snapshots, public review signals are withheld and profiles should resolve to:

`Insufficient evidence to score`

## Weighted Factors

| Factor | Max points | Public MVP rule |
| --- | ---: | --- |
| Timing proximity | 25 | Contribution must occur before the vote |
| Amount context | 20 | Context only; never enough on its own |
| Documented topic alignment | 20 | Only with documented, high-confidence classification |
| Repeat support pattern | 15 | Requires repeated verified support in the selected cycle |
| Committee context | 10 | Membership must be effective at the time of the vote |

## Public Signal Strength

- `0-34`: insufficient evidence to score
- `35-54`: low signal strength, yellow
- `55+`: medium signal strength, orange

The public MVP does **not** use red and does **not** publish high-strength labels.

## Guardrails

- Never rank politicians.
- Never compare people across profiles.
- Never compare people across Congress slices.
- Never show a public "top signals" list.
- Never use a donation alone as the basis for a signal.
- Never infer a topic linkage from low-confidence or undocumented classifications.
- Prefer showing nothing over showing a weak or misleading pattern.

## User-Facing Language

Preferred terms:

- review signal
- signal strength
- pattern indicator
- insufficient evidence to score

Avoid:

- risk score
- suspicious
- corrupt
- bought vote
- bribery
