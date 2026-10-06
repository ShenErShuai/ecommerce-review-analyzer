import type { PlatformId, RawReview } from "@/shared/types";

export interface ReviewAdapter {
  name: string;
  platform: PlatformId;
  match: (url: string) => boolean;
  extract: () => RawReview[];
}
