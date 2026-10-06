import {
  MessageType,
  type ExtractReviewsResponse,
  type ExtensionMessage,
  type GetFrameInfoResponse,
} from "@/shared/messages";
import { extractFromCurrentFrame } from "./extractor";
import { mountWidget } from "./widget";

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === MessageType.GET_FRAME_INFO) {
      const response: GetFrameInfoResponse = {
        ok: true,
        href: location.href,
        title: document.title,
      };
      sendResponse(response);
      return;
    }

    if (message.type !== MessageType.EXTRACT_FRAME) return;

    try {
      const data = extractFromCurrentFrame();
      sendResponse({ ok: true, data } satisfies ExtractReviewsResponse);
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "提取评论失败",
      } satisfies ExtractReviewsResponse);
    }
  },
);

if (window === window.top) {
  mountWidget();
}
