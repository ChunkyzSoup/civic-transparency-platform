export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME ?? "Civic Transparency Platform";

export const DEMO_BANNER =
  "Demo mode uses synthetic records to show the product safely. These examples are illustrative, not real-world findings.";

export const LIVE_BANNER =
  "Live mode uses official federal member, bill, vote, and FEC committee-to-candidate records for the locked MVP scope. Where a safe linkage is missing, the app should prefer insufficient evidence to score.";

export const DISCLAIMER =
  "Review signals are contextual prompts based on public records and documented linkages. They are not proof of wrongdoing or intent.";

export const LIMITATION_COPY =
  "If linkage confidence is not high, the system should prefer showing insufficient evidence to score rather than inferring a pattern.";
