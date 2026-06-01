import { extractSenateVoteUrls, parseSenateVoteXml } from "../parsers/votes";
import { fetchText, mapWithConcurrency } from "../utils/io";

function isSkippableSenateFetchError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes(" with 403") ||
    message.includes(" with 404") ||
    message.includes("fetch failed") ||
    message.includes("Connect Timeout") ||
    message.includes("The operation was aborted")
  );
}

async function fetchVoteMenu(congress: number, session: number) {
  const url = `https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_${congress}_${session}.htm`;

  try {
    return await fetchText(url);
  } catch (error) {
    if ((error instanceof Error ? error.message : String(error)).includes(" with 404")) {
      return null;
    }

    if (isSkippableSenateFetchError(error)) {
      console.warn(`Senate vote menu was not accessible for session ${session}; skipping Senate votes for this menu.`);
      return null;
    }

    throw error;
  }
}

export async function syncSenateVotes(
  checkedAt: string,
  congress: number,
  senateLisToBioguide: Record<string, string>,
  billSlugByDisplayNumber: Map<string, string>
) {
  const menuPages = (
    await Promise.all([1, 2].map((session) => fetchVoteMenu(congress, session)))
  ).filter(Boolean) as string[];
  const voteUrls = [...new Set(menuPages.flatMap((menuHtml) => extractSenateVoteUrls(menuHtml)))];

  return (
    await mapWithConcurrency(voteUrls, 10, async (voteUrl) => {
      try {
        const xml = await fetchText(voteUrl);
        return parseSenateVoteXml(xml, voteUrl, senateLisToBioguide, billSlugByDisplayNumber);
      } catch (error) {
        if (isSkippableSenateFetchError(error)) {
          console.warn(`Senate vote detail XML was not accessible; skipping ${voteUrl}.`);
          return null;
        }

        throw error;
      }
    })
  ).filter(Boolean);
}
