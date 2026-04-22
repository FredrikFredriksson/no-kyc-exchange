import { useEffect, useState } from "react";

interface CacheEntry {
  data: unknown;
  promise: Promise<unknown>;
}

const cache = new Map<string, CacheEntry>();

function fetchJson(url: string): Promise<unknown> {
  return fetch(url, {
    // High priority hint so this request isn't queued behind Orderly's
    // websocket/market data requests on cold load. Ignored by browsers
    // that don't support it.
    priority: "high",
  } as RequestInit)
    .then((r) => (r.ok ? r.json() : undefined))
    .catch(() => undefined);
}

/**
 * Kick off a fetch as early as possible (at module load), so by the time
 * the widget mounts — often 5–15s later while TradingPage hogs the main
 * thread — the response is already sitting in memory and can be rendered
 * on the first paint instead of via a post-mount setState.
 */
export function prewarm(url: string): void {
  if (cache.has(url)) return;
  const entry: CacheEntry = {
    data: undefined,
    promise: fetchJson(url).then((data) => {
      entry.data = data;
      return data;
    }),
  };
  cache.set(url, entry);
}

export function usePolledFetch<T>(
  url: string,
  intervalMs: number,
): T | undefined {
  const [data, setData] = useState<T | undefined>(
    () => cache.get(url)?.data as T | undefined,
  );

  useEffect(() => {
    let cancelled = false;

    const entry = cache.get(url);
    if (entry) {
      if (entry.data === undefined) {
        entry.promise.then((result) => {
          if (!cancelled && result !== undefined) setData(result as T);
        });
      }
    } else {
      prewarm(url);
      cache.get(url)!.promise.then((result) => {
        if (!cancelled && result !== undefined) setData(result as T);
      });
    }

    const load = async () => {
      const result = (await fetchJson(url)) as T | undefined;
      if (cancelled || result === undefined) return;
      const current = cache.get(url);
      if (current) current.data = result;
      setData(result);
    };

    const id = window.setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [url, intervalMs]);

  return data;
}
