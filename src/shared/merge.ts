import type { ExtractResult, RawReview } from "@/shared/types";

function reviewKey(review: RawReview): string {
  return review.content.replace(/\s+/g, "");
}

export function mergeExtracts(base: ExtractResult, extra: ExtractResult): ExtractResult {
  const seen = new Set(base.reviews.map(reviewKey));
  const added = extra.reviews.filter((review) => {
    const key = reviewKey(review);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    ...base,
    pageTitle: extra.pageTitle || base.pageTitle,
    pageUrl: extra.pageUrl || base.pageUrl,
    reviews: [...base.reviews, ...added],
  };
}
