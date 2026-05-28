import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Plus, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/cronograma")({
  component: CronogramaPage,
});

interface Task {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  duration_min: number | null;
  completed: boolean;
  subject_id: string | null;
}
interface Subject { id: string; name: string; }

function startOfWeek(d = new Date()) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

function CronogramaPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const week = startOfWeek();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(week);
    d.setDate(week.getDate() + i);
    return d;
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const start = days[0].toISOString().slice(0, 10);
    const end = days[6].toISOString().slice(0, 10);
    const [{ data: t }, { data: s }] = await Promise.all([
      supabase.from("schedule_tasks").select("*").gte("scheduled_date", start).lte("scheduled_date", end).order("scheduled_date"),
      supabase.from("subjects").select("id,name").order("name"),
    ]);
    setTasks((t as Task[]) ?? []);
    setSubjects((s as Subject[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const toggle = async (t: Task) => {
    setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, completed: !t.completed } : x));
    await supabase.from("schedule_tasks").update({
      completed: !t.completed,
      completed_at: !t.completed ? new Date().toISOString() : null,
    }).eq("id", t.id);
  };

  const remove = async (id: string) => {
    setTasks((prev) => prev.filter((x) => x.id !== id));
    await supabase.from("schedule_tasks").delete().eq("id", id);
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") || "").trim();
    const date = String(fd.get("date") || "");
    const duration = parseInt(String(fd.get("duration") || "60"));
    const subject_id = String(fd.get("subject_id") || "") || null;
    if (!title || !date) return toast.error("Preencha título e data");
    setSaving(true);
    const { error } = await supabase.from("schedule_tasks").insert({
      user_id: user.id, title, scheduled_date: date, duration_min: duration, subject_id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Tarefa adicionada");
    setOpen(false);
    load();
  };

  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Cronograma</h1>
          <p className="text-muted-foreground">Sua semana de estudos organizada.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-elegant">
              <Plus className="h-4 w-4 mr-1" /> Nova tarefa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar tarefa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input id="title" name="title" required maxLength={200} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="date">Data</Label>
                  <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0,10)} />
                </div>
                <div>
                  <Label htmlFor="duration">Duração (min)</Label>
                  <Input id="duration" name="duration" type="number" min={5} max={600} defaultValue={60} />
                </div>
              </div>
              <div>
                <Label>Matéria (opcional)</Label>
                <Select name="subject_id">
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Adicionar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Progresso */}
      <div className="bg-gradient-card border border-border rounded-2xl p-5 shadow-soft">
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold">Progresso da semana</p>
          <p className="text-sm text-muted-foreground">{done}/{total} concluídas</p>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-success transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {days.map((d) => {
            const key = d.toISOString().slice(0, 10);
            const dayTasks = tasks.filter((t) => t.scheduled_date === key);
            const isToday = key === new Date().toISOString().slice(0, 10);
            return (
              <div key={key} className={`rounded-2xl border p-3 min-h-40 ${isToday ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                <div className="flex items-baseline justify-between mb-2">
                  <p className={`text-xs uppercase font-semibold tracking-wider ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {d.toLocaleDateString("pt-BR", { weekday: "short" })}
                  </p>
                  <p className="text-sm font-display font-bold">{d.getDate()}</p>
                </div>
                {dayTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">—</p>
                ) : (
                  <ul className="space-y-1.5">
                    {dayTasks.map((t) => (
                      <li key={t.id} className="group flex items-start gap-2 p-2 rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <button
                          onClick={() => toggle(t)}
                          className={`mt-0.5 h-4 w-4 rounded-full grid place-items-center border-2 shrink-0 ${
                            t.completed ? "bg-success border-success" : "border-border hover:border-primary"
                          }`}
                        >
                          {t.completed && <CheckCircle2 className="h-3 w-3 text-success-foreground" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${t.completed ? "line-through text-muted-foreground" : ""}`}>
                            {t.title}
                          </p>
                          {t.duration_min && <p className="text-[10px] text-muted-foreground">{t.duration_min}min</p>}
                        </div>
                        <button
                          onClick={() => remove(t.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          aria-label="remover"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
