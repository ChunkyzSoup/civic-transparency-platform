import { XMLParser } from "fast-xml-parser";
import { asArray, cleanText, formatBillDisplayNumber, normalizeBillType, slugify, toIsoDateTime } from "./helpers";
import type { BillSyncResult, RawBillRecord } from "./source-records";
import type { SourceReference } from "../../src/types/domain";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  processEntities: false
});

const billTypeLabels: Record<string, string> = {
  HR: "house-bill",
  S: "senate-bill",
  HRES: "house-resolution",
  SRES: "senate-resolution",
  HJRES: "house-joint-resolution",
  SJRES: "senate-joint-resolution",
  HCONRES: "house-concurrent-resolution",
  SCONRES: "senate-concurrent-resolution"
};

function normalizeCommitteeCode(systemCode: string) {
  const upper = systemCode.toUpperCase();
  if (upper.startsWith("HS") && upper.length === 6) {
    return upper.slice(2);
  }

  return upper || null;
}

function buildCongressUrl(congress: number, billType: string, billNumber: number) {
  const typeSlug = billTypeLabels[billType] ?? "bill";
  return `https://www.congress.gov/bill/${congress}th-congress/${typeSlug}/${billNumber}`;
}

function extractTitle(billNode: Record<string, unknown>) {
  const titles = asArray((billNode.titles as Record<string, unknown> | undefined)?.item);
  const display = titles.find((item) => cleanText((item as Record<string, unknown>).titleType) === "Display Title");
  return cleanText((display as Record<string, unknown> | undefined)?.title) || cleanText((billNode.title as string | undefined) ?? "");
}

export function extractSitemapUrls(xml: string) {
  const parsed = parser.parse(xml) as {
    sitemapindex?: {
      sitemap?: Array<{ loc?: string }> | { loc?: string };
    };
    urlset?: {
      url?: Array<{ loc?: string }> | { loc?: string };
    };
  };

  if (parsed.sitemapindex?.sitemap) {
    return asArray(parsed.sitemapindex.sitemap)
      .map((item) => cleanText(item.loc))
      .filter(Boolean);
  }

  return asArray(parsed.urlset?.url)
    .map((item) => cleanText(item.loc))
    .filter(Boolean);
}

export function parseBillStatusXml(xml: string, sourceUrl: string): RawBillRecord | null {
  const parsed = parser.parse(xml) as {
    billStatus?: {
      bill?: Record<string, unknown>;
    };
  };

  const billNode = parsed.billStatus?.bill;
  if (!billNode) {
    return null;
  }

  const billType = normalizeBillType(cleanText(billNode.type));
  const billNumber = Number.parseInt(cleanText(billNode.number), 10);
  const congress = Number.parseInt(cleanText(billNode.congress), 10);

  if (!billType || !Number.isFinite(billNumber) || !Number.isFinite(congress)) {
    return null;
  }

  const displayNumber = formatBillDisplayNumber(billType, billNumber);
  const committees = asArray((billNode.committees as Record<string, unknown> | undefined)?.item).map(
    (item) => {
      const record = item as Record<string, unknown>;
      const systemCode = cleanText(record.systemCode);
      const chamber = cleanText(record.chamber).toUpperCase() === "SENATE" ? "SENATE" : "HOUSE";
      const activities = asArray((record.activities as Record<string, unknown> | undefined)?.item);
      const referred = activities.find(
        (activity) => cleanText((activity as Record<string, unknown>).name) === "Referred To"
      ) as Record<string, unknown> | undefined;

      return {
        name: cleanText(record.name),
        committeeCode: normalizeCommitteeCode(systemCode),
        chamber,
        referredAt: toIsoDateTime(cleanText(referred?.date))
      };
    }
  );

  const latestActionNode = billNode.latestAction as Record<string, unknown> | undefined;
  const policyAreaNode = billNode.policyArea as Record<string, unknown> | undefined;
  const slug = slugify(`${congress}-${billType}-${billNumber}`);
  const latestActionAt =
    toIsoDateTime(cleanText(latestActionNode?.actionDate)) ??
    toIsoDateTime(cleanText(billNode.updateDate)) ??
    null;

  return {
    slug,
    congress,
    chamber: cleanText(billNode.originChamberCode) === "S" ? "SENATE" : "HOUSE",
    billType,
    billNumber,
    displayNumber,
    title: extractTitle(billNode),
    summary: cleanText(latestActionNode?.text) || "Latest official action shown from GovInfo bill status.",
    statusText: cleanText(latestActionNode?.text),
    introducedAt: cleanText(billNode.introducedDate) || null,
    latestActionAt,
    policyArea: cleanText(policyAreaNode?.name) || null,
    officialUrl: buildCongressUrl(congress, billType, billNumber),
    committees,
    sourceSlugs: ["govinfo-bill-status"]
  };
}

export function buildBillSources(checkedAt: string): SourceReference[] {
  return [
    {
      slug: "govinfo-bill-status",
      label: "GovInfo bill status bulk data",
      sourceSystem: "GovInfo",
      url: "https://www.govinfo.gov/sitemap/bulkdata/BILLSTATUS/sitemapindex.xml",
      recordScope: "Current Congress bill status XML files",
      isDemo: false,
      lastCheckedAt: checkedAt
    }
  ];
}

export function combineBillSyncResults(bills: RawBillRecord[], checkedAt: string): BillSyncResult {
  return {
    bills,
    sources: buildBillSources(checkedAt)
  };
}
