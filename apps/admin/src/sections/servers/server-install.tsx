"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { getNodeConfig } from "@workspace/ui/services/admin/system";
import {
  type ChangeEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type Props = {
  server: API.Server;
};

export default function ServerInstall({ server }: Props) {
  const { t } = useTranslation("servers");
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");

  const nodeInstallTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const networkActivityTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { data: cfgResp } = useQuery({
    queryKey: ["getNodeConfig"],
    queryFn: async () => {
      const { data } = await getNodeConfig();
      return data.data as API.NodeConfig | undefined;
    },
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      const host = localStorage.getItem("API_HOST") ?? window.location.origin;
      setDomain(host);
    }
  }, [open]);

  const installCommand = useMemo(() => {
    const secret = cfgResp?.node_secret ?? "";
    return `wget -N https://raw.githubusercontent.com/perfect-panel/ppanel-node/master/scripts/install.sh && bash install.sh --api-host ${domain} --server-id ${server.id} --secret-key ${secret}`;
  }, [domain, server.id, cfgResp?.node_secret]);

  const networkActivityCommand = useMemo(() => {
    const secret = cfgResp?.node_secret ?? "";
    return `SERVER_ID="${server.id}" SECRET_KEY="${secret}" API_BASE="${domain}" bash <(curl -sL https://raw.githubusercontent.com/GQXXL/iata-server/Network-Activity/scripts/ppanel-network-activity-install.sh)`;
  }, [domain, server.id, cfgResp?.node_secret]);

  async function copyCommand(
    text: string,
    closeAfterCopy = false,
    sourceRef?: RefObject<HTMLTextAreaElement | null>
  ) {
    try {
      const value = String(text ?? "");
      if (!value.trim()) throw new Error("empty copy text");

      if (window.isSecureContext && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        if (navigator?.clipboard?.readText) {
          const back = await navigator.clipboard.readText();
          if (back !== value) throw new Error("clipboard verify mismatch");
        }
      } else {
        const sourceEl = sourceRef?.current;
        const ta = sourceEl ?? document.createElement("textarea");

        if (!sourceEl) {
          ta.value = value;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.top = "0";
          ta.style.left = "-9999px";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
        }

        ta.focus();
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        const ok = document.execCommand("copy");

        if (!sourceEl) {
          document.body.removeChild(ta);
        }

        if (!ok) throw new Error("execCommand copy failed");
      }

      toast.success(t("copied", "Copied"));
      if (closeAfterCopy) setOpen(false);
    } catch {
      toast.error(t("copyFailed", "Copy failed"));
    }
  }

  async function handleCopyNodeInstallAndClose() {
    await copyCommand(installCommand, true, nodeInstallTextareaRef);
  }

  async function handleCopyNetworkActivityAndClose() {
    await copyCommand(networkActivityCommand, true, networkActivityTextareaRef);
  }

  const onDomainChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setDomain(e.target.value);
    localStorage.setItem("API_HOST", e.target.value);
  }, []);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="secondary">{t("connect", "Connect")}</Button>
      </DialogTrigger>

      <DialogContent className="w-[720px] max-w-full md:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("oneClickInstall", "One-click Install")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{t("apiHost", "API Host")}</Label>
            <div className="flex items-center gap-2">
              <Input
                onChange={onDomainChange}
                placeholder={t("apiHostPlaceholder", "http(s)://example.com")}
                value={domain}
              />
            </div>
          </div>

          <div>
            <Label>{t("installCommand", "Install command")}</Label>
            <div className="flex flex-col gap-2">
              <textarea
                ref={nodeInstallTextareaRef}
                aria-label={t("installCommand", "Install command")}
                className="min-h-[88px] w-full rounded border p-2 font-mono text-sm"
                readOnly
                ref={nodeInstallTextareaRef}
                value={installCommand}
              />
              <Button
                className="self-end"
                onClick={handleCopyNodeInstallAndClose}
                size="sm"
                type="button"
              >
                {t("copyAndClose", "复制并关闭")}
              </Button>
            </div>
          </div>

          <div>
            <Label>{t("networkActivityInstall", "网络活动一键安装命令")}</Label>
            <div className="flex flex-col gap-2">
              <textarea
<<<<<<< Updated upstream
                aria-label={t("networkActivityInstall", "网络活动一键安装命令")}
                className="min-h-[88px] w-full rounded border p-2 font-mono text-sm"
                readOnly
                ref={networkActivityTextareaRef}
=======
                ref={networkActivityTextareaRef}
                aria-label={t("networkActivityInstall", "网络活动一键安装命令")}
                className="min-h-[88px] w-full rounded border p-2 font-mono text-sm"
                readOnly
>>>>>>> Stashed changes
                value={networkActivityCommand}
              />
              <Button
                className="self-end"
                onClick={handleCopyNetworkActivityAndClose}
                size="sm"
                type="button"
              >
                {t("copyAndClose", "复制并关闭")}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-2 pt-3">
          <Button onClick={() => setOpen(false)} variant="outline">
            {t("close", "Close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
