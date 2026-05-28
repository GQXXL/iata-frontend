import { createLazyFileRoute } from "@tanstack/react-router";
import ServerStatus from "@/sections/user/server-status";

export const Route = createLazyFileRoute("/(main)/(user)/server-status")({
  component: ServerStatus,
});
