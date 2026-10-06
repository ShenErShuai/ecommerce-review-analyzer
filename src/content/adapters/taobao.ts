import type { RawReview } from "@/shared/types";
import type { ReviewAdapter } from "./types";

const ITEM_SELECTORS = [
  ".Comment--item",
  ".rate-grid tr",
  ".rate-item",
  ".tm-rate-content",
  "[class*='CommentItem']",
  "[class*='commentItem']",
  "[class*='RateItem']",
];

const CONTENT_SELECTORS = [
  ".Comment--content",
  ".tm-rate-fulltxt",
  ".tm-rate-content",
  ".rate-content",
  ".tb-revbd",
  "[class*='content']",
  "[class*='Content']",
];

function textOf(el: Element | null): string {
  return el?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function parseRating(el: Element): number | undefined {
  const rated = el.querySelector("[class*='star'], [class*='rate'], [class*='Score']");
  const label = rated?.getAttribute("class") ?? "";
  const match = label.match(/(\d)/);
  if (match) return Number(match[1]);
  return undefined;
}

function extractFromDocument(): RawReview[] {
  const items = ITEM_SELECTORS.flatMap((selector) =>
    Array.from(document.querySelectorAll(selector)),
  );

  const uniqueItems = Array.from(new Set(items));

  const fromItems = uniqueItems
    .map((el) => {
      const contentEl =
        CONTENT_SELECTORS.map((selector) => el.querySelector(selector)).find(Boolean) ?? el;
      return {
        content: textOf(contentEl),
        rating: parseRating(el),
        date: textOf(el.querySelector(".tm-rate-date, .date, [class*='date'], [class*='Date']")) || undefined,
        author:
          textOf(el.querySelector(".rate-user-info, .user-name, [class*='user'], [class*='User']")) ||
          undefined,
      };
    })
    .filter((review) => review.content.length >= 6);

  if (fromItems.length > 0) return fromItems;

  return CONTENT_SELECTORS.flatMap((selector) =>
    Array.from(document.querySelectorAll(selector)),
  )
    .map((el) => ({ content: textOf(el) }))
    .filter((review) => review.content.length >= 6);
}

export const taobaoAdapter: ReviewAdapter = {
  name: "淘宝/天猫",
  platform: "taobao",
  match: (url) => /taobao\.com|tmall\.com|tmall\.hk/.test(url),
  extract: extractFromDocument,
};
