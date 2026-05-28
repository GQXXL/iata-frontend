import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Empty from "@workspace/ui/composed/empty";
import { Icon } from "@workspace/ui/composed/icon";
import { queryUserSubscribeNodeList } from "@workspace/ui/services/user/subscribe";

import { useTranslation } from "react-i18next";

function fmtTime(ts?: number) {
  if (!ts || Number.isNaN(ts)) return "—";
  const ms = ts > 1e12 ? ts : ts * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function ServerStatus() {
  const { t } = useTranslation("components");

  const { data: userSubscribeNodeList = [] } = useQuery({
    queryKey: ["queryUserSubscribeNodeList"],
    queryFn: async () => {
      const { data } = await queryUserSubscribeNodeList();
      return data.data?.list || [];
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const nodes = userSubscribeNodeList.flatMap((sub) => sub.nodes || []);

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-1.5 font-semibold text-base sm:text-lg">
        <Icon className="size-4 sm:size-5" icon="uil:server-network" />
        {t("serverStatus.title", "Node Status")}
      </h2>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base">
            {t("serverStatus.subtitleOnline", "在线状态")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs sm:text-sm">
          {nodes.length ? (
            <div className="overflow-hidden rounded-md border">
              <div className="grid grid-cols-3 bg-muted/40 px-3 py-2 font-medium">
                <div>{t("serverStatus.node", "节点")}</div>
                <div className="text-center">
                  {t("serverStatus.status", "状态")}
                </div>
                <div className="text-right">
                  {t("serverStatus.lastHeartbeat", "最后心跳")}
                </div>
              </div>

              {nodes.map((node) => {
                const nodeStatus =
                  node.status || (node.online ? "online" : "offline");
                const isOnline = nodeStatus === "online";
                const isWarning = nodeStatus === "warning";

                const dotClass = isOnline
                  ? "bg-emerald-500"
                  : isWarning
                    ? "bg-zinc-400"
                    : "bg-zinc-400";

                const statusText = isOnline
                  ? t("serverStatus.online", "在线")
                  : isWarning
                    ? t("serverStatus.warning", "抖动")
                    : t("serverStatus.unavailable", "离线");

                return (
                  <div
                    className="grid grid-cols-3 items-center border-t px-3 py-2"
                    key={`${node.id}-${node.protocol}-${node.address}-${node.port}`}
                  >
                    <div className="truncate pr-2">{node.name}</div>
                    <div className="flex justify-center">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass}`}
                        />
                        <span className="text-sm">{statusText}</span>
                      </div>
                    </div>
                    <div className="text-right text-muted-foreground">
                      {fmtTime(node.latency_updated_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
