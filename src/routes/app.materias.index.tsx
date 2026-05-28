import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as Icons from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/app/materias/")({
  component: MateriasPage,
});

interface Subject {
  id: string; slug: string; name: string; area: string; description: string | null;
  top_topics: string[] | null; icon: string | null; color: string | null;
}

const colorClass: Record<string, string> = {
  emerald: "from-emerald-500 to-teal-500",
  blue: "from-blue-500 to-indigo-500",
  amber: "from-amber-500 to-orange-500",
  green: "from-green-500 to-emerald-500",
  rose: "from-rose-500 to-pink-500",
};

function MateriasPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("subjects").select("*").order("area").order("name").then(({ data }) => {
      setSubjects((data as Subject[]) ?? []);
    });
  }, []);

  const filtered = subjects.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  const grouped = filtered.reduce<Record<string, Subject[]>>((acc, s) => {
    (acc[s.area] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Matérias</h1>
        <p className="text-muted-foreground">14 disciplinas que caem no ENEM. Escolha uma para começar.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar matéria..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {Object.entries(grouped).map(([area, items]) => (
        <section key={area}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{area}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((s) => {
              const Icon = (Icons as any)[s.icon || "BookOpen"] || Icons.BookOpen;
              const grad = colorClass[s.color || "blue"] ?? colorClass.blue;
              return (
                <Link
                  key={s.id}
                  to="/app/materias/$slug"
                  params={{ slug: s.slug }}
                  className="group bg-card border border-border rounded-2xl p-5 shadow-soft hover:shadow-elegant transition-all hover:-translate-y-0.5"
                >
                  <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${grad} grid place-items-center text-white shadow-soft`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display font-bold text-lg group-hover:text-primary transition-colors">{s.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{s.description}</p>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
