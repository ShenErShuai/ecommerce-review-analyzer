import type { PlatformId } from "./types";

export interface PageStatus {
  supported: boolean;
  platform: PlatformId;
  label: string;
}

export function detectPlatform(url = ""): PageStatus {
  if (/taobao\.com|tmall\.com|tmall\.hk/.test(url)) {
    return { supported: true, platform: "taobao", label: "淘宝/天猫" };
  }
  if (/jd\.com|jd\.hk/.test(url)) {
    return { supported: true, platform: "jd", label: "京东" };
  }
  return { supported: false, platform: "unknown", label: "当前页" };
}
