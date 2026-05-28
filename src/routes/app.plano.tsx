import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Loader2, Pencil, Plus, Trash2, Zap, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import {
  INTENSIVE_TEMPLATE, EXTENSIVE_TEMPLATE, DAYS_PT, DAYS_PT_FULL, SUBJECT_COLOR,
} from "@/lib/study-plan-template";

export const Route = createFileRoute("/app/plano")({
  head: () => ({
    meta: [
      { title: "Plano de Estudos — Aprova+ ENEM" },
      { name: "description", content: "Cronograma semanal Intensivo ou Extensivo com checklist de matérias do ENEM." },
    ],
  }),
  component: PlanoPage,
});

type PlanType = "intensivo" | "extensivo";

interface Subject { id: string; slug: string; name: string; }
interface Topic { id: string; subject_id: string; name: string; position: number; }
interface Block {
  id: string;
  plan_type: PlanType;
  day_of_week: number;
  position: number;
  subject_id: string | null;
  topic_id: string | null;
  custom_topic: string | null;
}
interface Completion { block_id: string; }

function PlanoPage() {
  const { user } = useAuth();
  const [planType, setPlanType] = useState<PlanType>("extensivo");
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [completedTopicIds, setCompletedTopicIds] = useState<Set<string>>(new Set());

  const [editing, setEditing] = useState<Block | null>(null);
  const [confirmTopic, setConfirmTopic] = useState<{ blockId: string; topicId: string; topicName: string; subjectName: string } | null>(null);

  const subjectsBySlug = useMemo(() => Object.fromEntries(subjects.map((s) => [s.slug, s])), [subjects]);
  const subjectsById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects]);
  const topicsBySubject = useMemo(() => {
    const m: Record<string, Topic[]> = {};
    for (const t of topics) (m[t.subject_id] ||= []).push(t);
    return m;
  }, [topics]);

  // Carrega tudo
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: subs }, { data: tops }, { data: prefs }, { data: utp }] = await Promise.all([
        supabase.from("subjects").select("id,slug,name").order("name"),
        supabase.from("subject_topics").select("id,subject_id,name,position").order("position"),
        supabase.from("user_preferences").select("active_plan_type").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_topic_progress").select("topic_id").eq("user_id", user.id),
      ]);
      const sList = (subs as Subject[]) ?? [];
      const tList = (tops as Topic[]) ?? [];
      setSubjects(sList);
      setTopics(tList);
      setCompletedTopicIds(new Set((utp ?? []).map((x: any) => x.topic_id)));
      const active = (prefs?.active_plan_type as PlanType) ?? "extensivo";
      setPlanType(active);
      await loadPlan(active, sList, tList);
      setLoading(false);
    })();
  }, [user]);

  const loadPlan = async (type: PlanType, sList: Subject[], tList: Topic[]) => {
    if (!user) return;
    const { data: blks } = await supabase
      .from("study_plan_blocks")
      .select("*")
      .eq("user_id", user.id)
      .eq("plan_type", type)
      .order("day_of_week").order("position");
    let blockList = (blks as Block[]) ?? [];

    // Lazy generate from template if user has no blocks for this plan_type yet
    if (blockList.length === 0) {
      const tpl = type === "intensivo" ? INTENSIVE_TEMPLATE : EXTENSIVE_TEMPLATE;
      const subBySlug = Object.fromEntries(sList.map((s) => [s.slug, s]));
      const topByKey = (subjectId: string, name: string) =>
        tList.find((t) => t.subject_id === subjectId && t.name === name);
      const rows: any[] = [];
      for (const dayStr of Object.keys(tpl)) {
        const day = Number(dayStr);
        tpl[day].forEach((b, idx) => {
          const subj = subBySlug[b.subjectSlug];
          if (!subj) return;
          const top = topByKey(subj.id, b.topicName);
          rows.push({
            user_id: user.id,
            plan_type: type,
            day_of_week: day,
            position: idx,
            subject_id: subj.id,
            topic_id: top?.id ?? null,
            custom_topic: top ? null : b.topicName,
          });
        });
      }
      if (rows.length > 0) {
        const { data: inserted } = await supabase.from("study_plan_blocks").insert(rows).select();
        blockList = (inserted as Block[]) ?? [];
      }
    }
    setBlocks(blockList);

    const ids = blockList.map((b) => b.id);
    if (ids.length > 0) {
      const { data: comps } = await supabase
        .from("study_plan_completions")
        .select("block_id")
        .eq("user_id", user.id)
        .in("block_id", ids);
      setCompletions(new Set(((comps as Completion[]) ?? []).map((c) => c.block_id)));
    } else {
      setCompletions(new Set());
    }
  };

  const switchPlan = async (next: PlanType) => {
    if (!user || next === planType) return;
    setPlanType(next);
    setLoading(true);
    await supabase.from("user_preferences").upsert({ user_id: user.id, active_plan_type: next });
    await loadPlan(next, subjects, topics);
    setLoading(false);
  };

  const toggleCompletion = async (block: Block) => {
    if (!user) return;
    const isDone = completions.has(block.id);
    const next = new Set(completions);
    if (isDone) {
      next.delete(block.id);
      setCompletions(next);
      await supabase.from("study_plan_completions").delete()
        .eq("user_id", user.id).eq("block_id", block.id);
      return;
    }
    next.add(block.id);
    setCompletions(next);
    await supabase.from("study_plan_completions").insert({ user_id: user.id, block_id: block.id });

    // Pergunta sobre marcar no checklist da matéria
    if (block.topic_id && !completedTopicIds.has(block.topic_id)) {
      const subj = block.subject_id ? subjectsById[block.subject_id] : null;
      const topic = topics.find((t) => t.id === block.topic_id);
      if (subj && topic) {
        setConfirmTopic({ blockId: block.id, topicId: topic.id, topicName: topic.name, subjectName: subj.name });
      }
    }
  };

  const confirmMarkTopic = async () => {
    if (!user || !confirmTopic) return;
    await supabase.from("user_topic_progress").insert({ user_id: user.id, topic_id: confirmTopic.topicId });
    setCompletedTopicIds((p) => new Set(p).add(confirmTopic.topicId));
    toast.success("Tópico marcado no checklist da matéria");
    setConfirmTopic(null);
  };

  const saveBlock = async (data: { subject_id: string; topic_id: string | null; custom_topic: string | null }) => {
    if (!editing) return;
    const { error } = await supabase.from("study_plan_blocks").update(data).eq("id", editing.id);
    if (error) return toast.error(error.message);
    setBlocks((p) => p.map((b) => b.id === editing.id ? { ...b, ...data } : b));
    setEditing(null);
    toast.success("Bloco atualizado");
  };

  const deleteBlock = async (id: string) => {
    setBlocks((p) => p.filter((b) => b.id !== id));
    setCompletions((prev) => { const n = new Set(prev); n.delete(id); return n; });
    await supabase.from("study_plan_blocks").delete().eq("id", id);
  };

  const addBlock = async (day: number) => {
    if (!user) return;
    const dayBlocks = blocks.filter((b) => b.day_of_week === day);
    const max = planType === "intensivo" ? 3 : 2;
    if (dayBlocks.length >= max) return toast.error(`Máximo de ${max} blocos no ${planType}`);
    const firstSubj = subjects[0];
    if (!firstSubj) return;
    const { data, error } = await supabase.from("study_plan_blocks").insert({
      user_id: user.id, plan_type: planType, day_of_week: day, position: dayBlocks.length,
      subject_id: firstSubj.id, topic_id: null, custom_topic: "Novo bloco",
    }).select().single();
    if (error) return toast.error(error.message);
    setBlocks((p) => [...p, data as Block]);
  };

  const total = blocks.length;
  const done = blocks.filter((b) => completions.has(b.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  // Renderização: Seg(1) -> Sáb(6) + Dom(0) ao final
  const orderedDays = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Plano de Estudos</h1>
          <p className="text-muted-foreground">Cronograma semanal guiado para o ENEM.</p>
        </div>
        <div className="flex items-center gap-2 p-1 rounded-xl bg-muted">
          <button
            onClick={() => switchPlan("intensivo")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              planType === "intensivo" ? "bg-gradient-primary text-primary-foreground shadow-elegant" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="h-4 w-4" /> Intensivo
          </button>
          <button
            onClick={() => switchPlan("extensivo")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              planType === "extensivo" ? "bg-gradient-primary text-primary-foreground shadow-elegant" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarRange className="h-4 w-4" /> Extensivo
          </button>
        </div>
      </div>

      {/* Progresso semanal */}
      <div className="bg-gradient-card border border-border rounded-2xl p-5 shadow-soft">
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold">Progresso da semana — {planType === "intensivo" ? "Intensivo (3/dia)" : "Extensivo (2/dia)"}</p>
          <p className="text-sm text-muted-foreground">{done}/{total} concluídos · {pct}%</p>
        </div>
        <Progress value={pct} className="h-3" />
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin inline mr-2" /> Carregando seu plano...
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {orderedDays.map((day) => {
            const dayBlocks = blocks.filter((b) => b.day_of_week === day).sort((a, b) => a.position - b.position);
            const isFolga = day === 0;
            return (
              <div key={day} className={`rounded-2xl border p-3 min-h-44 ${isFolga ? "bg-muted/30 border-dashed" : "bg-card border-border"}`}>
                <div className="flex items-baseline justify-between mb-3">
                  <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">{DAYS_PT[day]}</p>
                  <p className="text-sm font-display font-bold">{DAYS_PT_FULL[day].slice(0, 3)}</p>
                </div>
                {isFolga ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    🌿 Folga<br /><span className="text-xs">Descanse!</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayBlocks.map((b) => {
                      const subj = b.subject_id ? subjectsById[b.subject_id] : null;
                      const topic = b.topic_id ? topics.find((t) => t.id === b.topic_id) : null;
                      const topicName = topic?.name ?? b.custom_topic ?? "—";
                      const isDone = completions.has(b.id);
                      const grad = SUBJECT_COLOR[subj?.slug ?? ""] ?? "from-slate-500 to-slate-600";
                      return (
                        <div
                          key={b.id}
                          className={`group relative rounded-xl p-3 border transition-all ${
                            isDone ? "bg-success/10 border-success/40" : "bg-background border-border hover:shadow-soft"
                          }`}
                        >
                          <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b ${grad}`} />
                          <p className={`text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${grad} bg-clip-text text-transparent`}>
                            {subj?.name ?? "Matéria"}
                          </p>
                          <p className={`text-sm font-medium mt-0.5 ${isDone ? "line-through text-muted-foreground" : ""}`}>
                            {topicName}
                          </p>
                          <div className="flex items-center gap-1 mt-2">
                            <Button
                              size="sm"
                              variant={isDone ? "secondary" : "default"}
                              className={`h-7 text-xs flex-1 ${!isDone ? "bg-gradient-primary text-primary-foreground hover:opacity-90" : ""}`}
                              onClick={() => toggleCompletion(b)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              {isDone ? "Feito" : "Estudei"}
                            </Button>
                            <button
                              onClick={() => setEditing(b)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                              aria-label="editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => deleteBlock(b.id)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted"
                              aria-label="remover"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {dayBlocks.length < (planType === "intensivo" ? 3 : 2) && (
                      <button
                        onClick={() => addBlock(day)}
                        className="w-full text-xs text-muted-foreground hover:text-primary border border-dashed border-border rounded-xl py-2 flex items-center justify-center gap-1 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" /> Adicionar
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Block */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar bloco de estudo</DialogTitle></DialogHeader>
          {editing && (
            <EditBlockForm
              block={editing}
              subjects={subjects}
              topicsBySubject={topicsBySubject}
              onSave={saveBlock}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm topic checklist */}
      <Dialog open={!!confirmTopic} onOpenChange={(o) => !o && setConfirmTopic(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar tópico como concluído?</DialogTitle>
            <DialogDescription>
              Deseja marcar <strong>{confirmTopic?.topicName}</strong> como estudado no checklist de <strong>{confirmTopic?.subjectName}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmTopic(null)}>Agora não</Button>
            <Button onClick={confirmMarkTopic} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              Sim, marcar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditBlockForm({
  block, subjects, topicsBySubject, onSave,
}: {
  block: Block;
  subjects: Subject[];
  topicsBySubject: Record<string, Topic[]>;
  onSave: (d: { subject_id: string; topic_id: string | null; custom_topic: string | null }) => void;
}) {
  const [subjectId, setSubjectId] = useState(block.subject_id ?? subjects[0]?.id ?? "");
  const [topicId, setTopicId] = useState<string>(block.topic_id ?? "__custom__");
  const [customTopic, setCustomTopic] = useState(block.custom_topic ?? "");
  const availableTopics = topicsBySubject[subjectId] ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topicId === "__custom__") {
      if (!customTopic.trim()) return toast.error("Informe o assunto");
      onSave({ subject_id: subjectId, topic_id: null, custom_topic: customTopic.trim() });
    } else {
      onSave({ subject_id: subjectId, topic_id: topicId, custom_topic: null });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Matéria</label>
        <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setTopicId("__custom__"); setCustomTopic(""); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Assunto</label>
        <Select value={topicId} onValueChange={setTopicId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {availableTopics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            <SelectItem value="__custom__">✏️ Personalizado…</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {topicId === "__custom__" && (
        <div>
          <label className="text-sm font-medium">Assunto personalizado</label>
          <input
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            maxLength={200}
            className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
            placeholder="Ex: Revisão de provas anteriores"
          />
        </div>
      )}
      <DialogFooter>
        <Button type="submit" className="bg-gradient-primary text-primary-foreground hover:opacity-90">Salvar</Button>
      </DialogFooter>
    </form>
  );
}
