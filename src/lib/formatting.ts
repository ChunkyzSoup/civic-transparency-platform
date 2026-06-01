export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function formatChamber(value: string) {
  return value === "HOUSE" ? "House" : value === "SENATE" ? "Senate" : value;
}

function getOrdinalSuffix(value: number) {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) {
    return "th";
  }

  switch (value % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function formatCongress(value: number) {
  return `${value}${getOrdinalSuffix(value)} Congress`;
}

export function formatParty(value: string) {
  switch (value) {
    case "DEMOCRATIC":
      return "Democratic";
    case "REPUBLICAN":
      return "Republican";
    case "INDEPENDENT":
      return "Independent";
    default:
      return "Other";
  }
}
