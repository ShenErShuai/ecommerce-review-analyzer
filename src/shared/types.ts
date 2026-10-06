export type ProviderId = "deepseek";

export type PlatformId = "taobao" | "jd" | "unknown";

export interface RawReview {
  content: string;
  rating?: number;
  date?: string;
  author?: string;
}

export interface AnalyzeResult {
  positiveSummary: string;
  negativeSummary: string;
  userPersona: string[];
  improvementSuggestions: string[];
  replyTemplates: string[];
}

export interface ExtractResult {
  platform: PlatformId;
  platformLabel: string;
  reviews: RawReview[];
  pageTitle: string;
  pageUrl: string;
}

export interface QuotaState {
  used: number;
  limit: number;
  date: string;
}

export interface AppSettings {
  provider: ProviderId;
  apiKey: string;
  isPro: boolean;
}
