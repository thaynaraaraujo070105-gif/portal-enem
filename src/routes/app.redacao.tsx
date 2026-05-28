import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  PenLine,
  Sparkles,
  FileText,
  Trash2,
  CheckCircle2,
  Circle,
  Save,
  ArrowLeft,
  Calendar,
  BookOpen,
  Wand2,
  Award,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/redacao")({
  component: RedacaoPage,
});

type Theme = {
  id: string;
  title: string;
  description: string | null;
  motivating_texts: string | null;
  year: number | null;
  source: string | null;
  area: string;
};

type Essay = {
  id: string;
  user_id: string;
  theme_id: string | null;
  custom_theme: string | null;
  title: string;
  content: string;
  word_count: number;
  status: string;
  c1_check: boolean;
  c2_check: boolean;
  c3_check: boolean;
  c4_check: boolean;
  c5_check: boolean;
  c1_score: number | null;
  c2_score: number | null;
  c3_score: number | null;
  c4_score: number | null;
  c5_score: number | null;
  total_score: number | null;
  c1_feedback: string | null;
  c2_feedback: string | null;
  c3_feedback: string | null;
  c4_feedback: string | null;
  c5_feedback: string | null;
  general_feedback: string | null;
  corrected_at: string | null;
  created_at: string;
  updated_at: string;
};

const CRITERIA = [
  { key: "c1_check", scoreKey: "c1_score", fbKey: "c1_feedback", label: "C1 — Norma culta", desc: "Gramática, ortografia, concordância e pontuação." },
  { key: "c2_check", scoreKey: "c2_score", fbKey: "c2_feedback", label: "C2 — Compreensão do tema", desc: "Texto dissertativo-argumentativo dentro do tema." },
  { key: "c3_check", scoreKey: "c3_score", fbKey: "c3_feedback", label: "C3 — Argumentação", desc: "Organização de ideias em defesa de um ponto de vista." },
  { key: "c4_check", scoreKey: "c4_score", fbKey: "c4_feedback", label: "C4 — Coesão", desc: "Conectivos e articulação entre parágrafos." },
  { key: "c5_check", scoreKey: "c5_score", fbKey: "c5_feedback", label: "C5 — Proposta de intervenção", desc: "Agente, ação, modo, finalidade e detalhamento." },
] as const;

function countWords(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function scoreColor(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 160) return "text-success";
  if (score >= 80) return "text-energy";
  return "text-destructive";
}

function RedacaoPage() {
  const { user } = useAuth();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [essays, setEssays] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Essay | null>(null);
  const [saving, setSaving] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [tRes, eRes] = await Promise.all([
        supabase.from("essay_themes").select("*").order("year", { ascending: false }),
        supabase.from("essays").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
      ]);
      if (tRes.data) setThemes(tRes.data as Theme[]);
      if (eRes.data) setEssays(eRes.data as Essay[]);
      setLoading(false);
    })();
  }, [user]);

  const activeTheme = useMemo(
    () => (active?.theme_id ? themes.find((t) => t.id === active.theme_id) : null),
    [active, themes],
  );

  const startEssay = async (theme: Theme | null) => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      theme_id: theme?.id ?? null,
      title: theme ? theme.title : "Tema livre",
      content: "",
      word_count: 0,
      status: "rascunho",
    };
    const { data, error } = await supabase.from("essays").insert(payload).select().single();
    if (error || !data) {
      toast.error("Erro ao criar redação");
      return;
    }
    setEssays((prev) => [data as Essay, ...prev]);
    setActive(data as Essay);
  };

  const scheduleSave = (next: Essay) => {
    setActive(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(next), 800);
  };

  const persist = async (essay: Essay) => {
    setSaving(true);
    const { error } = await supabase
      .from("essays")
      .update({
        title: essay.title,
        content: essay.content,
        word_count: essay.word_count,
        status: essay.status,
        c1_check: essay.c1_check,
        c2_check: essay.c2_check,
        c3_check: essay.c3_check,
        c4_check: essay.c4_check,
        c5_check: essay.c5_check,
      })
      .eq("id", essay.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar");
      return;
    }
    setEssays((prev) => prev.map((e) => (e.id === essay.id ? essay : e)));
  };

  const finalize = async () => {
    if (!active) return;
    const next = { ...active, status: "finalizada" };
    await persist(next);
    setActive(next);
    toast.success("Redação finalizada!");
  };

  const correctWithAI = async () => {
    if (!active) return;
    if (active.word_count < 50) {
      toast.error("Escreva mais antes de pedir correção (mín. 50 palavras).");
      return;
    }
    setCorrecting(true);
    // garante que está salvo antes
    await persist(active);

    const { data, error } = await supabase.functions.invoke("correct-essay", {
      body: { essayId: active.id },
    });
    setCorrecting(false);

    if (error) {
      const msg = (error as any)?.context?.body
        ? (() => { try { return JSON.parse((error as any).context.body).error; } catch { return null; } })()
        : null;
      toast.error(msg || "Erro ao corrigir redação");
      return;
    }
    if (data?.essay) {
      setActive(data.essay as Essay);
      setEssays((prev) => prev.map((e) => (e.id === data.essay.id ? data.essay : e)));
      toast.success(`Correção pronta! Nota total: ${data.essay.total_score}/1000`);
    }
  };

  const removeEssay = async (id: string) => {
    if (!confirm("Excluir esta redação?")) return;
    const { error } = await supabase.from("essays").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    setEssays((prev) => prev.filter((e) => e.id !== id));
    if (active?.id === id) setActive(null);
    toast.success("Redação excluída");
  };

  // ====== EDITOR ======
  if (active) {
    const wc = active.word_count;
    const wcColor =
      wc < 100 ? "text-muted-foreground" : wc < 300 ? "text-energy" : wc <= 450 ? "text-success" : "text-destructive";
    const checkedCount = CRITERIA.filter((c) => active[c.key as keyof Essay]).length;
    const hasCorrection = active.corrected_at !== null && active.total_score !== null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button variant="ghost" onClick={() => setActive(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {saving ? (
              <span className="flex items-center gap-1.5"><Save className="h-3.5 w-3.5 animate-pulse" /> Salvando…</span>
            ) : (
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Salvo</span>
            )}
            {active.status === "corrigida" && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">Corrigida</span>
            )}
            {active.status === "finalizada" && (
              <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">Finalizada</span>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-4">
            {activeTheme && (
              <div className="bg-gradient-card border border-border rounded-2xl p-5 shadow-soft">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <BookOpen className="h-3.5 w-3.5" /> Tema · {activeTheme.area}
                  {activeTheme.year && <span>· {activeTheme.year}</span>}
                </div>
                <h2 className="font-display font-bold text-lg">{activeTheme.title}</h2>
                {activeTheme.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{activeTheme.description}</p>
                )}
                {activeTheme.motivating_texts && (
                  <details className="mt-3">
                    <summary className="text-sm font-medium cursor-pointer text-primary">Textos motivadores</summary>
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-foreground/80 font-sans">
                      {activeTheme.motivating_texts}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <Input
              value={active.title}
              onChange={(e) => scheduleSave({ ...active, title: e.target.value })}
              className="text-lg font-display font-bold h-12"
              placeholder="Título da redação"
            />

            <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
              <Textarea
                value={active.content}
                onChange={(e) => {
                  const content = e.target.value;
                  scheduleSave({ ...active, content, word_count: countWords(content) });
                }}
                placeholder="Comece a escrever sua redação aqui... O ENEM espera entre 7 e 30 linhas (aprox. 250–450 palavras)."
                className="min-h-[480px] border-0 rounded-none resize-y text-base leading-relaxed focus-visible:ring-0"
              />
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/30 text-sm">
                <span className={cn("font-medium", wcColor)}>{wc} palavras</span>
                <span className="text-muted-foreground text-xs">Recomendado: 250 a 450</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 flex-wrap">
              <Button variant="outline" onClick={() => persist(active)}>
                <Save className="h-4 w-4" /> Salvar
              </Button>
              {active.status !== "finalizada" && active.status !== "corrigida" && (
                <Button variant="outline" onClick={finalize}>
                  <CheckCircle2 className="h-4 w-4" /> Finalizar
                </Button>
              )}
              <Button
                onClick={correctWithAI}
                disabled={correcting}
                className="bg-gradient-primary text-primary-foreground"
              >
                {correcting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Corrigindo com IA…</>
                ) : (
                  <><Wand2 className="h-4 w-4" /> {hasCorrection ? "Corrigir novamente" : "Corrigir com IA"}</>
                )}
              </Button>
            </div>

            {/* Resultado da correção */}
            {hasCorrection && (
              <div className="space-y-4">
                <div className="bg-gradient-primary text-primary-foreground rounded-2xl p-6 shadow-elegant">
                  <div className="flex items-center gap-3">
                    <Award className="h-10 w-10" />
                    <div>
                      <p className="text-sm opacity-90">Nota total estimada (IA)</p>
                      <p className="font-display font-bold text-4xl">{active.total_score}<span className="text-2xl opacity-80">/1000</span></p>
                    </div>
                  </div>
                  {active.corrected_at && (
                    <p className="mt-2 text-xs opacity-75">
                      Corrigida em {new Date(active.corrected_at).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>

                {active.general_feedback && (
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-soft">
                    <h3 className="font-display font-bold mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-energy" /> Comentário geral
                    </h3>
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {active.general_feedback}
                    </p>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  {CRITERIA.map((c) => {
                    const score = active[c.scoreKey as keyof Essay] as number | null;
                    const fb = active[c.fbKey as keyof Essay] as string | null;
                    return (
                      <div key={c.scoreKey} className="bg-card border border-border rounded-2xl p-4 shadow-soft">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold">{c.label}</p>
                          <span className={cn("font-display font-bold text-lg", scoreColor(score))}>
                            {score ?? "—"}<span className="text-xs text-muted-foreground">/200</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-gradient-primary transition-all"
                            style={{ width: `${((score ?? 0) / 200) * 100}%` }}
                          />
                        </div>
                        {fb && <p className="text-xs text-muted-foreground leading-relaxed">{fb}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Checklist lateral */}
          <aside className="space-y-3">
            <div className="bg-gradient-card border border-border rounded-2xl p-5 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold">Checklist ENEM</h3>
                <span className="text-xs font-medium text-muted-foreground">{checkedCount}/5</span>
              </div>
              <div className="space-y-2">
                {CRITERIA.map((c) => {
                  const checked = active[c.key as keyof Essay] as boolean;
                  return (
                    <button
                      key={c.key}
                      onClick={() => scheduleSave({ ...active, [c.key]: !checked } as Essay)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all",
                        checked
                          ? "bg-success/10 border-success/30"
                          : "bg-background border-border hover:border-primary/40",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {checked ? (
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="text-sm font-semibold">{c.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // ====== LISTAGEM ======
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Redação</h1>
          <p className="text-muted-foreground">Escolha um tema, escreva e receba correção por IA com nota e feedback.</p>
        </div>
        <Button onClick={() => startEssay(null)} variant="outline" className="gap-2">
          <PenLine className="h-4 w-4" /> Tema livre
        </Button>
      </div>

      {/* Histórico */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="font-display font-bold text-xl">Minhas redações</h2>
          <span className="text-sm text-muted-foreground">({essays.length})</span>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : essays.length === 0 ? (
          <div className="bg-gradient-card border border-dashed border-border rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">Você ainda não começou nenhuma redação. Escolha um tema abaixo!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {essays.map((e) => (
              <div
                key={e.id}
                className="group bg-card border border-border rounded-2xl p-4 shadow-soft hover:shadow-elegant transition-all"
              >
                <button onClick={() => setActive(e)} className="text-left w-full">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        e.status === "corrigida"
                          ? "bg-primary/10 text-primary"
                          : e.status === "finalizada"
                            ? "bg-success/10 text-success"
                            : "bg-energy/10 text-energy",
                      )}
                    >
                      {e.status === "corrigida" ? "Corrigida" : e.status === "finalizada" ? "Finalizada" : "Rascunho"}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(e.updated_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <h3 className="font-display font-bold line-clamp-2">{e.title}</h3>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-sm text-muted-foreground">{e.word_count} palavras</p>
                    {e.total_score !== null && (
                      <span className={cn("text-sm font-display font-bold", scoreColor(e.total_score))}>
                        {e.total_score}/1000
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => removeEssay(e.id)}
                  className="mt-3 inline-flex items-center gap-1 text-xs text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" /> Excluir
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Temas */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-energy" />
          <h2 className="font-display font-bold text-xl">Temas disponíveis</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {themes.map((t) => (
            <div
              key={t.id}
              className="bg-gradient-card border border-border rounded-2xl p-5 shadow-soft hover:shadow-elegant transition-all flex flex-col"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{t.area}</span>
                {t.year && <span>· {t.year}</span>}
                {t.source && <span>· {t.source}</span>}
              </div>
              <h3 className="font-display font-bold text-lg leading-tight">{t.title}</h3>
              {t.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3 flex-1">{t.description}</p>
              )}
              <Button
                onClick={() => startEssay(t)}
                className="mt-4 bg-gradient-primary text-primary-foreground self-start"
              >
                <PenLine className="h-4 w-4" /> Escrever sobre este tema
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
