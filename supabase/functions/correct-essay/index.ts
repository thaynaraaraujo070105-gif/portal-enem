import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um corretor especialista de redações do ENEM. Avalie a redação seguindo rigorosamente as 5 competências oficiais, atribuindo nota de 0 a 200 (em múltiplos de 40: 0, 40, 80, 120, 160, 200) em cada uma:

C1 — Demonstrar domínio da modalidade escrita formal da língua portuguesa.
C2 — Compreender a proposta de redação e aplicar conceitos para desenvolver o tema, dentro dos limites estruturais do texto dissertativo-argumentativo em prosa.
C3 — Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos em defesa de um ponto de vista.
C4 — Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação.
C5 — Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos.

Para cada competência, forneça um feedback construtivo, específico e personalizado (2-4 frases) apontando pontos fortes e o que melhorar. Em "general_feedback" (3-5 frases), faça um resumo geral da redação com sugestões práticas de aprimoramento.

Seja honesto e justo: redações curtas, fora do tema ou sem proposta de intervenção devem receber notas baixas nas competências correspondentes.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });

    const { essayId } = await req.json();
    if (!essayId) return new Response(JSON.stringify({ error: "essayId obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Buscar redação + tema (RLS garante propriedade)
    const { data: essay, error: essayErr } = await supabase
      .from("essays")
      .select("id, title, content, theme_id, custom_theme")
      .eq("id", essayId)
      .single();

    if (essayErr || !essay) {
      return new Response(JSON.stringify({ error: "Redação não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!essay.content || essay.content.trim().length < 50) {
      return new Response(JSON.stringify({ error: "Redação muito curta para correção (mínimo 50 caracteres)." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let themeText = essay.custom_theme ?? "Tema livre";
    if (essay.theme_id) {
      const { data: theme } = await supabase
        .from("essay_themes")
        .select("title, description")
        .eq("id", essay.theme_id)
        .single();
      if (theme) themeText = `${theme.title}\n${theme.description ?? ""}`;
    }

    const userPrompt = `TEMA DA REDAÇÃO:\n${themeText}\n\n---\n\nTÍTULO: ${essay.title}\n\nREDAÇÃO DO ALUNO:\n${essay.content}\n\n---\n\nAvalie esta redação e retorne as notas e feedbacks via a função grade_essay.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "grade_essay",
              description: "Retorna a correção estruturada da redação do ENEM",
              parameters: {
                type: "object",
                properties: {
                  c1_score: { type: "integer", description: "Nota C1 (0-200, múltiplo de 40)" },
                  c2_score: { type: "integer" },
                  c3_score: { type: "integer" },
                  c4_score: { type: "integer" },
                  c5_score: { type: "integer" },
                  c1_feedback: { type: "string" },
                  c2_feedback: { type: "string" },
                  c3_feedback: { type: "string" },
                  c4_feedback: { type: "string" },
                  c5_feedback: { type: "string" },
                  general_feedback: { type: "string", description: "Comentário geral com sugestões" },
                },
                required: [
                  "c1_score","c2_score","c3_score","c4_score","c5_score",
                  "c1_feedback","c2_feedback","c3_feedback","c4_feedback","c5_feedback",
                  "general_feedback",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "grade_essay" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de uso da IA atingido. Tente novamente em alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos em Settings > Workspace > Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Erro na IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("Sem tool_call", JSON.stringify(aiJson));
      return new Response(JSON.stringify({ error: "Resposta inválida da IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const args = JSON.parse(toolCall.function.arguments);
    const clamp = (n: number) => Math.max(0, Math.min(200, Math.round(n / 40) * 40));
    const c1 = clamp(args.c1_score);
    const c2 = clamp(args.c2_score);
    const c3 = clamp(args.c3_score);
    const c4 = clamp(args.c4_score);
    const c5 = clamp(args.c5_score);
    const total = c1 + c2 + c3 + c4 + c5;

    const { data: updated, error: updErr } = await supabase
      .from("essays")
      .update({
        c1_score: c1, c2_score: c2, c3_score: c3, c4_score: c4, c5_score: c5,
        total_score: total,
        c1_feedback: args.c1_feedback,
        c2_feedback: args.c2_feedback,
        c3_feedback: args.c3_feedback,
        c4_feedback: args.c4_feedback,
        c5_feedback: args.c5_feedback,
        general_feedback: args.general_feedback,
        corrected_at: new Date().toISOString(),
        status: "corrigida",
      })
      .eq("id", essayId)
      .select()
      .single();

    if (updErr) {
      console.error(updErr);
      return new Response(JSON.stringify({ error: "Erro ao salvar correção" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ essay: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
