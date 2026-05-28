
-- 1. Tópicos curados por matéria (catálogo público para autenticados)
CREATE TABLE public.subject_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subject_id, name)
);
CREATE INDEX idx_subject_topics_subject ON public.subject_topics(subject_id, position);
ALTER TABLE public.subject_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Topics readable by authenticated" ON public.subject_topics
  FOR SELECT TO authenticated USING (true);

-- 2. Progresso do checklist por usuário (permanente)
CREATE TABLE public.user_topic_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic_id UUID NOT NULL REFERENCES public.subject_topics(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id)
);
CREATE INDEX idx_user_topic_progress_user ON public.user_topic_progress(user_id);
ALTER TABLE public.user_topic_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "utp_select_own" ON public.user_topic_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "utp_insert_own" ON public.user_topic_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "utp_delete_own" ON public.user_topic_progress FOR DELETE USING (auth.uid() = user_id);

-- 3. Blocos do cronograma (por usuário, por tipo de plano)
CREATE TYPE public.plan_type AS ENUM ('intensivo', 'extensivo');

CREATE TABLE public.study_plan_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_type public.plan_type NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Dom, 1=Seg ... 6=Sab
  position SMALLINT NOT NULL CHECK (position BETWEEN 0 AND 5),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.subject_topics(id) ON DELETE SET NULL,
  custom_topic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_spb_user_plan ON public.study_plan_blocks(user_id, plan_type, day_of_week, position);
ALTER TABLE public.study_plan_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spb_select_own" ON public.study_plan_blocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "spb_insert_own" ON public.study_plan_blocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "spb_update_own" ON public.study_plan_blocks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "spb_delete_own" ON public.study_plan_blocks FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_spb_updated BEFORE UPDATE ON public.study_plan_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Conclusões permanentes dos blocos (não resetam)
CREATE TABLE public.study_plan_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  block_id UUID NOT NULL REFERENCES public.study_plan_blocks(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, block_id)
);
CREATE INDEX idx_spc_user ON public.study_plan_completions(user_id);
ALTER TABLE public.study_plan_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spc_select_own" ON public.study_plan_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "spc_insert_own" ON public.study_plan_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "spc_delete_own" ON public.study_plan_completions FOR DELETE USING (auth.uid() = user_id);

-- 5. Preferências do usuário
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY,
  active_plan_type public.plan_type NOT NULL DEFAULT 'extensivo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "up_select_own" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "up_insert_own" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "up_update_own" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER trg_up_updated BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Seed dos tópicos curados (ENEM) — usando os slugs existentes em subjects
DO $$
DECLARE
  s RECORD;
  topics TEXT[];
  i INT;
BEGIN
  FOR s IN SELECT id, slug FROM public.subjects LOOP
    topics := CASE s.slug
      WHEN 'matematica' THEN ARRAY[
        'Razão e proporção','Porcentagem e juros','Regra de três','Equação do 1º grau','Equação do 2º grau',
        'Função afim','Função quadrática','Função exponencial','Função logarítmica','Progressão aritmética',
        'Progressão geométrica','Trigonometria no triângulo','Geometria plana','Áreas de figuras planas',
        'Geometria espacial','Volumes de sólidos','Geometria analítica','Estatística básica','Médias e medianas',
        'Probabilidade','Análise combinatória','Matemática financeira','Sistemas lineares','Conjuntos numéricos'
      ]
      WHEN 'portugues' THEN ARRAY[
        'Interpretação de texto','Tipos textuais','Gêneros textuais','Funções da linguagem','Variação linguística',
        'Figuras de linguagem','Coesão textual','Coerência textual','Concordância verbal','Concordância nominal',
        'Regência verbal','Regência nominal','Crase','Pontuação','Ortografia','Classes de palavras',
        'Sintaxe do período simples','Sintaxe do período composto','Semântica','Intertextualidade'
      ]
      WHEN 'literatura' THEN ARRAY[
        'Quinhentismo','Barroco','Arcadismo','Romantismo','Realismo','Naturalismo','Parnasianismo','Simbolismo',
        'Pré-Modernismo','Modernismo (1ª fase)','Modernismo (2ª fase)','Modernismo (3ª fase)','Literatura contemporânea',
        'Machado de Assis','Guimarães Rosa','Clarice Lispector','Carlos Drummond','Literatura africana de língua portuguesa',
        'Literatura indígena'
      ]
      WHEN 'redacao' THEN ARRAY[
        'Estrutura dissertativo-argumentativa','Tese e argumentação','Repertório sociocultural','Conectivos',
        'Proposta de intervenção','Competência 1 — Norma culta','Competência 2 — Tema','Competência 3 — Argumentação',
        'Competência 4 — Coesão','Competência 5 — Intervenção','Análise de temas anteriores'
      ]
      WHEN 'ingles' THEN ARRAY[
        'Reading comprehension','Vocabulário em contexto','Cognatos e falsos cognatos','Verb tenses','Modal verbs',
        'Conditionals','Reported speech','Passive voice','Linking words','Phrasal verbs','Inferência textual'
      ]
      WHEN 'espanhol' THEN ARRAY[
        'Comprensión lectora','Vocabulario en contexto','Heterosemánticos','Tiempos verbales','Pronombres',
        'Conectores','Voz pasiva','Inferencia textual','Variación del español','Cultura hispánica'
      ]
      WHEN 'artes' THEN ARRAY[
        'Pré-história e arte rupestre','Arte clássica','Renascimento','Barroco','Modernismo brasileiro',
        'Semana de Arte Moderna','Música popular brasileira','Artes cênicas','Cinema brasileiro','Patrimônio cultural'
      ]
      WHEN 'ed-fisica' THEN ARRAY[
        'Esportes e cultura','Saúde e qualidade de vida','Atividade física','Lazer e sociedade','Jogos olímpicos',
        'Lutas e capoeira','Doping','Inclusão no esporte'
      ]
      WHEN 'biologia' THEN ARRAY[
        'Citologia','Bioquímica celular','Divisão celular','Genética mendeliana','Genética molecular','Evolução',
        'Ecologia','Cadeias e teias alimentares','Ciclos biogeoquímicos','Biomas brasileiros','Botânica','Zoologia',
        'Fisiologia humana — sistema digestório','Fisiologia humana — sistema cardiovascular','Sistema imunológico',
        'Reprodução humana','Doenças infecciosas','Biotecnologia','Saúde pública','Sustentabilidade'
      ]
      WHEN 'quimica' THEN ARRAY[
        'Estrutura atômica','Tabela periódica','Ligações químicas','Funções inorgânicas','Reações químicas',
        'Estequiometria','Soluções','Termoquímica','Cinética química','Equilíbrio químico','pH e pOH',
        'Eletroquímica','Radioatividade','Química orgânica — funções','Isomeria','Reações orgânicas',
        'Polímeros','Química ambiental'
      ]
      WHEN 'fisica' THEN ARRAY[
        'Cinemática escalar','Cinemática vetorial','Leis de Newton','Trabalho e energia','Impulso e quantidade de movimento',
        'Hidrostática','Termologia','Calorimetria','Termodinâmica','Óptica geométrica','Ondulatória',
        'Eletrostática','Corrente elétrica','Circuitos elétricos','Eletromagnetismo','Física moderna'
      ]
      WHEN 'historia' THEN ARRAY[
        'Antiguidade clássica','Idade Média','Renascimento e Reforma','Iluminismo','Revolução Francesa',
        'Revolução Industrial','Brasil colônia','Independência do Brasil','Brasil Império','Primeira República',
        'Era Vargas','Ditadura militar no Brasil','Redemocratização','Primeira Guerra Mundial','Segunda Guerra Mundial',
        'Guerra Fria','Globalização','Movimentos sociais','História da África','História indígena'
      ]
      WHEN 'geografia' THEN ARRAY[
        'Cartografia','Geomorfologia','Climatologia','Hidrografia','Biomas','Urbanização','Êxodo rural',
        'Geografia agrária','Indústria e globalização','Blocos econômicos','Geopolítica mundial','Energia e recursos',
        'Questões ambientais','Mudanças climáticas','População e demografia','Migrações','Geografia do Brasil — regiões'
      ]
      WHEN 'filosofia' THEN ARRAY[
        'Filosofia antiga — pré-socráticos','Sócrates, Platão e Aristóteles','Filosofia medieval','Filosofia moderna',
        'Iluminismo','Ética','Política — contratualistas','Existencialismo','Escola de Frankfurt','Filosofia contemporânea'
      ]
      WHEN 'sociologia' THEN ARRAY[
        'Surgimento da sociologia','Durkheim — fato social','Weber — ação social','Marx — luta de classes',
        'Cultura e identidade','Movimentos sociais','Cidadania e direitos','Trabalho e sociedade','Indústria cultural',
        'Desigualdade social','Globalização','Sociologia brasileira'
      ]
      ELSE ARRAY[]::TEXT[]
    END;

    IF topics IS NOT NULL AND array_length(topics, 1) > 0 THEN
      FOR i IN 1..array_length(topics, 1) LOOP
        INSERT INTO public.subject_topics (subject_id, name, position)
        VALUES (s.id, topics[i], i)
        ON CONFLICT (subject_id, name) DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END $$;
