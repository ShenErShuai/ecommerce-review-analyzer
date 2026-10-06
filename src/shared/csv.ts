import type { AnalyzeResult, ExtractResult } from "@/shared/types";

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsv(extract: ExtractResult, result: AnalyzeResult): string {
  const summaryRows = [
    ["类型", "内容"],
    ["平台", extract.platformLabel],
    ["页面", extract.pageTitle],
    ["链接", extract.pageUrl],
    ["评论条数", String(extract.reviews.length)],
    ["好评卖点", result.positiveSummary],
    ["差评痛点", result.negativeSummary],
    ["用户画像", result.userPersona.join("、")],
    ["改进建议", result.improvementSuggestions.join("；")],
    ...result.replyTemplates.map((template, index) => [`回复模板${index + 1}`, template]),
    [],
    ["评论内容", "评分", "日期", "作者"],
    ...extract.reviews.map((review) => [
      review.content,
      review.rating ? String(review.rating) : "",
      review.date ?? "",
      review.author ?? "",
    ]),
  ];

  const csv = summaryRows
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\r\n");

  return `\uFEFF${csv}`;
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function csvFilename(extract: ExtractResult): string {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
  return `评论洞察-${extract.platformLabel}-${date}.csv`;
}
