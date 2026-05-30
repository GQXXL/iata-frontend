"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  ProTable,
  type ProTableActions,
} from "@workspace/ui/composed/pro-table/pro-table";
import {
  filterServerList,
  resetSortWithServer,
} from "@workspace/ui/services/admin/server";
import {
  deleteProbeAgent,
  generateProbeAgentToken,
  queryProbeAgentList,
  updateProbeAgentTarget,
} from "@workspace/ui/services/admin/system";
import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type Row = API.ProbeAgentItem & { id: number };

const DEFAULT_INTERVAL_SECONDS = 10;

function fmtTime(ts?: number) {
  if (!ts || Number.isNaN(ts)) return "—";
  const ms = ts > 1e12 ? ts : ts * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function ProbeAgentResults() {
  const { t } = useTranslation("system");
  const ref = useRef<ProTableActions>(null);

  const [savingId, setSavingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [bulkSaving, setBulkSaving] = useState<"toggle" | null>(null);
  const [isHeartbeatHidden, setIsHeartbeatHidden] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [editName, setEditName] = useState("");
  const [createServerId, setCreateServerId] = useState<string>("");

  const [createName, setCreateName] = useState("");
  const [newToken, setNewToken] = useState("");

  const [connectOpen, setConnectOpen] = useState(false);
  const [connectRow, setConnectRow] = useState<Row | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectScript, setConnectScript] = useState("");
  const [tokenCache, setTokenCache] = useState<Record<number, string>>({});
  const scriptAreaRef = useRef<HTMLTextAreaElement | null>(null);

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

  const buildScript = (token: string) =>
    `BASE_URL="${baseUrl}" TOKEN="${token}" bash <(curl -sL https://raw.githubusercontent.com/GQXXL/iata-server/custom/scripts/ppanel-probe-agent-install.sh)`;

  const { data: serverOptions = [] } = useQuery({
    queryKey: ["probe-agent-server-options"],
    queryFn: async () => {
      const res = await filterServerList({ page: 1, size: 2000 });
      return (
        ((res as any)?.data?.data?.list ||
          (res as any)?.data?.list ||
          []) as API.Server[]
      ).map((s) => ({
        id: Number(s.id),
        name: s.name || `server-${s.id}`,
      }));
    },
  });

  const canCreate = useMemo(() => Number(createServerId) > 0, [createServerId]);

  const copyText = async (text: string) => {
    const value = String(text ?? "");
    if (!value.trim()) throw new Error("empty copy text");

    if (window.isSecureContext && navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      if (navigator?.clipboard?.readText) {
        const back = await navigator.clipboard.readText();
        if (back !== value) throw new Error("clipboard verify mismatch");
      }
      return;
    }

    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (!ok) throw new Error("execCommand copy failed");
  };

  const selectScriptForManualCopy = () => {
    const el = scriptAreaRef.current;
    if (!el) return;
    el.focus();
    el.select();
    el.setSelectionRange(0, el.value.length);
  };

  useEffect(() => {
    if (!(connectOpen && connectScript)) return;
    const timer = window.setTimeout(() => {
      selectScriptForManualCopy();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [connectOpen, connectScript]);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const res = await queryProbeAgentList({ page: 1, size: 200 });
        const list =
          (((res as any)?.data?.data?.list ||
            (res as any)?.data?.list ||
            []) as API.ProbeAgentItem[]) || [];
        if (!list.length) return;
        const allHidden = list.every((r) => r.enabled === false);
        if (!canceled) setIsHeartbeatHidden(allHidden);
      } catch {
        // ignore
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  return (
    <>
      <ProTable<Row, { search: string }>
        action={ref}
        columns={[
          {
            accessorKey: "name",
            header: () => (
              <div className="pl-0.5">{t("probe.node", "Node")}</div>
            ),
            cell: ({ row }) => (
              <div className="min-w-[180px] max-w-[320px] truncate pr-2">
                {row.original.name}
              </div>
            ),
          },
          {
            accessorKey: "server_id",
            header: t("probe.serverId", "Server ID"),
            cell: ({ row }) => (
              <div className="w-[96px] tabular-nums">
                {row.original.server_id}
              </div>
            ),
          },
          {
            id: "probe_status",
            header: t("probe.status", "Probe Status"),
            cell: ({ row }) => {
              const online = row.original.status?.toLowerCase() === "online";
              return (
                <div className="flex w-[120px] items-center gap-2">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-500" : "bg-zinc-400"}`}
                  />
                  <span className="text-sm">
                    {online
                      ? t("probe.online", "Online")
                      : t("probe.offline", "Offline")}
                  </span>
                </div>
              );
            },
          },
          {
            accessorKey: "last_seen_at",
            header: t("probe.lastHeartbeat", "Last Heartbeat"),
            cell: ({ row }) => (
              <div className="w-[170px] text-sm tabular-nums">
                {fmtTime(row.original.last_seen_at)}
              </div>
            ),
          },
          {
            accessorKey: "version",
            header: t("probe.version", "Version"),
            cell: ({ row }) => (
              <div className="w-[110px]">
                <Badge variant="secondary">{row.original.version || "—"}</Badge>
              </div>
            ),
          },
          {
            id: "action",
            header: () => (
              <div className="w-full min-w-[260px] pr-1 text-right">
                {t("probe.actions", "Actions")}
              </div>
            ),
            cell: ({ row }) => {
              const id = Number(row.original.server_id);
              return (
                <div className="flex w-full min-w-[260px] justify-end">
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => {
                        setEditRow(row.original);
                        setEditName(row.original.name || "");
                        setEditOpen(true);
                      }}
                      size="sm"
                      variant="secondary"
                    >
                      {t("common.edit", "Edit")}
                    </Button>

                    <Button
                      onClick={async () => {
                        await deleteProbeAgent({ server_id: id });
                        toast.success(t("probe.deleted", "Probe node deleted"));
                        ref.current?.refresh();
                      }}
                      size="sm"
                      variant="destructive"
                    >
                      {t("common.delete", "Delete")}
                    </Button>
                    <Button
                      disabled={connectLoading}
                      onClick={async () => {
                        setConnectLoading(true);
                        try {
                          let token = tokenCache[id] || "";
                          if (!token) {
                            const res = await generateProbeAgentToken({
                              server_id: id,
                              name: row.original.name || undefined,
                            });
                            token =
                              (res as any)?.data?.data?.token ||
                              (res as any)?.data?.token ||
                              "";
                          }
                          if (!token) {
                            toast.error(
                              t(
                                "probe.tokenGenerateFailed",
                                "Token generation failed"
                              )
                            );
                            return;
                          }
                          setTokenCache((prev) => ({ ...prev, [id]: token }));
                          setConnectRow(row.original);
                          setConnectScript(buildScript(token));
                          setConnectOpen(true);
                        } finally {
                          setConnectLoading(false);
                        }
                      }}
                      size="sm"
                      variant="outline"
                    >
                      {t("probe.connect", "Connect")}
                    </Button>
                  </div>
                </div>
              );
            },
          },
        ]}
        header={{
          title: t("probe.pageTitle", "Detection Management"),
          toolbar: (
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                onChange={(e) => setCreateServerId(e.target.value)}
                value={createServerId}
              >
                <option value="">
                  {t("probe.selectServerId", "Select server_id")}
                </option>
                {serverOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} - {s.name}
                  </option>
                ))}
              </select>
              <Input
                className="h-9 w-[220px]"
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={t(
                  "probe.nodeNameOptional",
                  "Probe node name (optional)"
                )}
                value={createName}
              />
              <Button
                disabled={!canCreate || creating}
                onClick={async () => {
                  setCreating(true);
                  try {
                    const res = await generateProbeAgentToken({
                      server_id: Number(createServerId),
                      name: createName || undefined,
                    });
                    const token =
                      (res as any)?.data?.data?.token ||
                      (res as any)?.data?.token ||
                      "";
                    if (!token) {
                      toast.error(
                        t(
                          "probe.tokenGenerateFailed",
                          "Token generation failed"
                        )
                      );
                      return;
                    }
                    setNewToken(token);
                    setTokenCache((prev) => ({
                      ...prev,
                      [Number(createServerId)]: token,
                    }));
                    const script = buildScript(token);
                    setConnectRow({
                      id: Number(createServerId),
                      server_id: Number(createServerId),
                      server_sort: 0,
                      name: createName || `server-${createServerId}`,
                      status: "offline",
                      version: "",
                      last_seen_at: 0,
                      enabled: true,
                      interval_seconds: DEFAULT_INTERVAL_SECONDS,
                    } as Row);
                    setConnectScript(script);
                    setConnectOpen(true);
                    toast.success(
                      t(
                        "probe.createdWithScript",
                        "Probe node created, fixed token and one-click script generated"
                      )
                    );
                    ref.current?.refresh();
                  } finally {
                    setCreating(false);
                  }
                }}
              >
                {creating
                  ? t("common.creating", "Creating...")
                  : t("probe.createNode", "Create Probe Node")}
              </Button>
              <Button
                disabled={bulkSaving !== null}
                onClick={async () => {
                  setBulkSaving("toggle");
                  try {
                    const nextHidden = !isHeartbeatHidden;
                    let page = 1;
                    const size = 200;
                    while (true) {
                      const res = await queryProbeAgentList({ page, size });
                      const list =
                        (((res as any)?.data?.data?.list ||
                          (res as any)?.data?.list ||
                          []) as API.ProbeAgentItem[]) || [];
                      if (!list.length) break;
                      for (const row of list) {
                        const id = Number(row.server_id);
                        await updateProbeAgentTarget({
                          server_id: id,
                          enabled: !nextHidden,
                          interval_seconds: DEFAULT_INTERVAL_SECONDS,
                        });
                      }
                      if (list.length < size) break;
                      page += 1;
                    }
                    setIsHeartbeatHidden(nextHidden);
                    toast.success(
                      nextHidden
                        ? t("probe.heartbeatHidden", "Heartbeat hidden")
                        : t("probe.heartbeatShown", "Heartbeat shown")
                    );
                    ref.current?.refresh();
                  } finally {
                    setBulkSaving(null);
                  }
                }}
                variant={isHeartbeatHidden ? "secondary" : "destructive"}
              >
                {bulkSaving === "toggle"
                  ? isHeartbeatHidden
                    ? t("probe.showing", "Showing...")
                    : t("probe.hiding", "Hiding...")
                  : isHeartbeatHidden
                    ? t("probe.showHeartbeat", "Show Heartbeat")
                    : t("probe.hideHeartbeat", "Hide Heartbeat")}
              </Button>
              {newToken ? (
                <Button
                  onClick={async () => {
                    try {
                      await copyText(newToken);
                      toast.success(t("probe.tokenCopied", "Token copied"));
                    } catch {
                      toast.error(
                        t(
                          "probe.copyFailedManual",
                          "Copy failed, please copy manually below"
                        )
                      );
                    }
                  }}
                  variant="secondary"
                >
                  {t("probe.copyNewToken", "Copy New Token")}
                </Button>
              ) : null}
            </div>
          ),
        }}
        onSort={async (source, target, items) => {
          const sourceIndex = items.findIndex(
            (item) => String(item.id) === source
          );
          const targetIndex = items.findIndex(
            (item) => String(item.id) === target
          );
          if (sourceIndex < 0 || targetIndex < 0) return items;

          const prevSortById = new Map(
            items.map((item) => [
              Number(item.server_id),
              Number(item.server_sort || 0),
            ])
          );

          const next = items.slice();
          const [movedItem] = next.splice(sourceIndex, 1);
          if (!movedItem) return items;
          next.splice(targetIndex, 0, movedItem);

          const numericSorts = items
            .map((it) =>
              typeof it.server_sort === "number" ? it.server_sort : Number.NaN
            )
            .filter((v) => Number.isFinite(v)) as number[];
          const baseSort = numericSorts.length ? Math.min(...numericSorts) : 0;

          const updatedItems = next.map((item, index) => ({
            ...item,
            server_sort: baseSort + index,
          }));

          const changedItems = updatedItems.filter(
            (item) =>
              Number(item.server_sort || 0) !==
              prevSortById.get(Number(item.server_id))
          );

          if (changedItems.length > 0) {
            await resetSortWithServer({
              sort: changedItems.map((item) => ({
                id: Number(item.server_id),
                sort: Number(item.server_sort || 0),
              })) as API.SortItem[],
            });
            toast.success(t("probe.sortSaved", "Sort saved"));
          }

          return updatedItems;
        }}
        params={[{ key: "search", placeholder: t("search", "Search") }]}
        request={async (pagination) => {
          const res = await queryProbeAgentList({
            page: pagination.page,
            size: pagination.size,
          });
          const list =
            (((res as any)?.data?.data?.list ||
              (res as any)?.data?.list ||
              []) as API.ProbeAgentItem[]) || [];
          const total = Number(
            (res as any)?.data?.data?.total || (res as any)?.data?.total || 0
          );
          const sorted = [...list]
            .sort(
              (a, b) =>
                Number(a.server_sort || 0) - Number(b.server_sort || 0) ||
                Number(a.server_id) - Number(b.server_id)
            )
            .map((it) => ({ ...it, id: Number(it.server_id) }));
          return { list: sorted, total };
        }}
      />

      <Dialog onOpenChange={setEditOpen} open={editOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("probe.editNode", "Edit Node")}</DialogTitle>
            <DialogDescription>
              {t("probe.editNodeDesc", "You can modify this Probe node name")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              className="h-9"
              onChange={(e) => setEditName(e.target.value)}
              placeholder={t("probe.enterNodeName", "Please enter node name")}
              value={editName}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setEditOpen(false)} variant="outline">
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                disabled={!editRow || savingId === Number(editRow?.server_id)}
                onClick={async () => {
                  if (!editRow) return;
                  const id = Number(editRow.server_id);
                  setSavingId(id);
                  try {
                    const nextName = String(editName || "").trim();
                    if (!nextName) {
                      toast.error(
                        t("probe.nodeNameRequired", "Node name cannot be empty")
                      );
                      return;
                    }

                    await updateProbeAgentTarget({
                      server_id: id,
                      name: nextName,
                      enabled:
                        typeof editRow.enabled === "boolean"
                          ? editRow.enabled
                          : true,
                      interval_seconds:
                        typeof editRow.interval_seconds === "number" &&
                        editRow.interval_seconds > 0
                          ? editRow.interval_seconds
                          : DEFAULT_INTERVAL_SECONDS,
                    } as any);

                    toast.success(
                      t("probe.nodeNameUpdated", "Node name updated")
                    );
                    setEditOpen(false);
                    setEditRow((prev) =>
                      prev ? { ...prev, name: nextName } : prev
                    );
                    ref.current?.refresh();
                  } finally {
                    setSavingId(null);
                  }
                }}
              >
                {savingId === Number(editRow?.server_id)
                  ? t("common.saving", "Saving...")
                  : t("common.save", "Save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setConnectOpen} open={connectOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {t(
                "probe.deployScriptTitle",
                "Probe One-click Deploy Script (Copy & Close)"
              )}
            </DialogTitle>
            <DialogDescription>
              {t(
                "probe.deployScriptDesc",
                "The script is auto-selected by default. Press Ctrl+C to copy, or click Copy & Close."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="text-muted-foreground text-sm">
            {t("probe.currentNode", "Current node")}: {connectRow?.name || "-"}{" "}
            (server_id: {connectRow?.server_id || "-"})
          </div>
          <div className="sticky top-0 z-10 flex shrink-0 flex-wrap gap-2 bg-background py-1">
            <Button
              disabled={!connectScript}
              onClick={async () => {
                if (!connectScript) return;
                try {
                  await copyText(connectScript);
                  toast.success(
                    t(
                      "probe.scriptCopiedAndClosed",
                      "Script copied ({{len}} chars), dialog closed",
                      { len: connectScript.length }
                    )
                  );
                  setConnectOpen(false);
                } catch {
                  selectScriptForManualCopy();
                  toast.error(
                    t(
                      "probe.autoCopyFailed",
                      "Auto copy failed: script is selected, press Ctrl+C to copy"
                    )
                  );
                }
              }}
              variant="secondary"
            >
              {t("probe.copyAndClose", "Copy & Close")}
            </Button>
          </div>
          <Textarea
            className="min-h-[320px] flex-1 overflow-auto font-mono text-xs"
            placeholder={t(
              "probe.scriptPlaceholder",
              "Script will be generated after creating a new Probe node"
            )}
            readOnly
            ref={scriptAreaRef}
            value={connectScript}
          />

          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <span>
              {t(
                "probe.manualCopyHint",
                "If clipboard access is blocked, click Select Script then press Ctrl+C to copy manually."
              )}
            </span>
            <Button
              onClick={selectScriptForManualCopy}
              size="sm"
              variant="outline"
            >
              {t("probe.selectScript", "Select Script")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
