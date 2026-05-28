import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

function LegacyLatencyMonitorRedirect() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace("/dashboard/probe-agent-results");
    }
  }, []);

  return null;
}

export const Route = createLazyFileRoute("/dashboard/node-latency-monitor")({
  component: LegacyLatencyMonitorRedirect,
});
