export function mapAiError(error: unknown, status?: number): string {
  const raw = error instanceof Error ? error.message : String(error);
  const text = raw.toLowerCase();

  if (status === 401 || text.includes("authentication") || text.includes("invalid api key") || text.includes("incorrect api key")) {
    return "DeepSeek API Key 无效，请到设置里检查后重试";
  }
  if (status === 402 || text.includes("insufficient") || text.includes("balance") || text.includes("quota")) {
    return "DeepSeek 余额不足，请到 DeepSeek 控制台充值后再试";
  }
  if (status === 429 || text.includes("rate limit") || text.includes("too many")) {
    return "请求太频繁，请稍后再试";
  }
  if (status === 503 || status === 500 || text.includes("overloaded") || text.includes("internal")) {
    return "DeepSeek 暂时不可用，请稍后再试";
  }
  if (text.includes("failed to fetch") || text.includes("network") || text.includes("load failed")) {
    return "无法连接 DeepSeek，请检查网络是否能访问 api.deepseek.com";
  }

  if (raw && !/^deepseek 请求失败/i.test(raw) && raw.length <= 80 && /[\u4e00-\u9fff]/.test(raw)) {
    return raw;
  }

  return raw.length <= 60 ? raw : "分析失败，请稍后重试";
}
