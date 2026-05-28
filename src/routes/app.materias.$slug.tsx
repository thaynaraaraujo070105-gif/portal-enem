import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import * as Icons from "lucide-react";
import { ArrowLeft, Plus, FileText, Link as LinkIcon, Video, Map, Lightbulb, Trash2, Loader2, ExternalLink, Sparkles, ListChecks } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/app/materias/$slug")({
  component: SubjectPage,
});

interface Subject {
  id: string; slug: string; name: string; area: string; description: string | null;
  top_topics: string[] | null; icon: string | null; color: string | null;
}
interface Material {
  id: string; title: string; type: string; topic: string | null; description: string | null;
  url: string | null; created_at: string;
}
interface Note {
  id: string; title: string; content: string; updated_at: string;
}
interface Topic { id: string; name: string; position: number; }

const typeIcons: Record<string, any> = {
  pdf: FileText, link: LinkIcon, video: Video, resumo: FileText, mapa_mental: Map, outro: Lightbulb,
};
const typeLabels: Record<string, string> = {
  pdf: "PDF", link: "Link", video: "Vídeo", resumo: "Resumo", mapa_mental: "Mapa mental", outro: "Outro",
};

function SubjectPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [doneTopics, setDoneTopics] = useState<Set<string>>(new Set());
  const [openMat, setOpenMat] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("subjects").select("*").eq("slug", slug).maybeSingle();
      setSubject(s as Subject);
      if (!s) return;
      const [{ data: m }, { data: n }, { data: tps }] = await Promise.all([
        supabase.from("materials").select("*").eq("subject_id", s.id).order("created_at", { ascending: false }),
        supabase.from("notes").select("*").eq("subject_id", s.id).order("updated_at", { ascending: false }),
        supabase.from("subject_topics").select("id,name,position").eq("subject_id", s.id).order("position"),
      ]);
      setMaterials((m as Material[]) ?? []);
      setNotes((n as Note[]) ?? []);
      const topicList = (tps as Topic[]) ?? [];
      setTopics(topicList);
      if (user && topicList.length > 0) {
        const { data: prog } = await supabase
          .from("user_topic_progress")
          .select("topic_id")
          .eq("user_id", user.id)
          .in("topic_id", topicList.map((t) => t.id));
        setDoneTopics(new Set((prog ?? []).map((x: any) => x.topic_id)));
      }
    })();
  }, [slug, user]);

  const toggleTopic = async (topicId: string) => {
    if (!user) return;
    const isDone = doneTopics.has(topicId);
    const next = new Set(doneTopics);
    if (isDone) {
      next.delete(topicId);
      setDoneTopics(next);
      await supabase.from("user_topic_progress").delete()
        .eq("user_id", user.id).eq("topic_id", topicId);
    } else {
      next.add(topicId);
      setDoneTopics(next);
      await supabase.from("user_topic_progress").insert({ user_id: user.id, topic_id: topicId });
    }
  };

  const addMaterial = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !subject) return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      user_id: user.id,
      subject_id: subject.id,
      title: String(fd.get("title") || "").trim(),
      type: String(fd.get("type") || "outro"),
      topic: String(fd.get("topic") || "") || null,
      description: String(fd.get("description") || "") || null,
      url: String(fd.get("url") || "") || null,
    };
    if (!payload.title) return toast.error("Informe o título");
    setSaving(true);
    const { data, error } = await supabase.from("materials").insert(payload).select().single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setMaterials((p) => [data as Material, ...p]);
    setOpenMat(false);
    toast.success("Material adicionado");
  };

  const removeMaterial = async (id: string) => {
    setMaterials((p) => p.filter((x) => x.id !== id));
    await supabase.from("materials").delete().eq("id", id);
  };

  const newNote = async () => {
    if (!user || !subject) return;
    const { data, error } = await supabase.from("notes").insert({
      user_id: user.id, subject_id: subject.id, title: "Nova anotação", content: "",
    }).select().single();
    if (error) return toast.error(error.message);
    setNotes((p) => [data as Note, ...p]);
    setActiveNote(data as Note);
  };

  const saveNote = async () => {
    if (!activeNote) return;
    const { error } = await supabase.from("notes").update({
      title: activeNote.title, content: activeNote.content,
    }).eq("id", activeNote.id);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setNotes((p) => p.map((n) => n.id === activeNote.id ? { ...n, ...activeNote } : n));
  };

  const deleteNote = async (id: string) => {
    setNotes((p) => p.filter((x) => x.id !== id));
    if (activeNote?.id === id) setActiveNote(null);
    await supabase.from("notes").delete().eq("id", id);
  };

  if (!subject) {
    return <div className="text-center py-20 text-muted-foreground">Carregando...</div>;
  }

  const Icon = (Icons as any)[subject.icon || "BookOpen"] || Icons.BookOpen;

  return (
    <div className="space-y-6">
      <Link to="/app/materias" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Todas as matérias
      </Link>

      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-2xl bg-gradient-primary grid place-items-center text-primary-foreground shadow-elegant">
          <Icon className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">{subject.area}</p>
          <h1 className="text-3xl font-display font-bold">{subject.name}</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">{subject.description}</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="resumos">Resumos</TabsTrigger>
          <TabsTrigger value="exercicios">Exercícios</TabsTrigger>
          <TabsTrigger value="materiais">Materiais</TabsTrigger>
          <TabsTrigger value="anotacoes">Anotações</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-6 space-y-5">
          <div className="bg-gradient-card border border-border rounded-2xl p-6 shadow-soft">
            <h2 className="font-display font-bold text-lg">Sobre {subject.name}</h2>
            <p className="mt-2 text-muted-foreground">{subject.description}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-energy" />
              <h2 className="font-display font-bold text-lg">O que mais cai no ENEM</h2>
            </div>
            <ul className="grid sm:grid-cols-2 gap-2">
              {(subject.top_topics ?? []).map((t) => (
                <li key={t} className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                  <span className="h-2 w-2 rounded-full bg-gradient-energy" />
                  <span className="text-sm font-medium">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>

        {/* CHECKLIST */}
        <TabsContent value="checklist" className="mt-6 space-y-4">
          {topics.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground">
              <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Nenhum tópico cadastrado para esta matéria.</p>
            </div>
          ) : (
            <>
              <div className="bg-gradient-card border border-border rounded-2xl p-5 shadow-soft">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold flex items-center gap-2">
                    <ListChecks className="h-4 w-4" /> Progresso em {subject.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {doneTopics.size}/{topics.length} · {Math.round((doneTopics.size / topics.length) * 100)}%
                  </p>
                </div>
                <Progress value={Math.round((doneTopics.size / topics.length) * 100)} className="h-3" />
              </div>
              <ul className="grid sm:grid-cols-2 gap-2">
                {topics.map((t) => {
                  const done = doneTopics.has(t.id);
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => toggleTopic(t.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          done ? "bg-success/10 border-success/40" : "bg-card border-border hover:bg-muted/50"
                        }`}
                      >
                        <span className={`h-5 w-5 rounded-md border-2 grid place-items-center shrink-0 ${
                          done ? "bg-success border-success" : "border-border"
                        }`}>
                          {done && <svg className="h-3 w-3 text-success-foreground" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" clipRule="evenodd"/></svg>}
                        </span>
                        <span className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                          {t.name}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </TabsContent>

        {/* RESUMOS — usam materiais do tipo "resumo" */}
        <TabsContent value="resumos" className="mt-6">
          <MaterialsList items={materials.filter((m) => m.type === "resumo")} onRemove={removeMaterial} emptyText="Nenhum resumo ainda. Adicione na aba Materiais." />
        </TabsContent>

        {/* EXERCICIOS */}
        <TabsContent value="exercicios" className="mt-6">
          <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium text-foreground">Exercícios chegando em breve</p>
            <p className="text-sm mt-1">Por enquanto, salve listas e gabaritos na aba Materiais.</p>
          </div>
        </TabsContent>

        {/* MATERIAIS */}
        <TabsContent value="materiais" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{materials.length} material(is)</p>
            <Dialog open={openMat} onOpenChange={setOpenMat}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                  <Plus className="h-4 w-4 mr-1" /> Adicionar material
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo material</DialogTitle></DialogHeader>
                <form onSubmit={addMaterial} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título</Label>
                    <Input id="title" name="title" required maxLength={200} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Tipo</Label>
                      <Select name="type" defaultValue="link">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(typeLabels).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="topic">Assunto</Label>
                      <Input id="topic" name="topic" maxLength={120} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="url">Link (opcional)</Label>
                    <Input id="url" name="url" type="url" placeholder="https://..." />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea id="description" name="description" rows={3} maxLength={1000} />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={saving} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Salvar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <MaterialsList items={materials} onRemove={removeMaterial} emptyText="Nenhum material ainda. Comece adicionando um!" />
        </TabsContent>

        {/* ANOTACOES */}
        <TabsContent value="anotacoes" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 space-y-2">
              <Button onClick={newNote} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
                <Plus className="h-4 w-4 mr-1" /> Nova anotação
              </Button>
              {notes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Sem anotações ainda.</p>
              )}
              {notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setActiveNote(n)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    activeNote?.id === n.id ? "bg-primary/10 border-primary" : "bg-card border-border hover:bg-muted/50"
                  }`}
                >
                  <p className="font-medium truncate">{n.title || "Sem título"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(n.updated_at).toLocaleDateString("pt-BR")}
                  </p>
                </button>
              ))}
            </div>
            <div className="lg:col-span-2">
              {activeNote ? (
                <div className="bg-card border border-border rounded-2xl p-5 shadow-soft space-y-3">
                  <Input
                    value={activeNote.title}
                    onChange={(e) => setActiveNote({ ...activeNote, title: e.target.value })}
                    className="text-lg font-display font-bold border-0 px-0 focus-visible:ring-0 shadow-none"
                  />
                  <Textarea
                    value={activeNote.content}
                    onChange={(e) => setActiveNote({ ...activeNote, content: e.target.value })}
                    rows={14}
                    placeholder="Escreva suas anotações aqui..."
                    className="border-0 px-0 focus-visible:ring-0 shadow-none resize-none"
                  />
                  <div className="flex justify-between">
                    <Button variant="ghost" size="sm" onClick={() => deleteNote(activeNote.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-1" /> Excluir
                    </Button>
                    <Button onClick={saveNote} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground">
                  Selecione ou crie uma anotação para começar.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}

function MaterialsList({ items, onRemove, emptyText }: { items: Material[]; onRemove: (id: string) => void; emptyText: string }) {
  if (items.length === 0) {
    return (
      <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground">
        {emptyText}
      </div>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((m) => {
        const Icon = typeIcons[m.type] || Lightbulb;
        return (
          <div key={m.id} className="group bg-card border border-border rounded-2xl p-4 shadow-soft hover:shadow-elegant transition-all">
            <div className="flex items-start gap-3">
              <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                <Icon className="h-4.5 w-4.5" size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{m.title}</p>
                <p className="text-xs text-muted-foreground">{typeLabels[m.type]}{m.topic ? ` · ${m.topic}` : ""}</p>
                {m.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{m.description}</p>}
                <div className="mt-2 flex items-center gap-3">
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      Abrir <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <button onClick={() => onRemove(m.id)} className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-destructive transition-opacity">
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
