import { existsSync } from "node:fs";
import { combineVoteSyncResults } from "../parsers/votes";
import { syncCurrentMembers } from "./sync-current-members";
import { syncBills } from "./sync-bills";
import { syncHouseVotes } from "./sync-house-votes";
import { syncSenateVotes } from "./sync-senate-votes";
import { getCurrentCongress } from "../parsers/helpers";
import { readJsonFile, repoPath, writeJsonFile } from "../utils/io";

type SyncVotesOptions = {
  members?: Awaited<ReturnType<typeof syncCurrentMembers>>;
  bills?: Awaited<ReturnType<typeof syncBills>>;
};

export async function syncVotes(
  checkedAt = new Date().toISOString(),
  options: SyncVotesOptions = {}
) {
  const congress = getCurrentCongress(new Date(checkedAt));
  const members =
    options.members ??
    (await (async () => {
      try {
        return await syncCurrentMembers(checkedAt);
      } catch (error) {
        const rawPath = repoPath("data", "live", "raw", "members.json");
        if (existsSync(rawPath)) {
          console.warn(`Using cached member snapshot for vote sync. ${error}`);
          return readJsonFile<Awaited<ReturnType<typeof syncCurrentMembers>>>(rawPath);
        }

        throw error;
      }
    })());
  const bills =
    options.bills ??
    (await (async () => {
      try {
        return await syncBills(checkedAt);
      } catch (error) {
        const rawPath = repoPath("data", "live", "raw", "bills.json");
        if (existsSync(rawPath)) {
          console.warn(`Using cached bill snapshot for vote sync. ${error}`);
          return readJsonFile<Awaited<ReturnType<typeof syncBills>>>(rawPath);
        }

        throw error;
      }
    })());
  const billSlugByDisplayNumber = new Map(
    bills.bills.map((bill) => [bill.displayNumber, bill.slug] as const)
  );
  const rawPath = repoPath("data", "live", "raw", "votes.json");
  const cachedVotes = existsSync(rawPath)
    ? await readJsonFile<Awaited<ReturnType<typeof syncVotes>>>(rawPath)
    : null;

  const [houseVotes, senateVotes] = await Promise.all([
    syncHouseVotes(checkedAt, congress, billSlugByDisplayNumber),
    syncSenateVotes(checkedAt, congress, members.senateLisToBioguide, billSlugByDisplayNumber)
  ]);
  let votes = [...houseVotes, ...senateVotes];

  if ((houseVotes.length === 0 || senateVotes.length === 0) && cachedVotes) {
    const cachedHouseVotes = cachedVotes.votes.filter((vote) => vote.chamber === "HOUSE");
    const cachedSenateFallbackVotes = cachedVotes.votes.filter((vote) => vote.chamber === "SENATE");
    const fallbackVotes = [
      ...(houseVotes.length === 0 ? cachedHouseVotes : []),
      ...(senateVotes.length === 0 ? cachedSenateFallbackVotes : [])
    ];

    if (fallbackVotes.length > 0) {
      console.warn(
        `Using ${fallbackVotes.length} cached roll-call votes for chambers that were not accessible live.`
      );
      votes = [...votes, ...fallbackVotes];
    }
  }

  if (votes.length === 0) {
    if (existsSync(rawPath)) {
      const cached = await readJsonFile<Awaited<ReturnType<typeof syncVotes>>>(rawPath);
      if (cached.votes.length > 0) {
        throw new Error(
          "No live roll-call vote detail records were accessible; keeping cached vote snapshot."
        );
      }
    }
  }

  const result = {
    checkedAt,
    ...combineVoteSyncResults(votes, checkedAt)
  };

  await writeJsonFile(repoPath("data", "live", "raw", "votes.json"), result);
  return result;
}

async function main() {
  const result = await syncVotes();
  console.log(`Synced ${result.votes.length} current-Congress roll-call votes.`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
