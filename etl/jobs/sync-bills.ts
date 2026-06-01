import { combineBillSyncResults, extractSitemapUrls, parseBillStatusXml } from "../parsers/bills";
import { getCurrentCongress } from "../parsers/helpers";
import { fetchText, mapWithConcurrency, repoPath, writeJsonFile } from "../utils/io";

const BILL_STATUS_SITEMAP_INDEX_URL =
  "https://www.govinfo.gov/sitemap/bulkdata/BILLSTATUS/sitemapindex.xml";

export async function syncBills(checkedAt = new Date().toISOString()) {
  const congress = getCurrentCongress(new Date(checkedAt));
  const sitemapIndexXml = await fetchText(BILL_STATUS_SITEMAP_INDEX_URL);
  const currentCongressSitemaps = extractSitemapUrls(sitemapIndexXml).filter((url) =>
    url.includes(`/BILLSTATUS/${congress}`)
  );

  const billUrls = (
    await mapWithConcurrency(currentCongressSitemaps, 4, async (sitemapUrl) => {
      const sitemapXml = await fetchText(sitemapUrl);
      return extractSitemapUrls(sitemapXml);
    })
  ).flat();

  const bills = (
    await mapWithConcurrency(billUrls, 10, async (billUrl) => {
      const billXml = await fetchText(billUrl);
      return parseBillStatusXml(billXml, billUrl);
    })
  ).filter(Boolean);

  const result = {
    checkedAt,
    ...combineBillSyncResults(bills, checkedAt)
  };

  await writeJsonFile(repoPath("data", "live", "raw", "bills.json"), result);
  return result;
}

async function main() {
  const result = await syncBills();
  console.log(`Synced ${result.bills.length} current-Congress bills.`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
