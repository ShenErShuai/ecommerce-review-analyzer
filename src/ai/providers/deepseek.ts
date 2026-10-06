import { DEEPSEEK_ENDPOINT, DEEPSEEK_MODEL } from "@/shared/constants";
import type { AnalyzeResult, RawReview } from "@/shared/types";
import { mapAiError } from "../errors";
import { buildPrompt } from "../prompts";

interface DeepSeekResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function parseAnalyzeResult(content: string): AnalyzeResult {
  const parsed = JSON.parse(content) as Partial<AnalyzeResult>;
  return {
    positiveSummary: parsed.positiveSummary?.trim() || "暂无足够好评可总结",
    negativeSummary: parsed.negativeSummary?.trim() || "暂无足够差评可总结",
    userPersona: asStringArray(parsed.userPersona),
    improvementSuggestions: asStringArray(parsed.improvementSuggestions),
    replyTemplates: asStringArray(parsed.replyTemplates),
  };
}

export async function analyzeWithDeepSeek(
  reviews: RawReview[],
  apiKey: string,
  options: { includeReplies?: boolean } = {},
): Promise<AnalyzeResult> {
  let response: Response;
  try {
    response = await fetch(DEEPSEEK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: "你是一位电商评论分析专家，只输出合法 JSON。" },
          { role: "user", content: buildPrompt(reviews, options.includeReplies) },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });
  } catch (error) {
    throw new Error(mapAiError(error));
  }

  let data: DeepSeekResponse;
  try {
    data = (await response.json()) as DeepSeekResponse;
  } catch {
    throw new Error("DeepSeek 返回异常，请稍后重试");
  }

  if (!response.ok) {
    throw new Error(mapAiError(new Error(data.error?.message || ""), response.status));
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek 没有返回分析结果");
  }

  try {
    return parseAnalyzeResult(content);
  } catch {
    throw new Error("AI 返回内容无法解析，请重试");
  }
}
