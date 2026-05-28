import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trophy, Target, Clock, ArrowLeft, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/simulados/$attemptId/resultado")({
  component: ResultadoPage,
});

interface Detail {
  question_id: string;
  selected_letter: string | null;
  is_correct: boolean;
  question: {
    statement: string;
    alternatives: { letter: string; text: string }[];
    correct_letter: string;
    explanation: string | null;
    subject_id: string | null;
    subjects?: { name: string; color: string | null } | null;
  };
}

function ResultadoPage() {
  const { attemptId } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [details, setDetails] = useState<Detail[]>([]);

  useEffect(() => {
    (async () => {
      const { data: att } = await supabase
        .from("exam_attempts")
        .select("*, exams(title, duration_min)")
        .eq("id", attemptId)
        .maybeSingle();
      const { data: ans } = await supabase
        .from("exam_answers")
        .select("question_id, selected_letter, is_correct, exam_questions(statement, alternatives, correct_letter, explanation, subject_id, subjects(name, color))")
        .eq("attempt_id", attemptId);
      setData(att);
      setDetails(((ans ?? []) as any[]).map((a) => ({
        question_id: a.question_id,
        selected_letter: a.selected_letter,
        is_correct: a.is_correct,
        question: a.exam_questions,
      })));
      setLoading(false);
    })();
  }, [attemptId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!data) return <div className="text-center py-20">Resultado não encontrado.</div>;

  const score = Number(data.score ?? 0);
  const durationMs = data.finished_at ? new Date(data.finished_at).getTime() - new Date(data.started_at).getTime() : 0;
  const mins = Math.floor(durationMs / 60000);

  // Desempenho por matéria
  const bySubject: Record<string, { name: string; color: string; correct: number; total: number }> = {};
  details.forEach((d) => {
    const subj = d.question.subjects;
    if (!subj) return;
    const key = subj.name;
    if (!bySubject[key]) bySubject[key] = { name: subj.name, color: subj.color || "#6366f1", correct: 0, total: 0 };
    bySubject[key].total++;
    if (d.is_correct) bySubject[key].correct++;
  });
  const subjects = Object.values(bySubject);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/app/simulados" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar para simulados
      </Link>

      <div className="bg-gradient-primary text-primary-foreground rounded-3xl p-8 shadow-glow text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-white/20 grid place-items-center mb-4">
          <Trophy className="h-8 w-8" />
        </div>
        <p className="opacity-90 text-sm">{data.exams?.title}</p>
        <h1 className="font-display font-bold text-5xl mt-2">{score.toFixed(0)}%</h1>
        <p className="mt-2 opacity-90">
          {data.correct_count} de {data.total_questions} questões corretas
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 text-sm">
          <Clock className="h-4 w-4" /> Tempo: {mins} min
        </div>
      </div>

      {subjects.length > 0 && (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-soft">
          <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Desempenho por matéria
          </h2>
          <div className="space-y-4">
            {subjects.map((s) => {
              const pct = (s.correct / s.total) * 100;
              return (
                <div key={s.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground">{s.correct}/{s.total} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full transition-all" style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-display font-bold text-lg">Revisão das questões</h2>
        {details.map((d, idx) => {
          const correctAlt = d.question.alternatives.find((a) => a.letter === d.question.correct_letter);
          const userAlt = d.question.alternatives.find((a) => a.letter === d.selected_letter);
          return (
            <div key={d.question_id} className="bg-card border border-border rounded-2xl p-5 shadow-soft">
              <div className="flex items-start gap-3">
                <span className={`h-8 w-8 rounded-xl grid place-items-center shrink-0 ${d.is_correct ? "bg-energy/15 text-energy" : "bg-destructive/15 text-destructive"}`}>
                  {d.is_correct ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Questão {idx + 1}</p>
                  <p className="mt-1 text-sm leading-relaxed">{d.question.statement}</p>
                  <div className="mt-3 space-y-1.5 text-sm">
                    <p>
                      <span className="text-muted-foreground">Sua resposta:</span>{" "}
                      <span className={d.is_correct ? "text-energy font-medium" : "text-destructive font-medium"}>
                        {d.selected_letter ? `${d.selected_letter} — ${userAlt?.text}` : "Em branco"}
                      </span>
                    </p>
                    {!d.is_correct && (
                      <p>
                        <span className="text-muted-foreground">Resposta correta:</span>{" "}
                        <span className="text-energy font-medium">{d.question.correct_letter} — {correctAlt?.text}</span>
                      </p>
                    )}
                    {d.question.explanation && (
                      <p className="mt-2 p-3 rounded-xl bg-secondary text-muted-foreground text-xs leading-relaxed">
                        💡 {d.question.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center pt-4">
        <Link to="/app/simulados">
          <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">Fazer outro simulado</Button>
        </Link>
      </div>
    </div>
  );
}
