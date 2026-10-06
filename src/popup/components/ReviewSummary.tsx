import type { ReactNode } from "react";
import type { AnalyzeResult, ExtractResult } from "@/shared/types";

interface ReviewSummaryProps {
  extract: ExtractResult;
  result: AnalyzeResult;
  isPro: boolean;
  onExport?: () => void;
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3">
      <h3 className="mb-2 text-sm font-semibold text-slate-800">{title}</h3>
      {children}
    </section>
  );
}

export function ReviewSummary({ extract, result, isPro, onExport }: ReviewSummaryProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          已分析 {extract.platformLabel} {extract.reviews.length} 条可见评论
        </p>
        {isPro && onExport && (
          <button
            type="button"
            onClick={onExport}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
          >
            导出 CSV
          </button>
        )}
      </div>
      <Card title="好评卖点">
        <p className="text-sm leading-6 text-slate-700">{result.positiveSummary}</p>
      </Card>
      <Card title="差评痛点">
        <p className="text-sm leading-6 text-slate-700">{result.negativeSummary}</p>
      </Card>
      <Card title="用户画像">
        <div className="flex flex-wrap gap-2">
          {result.userPersona.length === 0 ? (
            <p className="text-sm text-slate-500">暂无画像标签</p>
          ) : (
            result.userPersona.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-700"
              >
                {tag}
              </span>
            ))
          )}
        </div>
      </Card>
      <Card title="改进建议">
        {result.improvementSuggestions.length === 0 ? (
          <p className="text-sm text-slate-500">暂无改进建议</p>
        ) : (
          <ol className="list-decimal space-y-1 pl-4 text-sm leading-6 text-slate-700">
            {result.improvementSuggestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        )}
      </Card>
      {isPro && (
        <Card title="回复模板">
          {result.replyTemplates.length === 0 ? (
            <p className="text-sm text-slate-500">这次没有生成回复模板，请再分析一次</p>
          ) : (
            <ol className="list-decimal space-y-2 pl-4 text-sm leading-6 text-slate-700">
              {result.replyTemplates.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          )}
        </Card>
      )}
      {!isPro && (
        <section className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs leading-5 text-slate-500">
          导出 CSV、客服回复模板、翻页后合并是 Pro 能力。可先到设置里打开本地 Pro 开关做验收。
        </section>
      )}
    </div>
  );
}
