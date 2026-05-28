
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
