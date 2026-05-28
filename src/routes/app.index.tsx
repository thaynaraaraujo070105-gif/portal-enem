import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Flame,
  Target,
  CheckCircle2,
  Clock,
  TrendingUp,
  CalendarDays,
  BookOpen,
  ArrowRight,
  Trophy,
} from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

interface Task {
  id: string;
  title: string;
  completed: boolean;
  duration_min: number | null;
  scheduled_date: string;
  subject_id: string | null;
}

function Dashboard() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [weekDone, setWeekDone] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile?.display_name) setName(profile.display_name);

      const today = new Date().toISOString().slice(0, 10);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().slice(0, 10);

      const { data: todayData } = await supabase
        .from("schedule_tasks")
        .select("id,title,completed,duration_min,scheduled_date,subject_id")
        .eq("scheduled_date", today)
        .order("created_at");
      setTodayTasks(todayData ?? []);

      const { data: weekData } = await supabase
        .from("schedule_tasks")
        .select("completed")
        .gte("scheduled_date", weekStartStr);
      setWeekTotal(weekData?.length ?? 0);
      setWeekDone((weekData ?? []).filter((t) => t.completed).length);
    })();
  }, [user]);

  const toggleTask = async (id: string, completed: boolean) => {
    setTodayTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t)));
    await supabase
      .from("schedule_tasks")
      .update({ completed: !completed, completed_at: !completed ? new Date().toISOString() : null })
      .eq("id", id);
  };

  const firstName = name.split(" ")[0] || "estudante";
  const weekPct = weekTotal ? Math.round((weekDone / weekTotal) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero text-white p-6 sm:p-10 shadow-elegant">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <div className="relative">
          <p className="text-white/80 text-sm">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-display font-bold">
            Olá, {firstName} 👋
          </h1>
          <p className="mt-2 text-white/85 max-w-xl">
            {todayTasks.length === 0
              ? "Nenhuma tarefa para hoje. Que tal organizar seu cronograma?"
              : `Você tem ${todayTasks.filter((t) => !t.completed).length} tarefa(s) pendente(s) hoje. Bora?`}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/app/cronograma" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-primary font-semibold hover:bg-white/90">
              <CalendarDays className="h-4 w-4" /> Ver cronograma
            </Link>
            <Link to="/app/materias" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 backdrop-blur text-white font-semibold hover:bg-white/25 border border-white/20">
              <BookOpen className="h-4 w-4" /> Estudar agora
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Flame} color="energy" label="Sequência" value="1 dia" hint="Continue assim!" />
        <StatCard icon={Target} color="primary" label="Meta semanal" value={`${weekPct}%`} hint={`${weekDone}/${weekTotal} tarefas`} />
        <StatCard icon={Clock} color="success" label="Tempo hoje" value={`${todayTasks.reduce((acc, t) => acc + (t.duration_min || 0), 0)} min`} hint="Planejado" />
        <StatCard icon={Trophy} color="primary" label="Simulados" value="0" hint="Faça o primeiro" />
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Plano de hoje */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg">Plano de hoje</h2>
            <Link to="/app/cronograma" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              Ver tudo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {todayTasks.length === 0 ? (
            <EmptyToday />
          ) : (
            <ul className="space-y-2">
              {todayTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                >
                  <button
                    onClick={() => toggleTask(t.id, t.completed)}
                    className={`h-6 w-6 rounded-full grid place-items-center border-2 transition-colors ${
                      t.completed
                        ? "bg-success border-success text-success-foreground"
                        : "border-border hover:border-primary"
                    }`}
                    aria-label="marcar"
                  >
                    {t.completed && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${t.completed ? "line-through text-muted-foreground" : ""}`}>
                      {t.title}
                    </p>
                    {t.duration_min && (
                      <p className="text-xs text-muted-foreground">{t.duration_min} min</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Sidebar cards */}
        <div className="space-y-6">
          <div className="bg-gradient-card border border-border rounded-2xl p-6 shadow-soft">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-display font-bold">Progresso semanal</h3>
            </div>
            <div className="mt-3">
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-primary transition-all" style={{ width: `${weekPct}%` }} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {weekDone} de {weekTotal} tarefas concluídas
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
            <h3 className="font-display font-bold mb-3">Último simulado</h3>
            <p className="text-sm text-muted-foreground">Você ainda não fez nenhum simulado.</p>
            <Link to="/app/simulados" className="mt-3 inline-flex text-sm text-primary hover:underline">
              Fazer agora →
            </Link>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
            <h3 className="font-display font-bold mb-3">Meta de hoje 🎯</h3>
            <p className="text-sm text-muted-foreground">Estude pelo menos 2 horas e mantenha sua sequência viva.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, color, label, value, hint,
}: { icon: any; color: "primary" | "success" | "energy"; label: string; value: string; hint: string }) {
  const colorMap = {
    primary: "bg-gradient-primary",
    success: "bg-gradient-success",
    energy: "bg-gradient-energy",
  } as const;
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className={`h-10 w-10 rounded-xl grid place-items-center text-white ${colorMap[color]} shadow-soft`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-2xl font-display font-bold">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function EmptyToday() {
  return (
    <div className="text-center py-8">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-muted grid place-items-center mb-3">
        <CalendarDays className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium">Nada planejado para hoje</p>
      <p className="text-sm text-muted-foreground mt-1">Adicione tarefas no seu cronograma para começar.</p>
      <Link to="/app/cronograma" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground font-medium hover:opacity-90">
        Ir para o cronograma <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
