import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Info } from "lucide-react";
import { cn } from "@orderly.network/ui";
import type { CommentaryMap, Signal, SignalVerdict } from "./types";
import { usePolledFetch } from "./usePolledFetch";
import { useSidebarHost } from "./useSidebarHost";
import "./scrollbar.css";

const API_BASE =
  (import.meta.env.VITE_SIGNALS_API_BASE as string | undefined) ??
  "https://www.ainewscrypto.com";

const SIGNALS_URL = `${API_BASE}/api/signals`;
const COMMENTARY_URL = `${API_BASE}/api/signals/commentary`;
const AINEWSCRYPTO_ORIGIN = "https://www.ainewscrypto.com";

function perpPairFor(symbol: string): string {
  return `PERP_${symbol.toUpperCase()}_USDC`;
}

const VERDICT_LABEL: Record<SignalVerdict, string> = {
  STRONG_BUY: "Strong Buy",
  BUY: "Buy",
  HOLD: "Hold",
  SELL: "Sell",
  STRONG_SELL: "Strong Sell",
};

const BADGE_STYLES: Record<SignalVerdict, string> = {
  STRONG_BUY:
    "bg-emerald-400/12 text-emerald-200 ring-1 ring-inset ring-emerald-300/30",
  BUY: "bg-emerald-400/10 text-emerald-200/90 ring-1 ring-inset ring-emerald-300/25",
  HOLD: "bg-amber-300/12 text-amber-100 ring-1 ring-inset ring-amber-300/35",
  SELL: "bg-rose-400/12 text-rose-200 ring-1 ring-inset ring-rose-300/30",
  STRONG_SELL:
    "bg-rose-500/15 text-rose-100 ring-1 ring-inset ring-rose-300/35",
};

const DOT_STYLES: Record<SignalVerdict, string> = {
  STRONG_BUY: "bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.7)]",
  BUY: "bg-emerald-300/80",
  HOLD: "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.55)]",
  SELL: "bg-rose-300/80",
  STRONG_SELL: "bg-rose-300 shadow-[0_0_6px_rgba(253,164,175,0.7)]",
};

const CONFIDENCE_GRADIENT: Record<SignalVerdict, string> = {
  STRONG_BUY: "from-emerald-500/70 via-emerald-400 to-emerald-200",
  BUY: "from-emerald-500/60 via-emerald-400/90 to-emerald-200/90",
  HOLD: "from-amber-500/70 via-amber-300 to-amber-100",
  SELL: "from-rose-500/60 via-rose-400/90 to-rose-200/90",
  STRONG_SELL: "from-rose-600/70 via-rose-400 to-rose-200",
};

function formatPrice(price: number): string {
  return `$${price.toLocaleString("en-US", {
    maximumFractionDigits: price < 1 ? 4 : 2,
  })}`;
}

function fallbackBlurb(sig: Signal): string {
  const absPct = Math.abs(sig.indicators.priceVsSma50).toFixed(1);
  const rsi = Math.round(sig.indicators.rsi);
  const direction = sig.indicators.priceVsSma50 >= 0 ? "above" : "below";
  return `${sig.symbol} is ${absPct}% ${direction} its 50-day MA with RSI at ${rsi}.`;
}

export function AiSignalsFeed() {
  const sidebarHost = useSidebarHost();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement | null>(null);
  const infoPopoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverPos, setPopoverPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!infoOpen) return;
    const updatePosition = () => {
      const btn = infoButtonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const popWidth = 288;
      const margin = 8;
      const viewportWidth = window.innerWidth;
      const centered = rect.left + rect.width / 2 - popWidth / 2;
      const left = Math.min(
        Math.max(margin, centered),
        viewportWidth - popWidth - margin,
      );
      const top = rect.bottom + 10;
      setPopoverPos({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [infoOpen]);

  useEffect(() => {
    if (!infoOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (infoPopoverRef.current?.contains(target)) return;
      if (infoButtonRef.current?.contains(target)) return;
      setInfoOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInfoOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [infoOpen]);

  const signals = usePolledFetch<Signal[]>(SIGNALS_URL, 30_000);
  const commentary = usePolledFetch<CommentaryMap>(COMMENTARY_URL, 300_000);

  const list = Array.isArray(signals) ? signals : [];

  const toggleExpand = useCallback((coinId: string) => {
    setExpandedId((prev) => (prev === coinId ? null : coinId));
  }, []);

  if (!sidebarHost) return null;

  const content = (
    <div className="relative mx-2 mb-2 overflow-hidden rounded-xl border border-[hsl(345_65%_28%/0.3)] shadow-[0_4px_20px_-8px_rgba(128,0,32,0.25)]">
      <div className="relative bg-gradient-to-r from-[hsl(345_65%_28%)] via-[hsl(345_55%_36%)] to-[hsl(345_65%_28%)] px-4 py-2.5">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.12)_50%,transparent_60%)]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="font-serif text-sm italic tracking-wide text-amber-100 drop-shadow-[0_1px_0_rgba(0,0,0,0.4)]">
              AI Signals
            </h3>
            <button
              ref={infoButtonRef}
              type="button"
              onClick={() => setInfoOpen((v) => !v)}
              aria-label="How AI signals work"
              aria-expanded={infoOpen}
              aria-haspopup="dialog"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-amber-100/70 transition-colors hover:text-amber-50 focus-visible:text-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(345_65%_28%)]"
            >
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-200">
              +116% ROI
            </span>
            <div className="flex items-center gap-1.5 rounded-full border border-green-300/50 bg-black/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-green-200">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
              </span>
              Live
            </div>
          </div>
        </div>
      </div>

      <div className="h-[2px] bg-gradient-to-r from-amber-300/40 via-amber-400 to-amber-300/40" />

      <div className="relative bg-gradient-to-b from-[#3d1524] via-[#2e101c] to-[#1f0a14] p-3">
        <div className="pointer-events-none absolute -top-10 -right-12 h-32 w-32 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-32 w-32 rounded-full bg-rose-500/15 blur-3xl" />

        {list.length === 0 ? (
          <div className="relative flex max-h-[350px] flex-col gap-1.5 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="h-[18px] w-[18px] shrink-0 rounded-full bg-white/10" />
                  <span className="h-3 w-10 rounded bg-white/10" />
                  <span className="h-3 w-14 rounded bg-white/[0.08]" />
                  <span className="ml-auto h-4 w-16 rounded-full bg-white/[0.08]" />
                </div>
                <div className="mt-2 space-y-1">
                  <span className="block h-2.5 w-full rounded bg-white/[0.06]" />
                  <span className="block h-2.5 w-3/4 rounded bg-white/[0.06]" />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="h-2 w-14 rounded bg-white/[0.06]" />
                  <span className="h-1 flex-1 rounded-full bg-black/40" />
                  <span className="h-2.5 w-7 rounded bg-white/[0.06]" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ul className="ai-signals-scroll relative flex max-h-[350px] flex-col gap-1.5 overflow-y-auto pr-1">
            {list.map((sig) => {
              const isExpanded = expandedId === sig.coinId;
              const bilingual = commentary?.[sig.coinId];
              const aiLine = bilingual?.en ?? fallbackBlurb(sig);
              const detailLine = bilingual?.detailEn;

              return (
                <li
                  key={sig.coinId}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onClick={() => toggleExpand(sig.coinId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(sig.coinId);
                    }
                  }}
                  className={cn(
                    "cursor-pointer select-none rounded-lg border bg-white/[0.07] px-3 py-2.5 backdrop-blur-sm transition-all duration-200",
                    isExpanded
                      ? "border-amber-300/30 bg-white/[0.10]"
                      : "border-white/10 hover:border-rose-300/50 hover:bg-white/[0.11]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {sig.image ? (
                      <img
                        src={sig.image}
                        alt={sig.name}
                        width={18}
                        height={18}
                        className="shrink-0 rounded-full ring-1 ring-white/20"
                      />
                    ) : (
                      <span className="h-[18px] w-[18px] shrink-0 rounded-full bg-white/10" />
                    )}
                    <span className="text-[12px] font-bold tracking-wide text-white">
                      {sig.symbol}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-amber-50/80">
                      {formatPrice(sig.price)}
                    </span>
                    <span
                      className={cn(
                        "ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[0.08em]",
                        BADGE_STYLES[sig.signal],
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "h-1 w-1 rounded-full",
                          DOT_STYLES[sig.signal],
                        )}
                      />
                      {VERDICT_LABEL[sig.signal]}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "h-3 w-3 shrink-0 text-white/30 transition-transform duration-300",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </div>

                  <p className="mt-2 text-[11px] leading-snug text-white/80">
                    {aiLine}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-white/45">
                      Confidence
                    </span>
                    <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-black/40 ring-1 ring-inset ring-white/5">
                      <div
                        className={cn(
                          "h-full rounded-full bg-gradient-to-r",
                          CONFIDENCE_GRADIENT[sig.signal],
                        )}
                        style={{ width: `${sig.confidence}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold tabular-nums text-white/80">
                      {sig.confidence}%
                    </span>
                  </div>

                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <div className="mt-2.5 border-t border-white/10 pt-2.5">
                        {detailLine && (
                          <p className="text-[11px] leading-relaxed text-white/90">
                            {detailLine}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/perp/${perpPairFor(sig.symbol)}`);
                          }}
                          className="group mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-amber-300/25 bg-amber-300/[0.06] py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-100/90 transition-colors duration-200 hover:border-amber-300/40 hover:bg-amber-300/10 hover:text-amber-50"
                        >
                          <span>Trade {sig.symbol}</span>
                          <span
                            aria-hidden="true"
                            className="transition-transform duration-200 group-hover:translate-x-0.5"
                          >
                            →
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="relative mt-2 text-center text-[9px] leading-tight text-white/50">
          Not financial advice.{" "}
          <a
            href={`${AINEWSCRYPTO_ORIGIN}/disclaimer`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-white/80"
          >
            See disclaimer
          </a>
        </p>
      </div>

      {mounted && infoOpen && popoverPos
        ? createPortal(
            <div
              ref={infoPopoverRef}
              role="dialog"
              aria-label="How AI signals work"
              style={{ top: popoverPos.top, left: popoverPos.left }}
              className="fixed z-[200] w-72"
            >
              <div
                aria-hidden="true"
                className="absolute -top-[6px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-[2px] border-t border-l border-amber-300/40 bg-[#2a0c18]"
              />
              <div className="relative rounded-lg border border-amber-300/40 bg-[#2a0c18]/95 p-3.5 text-[12px] leading-relaxed text-white/90 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)] backdrop-blur-md">
                <div className="mb-1.5 flex items-center gap-1.5 font-serif text-[11px] italic tracking-wide text-amber-200">
                  <Info className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>AI Signals</span>
                </div>
                <p className="text-white/85">
                  Verdicts blend three classic momentum indicators — the 50
                  &amp; 200-day moving averages, 14-day RSI and 10-day momentum
                  — into a single directional bias. Confidence reflects how
                  strongly the indicators agree. Refreshes every 30 seconds.
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );

  return createPortal(content, sidebarHost);
}
