import { syncHouseMembers } from "./sync-house-members";
import { syncSenateMembers } from "./sync-senate-members";
import { repoPath, writeJsonFile } from "../utils/io";

export async function syncCurrentMembers(checkedAt = new Date().toISOString()) {
  const [house, senate] = await Promise.all([
    syncHouseMembers(checkedAt),
    syncSenateMembers(checkedAt)
  ]);

  const result = {
    checkedAt,
    people: [...house.people, ...senate.people],
    committees: [...house.committees, ...senate.committees],
    sources: [...house.sources, ...senate.sources],
    senateLisToBioguide: senate.senateLisToBioguide
  };

  await writeJsonFile(repoPath("data", "live", "raw", "members.json"), result);
  return result;
}

async function main() {
  const result = await syncCurrentMembers();
  console.log(`Synced ${result.people.length} current-member profiles.`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
