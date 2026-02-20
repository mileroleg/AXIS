const HH_BASE = "https://api.hh.ru";

const HH_USER_AGENT = "hh-keywords/1.0 (local app; contact: local@localhost)";

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function hhFetch(path: string, params: URLSearchParams) {
  const url = `${HH_BASE}${path}?${params.toString()}`;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": HH_USER_AGENT,
          "HH-User-Agent": HH_USER_AGENT,
          "Accept": "application/json"
        },
        cache: "no-store"
      });

      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          throw new Error(`HH temporary error: ${response.status}`);
        }
        return new Response(await response.text(), { status: response.status });
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      await sleep(300 * Math.pow(2, attempt));
    }
  }

  throw lastError ?? new Error("Unknown HH fetch error");
}

export function toHhUrl(params: Record<string, string | undefined | boolean>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    q.set(key, String(value));
  });

  return `https://hh.ru/search/vacancy?${q.toString()}`;
}
