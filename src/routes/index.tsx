import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  CalendarDays,
  BookOpenCheck,
  ClipboardList,
  PenLine,
  MessageCircle,
  Trophy,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [loading, user, navigate]);

  const features = [
    { icon: CalendarDays, title: "Cronograma inteligente", desc: "Organize sua rotina e acompanhe seu progresso semanal." },
    { icon: BookOpenCheck, title: "14 matérias do ENEM", desc: "Resumos, materiais e anotações por disciplina." },
    { icon: ClipboardList, title: "Simulados", desc: "Treine com questões e veja seu desempenho por matéria." },
    { icon: PenLine, title: "Redação", desc: "Temas, rascunhos e checklist dos critérios do ENEM." },
    { icon: MessageCircle, title: "Tutor com IA", desc: "Tire dúvidas a qualquer hora com um tutor virtual." },
    { icon: Trophy, title: "Metas e progresso", desc: "Mantenha sua sequência de estudos e bata recordes." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="absolute top-0 inset-x-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display font-bold text-lg text-white">
            <span className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur-sm grid place-items-center">
              <Sparkles className="h-5 w-5" />
            </span>
            Aprova<span className="text-energy">+</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm text-white/90 hover:text-white">Entrar</Link>
            <Link to="/auth">
              <Button className="bg-white text-primary hover:bg-white/90 font-semibold">
                Começar grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-gradient-hero text-white pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-sm mb-6">
            <Sparkles className="h-4 w-4" /> Sua aprovação começa aqui
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold leading-tight max-w-4xl mx-auto">
            Estude para o ENEM com <span className="text-energy">organização</span> e foco
          </h1>
          <p className="mt-6 text-lg text-white/85 max-w-2xl mx-auto">
            Cronograma personalizado, materiais por matéria, simulados, redação e um tutor com IA para tirar todas as suas dúvidas.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link to="/auth">
              <Button size="lg" className="bg-energy text-energy-foreground hover:opacity-90 font-semibold shadow-elegant">
                Criar conta grátis <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-display font-bold">Tudo o que você precisa em um só lugar</h2>
          <p className="mt-3 text-muted-foreground">Uma plataforma completa para sua jornada até a aprovação.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-gradient-card border border-border rounded-2xl p-6 shadow-soft hover:shadow-elegant transition-shadow">
                <div className="h-11 w-11 rounded-xl bg-gradient-primary grid place-items-center mb-4 shadow-glow">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Feito para quem vai passar. © {new Date().getFullYear()} Aprova+ ENEM
      </footer>
    </div>
  );
}
