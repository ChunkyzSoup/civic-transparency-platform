export const methodologyVersion = "mvp-v3-live";

export const factorWeights = [
  {
    key: "timing_proximity",
    label: "Timing proximity",
    maxPoints: 25,
    description: "Active in the current live build. Only verified direct committee-to-candidate contributions that occur before the vote can receive timing points."
  },
  {
    key: "amount_outlier",
    label: "Amount context",
    maxPoints: 20,
    description: "Reserved for a later pass once a conservative within-profile baseline is fully documented."
  },
  {
    key: "documented_topic_alignment",
    label: "Documented topic alignment",
    maxPoints: 20,
    description: "Withheld in the current live build unless a documented, high-confidence classification path is added."
  },
  {
    key: "repeat_support",
    label: "Repeat support pattern",
    maxPoints: 15,
    description: "Active in the current live build. Repeated verified direct support in the selected cycle can add points."
  },
  {
    key: "committee_context",
    label: "Committee context",
    maxPoints: 10,
    description: "Withheld in the current live build until committee memberships are safely time-aware."
  }
];

export const thresholds = {
  hiddenBelow: 35,
  low: 35,
  medium: 55
};

export function getSignalStrengthLabel(score: number, factorCount: number) {
  if (score >= thresholds.medium && factorCount >= 2) {
    return "Medium signal strength";
  }
  if (score >= thresholds.low && factorCount >= 2) {
    return "Low signal strength";
  }
  return "Insufficient evidence to score";
}

export const methodologyRules = [
  "Only committee and PAC contributions to candidates are considered in the MVP.",
  "Individual donors, lobbying, and downstream spending are out of scope for the MVP.",
  "The public live MVP is limited to the current Congress and the current election cycle.",
  "A signal is eligible only when there is a verified money record and a verified legislative action.",
  "Timing only counts when the contribution occurs before the vote.",
  "At least two independent factors must be present before a review signal can appear.",
  "If linkage confidence is not high, the system shows insufficient evidence to score.",
  "Public pages do not rank politicians or compare people to one another."
];
