import { createLazyFileRoute } from "@tanstack/react-router";
import NetworkActivityPage from "@/sections/log/network-activity";

export const Route = createLazyFileRoute("/dashboard/log/network-activity")({
  component: NetworkActivityPage,
});
