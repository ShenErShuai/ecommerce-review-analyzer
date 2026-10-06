import { MAX_REVIEWS_PER_REQUEST } from "@/shared/constants";
import type { RawReview } from "@/shared/types";

export function buildPrompt(reviews: RawReview[], includeReplies = false): string {
  const reviewText = reviews
    .slice(0, MAX_REVIEWS_PER_REQUEST)
    .map((review, index) => {
      const bits = [`${index + 1}. ${review.content}`];
      if (review.rating) bits.push(`评分:${review.rating}`);
      if (review.date) bits.push(`日期:${review.date}`);
      return bits.join(" ");
    })
    .join("\n");

  const replyField = includeReplies
    ? `,\n  "replyTemplates": ["好评客服回复，语气真诚，80字以内", "差评客服回复，先道歉再给处理方案，80字以内"]`
    : "";

  return `请分析以下电商商品的用户评论，只依据评论本身，不要编造评论里没有的信息。严格按照 JSON 返回。

评论：
${reviewText}

返回格式：
{
  "positiveSummary": "好评核心卖点总结，80字以内",
  "negativeSummary": "差评核心痛点总结，80字以内；若没有差评就写“未见明显差评”",
  "userPersona": ["用户画像标签1", "标签2", "标签3"],
  "improvementSuggestions": ["改进建议1", "改进建议2", "改进建议3"]${replyField}
}`;
}
