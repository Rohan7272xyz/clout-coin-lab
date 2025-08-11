// src/components/onboarding/RobotAssistant.tsx
// Paste-as-is. Self-contained. No external deps beyond react + react-router-dom + Tailwind.
// Works on first 3 visits, non-intrusive, rule-based tips, route-aware, safe if selectors are missing.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

// ========================== CONFIG ==========================
type TipEvent = "mouseenter" | "click" | "focus";
type Tip = {
  id: string;                    // unique stable id
  selector: string;              // CSS selector to bind
  event: TipEvent;               // when to trigger
  message: string;               // robot text
  route?: RegExp | string;       // optional route filter
  once?: boolean;                // fire only once per user
};

const STORAGE_KEYS = {
  VISITS: "tf_visits",
  MUTED: "tf_tips_muted",
  SEEN: "tf_tips_seen_v1", // JSON stringified string[]
} as const;

// Gate by visits. Count once per browser session start of App.
function shouldEnableTips(): boolean {
  try {
    const n = Number(localStorage.getItem(STORAGE_KEYS.VISITS) || 0);
    if (!sessionStorage.getItem("_tf_visit_marked")) {
      localStorage.setItem(STORAGE_KEYS.VISITS, String(n + 1));
      sessionStorage.setItem("_tf_visit_marked", "1");
    }
    const visits = Number(localStorage.getItem(STORAGE_KEYS.VISITS) || 1);
    const muted = localStorage.getItem(STORAGE_KEYS.MUTED) === "1";
    return visits <= 3 && !muted;
  } catch {
    return false;
  }
}

function getSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SEEN);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markSeen(id: string) {
  const seen = getSeen();
  seen.add(id);
  try {
    localStorage.setItem(STORAGE_KEYS.SEEN, JSON.stringify(Array.from(seen)));
  } catch {}
}

// Tip catalog. Add or adjust selectors to your DOM.
// Safe: missing selectors are ignored.
const TIP_CATALOG: Tip[] = [
  {
    id: "connect-wallet",
    selector: '[data-testid="connect-wallet"], #connect-wallet, button[aria-label="Connect Wallet"]',
    event: "mouseenter",
    message: "Connect your wallet to explore and pledge. You can browse first if you prefer.",
    route: /^\/(index|home)?$|^\/$/i,
    once: true,
  },
  {
    id: "influencer-card",
    selector: ".influencer-card, [data-testid='influencer-card']",
    event: "mouseenter",
    message: "Open a profile to see pledge totals, milestones, and launch criteria.",
    route: /(index|trending|influencers)/i,
    once: true,
  },
  {
    id: "pledge-button",
    selector: "#pledge-button, [data-testid='pledge-button']",
    event: "mouseenter",
    message: "Pledge = pre-commit. Funds move only if the influencer endorses and the launch threshold is met.",
    route: /(coin|preinvest|tokenfactory)/i,
    once: true,
  },
  {
    id: "security-modal",
    selector: "#security-info, [data-testid='security-info']",
    event: "mouseenter",
    message: "Read the security notes. Smart contracts are audited. You keep custody until launch.",
    route: /(coin|trading|tokenfactory)/i,
    once: true,
  },
  {
    id: "admin-approval",
    selector: "[data-testid='approval-status']",
    event: "mouseenter",
    message: "Admin approval triggers launch after endorsements and thresholds. You can withdraw pledges before launch.",
    route: /(dashboard|investor|admin)/i,
    once: true,
  },
];

// UI behavior
const AUTO_HIDE_MS = 6000;         // auto-hide a shown tip
const MIN_DELAY_BETWEEN_MS = 800;  // throttle tip spam
const OBSERVE_TIMEOUT_MS = 120;    // debounce DOM observer

// ========================== COMPONENT ==========================
export default function RobotAssistant() {
  const location = useLocation();
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(true); // avatar visibility
  const [tipText, setTipText] = useState<string | null>(null);
  const [currentTipId, setCurrentTipId] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);

  const lastShownRef = useRef<number>(0);
  const hideTimerRef = useRef<number | null>(null);
  const cleanupFnsRef = useRef<(() => void)[]>([]);
  const observerRef = useRef<MutationObserver | null>(null);
  const observeDebounceRef = useRef<number | null>(null);

  // Derived route string for filters
  const routePath = useMemo(() => location.pathname.toLowerCase(), [location.pathname]);

  // Init gate
  useEffect(() => {
    setEnabled(shouldEnableTips());
  }, []);

  // Clear all listeners/observers
  function clearBindings() {
    cleanupFnsRef.current.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
    cleanupFnsRef.current = [];
    if (observerRef.current) {
      try {
        observerRef.current.disconnect();
      } catch {}
      observerRef.current = null;
    }
  }

  // Route-aware bindings
  useEffect(() => {
    if (!enabled) {
      clearBindings();
      return;
    }
    // Rebind on route change
    bindTipsForRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, routePath]);

  // Core: bind listeners to matching elements, watch DOM for late mounts
  function bindTipsForRoute() {
    clearBindings();

    const seen = getSeen();
    const applicable = TIP_CATALOG.filter((t) => {
      if (t.once && seen.has(t.id)) return false;
      if (!t.route) return true;
      if (t.route instanceof RegExp) return t.route.test(routePath);
      return routePath.includes(String(t.route).toLowerCase());
    });

    const bindAll = () => {
      applicable.forEach((tip) => {
        try {
          const nodes = document.querySelectorAll(tip.selector);
          nodes.forEach((node) => {
            const handler = () => maybeShowTip(tip);
            (node as Element).addEventListener(tip.event, handler, { passive: true });
            cleanupFnsRef.current.push(() => (node as Element).removeEventListener(tip.event, handler));
          });
        } catch {
          // ignore bad selectors
        }
      });
    };

    // Initial bind
    bindAll();

    // Observe DOM for late-mounted targets
    observerRef.current = new MutationObserver(() => {
      if (observeDebounceRef.current) window.clearTimeout(observeDebounceRef.current);
      observeDebounceRef.current = window.setTimeout(bindAll, OBSERVE_TIMEOUT_MS);
    });
    observerRef.current.observe(document.body, { childList: true, subtree: true });
    cleanupFnsRef.current.push(() => {
      if (observeDebounceRef.current) window.clearTimeout(observeDebounceRef.current);
    });
  }

  function maybeShowTip(tip: Tip) {
    const now = Date.now();
    if (now - lastShownRef.current < MIN_DELAY_BETWEEN_MS) return;

    lastShownRef.current = now;
    setTipText(tip.message);
    setCurrentTipId(tip.id);
    setPinned(false);

    // Auto-hide
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      if (!pinned) setTipText(null);
    }, AUTO_HIDE_MS) as unknown as number;

    if (tip.once) markSeen(tip.id);
  }

  function muteForever() {
    try {
      localStorage.setItem(STORAGE_KEYS.MUTED, "1");
    } catch {}
    setEnabled(false);
    setTipText(null);
    clearBindings();
  }

  function closeBubble() {
    setTipText(null);
    setPinned(false);
  }

  useEffect(() => {
    return () => {
      clearBindings();
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className="fixed right-4 bottom-6 z-50 pointer-events-none">
      {/* Avatar button */}
      {visible && (
        <button
          type="button"
          className="pointer-events-auto mb-2 flex items-center justify-center w-12 h-12 rounded-full shadow border bg-white"
          aria-label="Helper bot"
          onClick={() => {
            // Toggle bubble
            if (tipText) {
              closeBubble();
            } else {
              setTipText("Hover elements with dotted underline or icons to learn what they do.");
              setCurrentTipId(null);
              if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
              hideTimerRef.current = window.setTimeout(() => {
                if (!pinned) setTipText(null);
              }, AUTO_HIDE_MS) as unknown as number;
            }
          }}
        >
          {/* Simple robot glyph */}
          <div className="relative w-7 h-7">
            <div className="absolute inset-0 rounded-full bg-gray-100" />
            <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-1 h-2 bg-gray-300 rounded" />
            <div className="absolute inset-1 rounded-full bg-white border" />
            <div className="absolute left-2 top-2 w-1.5 h-1.5 bg-gray-700 rounded-full" />
            <div className="absolute right-2 top-2 w-1.5 h-1.5 bg-gray-700 rounded-full" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-2 w-3 h-1 bg-gray-700 rounded" />
          </div>
        </button>
      )}

      {/* Speech bubble */}
      {tipText && (
        <div className="pointer-events-auto max-w-sm rounded-2xl shadow-lg border bg-white p-3">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 border flex items-center justify-center shrink-0">
              <span className="text-xs">🤖</span>
            </div>
            <div className="flex-1">
              <div className="text-sm leading-snug">{tipText}</div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={() => setPinned((p) => !p)}
                >
                  {pinned ? "Unpin" : "Pin"}
                </button>
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={() => {
                    // Show next generic hint if current was contextual
                    closeBubble();
                  }}
                >
                  Dismiss
                </button>
                <span className="mx-1 text-gray-300">|</span>
                <button type="button" className="text-xs underline" onClick={muteForever}>
                  Mute tips
                </button>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              className="ml-1 text-gray-500 hover:text-gray-800"
              onClick={closeBubble}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/*
USAGE:
1) Place this file at: src/components/onboarding/RobotAssistant.tsx
2) Mount once in App frame, inside providers, outside routes:

   import RobotAssistant from "@/components/onboarding/RobotAssistant";
   ...
   <RobotAssistant />

3) Ensure your target elements have stable selectors. You can add attributes to your components:
   <button data-testid="connect-wallet" ...>
   <div className="influencer-card" ...>
   <button id="pledge-button" ...>

4) Add or edit TIP_CATALOG to fit your pages. Route filters accept regex or substring.
*/
