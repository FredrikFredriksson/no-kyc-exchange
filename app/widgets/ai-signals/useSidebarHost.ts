import { useEffect, useState } from "react";

const SIDEBAR_SELECTOR = ".oui-trading-markets-container";

/**
 * Finds Orderly's left sidebar container once, then appends a stable host
 * <div> so the widget renders as its last child — below the native markets
 * list. We intentionally avoid a MutationObserver: TradingPage mutates the DOM
 * on every tick, and any widget-triggered re-render of the surrounding tree
 * can crash Orderly's components (e.g. OrderTypeSelect has a conditional
 * useMemo that blows up on extra render churn).
 */
export function useSidebarHost(): HTMLDivElement | null {
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const div = document.createElement("div");
    div.dataset.widget = "ai-signals";
    let rafId = 0;
    let cancelled = false;

    const tryAttach = () => {
      if (cancelled) return;
      const sidebar = document.querySelector(SIDEBAR_SELECTOR);
      if (sidebar) {
        sidebar.appendChild(div);
        setHost(div);
        return;
      }
      rafId = requestAnimationFrame(tryAttach);
    };

    tryAttach();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      div.remove();
    };
  }, []);

  return host;
}
