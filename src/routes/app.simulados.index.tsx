import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ClipboardList, Clock, Play, History, Trophy, Loader2, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/simulados/")({
  component: SimuladosPage,
});

interface Exam {
  id: string;
  title: string;
  description: string | null;
  area: string;
  duration_min: number;
  difficulty: string;
}

interface Attempt {
  id: string;
  exam_id: string;
  started_at: string;
  finished_at: string | null;
  score: number | null;
  total_questions: number;
  correct_count: number;
  status: string;
  exams: { title: string } | null;
}

function SimuladosPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: e }, { data: a }] = await Promise.all([
        supabase.from("exams").select("*").order("created_at"),
        supabase
          .from("exam_attempts")
          .select("*, exams(title)")
          .order("started_at", { ascending: false })
          .limit(10),
      ]);
      setExams((e as Exam[]) ?? []);
      setAttempts((a as Attempt[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const inProgress = attempts.find((a) => a.status === "in_progress");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Simulados</h1>
        <p className="text-muted-foreground">Pratique com questões objetivas e acompanhe seu desempenho.</p>
      </div>

      {inProgress && (
        <div className="bg-gradient-primary text-primary-foreground rounded-3xl p-6 shadow-glow flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 grid place-items-center">
              <Play className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">Você tem um simulado em andamento</p>
              <p className="font-display font-bold text-lg">{inProgress.exams?.title}</p>
            </div>
          </div>
          <Link to="/app/simulados/$attemptId" params={{ attemptId: inProgress.id }}>
            <Button variant="secondary" className="font-medium">Continuar</Button>
          </Link>
        </div>
      )}

      <section>
        <h2 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" /> Disponíveis
        </h2>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {exams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} userId={user?.id} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> Histórico recente
        </h2>
        {attempts.filter((a) => a.status === "completed").length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
            Nenhum simulado finalizado ainda. Comece um agora!
          </div>
        ) : (
          <div className="space-y-2">
            {attempts.filter((a) => a.status === "completed").map((a) => (
              <Link
                key={a.id}
                to="/app/simulados/$attemptId/resultado"
                params={{ attemptId: a.id }}
                className="block bg-card border border-border rounded-2xl p-4 shadow-soft hover:shadow-elegant transition-shadow"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-energy/10 text-energy grid place-items-center shrink-0">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{a.exams?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.finished_at && formatDistanceToNow(new Date(a.finished_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-lg">{a.correct_count}/{a.total_questions}</p>
                    <p className="text-xs text-muted-foreground">{a.score?.toFixed(0)}%</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ExamCard({ exam, userId }: { exam: Exam; userId?: string }) {
  const [starting, setStarting] = useState(false);
  const navigate = Route.useNavigate();

  const start = async () => {
    if (!userId) return;
    setStarting(true);
    // Verifica se já há tentativa em andamento desse exame
    const { data: existing } = await supabase
      .from("exam_attempts")
      .select("id")
      .eq("user_id", userId)
      .eq("exam_id", exam.id)
      .eq("status", "in_progress")
      .maybeSingle();

    let attemptId = existing?.id;
    if (!attemptId) {
      const { count } = await supabase
        .from("exam_questions")
        .select("*", { count: "exact", head: true })
        .eq("exam_id", exam.id);
      const { data: created, error } = await supabase
        .from("exam_attempts")
        .insert({ user_id: userId, exam_id: exam.id, total_questions: count ?? 0 })
        .select("id")
        .single();
      if (error || !created) {
        setStarting(false);
        return;
      }
      attemptId = created.id;
    }
    navigate({ to: "/app/simulados/$attemptId", params: { attemptId } });
  };

  return (
    <div className="bg-gradient-card border border-border rounded-2xl p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-2xl bg-gradient-primary text-primary-foreground grid place-items-center shadow-soft shrink-0">
          <ClipboardList className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold">{exam.title}</p>
          <p className="text-sm text-muted-foreground line-clamp-2">{exam.description}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {exam.duration_min} min</span>
        <span className="px-2 py-0.5 rounded-full bg-secondary">{exam.area}</span>
      </div>
      <Button
        onClick={start}
        disabled={starting}
        className="w-full mt-4 bg-gradient-primary text-primary-foreground hover:opacity-90"
      >
        {starting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
        Iniciar simulado
      </Button>
    </div>
  );
}
