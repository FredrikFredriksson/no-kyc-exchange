import { useEffect, useState } from "react";

export function usePolledFetch<T>(
  url: string,
  intervalMs: number,
): T | undefined {
  const [data, setData] = useState<T>();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const json = (await res.json()) as T;
        if (!cancelled) setData(json);
      } catch {
        // swallow — widget falls back to skeleton / stale data
      }
    };

    load();
    const id = window.setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [url, intervalMs]);

  return data;
}
