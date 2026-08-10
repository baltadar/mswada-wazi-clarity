import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/translate")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
