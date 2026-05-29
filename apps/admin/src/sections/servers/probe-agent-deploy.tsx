"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  generateProbeAgentToken,
  queryProbeAgentList,
  updateProbeAgentTarget,
} from "@workspace/ui/services/admin/system";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const DEFAULT_CT = "gd-ct-v4.ip.zstaticcdn.com:443";
const DEFAULT_CU = "gd-cu-v4.ip.zstaticcdn.com:443";
const DEFAULT_CM = "gd-cm-v4.ip.zstaticcdn.com:443";

export default function ProbeAgentDeployDialog({
  server,
}: {
  server: API.Server;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState("");
  const [targetCt, setTargetCt] = useState(DEFAULT_CT);
  const [targetCu, setTargetCu] = useState(DEFAULT_CU);
  const [targetCm, setTargetCm] = useState(DEFAULT_CM);
  const [intervalSec, setIntervalSec] = useState("30");
  const [scriptToken, setScriptToken] = useState("");
  const copiedTimerRef = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [agentRow, setAgentRow] = useState<API.ProbeAgentItem | null>(null);

  const storageKey = useMemo(
    () => `probe_agent_deploy_${server.id}`,
    [server.id]
  );
  const scriptSchemaVersion = "heartbeat-only-v1";

  const baseUrl = useMemo(() => {
    const envPrefix = import.meta.env.VITE_API_PREFIX as string | undefined;

    if (envPrefix) {
      if (/^https?:\/\//i.test(envPrefix)) {
        return envPrefix.replace(/\/$/, "");
      }
      // 支持把 VITE_API_PREFIX 设为相对路径（如 /v1），自动拼到当前 origin
      if (typeof window !== "undefined") {
        return `${window.location.origin}${envPrefix.startsWith("/") ? "" : "/"}${envPrefix}`.replace(
          /\/$/,
          ""
        );
      }
    }

    if (typeof window !== "undefined") {
      return window.location.origin;
    }

    return "http://127.0.0.1:8080";
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const cached = JSON.parse(raw) as {
        token?: string;
        script?: string;
        version?: string;
      };

      // 旧缓存（含三网脚本）直接丢弃，避免复制到过期脚本
      if (cached?.version !== scriptSchemaVersion) {
        window.localStorage.removeItem(storageKey);
        return;
      }

      if (cached?.token) setScriptToken(cached.token);
      if (cached?.script) setScript(cached.script);
    } catch {
      // ignore cache parse errors
    }
  }, [storageKey, scriptSchemaVersion]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!(scriptToken && script)) return;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        token: scriptToken,
        script,
        version: scriptSchemaVersion,
      })
    );
  }, [storageKey, scriptToken, script, scriptSchemaVersion]);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = null;
      }
      return;
    }
    (async () => {
      try {
        const { data } = await queryProbeAgentList({ page: 1, size: 1000 });
        const row = (data?.data?.list || []).find(
          (it) => Number(it.server_id) === Number(server.id)
        );
        if (!row) {
          setAgentRow(null);
          return;
        }
        setAgentRow(row);
        setTargetCt(row.target_ct || DEFAULT_CT);
        setTargetCu(row.target_cu || DEFAULT_CU);
        setTargetCm(row.target_cm || DEFAULT_CM);
        setIntervalSec(String(row.interval_seconds || 30));
      } catch {
        // ignore
      }
    })();
  }, [open, server.id]);

  const buildScript = (token: string) => `bash -c 'set -e
BASE_URL="${baseUrl}"
TOKEN="${token}"

if ! command -v jq >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y && apt-get install -y jq
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y jq
  elif command -v yum >/dev/null 2>&1; then
    yum install -y jq
  elif command -v apk >/dev/null 2>&1; then
    apk add --no-cache jq
  else
    echo "jq is required but no supported package manager found"
    exit 1
  fi
fi

cat >/usr/local/bin/ppanel-probe-agent.sh <<EOF
#!/bin/bash
set -euo pipefail
BASE_URL="$BASE_URL"
TOKEN="$TOKEN"
while true; do
  CFG=$(curl -fsS "$BASE_URL/v1/probe_agent/config?token=$TOKEN")
  INTERVAL=$(echo "$CFG" | jq -r '.data.interval_seconds // 30')

  curl -fsS -X POST "$BASE_URL/v1/probe_agent/heartbeat" -H "Content-Type: application/json" -d "{"token":"$TOKEN","version":"shell-mvp"}" >/dev/null || true

  sleep "$INTERVAL"
done
EOF

sed -i 's/\r$//' /usr/local/bin/ppanel-probe-agent.sh
chmod +x /usr/local/bin/ppanel-probe-agent.sh

cat >/etc/systemd/system/ppanel-probe-agent.service <<EOF
[Unit]
Description=PPanel Probe Agent
After=network.target

[Service]
Type=simple
ExecStart=/bin/bash /usr/local/bin/ppanel-probe-agent.sh
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now ppanel-probe-agent
systemctl restart ppanel-probe-agent

# 每小时自动清理 journald 历史日志（保留最近 1 小时）
cat >/usr/local/bin/ppanel-probe-log-clean.sh <<'EOF'
#!/bin/bash
set -e
journalctl --rotate
journalctl --vacuum-time=1h
EOF
chmod +x /usr/local/bin/ppanel-probe-log-clean.sh

cat >/etc/cron.d/ppanel-probe-log-clean <<EOF
SHELL=/bin/bash
PATH=/usr/sbin:/usr/bin:/sbin:/bin
0 * * * * root /usr/local/bin/ppanel-probe-log-clean.sh >/dev/null 2>&1
EOF
chmod 644 /etc/cron.d/ppanel-probe-log-clean

systemctl status ppanel-probe-agent --no-pager -l
'`;

  const formatLastSeen = (ts?: number) => {
    if (!ts || Number.isNaN(ts)) return "—";
    const ms = ts > 1e12 ? ts : ts * 1000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  };

  const agentOnline = agentRow?.status?.toLowerCase() === "online";

  const onSaveTarget = async () => {
    setLoading(true);
    try {
      const ct = targetCt.trim() || DEFAULT_CT;
      const cu = targetCu.trim() || DEFAULT_CU;
      const cm = targetCm.trim() || DEFAULT_CM;

      await updateProbeAgentTarget({
        server_id: Number(server.id),
        target_ct: ct,
        target_cu: cu,
        target_cm: cm,
        enabled: true,
        interval_seconds: Math.max(5, Number(intervalSec || 30)),
      });
      toast.success("三网目标已保存");
      setTargetCt(ct);
      setTargetCu(cu);
      setTargetCm(cm);
      setAgentRow((prev) =>
        prev
          ? {
              ...prev,
              target_ct: ct,
              target_cu: cu,
              target_cm: cm,
              enabled: true,
              interval_seconds: Math.max(5, Number(intervalSec || 30)),
            }
          : prev
      );
    } finally {
      setLoading(false);
    }
  };

  const onGenerate = async () => {
    if (scriptToken) {
      const next = buildScript(scriptToken);
      setScript(next);
      toast.success("已使用当前 Token 重新生成脚本");
      return;
    }

    setLoading(true);
    try {
      const { data } = await generateProbeAgentToken({
        server_id: Number(server.id),
        name: String(server.name || "probe-agent"),
      });
      const token = data?.data?.token || "";
      if (!token) {
        toast.error("Token 生成失败");
        return;
      }
      const next = buildScript(token);
      setScriptToken(token);
      setScript(next);
      toast.success("Token 已生成并固定，可重复复制脚本");
    } finally {
      setLoading(false);
    }
  };

  const onResetTokenAndGenerate = async () => {
    setLoading(true);
    try {
      const { data } = await generateProbeAgentToken({
        server_id: Number(server.id),
        name: String(server.name || "probe-agent"),
      });
      const token = data?.data?.token || "";
      if (!token) {
        toast.error("重置 Token 失败");
        return;
      }
      const next = buildScript(token);
      setScriptToken(token);
      setScript(next);
      toast.success("Token 已重置并生成新脚本");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)} variant="outline">
          Probe Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>一键部署 Probe Agent（含 Token）</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 rounded-md border p-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>在线状态</Label>
            <div className="text-sm">
              <span
                className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${
                  agentOnline ? "bg-emerald-500" : "bg-zinc-400"
                }`}
              />
              {agentOnline ? "在线" : "离线"}
            </div>
          </div>
          <div className="space-y-1">
            <Label>最后心跳</Label>
            <div className="text-sm">
              {formatLastSeen(agentRow?.last_seen_at)}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Agent 版本</Label>
            <div className="text-sm">{agentRow?.version || "—"}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 rounded-md border p-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>电信目标 (target_ct)</Label>
            <Input
              onChange={(e) => setTargetCt(e.target.value)}
              placeholder="ip:port"
              value={targetCt}
            />
          </div>
          <div className="space-y-1">
            <Label>联通目标 (target_cu)</Label>
            <Input
              onChange={(e) => setTargetCu(e.target.value)}
              placeholder="ip:port"
              value={targetCu}
            />
          </div>
          <div className="space-y-1">
            <Label>移动目标 (target_cm)</Label>
            <Input
              onChange={(e) => setTargetCm(e.target.value)}
              placeholder="ip:port"
              value={targetCm}
            />
          </div>
          <div className="space-y-1">
            <Label>间隔秒数</Label>
            <Input
              onChange={(e) => setIntervalSec(e.target.value)}
              placeholder="30"
              value={intervalSec}
            />
          </div>
          <div className="pt-5">
            <Button disabled={loading} onClick={onSaveTarget} variant="outline">
              保存三网目标
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Button disabled={loading} onClick={onGenerate}>
              {loading
                ? "处理中..."
                : scriptToken
                  ? "使用当前 Token 重新生成脚本"
                  : "创建 Token 并生成脚本"}
            </Button>
            <Button
              disabled={loading}
              onClick={onResetTokenAndGenerate}
              variant="outline"
            >
              重置 Token 并生成新脚本
            </Button>
            <Button
              disabled={!script}
              onClick={async () => {
                if (!script) return;
                try {
                  if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(script);
                  } else {
                    const el = document.createElement("textarea");
                    el.value = script;
                    document.body.appendChild(el);
                    el.select();
                    document.execCommand("copy");
                    document.body.removeChild(el);
                  }
                  setCopied(true);
                  if (copiedTimerRef.current) {
                    window.clearTimeout(copiedTimerRef.current);
                  }
                  copiedTimerRef.current = window.setTimeout(() => {
                    setCopied(false);
                  }, 1500);
                  toast.success("脚本已复制");
                } catch {
                  toast.error("复制失败，请手动复制");
                }
              }}
              variant="outline"
            >
              {copied ? "已复制" : "复制脚本"}
            </Button>
          </div>
          <Textarea
            placeholder="点击上方按钮生成带 Token 的一键部署脚本"
            readOnly
            rows={16}
            value={script}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
