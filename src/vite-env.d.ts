/// <reference types="vite/client" />
/// <reference types="chrome" />

interface ImportMetaEnv {
  readonly VITE_EZREVENUE_PROJECT_ID?: string;
  readonly VITE_EZREVENUE_PROJECT_SECRET?: string;
  readonly VITE_EZREVENUE_PAYWALL_ALIAS?: string;
}

declare module "ezrevenue-sdk" {
  export function registerEzrevenueBackground(options: {
    projectId: string;
    projectSecret: string;
    paywallAlias?: string;
  }): {
    isBalanceUsable: (opts?: { equityAlias?: string }) => Promise<boolean | undefined>;
    showPaywallPopup: (opts?: { screenWidth?: number; screenHeight?: number }) => Promise<unknown>;
    getCustomerInfo: (opts?: { refresh?: boolean }) => Promise<unknown>;
  };
}
