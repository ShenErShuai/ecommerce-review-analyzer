// 从 store/icon-master-1024.png 缩出 public/icons 下的 16 / 48 / 128 三张图标。
// 母图是 store/icon.html 的渲染结果；只有改图标设计时才需要重新渲染母图并替换，
// 日常构建只走这里的缩放，保证三个尺寸始终同源。
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const master = join(root, "store", "icon-master-1024.png");
const outDir = join(root, "public", "icons");

if (!existsSync(master)) {
  throw new Error(`缺少图标母图：${master}`);
}

mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const out = join(outDir, `icon${size}.png`);
  await run("sips", ["-z", String(size), String(size), master, "--out", out]);
  const buf = readFileSync(out);
  const [w, h] = [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  if (w !== size || h !== size) {
    throw new Error(`${out} 尺寸为 ${w}x${h}，应为 ${size}x${size}`);
  }
  console.log(`icon${size}.png ${w}x${h}`);
}
