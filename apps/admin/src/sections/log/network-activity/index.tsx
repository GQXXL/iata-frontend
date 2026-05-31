"use client";

import { useSearch } from "@tanstack/react-router";
import { ProTable } from "@workspace/ui/composed/pro-table/pro-table";
import { filterSubscribeLog } from "@workspace/ui/services/admin/log";
import { getUserNetworkActivity } from "@workspace/ui/services/admin/user";
import { useTranslation } from "react-i18next";
import { IpLink } from "@/components/ip-link";
import { UserDetail, UserSubscribeDetail } from "@/sections/user/user-detail";
import { formatDate, getTodayDateByTimezone } from "@/utils/common";

type NetworkActivityRow = {
  id: number;
  server_id?: number;
  user_id: number;
  subscribe_id?: number;
  user_subscribe_id?: number;
  client_ip?: string;
  user_agent?: string;
  timestamp: number;
  domain: string;
};

function mapIPhoneModel(code: string): string {
  const exact: Record<string, string> = {
    "iPhone1,1": "iPhone",
    "iPhone1,2": "iPhone 3G",
    "iPhone2,1": "iPhone 3GS",
    "iPhone3,1": "iPhone 4",
    "iPhone3,2": "iPhone 4",
    "iPhone3,3": "iPhone 4",
    "iPhone4,1": "iPhone 4s",
    "iPhone5,1": "iPhone 5",
    "iPhone5,2": "iPhone 5",
    "iPhone5,3": "iPhone 5c",
    "iPhone5,4": "iPhone 5c",
    "iPhone6,1": "iPhone 5s",
    "iPhone6,2": "iPhone 5s",
    "iPhone7,1": "iPhone 6 Plus",
    "iPhone7,2": "iPhone 6",
    "iPhone8,1": "iPhone 6s",
    "iPhone8,2": "iPhone 6s Plus",
    "iPhone8,4": "iPhone SE (1st Gen)",
    "iPhone9,1": "iPhone 7",
    "iPhone9,2": "iPhone 7 Plus",
    "iPhone9,3": "iPhone 7",
    "iPhone9,4": "iPhone 7 Plus",
    "iPhone10,1": "iPhone 8",
    "iPhone10,2": "iPhone 8 Plus",
    "iPhone10,3": "iPhone X",
    "iPhone10,4": "iPhone 8",
    "iPhone10,5": "iPhone 8 Plus",
    "iPhone10,6": "iPhone X",
    "iPhone11,2": "iPhone XS",
    "iPhone11,4": "iPhone XS Max",
    "iPhone11,6": "iPhone XS Max",
    "iPhone11,8": "iPhone XR",
    "iPhone12,1": "iPhone 11",
    "iPhone12,3": "iPhone 11 Pro",
    "iPhone12,5": "iPhone 11 Pro Max",
    "iPhone12,8": "iPhone SE (2nd Gen)",
    "iPhone13,1": "iPhone 12 mini",
    "iPhone13,2": "iPhone 12",
    "iPhone13,3": "iPhone 12 Pro",
    "iPhone13,4": "iPhone 12 Pro Max",
    "iPhone14,2": "iPhone 13 Pro",
    "iPhone14,3": "iPhone 13 Pro Max",
    "iPhone14,4": "iPhone 13 mini",
    "iPhone14,5": "iPhone 13",
    "iPhone14,6": "iPhone SE (3rd Gen)",
    "iPhone14,7": "iPhone 14",
    "iPhone14,8": "iPhone 14 Plus",
    "iPhone15,2": "iPhone 14 Pro",
    "iPhone15,3": "iPhone 14 Pro Max",
    "iPhone15,4": "iPhone 15",
    "iPhone15,5": "iPhone 15 Plus",
    "iPhone16,1": "iPhone 15 Pro",
    "iPhone16,2": "iPhone 15 Pro Max",
    "iPhone17,1": "iPhone 16 Pro",
    "iPhone17,2": "iPhone 16 Pro Max",
    "iPhone17,3": "iPhone 16",
    "iPhone17,4": "iPhone 16 Plus",
  };

  if (exact[code]) return exact[code];

  const m = code.match(/^iPhone(\d+),(\d+)$/);
  if (!m) return code;

  const major = Number(m[1]);
  if (major <= 2) return "iPhone 3GS or earlier";
  if (major === 3) return "iPhone 4 series";
  if (major === 4) return "iPhone 4s";
  if (major === 5) return "iPhone 5/5c series";
  if (major === 6) return "iPhone 5s";
  if (major === 7) return "iPhone 6 series";
  if (major === 8) return "iPhone 6s/SE (1st Gen) series";
  if (major === 9) return "iPhone 7 series";
  if (major === 10) return "iPhone 8/X series";
  if (major === 11) return "iPhone XS/XR series";
  if (major === 12) return "iPhone 11/SE (2nd Gen) series";
  if (major === 13) return "iPhone 12 series";
  if (major === 14) return "iPhone 13/14/SE (3rd Gen) series";
  if (major === 15) return "iPhone 14 Pro / iPhone 15 series";
  if (major === 16) return "iPhone 15 Pro series";
  if (major === 17) return "iPhone 16 series";
  return `iPhone (model ${code})`;
}

function extractModelName(ua?: string): string {
  if (!ua) return "";

  const iPhoneMatch = ua.match(/\biPhone\d+,\d+\b/);
  if (iPhoneMatch?.[0]) return mapIPhoneModel(iPhoneMatch[0]);

  const iPadMatch = ua.match(/\biPad\d+,\d+\b/);
  if (iPadMatch?.[0]) return iPadMatch[0];

  const androidMatch = ua.match(/Android[^;]*;\s*([^;)]+?)\s*(?:Build\/|\))/i);
  if (androidMatch?.[1]) return androidMatch[1].trim();

  return "";
}

function isIpAddress(value?: string): boolean {
  if (!value) return false;
  const v = value.trim();
  const ipv4 =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  const ipv6 = /^([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}$/;
  return ipv4.test(v) || ipv6.test(v);
}

export default function NetworkActivityPage() {
  const { t } = useTranslation("log");
  const sp = useSearch({ strict: false }) as Record<string, string | undefined>;

  const initialFilters = {
    user_id: sp.user_id ? Number(sp.user_id) : undefined,
    subscribe_id: sp.subscribe_id ? Number(sp.subscribe_id) : undefined,
    user_subscribe_id: sp.user_subscribe_id
      ? Number(sp.user_subscribe_id)
      : undefined,
    domain: sp.domain || undefined,
  };

  return (
    <ProTable<NetworkActivityRow, Record<string, any>>
      columns={[
        {
          accessorKey: "user_id",
          header: t("column.user", "User"),
          cell: ({ row }) => <UserDetail id={Number(row.original.user_id)} />,
        },
        {
          accessorKey: "subscribe_id",
          header: t("column.subscribe", "Subscribe"),
          cell: ({ row }) => (
            <UserSubscribeDetail
              enabled
              hoverCard
              id={Number(
                row.original.user_subscribe_id || row.original.subscribe_id || 0
              )}
            />
          ),
        },
        {
          accessorKey: "domain",
          header: t("column.destination", "Domain"),
          cell: ({ row }) => {
            const domain = String(row.original.domain || "");
            if (!domain) return "-";
            return isIpAddress(domain) ? <IpLink ip={domain} /> : domain;
          },
        },
        {
          accessorKey: "client_ip",
          header: t("column.ip", "IP"),
          cell: ({ row }) => {
            const ip = String(row.original.client_ip || "");
            return ip ? <IpLink ip={ip} /> : "-";
          },
        },
        {
          accessorKey: "user_agent",
          header: t("column.ua", "UA"),
          cell: ({ row }) => (
            <div
              className="max-w-80 truncate"
              title={row.original.user_agent || ""}
            >
              {row.original.user_agent || "-"}
            </div>
          ),
        },
        {
          accessorKey: "server_id",
          header: t("column.server", "Server"),
          cell: ({ row }) => row.original.server_id || "-",
        },
        {
          accessorKey: "timestamp",
          header: t("column.time", "Time"),
          cell: ({ row }) => formatDate(row.original.timestamp),
        },
      ]}
      header={{ title: t("title.networkActivity", "Network Activity") }}
      initialFilters={initialFilters}
      params={[
        { key: "user_id", placeholder: t("column.userId", "User ID") },
        {
          key: "subscribe_id",
          placeholder: t("column.subscribeId", "Subscribe ID"),
        },
        {
          key: "user_subscribe_id",
          placeholder: t("column.userSubscribeId", "User Subscribe ID"),
        },
        { key: "domain", placeholder: t("column.domain", "Domain") },
      ]}
      request={async (pagination, filter) => {
        const page = Number(pagination.page || 1);
        const size = Number(pagination.size || 10);
        const userId = Number((filter as any)?.user_id || 0);
        const subscribeId = Number((filter as any)?.subscribe_id || 0);
        const userSubscribeId = Number((filter as any)?.user_subscribe_id || 0);
        const domain = String((filter as any)?.domain || "");

        const resp = await getUserNetworkActivity({
          page,
          size,
          user_id: userId,
          subscribe_id: subscribeId,
          user_subscribe_id: userSubscribeId,
          domain,
        } as any);

        const list = (resp?.data?.data?.list || []) as any[];

        const uaByUserSubscribeId = new Map<number, string>();
        const needUsids = Array.from(
          new Set(
            list
              .map((x) => Number(x?.user_subscribe_id || 0))
              .filter((n) => n > 0)
          )
        );

        if (needUsids.length > 0) {
          const today = getTodayDateByTimezone("Asia/Shanghai");
          await Promise.all(
            needUsids.map(async (usid) => {
              try {
                const subLogResp = await filterSubscribeLog({
                  page: 1,
                  size: 50,
                  date: today,
                  user_subscribe_id: usid,
                } as any);
                const subList = (subLogResp as any)?.data?.data?.list || [];
                const uaCand = subList
                  .map((it: any) => String(it?.user_agent || "").trim())
                  .find((s: string) => !!s);
                if (uaCand) uaByUserSubscribeId.set(usid, uaCand);
              } catch {
                // ignore per-subscribe fetch error
              }
            })
          );
        }

        const mapped: NetworkActivityRow[] = list.map((x) => {
          const tsMs = Number(x.timestamp || 0) * 1000;
          const uid = Number(x.user_id);
          const sid = Number(x.subscribe_id || 0);
          const usid = Number(x.user_subscribe_id || 0);

          const rawUA = String(x.user_agent || "");
          const logUA = uaByUserSubscribeId.get(usid) || "";
          const ua =
            (!rawUA ||
              rawUA === "PPanel-node/journalctl" ||
              rawUA === "PPanel-node/journalctl-uuid-auto") &&
            logUA
              ? logUA
              : rawUA;
          const deviceName = extractModelName(ua || "");

          return {
            id: Number(x.id),
            server_id: Number(x.server_id || 0),
            user_id: uid,
            subscribe_id: sid,
            user_subscribe_id: usid,
            domain: x.domain || "",
            client_ip: x.client_ip || "",
            user_agent: deviceName || ua || "-",
            timestamp: tsMs,
          };
        });

        return {
          list: mapped,
          total: Number(resp?.data?.data?.total || 0),
        };
      }}
    />
  );
}
