"use client";

import { useSearch } from "@tanstack/react-router";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { ProTable } from "@workspace/ui/composed/pro-table/pro-table";
import { filterSubscribeLog } from "@workspace/ui/services/admin/log";
import { useTranslation } from "react-i18next";
import { IpLink } from "@/components/ip-link";
import { UserDetail, UserSubscribeDetail } from "@/sections/user/user-detail";
import { formatDate, getTodayDateByTimezone } from "@/utils/common";

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

export default function SubscribeLogPage() {
  const { t } = useTranslation("log");
  const sp = useSearch({ strict: false }) as Record<string, string | undefined>;

  const today = getTodayDateByTimezone("Asia/Shanghai");

  const initialFilters = {
    date: sp.date || today,
    user_id: sp.user_id ? Number(sp.user_id) : undefined,
    user_subscribe_id: sp.user_subscribe_id
      ? Number(sp.user_subscribe_id)
      : undefined,
  };
  return (
    <ProTable<API.SubscribeLog, { date?: string; user_id?: number }>
      columns={[
        {
          accessorKey: "user",
          header: t("column.user", "User"),
          cell: ({ row }) => <UserDetail id={Number(row.original.user_id)} />,
        },
        {
          accessorKey: "user_subscribe_id",
          header: t("column.subscribe", "Subscribe"),
          cell: ({ row }) => (
            <UserSubscribeDetail
              enabled
              hoverCard
              id={Number(row.original.user_subscribe_id)}
            />
          ),
        },
        {
          accessorKey: "client_ip",
          header: t("column.ip", "IP"),
          cell: ({ row }) => (
            <IpLink ip={String((row.original as any).client_ip || "")} />
          ),
        },
        {
          accessorKey: "user_agent",
          header: t("column.userAgent", "User Agent"),
          cell: ({ row }) => {
            const rawUA = String(row.original.user_agent || "");
            const parsed = extractModelName(rawUA);
            const displayUA = parsed || rawUA || "-";
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="max-w-48 cursor-help truncate">
                      {displayUA}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="wrap-break-word max-w-md">{displayUA}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          },
        },
        {
          accessorKey: "timestamp",
          header: t("column.time", "Time"),
          cell: ({ row }) => formatDate(row.original.timestamp),
        },
      ]}
      header={{ title: t("title.subscribe", "Subscribe Log") }}
      initialFilters={initialFilters}
      params={[
        { key: "date", type: "date" },
        { key: "user_id", placeholder: t("column.userId", "User ID") },
        {
          key: "user_subscribe_id",
          placeholder: t("column.subscribeId", "Subscribe ID"),
        },
      ]}
      request={async (pagination, filter) => {
        const { data } = await filterSubscribeLog({
          page: pagination.page,
          size: pagination.size,
          date: (filter as any)?.date,
          user_id: (filter as any)?.user_id,
          user_subscribe_id: (filter as any)?.user_subscribe_id,
        });
        const list = (data?.data?.list || []) as any[];
        const total = Number(data?.data?.total || list.length);
        return { list, total };
      }}
    />
  );
}
