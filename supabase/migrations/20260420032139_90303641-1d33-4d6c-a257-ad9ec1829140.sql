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
('O papel da escola na formação para a cidadania digital', 'Discuta como a escola pode formar cidadãos críticos diante dos desafios do mundo digital, considerando privacidade, ética e participação democrática.', 'Texto I — A BNCC inclui competências digitais entre as habilidades essenciais.\n\nTexto II — Crianças e adolescentes brasileiros passam, em média, mais de 5 horas por dia online.', 2024, 'Tema autoral', 'Educação');