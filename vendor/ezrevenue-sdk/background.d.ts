export function registerEzrevenueBackground(options: {
  projectId: string;
  projectSecret: string;
  paywallAlias?: string;
}): {
  isBalanceUsable: (opts?: { equityAlias?: string }) => Promise<boolean | undefined>;
  showPaywallPopup: (opts?: { screenWidth?: number; screenHeight?: number }) => Promise<unknown>;
  getCustomerInfo: (opts?: { refresh?: boolean }) => Promise<unknown>;
};
