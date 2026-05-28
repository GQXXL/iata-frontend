import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { Switch } from "@workspace/ui/components/switch";
import { ConfirmButton } from "@workspace/ui/composed/confirm-button";
import { ProTable } from "@workspace/ui/composed/pro-table/pro-table";
import {
  getUserSubscribeDevices,
  kickOfflineByUserDevice,
} from "@workspace/ui/services/admin/user";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { IpLink } from "@/components/ip-link";
import { formatDate } from "@/utils/common";

function mapIPhoneModel(code: string): string {
  const m: Record<string, string> = {
    "iPhone1,1": "iPhone",
    "iPhone1,2": "iPhone 3G",
    "iPhone2,1": "iPhone 3GS",
    "iPhone3,1": "iPhone 4",
    "iPhone3,2": "iPhone 4",
    "iPhone3,3": "iPhone 4",
    "iPhone4,1": "iPhone 4S",
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
    "iPhone8,4": "iPhone SE",
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
    "iPhone12,8": "iPhone SE (2nd generation)",
    "iPhone13,1": "iPhone 12 mini",
    "iPhone13,2": "iPhone 12",
    "iPhone13,3": "iPhone 12 Pro",
    "iPhone13,4": "iPhone 12 Pro Max",
    "iPhone14,2": "iPhone 13 Pro",
    "iPhone14,3": "iPhone 13 Pro Max",
    "iPhone14,4": "iPhone 13 mini",
    "iPhone14,5": "iPhone 13",
    "iPhone14,6": "iPhone SE (3rd generation)",
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
    "iPhone17,5": "iPhone 16e",
    "iPhone18,1": "iPhone 17 Pro",
    "iPhone18,2": "iPhone 17 Pro Max",
    "iPhone18,3": "iPhone 17",
    "iPhone18,4": "iPhone Air",
  };
  return m[code] || code.replace(",", " ");
}

function mapIPadModel(code: string): string {
  const m: Record<string, string> = {
    "iPad1,1": "iPad",
    "iPad2,1": "iPad 2",
    "iPad2,2": "iPad 2",
    "iPad2,3": "iPad 2",
    "iPad2,4": "iPad 2",
    "iPad2,5": "iPad mini",
    "iPad2,6": "iPad mini",
    "iPad2,7": "iPad mini",
    "iPad3,1": "iPad (3rd generation)",
    "iPad3,2": "iPad (3rd generation)",
    "iPad3,3": "iPad (3rd generation)",
    "iPad3,4": "iPad (4th generation)",
    "iPad3,5": "iPad (4th generation)",
    "iPad3,6": "iPad (4th generation)",
    "iPad4,1": "iPad Air",
    "iPad4,2": "iPad Air",
    "iPad4,3": "iPad Air",
    "iPad4,4": "iPad mini 2",
    "iPad4,5": "iPad mini 2",
    "iPad4,6": "iPad mini 2",
    "iPad4,7": "iPad mini 3",
    "iPad4,8": "iPad mini 3",
    "iPad4,9": "iPad mini 3",
    "iPad5,1": "iPad mini 4",
    "iPad5,2": "iPad mini 4",
    "iPad5,3": "iPad Air 2",
    "iPad5,4": "iPad Air 2",
    "iPad6,3": "iPad Pro (9.7-inch)",
    "iPad6,4": "iPad Pro (9.7-inch)",
    "iPad6,7": "iPad Pro (12.9-inch)",
    "iPad6,8": "iPad Pro (12.9-inch)",
    "iPad6,11": "iPad (5th generation)",
    "iPad6,12": "iPad (5th generation)",
    "iPad7,1": "iPad Pro (12.9-inch, 2nd generation)",
    "iPad7,2": "iPad Pro (12.9-inch, 2nd generation)",
    "iPad7,3": "iPad Pro (10.5-inch)",
    "iPad7,4": "iPad Pro (10.5-inch)",
    "iPad7,5": "iPad (6th generation)",
    "iPad7,6": "iPad (6th generation)",
    "iPad7,11": "iPad (7th generation)",
    "iPad7,12": "iPad (7th generation)",
    "iPad8,1": "iPad Pro (11-inch)",
    "iPad8,2": "iPad Pro (11-inch)",
    "iPad8,3": "iPad Pro (11-inch)",
    "iPad8,4": "iPad Pro (11-inch)",
    "iPad8,5": "iPad Pro (12.9-inch, 3rd generation)",
    "iPad8,6": "iPad Pro (12.9-inch, 3rd generation)",
    "iPad8,7": "iPad Pro (12.9-inch, 3rd generation)",
    "iPad8,8": "iPad Pro (12.9-inch, 3rd generation)",
    "iPad8,9": "iPad Pro (11-inch, 2nd generation)",
    "iPad8,10": "iPad Pro (11-inch, 2nd generation)",
    "iPad8,11": "iPad Pro (12.9-inch, 4th generation)",
    "iPad8,12": "iPad Pro (12.9-inch, 4th generation)",
    "iPad11,1": "iPad mini (5th generation)",
    "iPad11,2": "iPad mini (5th generation)",
    "iPad11,3": "iPad Air (3rd generation)",
    "iPad11,4": "iPad Air (3rd generation)",
    "iPad11,6": "iPad (8th generation)",
    "iPad11,7": "iPad (8th generation)",
    "iPad12,1": "iPad (9th generation)",
    "iPad12,2": "iPad (9th generation)",
    "iPad13,1": "iPad Air (4th generation)",
    "iPad13,2": "iPad Air (4th generation)",
    "iPad13,4": "iPad Pro (11-inch, 3rd generation)",
    "iPad13,5": "iPad Pro (11-inch, 3rd generation)",
    "iPad13,6": "iPad Pro (11-inch, 3rd generation)",
    "iPad13,7": "iPad Pro (11-inch, 3rd generation)",
    "iPad13,8": "iPad Pro (12.9-inch, 5th generation)",
    "iPad13,9": "iPad Pro (12.9-inch, 5th generation)",
    "iPad13,10": "iPad Pro (12.9-inch, 5th generation)",
    "iPad13,11": "iPad Pro (12.9-inch, 5th generation)",
    "iPad13,16": "iPad Air (5th generation)",
    "iPad13,17": "iPad Air (5th generation)",
    "iPad13,18": "iPad (10th generation)",
    "iPad13,19": "iPad (10th generation)",
    "iPad14,1": "iPad mini (6th generation)",
    "iPad14,2": "iPad mini (6th generation)",
    "iPad14,3": "iPad Pro (11-inch, 4th generation)",
    "iPad14,4": "iPad Pro (11-inch, 4th generation)",
    "iPad14,5": "iPad Pro (12.9-inch, 6th generation)",
    "iPad14,6": "iPad Pro (12.9-inch, 6th generation)",
    "iPad14,8": "iPad Air 11-inch (M2)",
    "iPad14,9": "iPad Air 11-inch (M2)",
    "iPad14,10": "iPad Air 13-inch (M2)",
    "iPad14,11": "iPad Air 13-inch (M2)",
    "iPad15,3": "iPad Air 11-inch (M3)",
    "iPad15,4": "iPad Air 11-inch (M3)",
    "iPad15,5": "iPad Air 13-inch (M3)",
    "iPad15,6": "iPad Air 13-inch (M3)",
    "iPad15,7": "iPad (A16)",
    "iPad15,8": "iPad (A16)",
    "iPad16,1": "iPad mini (A17 Pro)",
    "iPad16,2": "iPad mini (A17 Pro)",
    "iPad16,3": "iPad Pro 11-inch (M4)",
    "iPad16,4": "iPad Pro 11-inch (M4)",
    "iPad16,5": "iPad Pro 13-inch (M4)",
    "iPad16,6": "iPad Pro 13-inch (M4)",
  };
  return m[code] || code.replace(",", " ");
}

function mapAppleTVModel(code: string): string {
  const m: Record<string, string> = {
    "AppleTV2,1": "Apple TV (2nd generation)",
    "AppleTV3,1": "Apple TV (3rd generation)",
    "AppleTV3,2": "Apple TV (3rd generation Rev A)",
    "AppleTV5,3": "Apple TV HD",
    "AppleTV6,2": "Apple TV 4K (1st generation)",
    "AppleTV11,1": "Apple TV 4K (2nd generation)",
    "AppleTV14,1": "Apple TV 4K (3rd generation)",
  };
  return m[code] || code.replace("AppleTV", "Apple TV ").replace(",", " ");
}

function mapAppleDeviceModel(code: string): string {
  if (/^iPhone\d+,\d+$/i.test(code)) return mapIPhoneModel(code);
  if (/^iPad\d+,\d+$/i.test(code)) return mapIPadModel(code);
  if (/^AppleTV\d+,\d+$/i.test(code)) return mapAppleTVModel(code);
  return code;
}

function parseDeviceModel(userAgent?: string): string {
  if (!userAgent) return "未知设备";

  const ua = userAgent.trim();

  const iosMatch = ua.match(
    /\b(iPhone\d+,\d+|iPad\d+,\d+|iPod\d+,\d+|AppleTV\d+,\d+)\b/i
  );
  if (iosMatch?.[1]) return mapAppleDeviceModel(iosMatch[1]);

  const androidMatch = ua.match(/;\s*([^;/]{2,60}?)\s+Build\//i);
  if (androidMatch?.[1]) return androidMatch[1].trim();

  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/AppleTV|Apple TV|\uF8FF TV/i.test(ua)) return "Apple TV";

  return "未知设备";
}

function displayIdentifier(row: API.UserDevice): string {
  const id = (row.identifier || "").trim();
  const appleIdentifier = id.match(/^(iPhone|iPad|AppleTV)\d+,\d+$/i)?.[0];
  if (appleIdentifier) return mapAppleDeviceModel(appleIdentifier);
  if (id && !id.startsWith("sub_")) return id;
  return parseDeviceModel(row.user_agent);
}

export function SubscriptionDetail({
  trigger,
  userId,
  subscriptionId,
}: {
  trigger: ReactNode;
  userId: number;
  subscriptionId: number;
}) {
  const { t } = useTranslation("user");
  const [open, setOpen] = useState(false);

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        className="w-[700px] max-w-full md:max-w-screen-md"
        side="right"
      >
        <SheetHeader>
          <SheetTitle>{t("onlineDevices", "Online Devices")}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 max-h-[calc(100dvh-120px)] overflow-y-auto">
          <ProTable<API.UserDevice, Record<string, unknown>>
            actions={{
              render: (row) => {
                if (!row.identifier) return [];
                return [
                  <ConfirmButton
                    cancelText={t("cancel", "Cancel")}
                    confirmText={t("confirm", "Confirm")}
                    description={t(
                      "kickOfflineConfirm",
                      `Kick device ${row.ip} offline?`
                    )}
                    key="offline"
                    onConfirm={async () => {
                      await kickOfflineByUserDevice({ id: row.id });
                      toast.success(
                        t("kickOfflineSuccess", "Device kicked offline")
                      );
                    }}
                    title={t("confirmOffline", "Confirm Offline")}
                    trigger={
                      <Button variant="destructive">
                        {t("confirmOffline", "Confirm Offline")}
                      </Button>
                    }
                  />,
                ];
              },
            }}
            columns={[
              {
                accessorKey: "enabled",
                header: t("enable", "Enable"),
                cell: ({ row }) => (
                  <Switch
                    checked={row.getValue("enabled")}
                    onChange={(checked) => {
                      console.log("Switch:", checked);
                    }}
                  />
                ),
              },
              { accessorKey: "id", header: "ID" },
              {
                accessorKey: "identifier",
                header: "IMEI",
                cell: ({ row }) => displayIdentifier(row.original),
              },
              {
                accessorKey: "user_agent",
                header: t("userAgent", "User Agent"),
              },
              {
                accessorKey: "ip",
                header: "IP",
                cell: ({ row }) => <IpLink ip={row.getValue("ip")} />,
              },
              {
                accessorKey: "online",
                header: t("loginStatus", "Login Status"),
                cell: ({ row }) => (
                  <Badge
                    variant={row.getValue("online") ? "default" : "destructive"}
                  >
                    {row.getValue("online")
                      ? t("online", "Online")
                      : t("offline", "Offline")}
                  </Badge>
                ),
              },
              {
                accessorKey: "updated_at",
                header: t("lastSeen", "Last Seen"),
                cell: ({ row }) => formatDate(row.getValue("updated_at")),
              },
            ]}
            request={async (pagination) => {
              const { data } = await getUserSubscribeDevices({
                user_id: userId,
                subscribe_id: subscriptionId,
                ...pagination,
              });
              return {
                list: data.data?.list || [],
                total: data.data?.total || 0,
              };
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
