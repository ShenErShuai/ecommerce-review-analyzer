import type { RawReview } from "@/shared/types";
import type { ReviewAdapter } from "./types";

const ITEM_SELECTORS = [
  ".comment-item",
  ".jdc-comment-item",
  ".comment-column",
  "[class*='commentItem']",
  "[class*='CommentItem']",
];

const CONTENT_SELECTORS = [
  ".comment-con",
  ".jdc-comment-content",
  "[class*='commentContent']",
  "[class*='content']",
];

function textOf(el: Element | null): string {
  return el?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function parseRating(el: Element): number | undefined {
  const star = el.querySelector(".star, .comment-star, [class*='star']");
  const cls = star?.getAttribute("class") ?? "";
  const match = cls.match(/(\d)/);
  if (match) return Number(match[1]);
  return undefined;
}

function extractFromDocument(): RawReview[] {
  const items = Array.from(new Set(ITEM_SELECTORS.flatMap((selector) => Array.from(document.querySelectorAll(selector)))));

  const fromItems = items
    .map((el) => {
      const contentEl =
        CONTENT_SELECTORS.map((selector) => el.querySelector(selector)).find(Boolean) ?? el;
      return {
        content: textOf(contentEl),
        rating: parseRating(el),
        date: textOf(el.querySelector(".comment-time, .order-info, [class*='time'], [class*='date']")) || undefined,
        author: textOf(el.querySelector(".user-info, .user-name, [class*='user']")) || undefined,
      };
    })
    .filter((review) => review.content.length >= 6);

  if (fromItems.length > 0) return fromItems;

  return CONTENT_SELECTORS.flatMap((selector) => Array.from(document.querySelectorAll(selector)))
    .map((el) => ({ content: textOf(el) }))
    .filter((review) => review.content.length >= 6);
}

export const jdAdapter: ReviewAdapter = {
  name: "京东",
  platform: "jd",
  match: (url) => /jd\.com|jd\.hk/.test(url),
  extract: extractFromDocument,
};
