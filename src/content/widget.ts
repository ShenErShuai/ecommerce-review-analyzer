import { APP_NAME } from "@/shared/constants";
import { buildCsv, csvFilename, downloadCsv } from "@/shared/csv";
import {
  MessageType,
  type AnalyzeReviewsResponse,
  type ExtractReviewsResponse,
  type GetStatusResponse,
} from "@/shared/messages";
import { mergeExtracts } from "@/shared/merge";
import { detectPlatform } from "@/shared/platform";
import type { AnalyzeResult, ExtractResult } from "@/shared/types";
import { getLastExtract, saveLastExtract } from "@/storage";

const HOST_ID = "aidongcha-widget-host";

const STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; }
  .wrap { position: fixed; right: 18px; bottom: 18px; z-index: 2147483647; }
  .fab {
    width: 48px; height: 48px; border: 0; border-radius: 999px;
    background: #2563eb; color: #fff; font-size: 15px; font-weight: 700;
    box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35); cursor: pointer;
  }
  .panel {
    display: none; width: 320px; max-height: 70vh; overflow: auto;
    margin-bottom: 10px; padding: 12px; border-radius: 16px;
    background: #fff; color: #0f172a;
    box-shadow: 0 12px 40px rgba(15, 23, 42, 0.18);
  }
  .panel.open { display: block; }
  .title { font-size: 14px; font-weight: 700; margin: 0 0 4px; }
  .meta, .hint, .preview { font-size: 12px; line-height: 1.6; color: #64748b; }
  .btn {
    width: 100%; margin-top: 10px; border: 0; border-radius: 10px;
    padding: 9px 12px; background: #2563eb; color: #fff; font-size: 13px; cursor: pointer;
  }
  .btn.secondary { background: #eff6ff; color: #1d4ed8; }
  .btn.ghost { background: #fff; color: #334155; border: 1px solid #e2e8f0; }
  .btn:disabled { background: #94a3b8; cursor: not-allowed; color: #fff; }
  .error { margin-top: 8px; padding: 8px; border-radius: 10px; background: #fff1f2; color: #be123c; font-size: 12px; line-height: 1.6; }
  .card { margin-top: 8px; padding: 8px; border-radius: 10px; background: #f8fafc; }
  .card h4 { margin: 0 0 4px; font-size: 12px; }
  .card p, .card li { margin: 0; font-size: 12px; line-height: 1.6; color: #334155; }
`;

export function mountWidget(): void {
  if (!detectPlatform(location.href).supported) return;
  if (document.getElementById(HOST_ID)) return;

  const start = () => {
    if (!document.body || document.getElementById(HOST_ID)) return;
    const host = document.createElement("div");
    host.id = HOST_ID;
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>${STYLES}</style>
      <div class="wrap">
        <div class="panel" id="panel">
          <p class="title">${APP_NAME}</p>
          <p class="meta" id="meta">当前：${detectPlatform(location.href).label}</p>
          <button class="btn" id="run">提取并分析</button>
          <button class="btn secondary" id="merge" style="display:none">翻页后合并再分析</button>
          <p class="hint" id="hint">先滚动到评价区域，再点按钮。API Key 请点右上角扩展图标填写。</p>
          <div id="output"></div>
        </div>
        <button class="fab" id="fab" title="${APP_NAME}">评</button>
      </div>
    `;
    document.body.appendChild(host);

    const panel = shadow.getElementById("panel") as HTMLElement;
    const fab = shadow.getElementById("fab") as HTMLButtonElement;
    const run = shadow.getElementById("run") as HTMLButtonElement;
    const merge = shadow.getElementById("merge") as HTMLButtonElement;
    const hint = shadow.getElementById("hint") as HTMLElement;
    const output = shadow.getElementById("output") as HTMLElement;

    fab.addEventListener("click", () => {
      panel.classList.toggle("open");
      void syncPro(merge);
    });

    run.addEventListener("click", () => {
      void analyze(run, merge, hint, output, false);
    });
    merge.addEventListener("click", () => {
      void analyze(run, merge, hint, output, true);
    });
    void syncPro(merge);

    const keep = window.setInterval(() => {
      if (!host.isConnected && document.body) document.body.appendChild(host);
    }, 2500);

    window.addEventListener("beforeunload", () => window.clearInterval(keep));
  };

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
}

async function syncPro(mergeBtn: HTMLButtonElement): Promise<void> {
  try {
    const status = (await chrome.runtime.sendMessage({
      type: MessageType.GET_STATUS,
    })) as GetStatusResponse;
    mergeBtn.style.display = status.ok && status.data.isPro ? "block" : "none";
  } catch {
    mergeBtn.style.display = "none";
  }
}

async function analyze(
  run: HTMLButtonElement,
  mergeBtn: HTMLButtonElement,
  hint: HTMLElement,
  output: HTMLElement,
  merge: boolean,
): Promise<void> {
  output.replaceChildren();
  run.disabled = true;
  mergeBtn.disabled = true;
  hint.textContent = "正在提取当前页可见评论...";

  try {
    const status = (await chrome.runtime.sendMessage({
      type: MessageType.GET_STATUS,
    })) as GetStatusResponse;
    if (status.ok && !status.data.hasApiKey) {
      hint.textContent = "还没有 API Key。请点击浏览器右上角的插件图标，在设置里填写 DeepSeek Key。";
      return;
    }
    const isPro = Boolean(status.ok && status.data.isPro);

    const previous = merge ? await getLastExtract() : null;
    const collected = (await chrome.runtime.sendMessage({
      type: MessageType.COLLECT_REVIEWS,
    })) as ExtractReviewsResponse;
    if (!collected.ok) {
      showError(output, collected.error);
      hint.textContent = "提取失败";
      return;
    }
    if (collected.data.reviews.length === 0) {
      showError(output, "没有提取到可见评论。请先滚动到评价区域，确认评论已经显示。");
      hint.textContent = `已打开${collected.data.platformLabel}，但没读到评论`;
      return;
    }

    let payload = collected.data;
    if (merge) {
      if (!previous || previous.reviews.length === 0) {
        showError(output, "请先完成一次提取，再翻到下一页评论后合并。");
        hint.textContent = "还没有可合并的上次结果";
        return;
      }
      payload = mergeExtracts(previous, collected.data);
      await saveLastExtract(payload);
    }

    hint.textContent = `已提取 ${payload.reviews.length} 条，正在分析...`;
    const analyzed = (await chrome.runtime.sendMessage({
      type: MessageType.ANALYZE_REVIEWS,
      payload,
    })) as AnalyzeReviewsResponse;

    if (!analyzed.ok) {
      showError(output, analyzed.error);
      hint.textContent = "分析未完成";
      return;
    }

    hint.textContent = `已分析 ${payload.platformLabel} ${payload.reviews.length} 条评论`;
    renderResult(output, payload, analyzed.data, isPro);
  } catch (error) {
    showError(output, error instanceof Error ? error.message : "分析失败，请重试");
    hint.textContent = "出错了";
  } finally {
    run.disabled = false;
    mergeBtn.disabled = false;
  }
}

function showError(output: HTMLElement, message: string): void {
  const box = document.createElement("div");
  box.className = "error";
  box.textContent = message;
  output.replaceChildren(box);
}

function renderResult(
  output: HTMLElement,
  extract: ExtractResult,
  result: AnalyzeResult,
  isPro: boolean,
): void {
  const nodes = [
    card("好评卖点", result.positiveSummary),
    card("差评痛点", result.negativeSummary),
    card("用户画像", result.userPersona.join("、") || "暂无画像标签"),
    card("改进建议", result.improvementSuggestions.join("；") || "暂无改进建议"),
  ];
  if (isPro) {
    nodes.push(card("回复模板", result.replyTemplates.join("\n") || "这次没有生成回复模板"));
    const exportBtn = document.createElement("button");
    exportBtn.className = "btn ghost";
    exportBtn.textContent = "导出 CSV";
    exportBtn.addEventListener("click", () => {
      downloadCsv(csvFilename(extract), buildCsv(extract, result));
    });
    nodes.push(exportBtn);
  }
  output.replaceChildren(...nodes);
}

function card(title: string, body: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "card";
  const heading = document.createElement("h4");
  heading.textContent = title;
  const text = document.createElement("p");
  text.style.whiteSpace = "pre-wrap";
  text.textContent = body;
  wrap.append(heading, text);
  return wrap;
}
