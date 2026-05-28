import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  BookOpenCheck,
  ClipboardList,
  PenLine,
  UserCircle2,
  LogOut,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/app", label: "Início", icon: LayoutDashboard, exact: true },
  { to: "/app/plano", label: "Plano de estudos", icon: CalendarRange },
  { to: "/app/cronograma", label: "Cronograma", icon: CalendarDays },
  { to: "/app/materias", label: "Matérias", icon: BookOpenCheck },
  { to: "/app/simulados", label: "Simulados", icon: ClipboardList },
  { to: "/app/redacao", label: "Redação", icon: PenLine },
  { to: "/app/perfil", label: "Perfil", icon: UserCircle2 },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="flex items-center gap-2 font-display font-bold">
          <span className="h-7 w-7 rounded-lg bg-gradient-primary grid place-items-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          Aprova+
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-2 rounded-md hover:bg-sidebar-accent"
          aria-label="Abrir menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 lg:top-0 left-0 z-30 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-transform",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="hidden lg:flex items-center gap-2 px-5 h-16 font-display text-lg font-bold border-b border-sidebar-border">
          <span className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </span>
          <span>
            Aprova<span className="text-primary-glow">+</span>
            <span className="ml-1 text-xs font-medium text-sidebar-foreground/60">ENEM</span>
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 mt-14 lg:mt-0">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, (item as any).exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 mb-2 text-xs text-sidebar-foreground/60 truncate">
            {user?.email}
          </div>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10">{children}</div>
      </main>
    </div>
  );
}
