import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserCircle2, Mail, BookOpenCheck, FileText, CalendarDays, Loader2, Trophy, Target } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/perfil")({
  component: PerfilPage,
});

function PerfilPage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ materials: 0, notes: 0, tasksDone: 0, examsDone: 0, bestScore: 0, avgScore: 0 });
  const [recentExams, setRecentExams] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { count: materials }, { count: notes }, { count: tasksDone }, { data: attempts }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("materials").select("*", { count: "exact", head: true }),
        supabase.from("notes").select("*", { count: "exact", head: true }),
        supabase.from("schedule_tasks").select("*", { count: "exact", head: true }).eq("completed", true),
        supabase.from("exam_attempts").select("id, score, finished_at, exams(title)").eq("status", "completed").order("finished_at", { ascending: false }),
      ]);
      setName(p?.display_name ?? "");
      const scores = (attempts ?? []).map((a: any) => Number(a.score ?? 0));
      const best = scores.length ? Math.max(...scores) : 0;
      const avg = scores.length ? scores.reduce((s, n) => s + n, 0) / scores.length : 0;
      setStats({
        materials: materials ?? 0,
        notes: notes ?? 0,
        tasksDone: tasksDone ?? 0,
        examsDone: scores.length,
        bestScore: best,
        avgScore: avg,
      });
      setRecentExams((attempts ?? []).slice(0, 5));
    })();
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: name.trim() }).eq("user_id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-primary grid place-items-center text-primary-foreground shadow-elegant">
          <UserCircle2 className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">{name || "Seu perfil"}</h1>
          <p className="text-muted-foreground inline-flex items-center gap-1.5"><Mail className="h-4 w-4" /> {user?.email}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat icon={CalendarDays} label="Tarefas concluídas" value={stats.tasksDone} />
        <Stat icon={BookOpenCheck} label="Materiais salvos" value={stats.materials} />
        <Stat icon={FileText} label="Anotações" value={stats.notes} />
        <Stat icon={Trophy} label="Simulados feitos" value={stats.examsDone} />
        <Stat icon={Target} label="Melhor nota" value={`${stats.bestScore.toFixed(0)}%`} />
        <Stat icon={Target} label="Média geral" value={`${stats.avgScore.toFixed(0)}%`} />
      </div>

      {recentExams.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
          <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Simulados recentes
          </h2>
          <div className="space-y-2">
            {recentExams.map((a) => (
              <Link
                key={a.id}
                to="/app/simulados/$attemptId/resultado"
                params={{ attemptId: a.id }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors"
              >
                <span className="font-medium truncate">{a.exams?.title}</span>
                <span className="font-display font-bold text-primary">{Number(a.score ?? 0).toFixed(0)}%</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={save} className="bg-card border border-border rounded-2xl p-6 shadow-soft space-y-4">
        <h2 className="font-display font-bold text-lg">Informações pessoais</h2>
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <Button type="submit" disabled={saving} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar alterações
        </Button>
      </form>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-soft">
      <span className="h-10 w-10 rounded-xl bg-gradient-primary text-primary-foreground grid place-items-center shadow-soft">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-2xl font-display font-bold">{value}</p>
    </div>
  );
}
