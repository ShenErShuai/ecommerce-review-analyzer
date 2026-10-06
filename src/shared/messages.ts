import type { AnalyzeResult, ExtractResult, QuotaState } from "./types";

export const MessageType = {
  COLLECT_REVIEWS: "COLLECT_REVIEWS",
  EXTRACT_FRAME: "EXTRACT_FRAME",
  GET_FRAME_INFO: "GET_FRAME_INFO",
  GET_STATUS: "GET_STATUS",
  ANALYZE_REVIEWS: "ANALYZE_REVIEWS",
  GET_QUOTA: "GET_QUOTA",
  OPEN_PAYWALL: "OPEN_PAYWALL",
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export interface CollectReviewsMessage {
  type: typeof MessageType.COLLECT_REVIEWS;
}

export interface ExtractFrameMessage {
  type: typeof MessageType.EXTRACT_FRAME;
}

export interface GetFrameInfoMessage {
  type: typeof MessageType.GET_FRAME_INFO;
}

export interface GetStatusMessage {
  type: typeof MessageType.GET_STATUS;
}

export interface AnalyzeReviewsMessage {
  type: typeof MessageType.ANALYZE_REVIEWS;
  payload: ExtractResult;
}

export interface GetQuotaMessage {
  type: typeof MessageType.GET_QUOTA;
}

export interface OpenPaywallMessage {
  type: typeof MessageType.OPEN_PAYWALL;
  payload?: {
    screenWidth?: number;
    screenHeight?: number;
  };
}

export type ExtensionMessage =
  | CollectReviewsMessage
  | ExtractFrameMessage
  | GetFrameInfoMessage
  | GetStatusMessage
  | AnalyzeReviewsMessage
  | GetQuotaMessage
  | OpenPaywallMessage;

export type ExtractReviewsResponse =
  | { ok: true; data: ExtractResult }
  | { ok: false; error: string };

export type AnalyzeReviewsResponse =
  | { ok: true; data: AnalyzeResult; quota: QuotaState }
  | { ok: false; error: string; quota?: QuotaState };

export type GetQuotaResponse = { ok: true; data: QuotaState };

export type GetFrameInfoResponse = {
  ok: true;
  href: string;
  title: string;
};

export type GetStatusResponse = {
  ok: true;
  data: {
    quota: QuotaState;
    hasApiKey: boolean;
    isPro: boolean;
    ezrevenueConfigured: boolean;
  };
};

export type OpenPaywallResponse =
  | { ok: true; isPro: boolean }
  | { ok: false; error: string };
