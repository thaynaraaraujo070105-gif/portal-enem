
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
