import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export function repoPath(...segments: string[]) {
  return path.join(process.cwd(), ...segments);
}

function loadLocalEnv() {
  const envPath = repoPath(".env");
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]] !== undefined) {
      continue;
    }

    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

loadLocalEnv();

export async function ensureDirectory(directory: string) {
  await mkdir(directory, { recursive: true });
}

export async function writeJsonFile(filePath: string, value: unknown) {
  await ensureDirectory(path.dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readJsonFile<T>(filePath: string) {
  const contents = await readFile(filePath, "utf8");
  return JSON.parse(contents) as T;
}

export async function fetchText(url: string) {
  const timeoutMs = Number.parseInt(process.env.CIVIC_FETCH_TIMEOUT_MS ?? "30000", 10);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(Number.isFinite(timeoutMs) ? timeoutMs : 30000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; civic-transparency-platform/0.1; +https://api.congress.gov)",
      Accept: "application/json,text/xml,text/html,*/*"
    }
  });

  if (!response.ok) {
    throw new Error(`Fetch failed for ${url} with ${response.status}`);
  }

  return response.text();
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
) {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runWorker()));
  return results;
}
