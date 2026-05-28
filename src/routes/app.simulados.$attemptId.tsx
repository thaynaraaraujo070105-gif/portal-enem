import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, ChevronLeft, ChevronRight, Flag, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/simulados/$attemptId")({
  component: ExamRunner,
});

interface Question {
  id: string;
  position: number;
  statement: string;
  alternatives: { letter: string; text: string }[];
  subject_id: string | null;
}

interface Attempt {
  id: string;
  exam_id: string;
  started_at: string;
  status: string;
  exams: { title: string; duration_min: number } | null;
}

function ExamRunner() {
  const { attemptId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: att } = await supabase
        .from("exam_attempts")
        .select("*, exams(title, duration_min)")
        .eq("id", attemptId)
        .maybeSingle();
      if (!att) { toast.error("Simulado não encontrado"); navigate({ to: "/app/simulados" }); return; }
      if (att.status === "completed") {
        navigate({ to: "/app/simulados/$attemptId/resultado", params: { attemptId } });
        return;
      }
      const [{ data: qs }, { data: ans }] = await Promise.all([
        supabase.from("exam_questions").select("id,position,statement,alternatives,subject_id").eq("exam_id", att.exam_id).order("position"),
        supabase.from("exam_answers").select("question_id, selected_letter").eq("attempt_id", attemptId),
      ]);
      setAttempt(att as Attempt);
      setQuestions((qs as Question[]) ?? []);
      const map: Record<string, string> = {};
      (ans ?? []).forEach((a: any) => { if (a.selected_letter) map[a.question_id] = a.selected_letter; });
      setAnswers(map);
      setLoading(false);
    })();
  }, [attemptId, user, navigate]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = useMemo(() => {
    if (!attempt) return 0;
    const end = new Date(attempt.started_at).getTime() + attempt.exams!.duration_min * 60_000;
    return Math.max(0, Math.floor((end - now) / 1000));
  }, [attempt, now]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  // Auto-finish ao zerar
  useEffect(() => {
    if (attempt && remaining === 0 && !finishing) finish(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const select = async (questionId: string, letter: string) => {
    if (!user) return;
    setAnswers((p) => ({ ...p, [questionId]: letter }));
    const { data: q } = await supabase.from("exam_questions").select("correct_letter").eq("id", questionId).single();
    const isCorrect = q?.correct_letter === letter;
    await supabase.from("exam_answers").upsert(
      { attempt_id: attemptId, question_id: questionId, user_id: user.id, selected_letter: letter, is_correct: isCorrect },
      { onConflict: "attempt_id,question_id" }
    );
  };

  const finish = async (auto = false) => {
    if (!attempt) return;
    setFinishing(true);
    const { data: ans } = await supabase.from("exam_answers").select("is_correct").eq("attempt_id", attemptId);
    const correct = (ans ?? []).filter((a: any) => a.is_correct).length;
    const total = questions.length;
    const score = total > 0 ? (correct / total) * 100 : 0;
    await supabase.from("exam_attempts").update({
      status: "completed",
      finished_at: new Date().toISOString(),
      correct_count: correct,
      total_questions: total,
      score,
    }).eq("id", attemptId);
    if (auto) toast.info("Tempo esgotado — simulado finalizado");
    else toast.success("Simulado finalizado!");
    navigate({ to: "/app/simulados/$attemptId/resultado", params: { attemptId } });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (questions.length === 0) return <div className="text-center py-20 text-muted-foreground">Este simulado não tem questões.</div>;

  const q = questions[current];
  const answeredCount = Object.keys(answers).length;
  const lowTime = remaining < 60;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{attempt?.exams?.title}</p>
          <h1 className="font-display font-bold text-2xl">Questão {current + 1} de {questions.length}</h1>
        </div>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-mono font-bold text-lg ${lowTime ? "bg-destructive/10 text-destructive animate-pulse" : "bg-primary/10 text-primary"}`}>
          <Clock className="h-5 w-5" /> {mm}:{ss}
        </div>
      </div>

      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className="h-full bg-gradient-primary transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="bg-card border border-border rounded-3xl p-6 shadow-soft">
        <p className="text-base leading-relaxed whitespace-pre-wrap">{q.statement}</p>
        <div className="mt-6 space-y-2">
          {q.alternatives.map((alt) => {
            const selected = answers[q.id] === alt.letter;
            return (
              <button
                key={alt.letter}
                onClick={() => select(q.id, alt.letter)}
                className={`w-full text-left flex items-start gap-3 p-4 rounded-2xl border-2 transition-all ${
                  selected ? "border-primary bg-primary/5 shadow-soft" : "border-border hover:border-primary/40"
                }`}
              >
                <span className={`h-8 w-8 rounded-xl grid place-items-center font-bold shrink-0 ${selected ? "bg-gradient-primary text-primary-foreground" : "bg-secondary"}`}>
                  {alt.letter}
                </span>
                <span className="pt-0.5">{alt.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <p className="text-sm text-muted-foreground">{answeredCount}/{questions.length} respondidas</p>
        {current < questions.length - 1 ? (
          <Button onClick={() => setCurrent((c) => c + 1)} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            Próxima <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={() => finish(false)} disabled={finishing} className="bg-energy text-white hover:opacity-90">
            {finishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Flag className="h-4 w-4 mr-2" />}
            Finalizar
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Mapa de questões</p>
        <div className="flex flex-wrap gap-2">
          {questions.map((qq, i) => {
            const done = !!answers[qq.id];
            const isCur = i === current;
            return (
              <button
                key={qq.id}
                onClick={() => setCurrent(i)}
                className={`h-9 w-9 rounded-lg text-sm font-medium transition-all ${
                  isCur ? "bg-gradient-primary text-primary-foreground shadow-glow" :
                  done ? "bg-energy/15 text-energy" : "bg-secondary text-muted-foreground hover:bg-secondary/70"
                }`}
              >
                {done && !isCur ? <CheckCircle2 className="h-4 w-4 mx-auto" /> : i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
