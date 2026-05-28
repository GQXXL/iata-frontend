"use client";

import { useRouter, useSearch } from "@tanstack/react-router";
import { bindOAuthCallback } from "@workspace/ui/services/user/user";
import { useEffect } from "react";

interface CertificationProps {
  platform: string;
  children: React.ReactNode;
}

export default function Certification({
  platform,
  children,
}: CertificationProps) {
  const router = useRouter();
  const searchParams = useSearch({ strict: false });

  useEffect(() => {
    const callback = searchParams as Record<string, string | undefined>;

    // Telegram OAuth 回调参数通过 tgAuthResult 传递。
    if (platform === "telegram" && !callback?.tgAuthResult) return;

    // 防重复提交：同一回调参数只提交一次
    const dedupeToken =
      platform === "telegram"
        ? callback.tgAuthResult
        : JSON.stringify(callback || {});
    const dedupeKey = `bind-oauth-callback:${platform}:${dedupeToken}`;

    if (typeof window !== "undefined") {
      if (sessionStorage.getItem(dedupeKey)) {
        router.navigate({ to: "/profile" });
        return;
      }
      sessionStorage.setItem(dedupeKey, "1");
    }

    bindOAuthCallback(
      {
        method: platform,
        callback: callback as Record<string, string>,
      },
      {
        // 修复问题本身：保持错误可见，便于定位真实异常
        skipErrorHandler: false,
      }
    )
      .then(() => {
        router.navigate({ to: "/profile" });
      })
      .catch(() => {
        router.navigate({ to: "/profile" });
      });
  }, [platform, router, searchParams]);

  return children;
}
