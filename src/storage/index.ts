import { FREE_DAILY_LIMIT, SHANGHAI_TIME_ZONE } from "@/shared/constants";
import type { AppSettings, ExtractResult, ProviderId, QuotaState } from "@/shared/types";

const SETTINGS_KEY = "settings";
const QUOTA_KEY = "dailyQuota";
const LAST_EXTRACT_KEY = "lastExtract";

const defaultSettings: AppSettings = {
  provider: "deepseek",
  apiKey: "",
  isPro: false,
};

export function todayInShanghai(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHANGHAI_TIME_ZONE,
  }).format(new Date());
}

export async function getSettings(): Promise<AppSettings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...defaultSettings, ...(result[SETTINGS_KEY] as AppSettings | undefined) };
}

export async function saveApiKey(apiKey: string, provider: ProviderId = "deepseek"): Promise<void> {
  const settings = await getSettings();
  await chrome.storage.local.set({
    [SETTINGS_KEY]: { ...settings, provider, apiKey: apiKey.trim() },
  });
}

export async function savePro(isPro: boolean): Promise<void> {
  const settings = await getSettings();
  await chrome.storage.local.set({
    [SETTINGS_KEY]: { ...settings, isPro },
  });
}

export async function saveLastExtract(extract: ExtractResult): Promise<void> {
  await chrome.storage.local.set({ [LAST_EXTRACT_KEY]: extract });
}

export async function getLastExtract(): Promise<ExtractResult | null> {
  const result = await chrome.storage.local.get(LAST_EXTRACT_KEY);
  return (result[LAST_EXTRACT_KEY] as ExtractResult | undefined) ?? null;
}

export async function getQuota(): Promise<QuotaState> {
  const today = todayInShanghai();
  const result = await chrome.storage.local.get(QUOTA_KEY);
  const stored = result[QUOTA_KEY] as QuotaState | undefined;

  if (!stored || stored.date !== today) {
    const fresh: QuotaState = { used: 0, limit: FREE_DAILY_LIMIT, date: today };
    await chrome.storage.local.set({ [QUOTA_KEY]: fresh });
    return fresh;
  }

  return { ...stored, limit: FREE_DAILY_LIMIT };
}

export async function consumeQuota(): Promise<QuotaState> {
  const quota = await getQuota();
  if (quota.used >= quota.limit) {
    return quota;
  }

  const next: QuotaState = { ...quota, used: quota.used + 1 };
  await chrome.storage.local.set({ [QUOTA_KEY]: next });
  return next;
}
