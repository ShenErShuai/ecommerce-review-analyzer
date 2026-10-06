import type { ExtractResult, RawReview } from "@/shared/types";
import { jdAdapter } from "./adapters/jd";
import { taobaoAdapter } from "./adapters/taobao";
import type { ReviewAdapter } from "./adapters/types";

const adapters: ReviewAdapter[] = [taobaoAdapter, jdAdapter];

function dedupeReviews(reviews: RawReview[]): RawReview[] {
  const seen = new Set<string>();
  return reviews.filter((review) => {
    const key = review.content.replace(/\s+/g, "");
    if (key.length < 6 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractFromCurrentFrame(href = location.href): ExtractResult {
  const adapter = adapters.find((item) => item.match(href));

  return {
    platform: adapter?.platform ?? "unknown",
    platformLabel: adapter?.name ?? "当前页面",
    reviews: adapter ? dedupeReviews(adapter.extract()) : [],
    pageTitle: document.title,
    pageUrl: href,
  };
}
