import type { ExtractResult } from "@/shared/types";
import { MAX_REVIEWS_PER_REQUEST } from "@/shared/constants";

interface ExtractPreviewProps {
  extract: ExtractResult;
  analyzing?: boolean;
}

export function ExtractPreview({ extract, analyzing = false }: ExtractPreviewProps) {
  const preview = extract.reviews.slice(0, 2);
  const analyzingCount = Math.min(extract.reviews.length, MAX_REVIEWS_PER_REQUEST);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">
        {analyzing
          ? `已提取 ${extract.platformLabel} ${extract.reviews.length} 条，正在分析前 ${analyzingCount} 条`
          : `已提取 ${extract.platformLabel} ${extract.reviews.length} 条可见评论`}
      </p>
      {preview.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {preview.map((review) => (
            <li key={review.content} className="text-xs leading-5 text-slate-600">
              {review.content.length > 48 ? `${review.content.slice(0, 48)}…` : review.content}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
