// Template padrão de blocos de estudo por dia (slug da matéria + nome do tópico).
// Domingo (0) é folga e não recebe blocos.
// Intensivo: 3 blocos/dia (Seg-Sáb). Extensivo: 2 blocos/dia (Seg-Sáb).

export type PlanBlockTemplate = { subjectSlug: string; topicName: string };

// day_of_week: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
export const INTENSIVE_TEMPLATE: Record<number, PlanBlockTemplate[]> = {
  1: [
    { subjectSlug: "matematica", topicName: "Razão e proporção" },
    { subjectSlug: "portugues", topicName: "Interpretação de texto" },
    { subjectSlug: "biologia", topicName: "Citologia" },
  ],
  2: [
    { subjectSlug: "fisica", topicName: "Cinemática escalar" },
    { subjectSlug: "historia", topicName: "Brasil colônia" },
    { subjectSlug: "redacao", topicName: "Estrutura dissertativo-argumentativa" },
  ],
  3: [
    { subjectSlug: "quimica", topicName: "Estrutura atômica" },
    { subjectSlug: "geografia", topicName: "Cartografia" },
    { subjectSlug: "literatura", topicName: "Romantismo" },
  ],
  4: [
    { subjectSlug: "matematica", topicName: "Função afim" },
    { subjectSlug: "ingles", topicName: "Reading comprehension" },
    { subjectSlug: "filosofia", topicName: "Sócrates, Platão e Aristóteles" },
  ],
  5: [
    { subjectSlug: "biologia", topicName: "Genética mendeliana" },
    { subjectSlug: "portugues", topicName: "Concordância verbal" },
    { subjectSlug: "fisica", topicName: "Leis de Newton" },
  ],
  6: [
    { subjectSlug: "historia", topicName: "Era Vargas" },
    { subjectSlug: "sociologia", topicName: "Durkheim — fato social" },
    { subjectSlug: "redacao", topicName: "Repertório sociocultural" },
  ],
};

export const EXTENSIVE_TEMPLATE: Record<number, PlanBlockTemplate[]> = {
  1: [
    { subjectSlug: "matematica", topicName: "Razão e proporção" },
    { subjectSlug: "portugues", topicName: "Interpretação de texto" },
  ],
  2: [
    { subjectSlug: "biologia", topicName: "Citologia" },
    { subjectSlug: "historia", topicName: "Brasil colônia" },
  ],
  3: [
    { subjectSlug: "fisica", topicName: "Cinemática escalar" },
    { subjectSlug: "redacao", topicName: "Estrutura dissertativo-argumentativa" },
  ],
  4: [
    { subjectSlug: "quimica", topicName: "Estrutura atômica" },
    { subjectSlug: "geografia", topicName: "Cartografia" },
  ],
  5: [
    { subjectSlug: "matematica", topicName: "Função afim" },
    { subjectSlug: "literatura", topicName: "Romantismo" },
  ],
  6: [
    { subjectSlug: "ingles", topicName: "Reading comprehension" },
    { subjectSlug: "filosofia", topicName: "Sócrates, Platão e Aristóteles" },
  ],
};

export const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const DAYS_PT_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// Cores por slug de matéria (Tailwind gradient classes)
export const SUBJECT_COLOR: Record<string, string> = {
  matematica: "from-blue-500 to-indigo-500",
  portugues: "from-rose-500 to-pink-500",
  literatura: "from-purple-500 to-fuchsia-500",
  redacao: "from-amber-500 to-orange-500",
  ingles: "from-sky-500 to-cyan-500",
  espanhol: "from-yellow-500 to-amber-500",
  artes: "from-pink-500 to-rose-500",
  "ed-fisica": "from-lime-500 to-green-500",
  biologia: "from-emerald-500 to-teal-500",
  quimica: "from-teal-500 to-cyan-500",
  fisica: "from-violet-500 to-purple-500",
  historia: "from-orange-500 to-red-500",
  geografia: "from-green-500 to-emerald-500",
  filosofia: "from-slate-500 to-zinc-500",
  sociologia: "from-stone-500 to-neutral-500",
};
