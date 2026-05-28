
-- =========================
-- Helper: updated_at trigger
-- =========================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =========================
-- profiles
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by owner" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- subjects (catalog: per-user list of ENEM subjects, seeded on first use client-side OR fixed via slug)
-- We use a fixed slug-based catalog (no per-user duplication) to keep things simple.
-- =========================
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  description TEXT,
  top_topics TEXT[] DEFAULT '{}',
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subjects readable by authenticated" ON public.subjects
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.subjects (slug, name, area, description, top_topics, icon, color) VALUES
  ('portugues', 'Português', 'Linguagens', 'Base da comunicação e interpretação para todas as áreas do ENEM.', ARRAY['Funções da linguagem','Variação linguística','Coesão e coerência'], 'BookOpen', 'emerald'),
  ('literatura', 'Literatura', 'Linguagens', 'Movimentos literários e análise de obras.', ARRAY['Modernismo','Romantismo','Realismo'], 'BookMarked', 'emerald'),
  ('interpretacao', 'Interpretação de Texto', 'Linguagens', 'Habilidade central em todas as provas do ENEM.', ARRAY['Inferência','Tese e argumento','Gêneros textuais'], 'FileSearch', 'emerald'),
  ('gramatica', 'Gramática', 'Linguagens', 'Estrutura da língua portuguesa.', ARRAY['Concordância','Regência','Pontuação'], 'Type', 'emerald'),
  ('ingles', 'Inglês', 'Linguagens', 'Compreensão de textos em inglês.', ARRAY['Reading comprehension','Vocabulary','Cognatos'], 'Languages', 'emerald'),
  ('matematica', 'Matemática', 'Matemática', 'Raciocínio lógico e aplicações.', ARRAY['Funções','Geometria','Probabilidade','Estatística'], 'Calculator', 'blue'),
  ('historia', 'História', 'Humanas', 'Brasil e mundo, com foco em processos.', ARRAY['Era Vargas','Ditadura Militar','Revolução Industrial'], 'Landmark', 'amber'),
  ('geografia', 'Geografia', 'Humanas', 'Geografia humana e física.', ARRAY['Globalização','Urbanização','Climatologia'], 'Globe', 'amber'),
  ('filosofia', 'Filosofia', 'Humanas', 'Pensadores e correntes filosóficas.', ARRAY['Filosofia política','Ética','Filosofia antiga'], 'Brain', 'amber'),
  ('sociologia', 'Sociologia', 'Humanas', 'Sociedade, cultura e movimentos sociais.', ARRAY['Trabalho','Cidadania','Movimentos sociais'], 'Users', 'amber'),
  ('biologia', 'Biologia', 'Natureza', 'Ecologia, genética, fisiologia.', ARRAY['Ecologia','Genética','Citologia'], 'Leaf', 'green'),
  ('fisica', 'Física', 'Natureza', 'Mecânica, eletricidade, ondas.', ARRAY['Mecânica','Eletricidade','Termodinâmica'], 'Atom', 'green'),
  ('quimica', 'Química', 'Natureza', 'Química geral, orgânica e inorgânica.', ARRAY['Estequiometria','Orgânica','Soluções'], 'FlaskConical', 'green'),
  ('redacao', 'Redação', 'Redação', 'Texto dissertativo-argumentativo.', ARRAY['Estrutura','Repertório','Proposta de intervenção'], 'PenLine', 'rose');

-- =========================
-- materials
-- =========================
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pdf','link','video','resumo','mapa_mental','outro')),
  topic TEXT,
  description TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mat_select_own" ON public.materials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mat_insert_own" ON public.materials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mat_update_own" ON public.materials FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "mat_delete_own" ON public.materials FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_materials_updated_at BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_materials_user_subject ON public.materials(user_id, subject_id);

-- =========================
-- notes (per subject)
-- =========================
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova anotação',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_select_own" ON public.notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notes_insert_own" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_update_own" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notes_delete_own" ON public.notes FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_notes_updated_at BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_notes_user_subject ON public.notes(user_id, subject_id);

-- =========================
-- schedule_tasks (cronograma)
-- =========================
CREATE TABLE public.schedule_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  duration_min INT DEFAULT 60,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schedule_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sched_select_own" ON public.schedule_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sched_insert_own" ON public.schedule_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sched_update_own" ON public.schedule_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sched_delete_own" ON public.schedule_tasks FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_sched_updated_at BEFORE UPDATE ON public.schedule_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_sched_user_date ON public.schedule_tasks(user_id, scheduled_date);

-- Catálogo público de simulados
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  area TEXT NOT NULL DEFAULT 'Geral',
  duration_min INTEGER NOT NULL DEFAULT 60,
  difficulty TEXT NOT NULL DEFAULT 'medio',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exams readable by authenticated"
ON public.exams FOR SELECT TO authenticated USING (true);

-- Questões dos simulados
CREATE TABLE public.exam_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 1,
  statement TEXT NOT NULL,
  alternatives JSONB NOT NULL,
  correct_letter TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exam_questions_exam ON public.exam_questions(exam_id, position);

ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions readable by authenticated"
ON public.exam_questions FOR SELECT TO authenticated USING (true);

-- Tentativas dos usuários
CREATE TABLE public.exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  score NUMERIC,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exam_attempts_user ON public.exam_attempts(user_id, started_at DESC);

ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "att_select_own" ON public.exam_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "att_insert_own" ON public.exam_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "att_update_own" ON public.exam_attempts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "att_delete_own" ON public.exam_attempts FOR DELETE USING (auth.uid() = user_id);

-- Respostas individuais
CREATE TABLE public.exam_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  selected_letter TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX idx_exam_answers_attempt ON public.exam_answers(attempt_id);

ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ans_select_own" ON public.exam_answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ans_insert_own" ON public.exam_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ans_update_own" ON public.exam_answers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ans_delete_own" ON public.exam_answers FOR DELETE USING (auth.uid() = user_id);

-- Seed: 2 simulados com algumas questões
DO $$
DECLARE
  exam1 UUID;
  exam2 UUID;
  s_mat UUID;
  s_port UUID;
  s_bio UUID;
  s_hist UUID;
  s_fis UUID;
  s_qui UUID;
BEGIN
  SELECT id INTO s_mat FROM public.subjects WHERE slug = 'matematica' LIMIT 1;
  SELECT id INTO s_port FROM public.subjects WHERE slug = 'portugues' LIMIT 1;
  SELECT id INTO s_bio FROM public.subjects WHERE slug = 'biologia' LIMIT 1;
  SELECT id INTO s_hist FROM public.subjects WHERE slug = 'historia' LIMIT 1;
  SELECT id INTO s_fis FROM public.subjects WHERE slug = 'fisica' LIMIT 1;
  SELECT id INTO s_qui FROM public.subjects WHERE slug = 'quimica' LIMIT 1;

  INSERT INTO public.exams (title, description, area, duration_min, difficulty)
  VALUES ('Simulado ENEM - Dia 1', 'Linguagens e Ciências Humanas - 5 questões para aquecer', 'Humanas', 30, 'medio')
  RETURNING id INTO exam1;

  INSERT INTO public.exams (title, description, area, duration_min, difficulty)
  VALUES ('Simulado ENEM - Dia 2', 'Matemática e Ciências da Natureza - 5 questões', 'Exatas', 30, 'medio')
  RETURNING id INTO exam2;

  -- Exam 1 questions
  INSERT INTO public.exam_questions (exam_id, subject_id, position, statement, alternatives, correct_letter, explanation) VALUES
  (exam1, s_port, 1, 'Na frase "Os alunos estudaram bastante para a prova", a palavra "bastante" funciona como:',
    '[{"letter":"A","text":"Adjetivo"},{"letter":"B","text":"Advérbio de intensidade"},{"letter":"C","text":"Substantivo"},{"letter":"D","text":"Pronome"},{"letter":"E","text":"Conjunção"}]'::jsonb,
    'B', 'Quando "bastante" modifica um verbo, é advérbio de intensidade e fica invariável.'),
  (exam1, s_port, 2, 'Qual figura de linguagem está presente em "Seus olhos são duas estrelas brilhantes"?',
    '[{"letter":"A","text":"Metáfora"},{"letter":"B","text":"Metonímia"},{"letter":"C","text":"Hipérbole"},{"letter":"D","text":"Ironia"},{"letter":"E","text":"Antítese"}]'::jsonb,
    'A', 'Há comparação implícita entre olhos e estrelas — característica da metáfora.'),
  (exam1, s_hist, 3, 'A Proclamação da República no Brasil ocorreu em:',
    '[{"letter":"A","text":"7 de setembro de 1822"},{"letter":"B","text":"13 de maio de 1888"},{"letter":"C","text":"15 de novembro de 1889"},{"letter":"D","text":"5 de outubro de 1988"},{"letter":"E","text":"1º de janeiro de 1900"}]'::jsonb,
    'C', 'Marechal Deodoro proclamou a República em 15/11/1889.'),
  (exam1, s_hist, 4, 'A Revolução Industrial teve início em qual país?',
    '[{"letter":"A","text":"França"},{"letter":"B","text":"Alemanha"},{"letter":"C","text":"Estados Unidos"},{"letter":"D","text":"Inglaterra"},{"letter":"E","text":"Itália"}]'::jsonb,
    'D', 'A Inglaterra do século XVIII foi o berço da Revolução Industrial.'),
  (exam1, s_port, 5, 'Assinale a alternativa em que há ERRO de concordância:',
    '[{"letter":"A","text":"Fazem dois anos que ele partiu"},{"letter":"B","text":"Houve muitos problemas"},{"letter":"C","text":"Existem várias soluções"},{"letter":"D","text":"Aconteceram fatos estranhos"},{"letter":"E","text":"Ocorreram acidentes"}]'::jsonb,
    'A', 'O verbo "fazer" indicando tempo é impessoal: "Faz dois anos".');

  -- Exam 2 questions
  INSERT INTO public.exam_questions (exam_id, subject_id, position, statement, alternatives, correct_letter, explanation) VALUES
  (exam2, s_mat, 1, 'Qual o valor de x na equação 2x + 6 = 20?',
    '[{"letter":"A","text":"5"},{"letter":"B","text":"6"},{"letter":"C","text":"7"},{"letter":"D","text":"8"},{"letter":"E","text":"10"}]'::jsonb,
    'C', '2x = 14 → x = 7.'),
  (exam2, s_mat, 2, 'Uma loja oferece desconto de 20% sobre R$ 250. O preço final é:',
    '[{"letter":"A","text":"R$ 180"},{"letter":"B","text":"R$ 200"},{"letter":"C","text":"R$ 210"},{"letter":"D","text":"R$ 220"},{"letter":"E","text":"R$ 230"}]'::jsonb,
    'B', '20% de 250 = 50. 250 - 50 = 200.'),
  (exam2, s_fis, 3, 'A unidade de força no SI é:',
    '[{"letter":"A","text":"Joule"},{"letter":"B","text":"Watt"},{"letter":"C","text":"Newton"},{"letter":"D","text":"Pascal"},{"letter":"E","text":"Coulomb"}]'::jsonb,
    'C', 'Newton (N) = kg·m/s² é a unidade de força.'),
  (exam2, s_qui, 4, 'A fórmula química da água é:',
    '[{"letter":"A","text":"H2O"},{"letter":"B","text":"CO2"},{"letter":"C","text":"O2"},{"letter":"D","text":"NaCl"},{"letter":"E","text":"CH4"}]'::jsonb,
    'A', 'Dois hidrogênios e um oxigênio: H₂O.'),
  (exam2, s_bio, 5, 'A organela responsável pela respiração celular é:',
    '[{"letter":"A","text":"Ribossomo"},{"letter":"B","text":"Mitocôndria"},{"letter":"C","text":"Lisossomo"},{"letter":"D","text":"Núcleo"},{"letter":"E","text":"Cloroplasto"}]'::jsonb,
    'B', 'A mitocôndria realiza a respiração celular e produz ATP.');
END $$;
-- Temas de redação (catálogo)
CREATE TABLE public.essay_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  motivating_texts text,
  year integer,
  source text,
  area text NOT NULL DEFAULT 'Atualidades',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.essay_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Themes readable by authenticated"
ON public.essay_themes FOR SELECT TO authenticated USING (true);

-- Redações dos usuários
CREATE TABLE public.essays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  theme_id uuid REFERENCES public.essay_themes(id) ON DELETE SET NULL,
  custom_theme text,
  title text NOT NULL DEFAULT 'Nova redação',
  content text NOT NULL DEFAULT '',
  word_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'rascunho',
  c1_check boolean NOT NULL DEFAULT false,
  c2_check boolean NOT NULL DEFAULT false,
  c3_check boolean NOT NULL DEFAULT false,
  c4_check boolean NOT NULL DEFAULT false,
  c5_check boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "essays_select_own" ON public.essays FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "essays_insert_own" ON public.essays FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "essays_update_own" ON public.essays FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "essays_delete_own" ON public.essays FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_essays_updated_at
BEFORE UPDATE ON public.essays
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: alguns temas iniciais
INSERT INTO public.essay_themes (title, description, motivating_texts, year, source, area) VALUES
('Desafios para a valorização da saúde mental no Brasil', 'Discuta as dificuldades enfrentadas pela população e pelas políticas públicas para promover a saúde mental, propondo intervenções concretas que respeitem os direitos humanos.', 'Texto I — Segundo a OMS, transtornos mentais afetam mais de 1 bilhão de pessoas no mundo.\n\nTexto II — No Brasil, dados do Ministério da Saúde apontam aumento de casos de ansiedade e depressão após a pandemia.', 2023, 'Inspirado no ENEM', 'Saúde'),
('Caminhos para combater a desinformação na era digital', 'Reflita sobre o impacto das fake news na sociedade brasileira e proponha intervenções que envolvam Estado, plataformas digitais, escola e sociedade civil.', 'Texto I — Pesquisas mostram que notícias falsas se espalham 6x mais rápido que verdadeiras nas redes sociais.\n\nTexto II — A LGPD e o PL das Fake News tentam regular o ambiente digital, mas enfrentam resistências.', 2024, 'Tema autoral', 'Tecnologia'),
('A democratização do acesso ao cinema no Brasil', 'Analise as barreiras de acesso ao cinema enquanto manifestação cultural e proponha medidas para ampliar esse acesso, sobretudo nas periferias e cidades pequenas.', 'Texto I — Cerca de 80% dos municípios brasileiros não possuem salas de cinema.\n\nTexto II — Programas como o Cine Mais Cultura tentam levar o audiovisual a regiões afastadas.', 2019, 'ENEM 2019 — referência', 'Cultura'),
('O papel da escola na formação para a cidadania digital', 'Discuta como a escola pode formar cidadãos críticos diante dos desafios do mundo digital, considerando privacidade, ética e participação democrática.', 'Texto I — A BNCC inclui competências digitais entre as habilidades essenciais.\n\nTexto II — Crianças e adolescentes brasileiros passam, em média, mais de 5 horas por dia online.', 2024, 'Tema autoral', 'Educação');ALTER TABLE public.essays
  ADD COLUMN c1_score integer,
  ADD COLUMN c2_score integer,
  ADD COLUMN c3_score integer,
  ADD COLUMN c4_score integer,
  ADD COLUMN c5_score integer,
  ADD COLUMN total_score integer,
  ADD COLUMN c1_feedback text,
  ADD COLUMN c2_feedback text,
  ADD COLUMN c3_feedback text,
  ADD COLUMN c4_feedback text,
  ADD COLUMN c5_feedback text,
  ADD COLUMN general_feedback text,
  ADD COLUMN corrected_at timestamptz;-- Conversas
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Nova conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_select_own" ON public.chat_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "conv_insert_own" ON public.chat_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conv_update_own" ON public.chat_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "conv_delete_own" ON public.chat_conversations FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mensagens
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL DEFAULT '',
  image_urls text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_conv ON public.chat_messages(conversation_id, created_at);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_select_own" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "msg_insert_own" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "msg_delete_own" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

-- Bucket privado para imagens
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "chat_img_select_own" ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "chat_img_insert_own" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "chat_img_delete_own" ON storage.objects FOR DELETE
USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_conversations CASCADE;
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
