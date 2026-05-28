import { createLazyFileRoute } from "@tanstack/react-router";
import Tutorial from "@/sections/tutorial";

export const Route = createLazyFileRoute("/dashboard/tutorial/")({
  component: Tutorial,
});
