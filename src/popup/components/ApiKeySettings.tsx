import { useState } from "react";

interface ApiKeySettingsProps {
  initialKey: string;
  isPro: boolean;
  ezrevenueConfigured: boolean;
  onSave: (apiKey: string) => Promise<void>;
  onTogglePro: (isPro: boolean) => Promise<void>;
  onOpenPaywall: () => Promise<void>;
}

export function ApiKeySettings({
  initialKey,
  isPro,
  ezrevenueConfigured,
  onSave,
  onTogglePro,
  onOpenPaywall,
}: ApiKeySettingsProps) {
  const [apiKey, setApiKey] = useState(initialKey);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hint, setHint] = useState("");
  const [proOn, setProOn] = useState(isPro);
  const [opening, setOpening] = useState(false);

  async function handleSave() {
    const value = apiKey.trim();
    if (!value) {
      setHint("请先粘贴 DeepSeek API Key");
      return;
    }
    if (!value.startsWith("sk-")) {
      setHint("Key 一般以 sk- 开头，请确认复制完整");
    } else {
      setHint("");
    }

    setSaving(true);
    try {
      await onSave(value);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } finally {
      setSaving(false);
    }
  }

  async function handlePro(next: boolean) {
    setProOn(next);
    await onTogglePro(next);
  }

  async function handlePaywall() {
    setOpening(true);
    try {
      await onOpenPaywall();
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">DeepSeek API Key</h2>
          <a
            className="text-xs text-brand-600 hover:underline"
            href="https://platform.deepseek.com/api_keys"
            target="_blank"
            rel="noreferrer"
          >
            去获取
          </a>
        </div>
        <div className="mb-2 flex gap-2">
          <input
            type={visible ? "text" : "password"}
            value={apiKey}
            onChange={(event) => {
              setApiKey(event.target.value);
              setHint("");
            }}
            placeholder="sk-..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            className="shrink-0 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-600"
          >
            {visible ? "隐藏" : "显示"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !apiKey.trim()}
          className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {saved ? "已保存" : saving ? "保存中..." : "保存 Key"}
        </button>
        {hint && <p className="mt-2 text-xs text-amber-600">{hint}</p>}
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Key 只保存在浏览器本地，分析时由后台请求 DeepSeek，不会发到我们的服务器。
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h2 className="text-sm font-semibold text-slate-800">Pro 会员</h2>
        {ezrevenueConfigured ? (
          <>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {isPro ? "已开通 Pro：无限次分析、CSV、回复模板、翻页合并。" : "开通后可解锁 CSV、回复模板和翻页合并。"}
            </p>
            <button
              type="button"
              onClick={() => void handlePaywall()}
              disabled={opening}
              className="mt-3 w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-400"
            >
              {opening ? "打开付费页..." : isPro ? "我的会员" : "开通 Pro"}
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              艺爪凭证还没填。到
              <a
                className="text-brand-600 hover:underline"
                href="https://revenue.ezboti.com/"
                target="_blank"
                rel="noreferrer"
              >
                艺爪控制台
              </a>
              创建项目后，把 projectId / projectSecret 填进项目根目录的 `.env.local`（复制 `.env.example` 得到）。填好前可用本地开关验收。
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-600">本地 Pro 开关</span>
              <button
                type="button"
                onClick={() => void handlePro(!proOn)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  proOn ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {proOn ? "已开启" : "未开启"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
