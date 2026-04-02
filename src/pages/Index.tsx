import { useCallback, useEffect, useRef, useState } from "react";
import { questions, Question } from "@/lib/quiz-data";
import QuizProgress from "@/components/QuizProgress";
import QuizStep from "@/components/QuizStep";
import SurveyHero from "@/components/SurveyHero";
import SurveyShell from "@/components/SurveyShell";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

function getUtmParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"];
  const result: Record<string, string> = {};
  keys.forEach((k) => {
    result[k] = params.get(k) || "";
  });
  result.user_agent = navigator.userAgent;
  result.page_url = window.location.href;
  return result;
}

const ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzHffjij5Wb788NYj4rrRfljjm77Qavwhb_PnmPNnDS7DgPttmd6rP8cVQ0a69CJAJy/exec";

const TOTAL_STAGES = 3;

const Index = () => {
  const [phase, setPhase] = useState<"hero" | "quiz" | "thanks">("hero");
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const utmRef = useRef(getUtmParams());
  const submittedRef = useRef(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const validateAnswer = useCallback(
    (question: Question, value: any, allAnswers: Record<string, any>): string | null => {
      if (question.validate) {
        return question.validate(value, allAnswers);
      }
      if (question.type === "address") {
        if (!value) return "Esta pergunta é obrigatória.";
      } else {
        if (!(value || "").trim()) return "Esta pergunta é obrigatória.";
      }
      return null;
    },
    [],
  );

  // Questions visible for the current stage (respecting showIf)
  const stageQuestions = questions.filter(
    (q) => q.stage === stage && (!q.showIf || q.showIf(answers)),
  );

  const submit = async (finalAnswers: Record<string, any>) => {
    if (submittedRef.current || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const addr = finalAnswers.endereco || {};

    const payload = {
      nome_completo: finalAnswers.nome_completo || "",
      idade_faixa: finalAnswers.idade_faixa || "",
      telefone: finalAnswers.telefone || "",
      cidade: addr.cidade || "",
      bairro: addr.bairro || "",
      renda_mensal: finalAnswers.renda_mensal || "",
      voto_presidente_2026: finalAnswers.voto_presidente_2026 || "",
      voto_senador_1: finalAnswers.voto_senador_1_2026 || "",
      voto_senador_2: finalAnswers.voto_senador_2_2026 || "",
      voto_governador_ba_2026: finalAnswers.voto_governador_ba_2026 || "",
      dor_principal: finalAnswers.dor_principal || "",
      perfil_confianca: finalAnswers.perfil_confianca || "",
      mudaria_voto: finalAnswers.mudaria_voto || "",
      criterio_voto: finalAnswers.criterio_voto || "",
      ...utmRef.current,
      timestamp: new Date().toISOString(),
    };

    try {
      await fetch(ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });

      submittedRef.current = true;
      if (typeof window.fbq === "function") {
        window.fbq("track", "Lead", { content_name: "Enquete 2026 Bahia" });
      }
      setPhase("thanks");
    } catch (e) {
      console.warn("[survey] submission failed", e);
      setSubmitError("Falha ao enviar. Verifique sua conexão e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = useCallback(() => {
    // Validate all visible questions in the current stage
    const newErrors: Record<string, string | null> = {};
    let firstErrorId: string | null = null;

    for (const q of stageQuestions) {
      const err = validateAnswer(q, answers[q.id], answers);
      if (err) {
        newErrors[q.id] = err;
        if (!firstErrorId) firstErrorId = q.id;
      }
    }

    if (firstErrorId) {
      setErrors(newErrors);
      // Scroll to the first question with an error
      const el = document.getElementById(`question-${firstErrorId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (stage < TOTAL_STAGES) {
      setStage((s) => (s + 1) as 1 | 2 | 3);
      setErrors({});
      // Scroll to top of content
      mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      submit(answers);
    }
  }, [stage, stageQuestions, answers, validateAnswer]);

  const back = useCallback(() => {
    if (stage > 1) {
      setStage((s) => (s - 1) as 1 | 2 | 3);
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [stage]);

  const setAnswer = useCallback(
    (id: string, val: any) => {
      setAnswers((prev) => ({ ...prev, [id]: val }));
      if (errors[id]) {
        setErrors((prev) => ({ ...prev, [id]: null }));
      }
    },
    [errors],
  );

  // Re-validate live only for questions that already have an error shown
  useEffect(() => {
    if (Object.keys(errors).length === 0) return;
    const updated: Record<string, string | null> = { ...errors };
    let changed = false;
    for (const q of stageQuestions) {
      if (errors[q.id]) {
        const err = validateAnswer(q, answers[q.id], answers);
        if (err !== errors[q.id]) {
          updated[q.id] = err;
          changed = true;
        }
      }
    }
    if (changed) setErrors(updated);
  }, [answers]);

  if (phase === "hero") {
    return (
      <SurveyHero
        title="Enquete 2026"
        highlight="Bahia"
        subtitle="Sua Voz Define o Futuro da Bahia"
        trustLine="Anônimo. Gratuito. Leva menos de 1 minuto."
        primaryCtaLabel="Dar Minha Opinião"
        onPrimaryCta={() => setPhase("quiz")}
        totalQuestions={questions.length}
      />
    );
  }

  if (phase === "thanks") {
    return (
      <SurveyShell contentClassName="justify-center px-4 py-6 sm:px-5 sm:py-8">
        <div className="mx-auto w-full max-w-lg">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_80px_rgba(124,58,237,0.18)] backdrop-blur-xl sm:p-7">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06]">
              <CheckCircle2 className="h-7 w-7 text-violet-300" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-white sm:text-[28px]">Resposta registrada</h1>
            <p className="mt-2 text-sm text-white/70 sm:text-base">Obrigado por participar.</p>
          </div>
        </div>
      </SurveyShell>
    );
  }

  return (
    <SurveyShell contentClassName="px-4 py-4 sm:px-5 sm:py-8">
      <header className="sticky top-0 z-10 -mx-4 border-b border-white/10 bg-[#0B0B12]/70 px-4 py-3 backdrop-blur-xl sm:-mx-5 sm:px-5">
        <QuizProgress stage={stage} />
      </header>

      <main ref={mainRef} className="flex flex-1 flex-col pt-5 sm:pt-7">
        <div className="mx-auto w-full max-w-lg flex-1 space-y-4 sm:space-y-5">
          {stageQuestions.map((q) => (
            <div
              key={q.id}
              id={`question-${q.id}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl sm:p-7"
            >
              <QuizStep
                question={q}
                value={answers[q.id]}
                onChange={(val) => setAnswer(q.id, val)}
                error={errors[q.id] ?? null}
              />
            </div>
          ))}
        </div>

        {submitError && <p className="mt-4 text-center text-sm font-medium text-red-300">{submitError}</p>}

        <div className="mx-auto mt-5 w-full max-w-lg">
          <div className="grid grid-cols-1 gap-3 sm:flex sm:gap-3">
            {stage > 1 && (
              <Button
                type="button"
                onClick={back}
                variant="secondary"
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.09] sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            )}

            <Button
              type="button"
              onClick={next}
              disabled={submitting}
              className="group relative h-12 w-full flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-base font-bold text-white shadow-[0_10px_40px_rgba(124,58,237,0.35)] transition-all hover:shadow-[0_12px_55px_rgba(168,85,247,0.45)] focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B12] active:translate-y-[1px]"
            >
              <span className="absolute inset-0 -z-10 rounded-xl bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_45%)] opacity-60" />
              {submitting ? "Enviando…" : stage < TOTAL_STAGES ? "Próxima Etapa →" : "Enviar respostas"}
            </Button>
          </div>
        </div>
      </main>
    </SurveyShell>
  );
};

export default Index;
