import type { AnalyzeResult, ProviderId, RawReview } from "@/shared/types";
import { analyzeWithDeepSeek } from "./providers/deepseek";

export async function analyzeReviews(
  reviews: RawReview[],
  apiKey: string,
  provider: ProviderId = "deepseek",
  options: { includeReplies?: boolean } = {},
): Promise<AnalyzeResult> {
  if (provider !== "deepseek") {
    throw new Error("当前版本仅支持 DeepSeek");
  }
  return analyzeWithDeepSeek(reviews, apiKey, options);
}
