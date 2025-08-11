// src/components/onboarding/tipConfig.ts
// Drop-in catalog. Safe if selectors don’t exist. Edit routes/selectors to fit your DOM.

export type TipEvent = "mouseenter" | "click" | "focus";

export type Tip = {
  id: string;               // unique stable id
  selector: string;         // CSS selector to bind
  event: TipEvent;          // when to trigger
  message: string;          // robot text
  route?: RegExp | string;  // optional route filter
  once?: boolean;           // fire only once per user
};

export const TIP_CATALOG: Tip[] = [
  // ===== Global onboarding =====
  {
    id: "connect-wallet",
    selector:
      '[data-testid="connect-wallet"], #connect-wallet, button[aria-label="Connect Wallet"], .rk-connect, [data-connect-button]',
    event: "mouseenter",
    message:
      "Connect your wallet to explore balances and pledge. You can still browse first.",
    route: /^\/$|^\/(index|home)?$/i,
    once: true,
  },
  {
    id: "how-it-works",
    selector:
      "[data-testid='how-it-works'], a[href*='how-it-works'], .how-it-works",
    event: "mouseenter",
    message:
      "Short overview of pledges, endorsements, and launches. Two minutes max.",
    route: /(index|about)/i,
    once: true,
  },

  // ===== Discovery pages =====
  {
    id: "influencer-card",
    selector: ".influencer-card, [data-testid='influencer-card']",
    event: "mouseenter",
    message:
      "Open a profile to see pledge totals, milestones, and launch criteria.",
    route: /(index|trending|influencers)/i,
    once: true,
  },
  {
    id: "open-coin",
    selector:
      ".view-coin, [data-testid='view-coin'], a[href*='/coin'], a[href*='/CoinDetail']",
    event: "mouseenter",
    message:
      "View token details, thresholds, and endorsement status for this influencer.",
    route: /(index|trending|influencers)/i,
    once: true,
  },

  // ===== Coin detail / pledge flow =====
  {
    id: "pledge-button",
    selector: "#pledge-button, [data-testid='pledge-button']",
    event: "mouseenter",
    message:
      "Pledge = pre-commit. Funds move only if the influencer endorses and the launch threshold is met.",
    route: /(coin|preinvest|tokenfactory)/i,
    once: true,
  },
  {
    id: "pledge-confirm",
    selector:
      "[data-testid='confirm-pledge'], button#confirm-pledge, button[name='confirm-pledge']",
    event: "mouseenter",
    message:
      "Confirm your pre-commit. You can cancel before launch from your dashboard.",
    route: /(coin|preinvest)/i,
    once: true,
  },
  {
    id: "security-modal",
    selector:
      "#security-info, [data-testid='security-info'], button[aria-label='Security']",
    event: "mouseenter",
    message:
      "Review audits, custody model, and risk notes. Keep control until launch.",
    route: /(coin|trading|tokenfactory)/i,
    once: true,
  },
  {
    id: "price-chart",
    selector: "[data-testid='price-chart'], canvas.chartjs-render-monitor",
    event: "mouseenter",
    message:
      "Historical price is simulated pre-launch. Live market data starts after endorsement and go-live.",
    route: /(coin|trading)/i,
    once: true,
  },

  // ===== Dashboards =====
  {
    id: "approval-status",
    selector: "[data-testid='approval-status'], .approval-status",
    event: "mouseenter",
    message:
      "Admin approval triggers launch after endorsement and thresholds. Track progress here.",
    route: /(dashboard|investor|admin|influencer)/i,
    once: true,
  },
  {
    id: "withdraw-pledge",
    selector:
      "[data-testid='withdraw-pledge'], button#withdraw-pledge, .withdraw-pledge",
    event: "mouseenter",
    message:
      "Change your mind? Withdraw a pledge anytime before launch from this panel.",
    route: /(dashboard|investor|coin)/i,
    once: true,
  },

  // ===== Auth =====
  {
    id: "email-link-auth",
    selector:
      "[data-testid='email-link-auth'], button#email-link-auth, [data-auth='email-link']",
    event: "mouseenter",
    message:
      "Passwordless sign-in via email link. Faster and safer on shared devices.",
    route: /signin|login/i,
    once: true,
  },
];
