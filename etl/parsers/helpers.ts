export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia"
};

export function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [value];
}

export function cleanText(value: unknown): string {
  if (typeof value === "string") {
    return value.replace(/\s+/g, " ").trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record["#text"] === "string") {
      return cleanText(record["#text"]);
    }
  }

  return "";
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizePersonName(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9,\s-]/g, " ")
    .replace(/\b(jr|sr|ii|iii|iv|v|mr|mrs|ms|dr)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeNameParts(firstName: string, lastName: string) {
  return {
    first: normalizePersonName(firstName).split(" ")[0] ?? "",
    last: normalizePersonName(lastName).replace(/\s+/g, " ").trim()
  };
}

export function toParty(value: string) {
  switch (cleanText(value).toUpperCase()) {
    case "D":
    case "DEMOCRAT":
    case "DEMOCRATIC":
      return "DEMOCRATIC" as const;
    case "R":
    case "REPUBLICAN":
      return "REPUBLICAN" as const;
    case "I":
    case "INDEPENDENT":
      return "INDEPENDENT" as const;
    default:
      return "OTHER" as const;
  }
}

export function toVoteChoice(value: string) {
  const normalized = cleanText(value).toUpperCase();

  if (normalized === "YEA" || normalized === "AYE") {
    return "YEA" as const;
  }

  if (normalized === "NAY" || normalized === "NO") {
    return "NAY" as const;
  }

  if (normalized.includes("PRESENT")) {
    return "PRESENT" as const;
  }

  return "NOT_VOTING" as const;
}

export function toIsoDate(value: string) {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return null;
  }

  if (/^\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
  }

  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export function toIsoDateFromMonthDayYear(value: string) {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return null;
  }

  if (/^\d{8}$/.test(cleaned)) {
    const month = cleaned.slice(0, 2);
    const day = cleaned.slice(2, 4);
    const year = cleaned.slice(4, 8);
    const parsed = new Date(`${year}-${month}-${day}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  return toIsoDate(cleaned);
}

export function toIsoDateTime(value: string) {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return null;
  }

  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export function formatDistrict(district: string) {
  const cleaned = cleanText(district);
  if (!cleaned || cleaned === "00" || cleaned.toLowerCase() === "at large") {
    return "At Large";
  }

  const numeric = Number.parseInt(cleaned, 10);
  if (Number.isFinite(numeric)) {
    return String(numeric);
  }

  return cleaned;
}

export function formatFecDistrict(district: string | null | undefined) {
  const cleaned = cleanText(district);
  if (!cleaned || cleaned === "At Large") {
    return "00";
  }

  const numeric = Number.parseInt(cleaned, 10);
  if (Number.isFinite(numeric)) {
    return String(numeric).padStart(2, "0");
  }

  return cleaned.padStart(2, "0");
}

export function getCurrentCongress(date = new Date()) {
  return Math.floor((date.getUTCFullYear() - 1789) / 2) + 1;
}

export function getCurrentElectionCycle(date = new Date()) {
  const year = date.getUTCFullYear();
  return year % 2 === 0 ? year : year + 1;
}

export function getCongressYears(congress: number) {
  const firstYear = 1789 + (congress - 1) * 2;
  return [firstYear, firstYear + 1];
}

export function formatBillDisplayNumber(billType: string, billNumber: number) {
  const normalizedType = billType.toUpperCase();
  const labels: Record<string, string> = {
    HR: "H.R.",
    S: "S.",
    HRES: "H.Res.",
    SRES: "S.Res.",
    HJRES: "H.J.Res.",
    SJRES: "S.J.Res.",
    HCONRES: "H.Con.Res.",
    SCONRES: "S.Con.Res."
  };

  return `${labels[normalizedType] ?? normalizedType} ${billNumber}`;
}

export function normalizeBillType(value: string) {
  return cleanText(value).toUpperCase().replace(/\./g, "");
}

export function stripHtml(value: string) {
  return cleanText(value.replace(/<[^>]+>/g, " "));
}
