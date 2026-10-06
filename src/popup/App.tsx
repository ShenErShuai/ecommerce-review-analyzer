import { useEffect, useState } from "react";
import { getLastExtract, saveApiKey, saveLastExtract, savePro } from "@/storage";
import { APP_NAME } from "@/shared/constants";
import { buildCsv, csvFilename, downloadCsv } from "@/shared/csv";
import { mergeExtracts } from "@/shared/merge";
import {
  MessageType,
  type AnalyzeReviewsResponse,
  type ExtractReviewsResponse,
  type GetFrameInfoResponse,
  type GetQuotaResponse,
  type GetStatusResponse,
  type OpenPaywallResponse,
} from "@/shared/messages";
import { detectPlatform, type PageStatus } from "@/shared/platform";
import type { AnalyzeResult, AppSettings, ExtractResult, QuotaState } from "@/shared/types";
import { ApiKeySettings } from "./components/ApiKeySettings";
import { ExtractPreview } from "./components/ExtractPreview";
import { ReviewSummary } from "./components/ReviewSummary";

type View = "home" | "settings";
type LoadingStep = "extracting" | "analyzing" | null;

export default function App() {
  const [view, setView] = useState<View>("home");
  const [settings, setSettings] = useState<AppSettings>({
    provider: "deepseek",
    apiKey: "",
    isPro: false,
  });
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [page, setPage] = useState<PageStatus | null>(null);
  const [extract, setExtract] = useState<ExtractResult | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>(null);
  const [error, setError] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [ezrevenueConfigured, setEzrevenueConfigured] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, []);

  async function bootstrap() {
    try {
      const stored = await chrome.storage.local.get("settings");
      const nextSettings = stored.settings as AppSettings | undefined;
      if (nextSettings) setSettings((current) => ({ ...current, ...nextSettings }));

      const statusResponse = (await chrome.runtime.sendMessage({
        type: MessageType.GET_STATUS,
      })) as GetStatusResponse;
      if (statusResponse.ok) {
        setQuota(statusResponse.data.quota);
        setIsPro(statusResponse.data.isPro);
        setEzrevenueConfigured(statusResponse.data.ezrevenueConfigured);
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      let href = tab?.url ?? "";
      if (tab?.id) {
        try {
          const frameInfo = (await chrome.tabs.sendMessage(tab.id, {
            type: MessageType.GET_FRAME_INFO,
          }, { frameId: 0 })) as GetFrameInfoResponse;
          if (frameInfo?.href) href = frameInfo.href;
        } catch {
          // 内容脚本未注入时退回 tab.url
        }
      }
      setPage(detectPlatform(href));
    } catch {
      setPage(detectPlatform(""));
    }
  }

  async function handleSaveKey(apiKey: string) {
    await saveApiKey(apiKey);
    setSettings((current) => ({ ...current, apiKey }));
    setView("home");
    setError("");
  }

  async function handleTogglePro(nextPro: boolean) {
    await savePro(nextPro);
    setSettings((current) => ({ ...current, isPro: nextPro }));
    setIsPro(nextPro);
    const quotaResponse = (await chrome.runtime.sendMessage({
      type: MessageType.GET_QUOTA,
    })) as GetQuotaResponse;
    if (quotaResponse.ok) setQuota(quotaResponse.data);
  }

  async function handleOpenPaywall() {
    const response = (await chrome.runtime.sendMessage({
      type: MessageType.OPEN_PAYWALL,
      payload: {
        screenWidth: window.screen.availWidth,
        screenHeight: window.screen.availHeight,
      },
    })) as OpenPaywallResponse;
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setIsPro(response.isPro);
    const quotaResponse = (await chrome.runtime.sendMessage({
      type: MessageType.GET_QUOTA,
    })) as GetQuotaResponse;
    if (quotaResponse.ok) setQuota(quotaResponse.data);
  }

  async function handleAnalyze(merge = false) {
    setLoadingStep("extracting");
    setError("");
    setResult(null);

    try {
      const previous = merge ? (extract ?? (await getLastExtract())) : null;
      const collected = (await chrome.runtime.sendMessage({
        type: MessageType.COLLECT_REVIEWS,
      })) as ExtractReviewsResponse;

      if (!collected.ok) {
        setError(collected.error);
        return;
      }

      if (collected.data.reviews.length === 0) {
        setExtract(collected.data);
        setError("没有提取到可见评论。请打开商品详情页，滚动到评价区域，确认评论已经显示后再试。");
        return;
      }

      let payload = collected.data;
      if (merge) {
        if (!previous || previous.reviews.length === 0) {
          setError("请先完成一次提取，再翻到下一页评论后点「翻页后合并」。");
          setExtract(collected.data);
          return;
        }
        payload = mergeExtracts(previous, collected.data);
        await saveLastExtract(payload);
      }

      setExtract(payload);
      setLoadingStep("analyzing");

      const analyzed = (await chrome.runtime.sendMessage({
        type: MessageType.ANALYZE_REVIEWS,
        payload,
      })) as AnalyzeReviewsResponse;

      if (analyzed.quota) setQuota(analyzed.quota);

      if (!analyzed.ok) {
        setError(analyzed.error);
        return;
      }

      setResult(analyzed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败，请重试");
    } finally {
      setLoadingStep(null);
    }
  }

  const remaining = quota ? Math.max(quota.limit - quota.used, 0) : 0;
  const loading = loadingStep !== null;
  const hasKey = Boolean(settings.apiKey);
  const quotaEmpty = !isPro && quota !== null && quota.limit >= 0 && remaining <= 0;
  const unsupported = page !== null && !page.supported;
  const canAnalyze = hasKey && !quotaEmpty && !loading;

  let disabledReason = "";
  if (!hasKey) disabledReason = "请先填写 DeepSeek API Key";
  else if (quotaEmpty) disabledReason = "今日免费 3 次已用完，北京时间明天 0 点恢复";
  else if (unsupported) disabledReason = "当前可能不是商品页。打开淘宝/天猫/京东详情页后也可直接点分析试试";

  return (
    <div className="min-h-[420px] bg-slate-50 p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">{APP_NAME}</h1>
          <p className="text-xs text-slate-500">当前页可见评论 · DeepSeek BYOK</p>
        </div>
        <button
          type="button"
          onClick={() => setView(view === "settings" ? "home" : "settings")}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600"
        >
          {view === "settings" ? "返回" : "设置"}
        </button>
      </header>

      {view === "settings" ? (
        <ApiKeySettings
          initialKey={settings.apiKey}
          isPro={isPro}
          ezrevenueConfigured={ezrevenueConfigured}
          onSave={handleSaveKey}
          onTogglePro={handleTogglePro}
          onOpenPaywall={handleOpenPaywall}
        />
      ) : (
        <div className="space-y-3">
          <section className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <span>
                {page
                  ? page.supported
                    ? `当前：${page.label}`
                    : "当前页不在支持列表"
                  : "正在识别页面..."}
              </span>
              <span>
                {isPro
                  ? "Pro 不限次数"
                  : `今日剩余 ${remaining}/${quota?.limit ?? 3}`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleAnalyze(false)}
              disabled={!canAnalyze}
              className="w-full rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loadingStep === "extracting"
                ? "正在提取评论..."
                : loadingStep === "analyzing"
                  ? "正在分析评论..."
                  : "提取并分析"}
            </button>
            {isPro && (
              <button
                type="button"
                onClick={() => void handleAnalyze(true)}
                disabled={!canAnalyze}
                className="mt-2 w-full rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                翻页后合并再分析
              </button>
            )}
            {disabledReason && !loading && (
              <p className="mt-2 text-center text-xs text-slate-500">{disabledReason}</p>
            )}
            {!hasKey && (
              <button
                type="button"
                onClick={() => setView("settings")}
                className="mt-2 w-full text-xs text-brand-600 hover:underline"
              >
                先去填写 DeepSeek API Key
              </button>
            )}
          </section>

          {quotaEmpty && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
              今日免费次数已用完。可以明天再试，或后续开通 Pro 后不限次数。
            </div>
          )}

          {!loading && !extract && !result && !error && (
            <section className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-sm leading-6 text-slate-600">
              <p className="font-medium text-slate-800">使用步骤</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>在设置中填写 DeepSeek API Key</li>
                <li>打开淘宝、天猫或京东商品详情页</li>
                <li>滚动到评价区域，确认评论已显示</li>
                <li>点击「提取并分析」</li>
              </ol>
            </section>
          )}

          {loadingStep === "extracting" && (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
              正在读取当前页可见评论...
            </div>
          )}

          {extract && extract.reviews.length > 0 && !result && (
            <ExtractPreview extract={extract} analyzing={loadingStep === "analyzing"} />
          )}

          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-700">
              {error}
            </div>
          )}

          {extract && result && (
            <ReviewSummary
              extract={extract}
              result={result}
              isPro={isPro}
              onExport={() => downloadCsv(csvFilename(extract), buildCsv(extract, result))}
            />
          )}
        </div>
      )}
    </div>
  );
}
