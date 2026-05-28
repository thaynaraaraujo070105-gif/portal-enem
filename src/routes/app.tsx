import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <AuthGate>
      <AppShell>
        <Outlet />
      </AppShell>
    </AuthGate>
  );
}
