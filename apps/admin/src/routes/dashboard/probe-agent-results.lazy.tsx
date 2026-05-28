import { createLazyFileRoute } from "@tanstack/react-router";
import ProbeAgentResults from "@/sections/probe-agent-results";

export const Route = createLazyFileRoute("/dashboard/probe-agent-results")({
  component: ProbeAgentResults,
});
