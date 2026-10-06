import { analyzeReviews } from "@/ai/client";
import { MAX_REVIEWS_PER_REQUEST } from "@/shared/constants";
import { EZREVENUE_CONFIG, isEzrevenueConfigured } from "@/shared/ezrevenue-config";
import {
  MessageType,
  type AnalyzeReviewsResponse,
  type ExtensionMessage,
  type ExtractReviewsResponse,
  type GetQuotaResponse,
  type GetStatusResponse,
  type OpenPaywallResponse,
} from "@/shared/messages";
import type { ExtractResult, QuotaState } from "@/shared/types";
import { consumeQuota, getQuota, getSettings, saveLastExtract } from "@/storage";
import { registerEzrevenueBackground } from "ezrevenue-sdk";

const vipService = isEzrevenueConfigured()
  ? registerEzrevenueBackground({
      projectId: EZREVENUE_CONFIG.projectId,
      projectSecret: EZREVENUE_CONFIG.projectSecret,
      paywallAlias: EZREVENUE_CONFIG.paywallAlias,
    })
  : null;

async function resolveIsPro(): Promise<boolean> {
  if (vipService) {
    try {
      return Boolean(await vipService.isBalanceUsable());
    } catch {
      return false;
    }
  }
  return (await getSettings()).isPro;
}

async function effectiveQuota(): Promise<{ quota: QuotaState; isPro: boolean }> {
  const [quota, isPro] = await Promise.all([getQuota(), resolveIsPro()]);
  return {
    isPro,
    quota: isPro ? { ...quota, limit: -1 } : quota,
  };
}

async function collectReviewsFromTab(tabId: number): Promise<ExtractResult> {
  let frames: Array<{ frameId: number }>;
  try {
    frames = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => true,
    });
  } catch {
    throw new Error("当前页无法读取，请打开淘宝、天猫或京东商品页后重试");
  }

  const responses = await Promise.all(
    frames.map(async (frame) => {
      try {
        return (await chrome.tabs.sendMessage(
          tabId,
          { type: MessageType.EXTRACT_FRAME },
          { frameId: frame.frameId },
        )) as ExtractReviewsResponse;
      } catch {
        return null;
      }
    }),
  );

  const extracts = responses.flatMap((item) => (item?.ok ? [item.data] : []));

  if (extracts.length === 0) {
    throw new Error("当前页没有可用的评论提取脚本，请打开淘宝、天猫或京东商品页后重试");
  }

  const primary =
    extracts.find((item) => item.reviews.length > 0) ??
    extracts.find((item) => item.platform !== "unknown") ??
    extracts[0];

  const mergedReviews = extracts.flatMap((item) => item.reviews);
  const seen = new Set<string>();
  const reviews = mergedReviews.filter((review) => {
    const key = review.content.replace(/\s+/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    ...primary,
    reviews,
  };
}

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === MessageType.GET_STATUS) {
      void (async () => {
        const [settings, membership] = await Promise.all([getSettings(), effectiveQuota()]);
        const response: GetStatusResponse = {
          ok: true,
          data: {
            quota: membership.quota,
            hasApiKey: Boolean(settings.apiKey),
            isPro: membership.isPro,
            ezrevenueConfigured: isEzrevenueConfigured(),
          },
        };
        sendResponse(response);
      })();
      return true;
    }

    if (message.type === MessageType.GET_QUOTA) {
      void effectiveQuota().then(({ quota }) => {
        const response: GetQuotaResponse = { ok: true, data: quota };
        sendResponse(response);
      });
      return true;
    }

    if (message.type === MessageType.OPEN_PAYWALL) {
      void (async () => {
        if (!vipService) {
          sendResponse({
            ok: false,
            error: "还没有配置艺爪项目凭证，请先到设置说明里填写 projectId",
          } satisfies OpenPaywallResponse);
          return;
        }
        try {
          await vipService.showPaywallPopup({
            screenWidth: message.payload?.screenWidth ?? 800,
            screenHeight: message.payload?.screenHeight ?? 600,
          });
          sendResponse({ ok: true, isPro: await resolveIsPro() } satisfies OpenPaywallResponse);
        } catch (error) {
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : "打开付费页失败",
          } satisfies OpenPaywallResponse);
        }
      })();
      return true;
    }

    if (message.type === MessageType.COLLECT_REVIEWS) {
      void (async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          sendResponse({ ok: false, error: "找不到当前标签页" } satisfies ExtractReviewsResponse);
          return;
        }
        try {
          const data = await collectReviewsFromTab(tab.id);
          await saveLastExtract(data);
          sendResponse({ ok: true, data } satisfies ExtractReviewsResponse);
        } catch (error) {
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : "提取评论失败",
          } satisfies ExtractReviewsResponse);
        }
      })();
      return true;
    }

    if (message.type === MessageType.ANALYZE_REVIEWS) {
      void (async () => {
        try {
          const settings = await getSettings();
          if (!settings.apiKey) {
            sendResponse({
              ok: false,
              error: "请先在设置中填写 DeepSeek API Key",
            } satisfies AnalyzeReviewsResponse);
            return;
          }

          const { quota, isPro } = await effectiveQuota();
          if (!isPro && quota.limit >= 0 && quota.used >= quota.limit) {
            sendResponse({
              ok: false,
              error: `今日免费次数已用完（${quota.limit} 次），明天再试`,
              quota,
            } satisfies AnalyzeReviewsResponse);
            return;
          }

          const reviews = message.payload.reviews
            .filter((review) => review.content.trim().length >= 6)
            .slice(0, MAX_REVIEWS_PER_REQUEST);

          if (reviews.length === 0) {
            sendResponse({
              ok: false,
              error: "没有提取到可见评论。请先滚动到评价区域，确认页面上已显示评论。",
              quota,
            } satisfies AnalyzeReviewsResponse);
            return;
          }

          const data = await analyzeReviews(reviews, settings.apiKey, settings.provider, {
            includeReplies: isPro,
          });
          const nextQuota = isPro ? quota : await consumeQuota();
          sendResponse({
            ok: true,
            data,
            quota: isPro ? { ...nextQuota, limit: -1 } : nextQuota,
          } satisfies AnalyzeReviewsResponse);
        } catch (error) {
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : "分析失败，请稍后重试",
          } satisfies AnalyzeReviewsResponse);
        }
      })();
      return true;
    }
  },
);
