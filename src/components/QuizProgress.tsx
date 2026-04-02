import { Check } from "lucide-react";

interface QuizProgressProps {
  stage: 1 | 2 | 3;
}

const STAGE_LABELS = ["Seu Perfil", "Suas Escolhas", "Finalizar"];

const QuizProgress = ({ stage }: QuizProgressProps) => {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-center gap-0">
        {([1, 2, 3] as const).map((s, i) => {
          const done = s < stage;
          const active = s === stage;
          return (
            <div key={s} className="flex items-center">
              {i > 0 && (
                <div
                  className={`h-px w-8 sm:w-14 transition-colors duration-300 ${
                    s <= stage ? "bg-violet-500" : "bg-white/20"
                  }`}
                />
              )}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    done
                      ? "bg-violet-500 text-white"
                      : active
                        ? "bg-violet-500 text-white ring-2 ring-violet-400/40 ring-offset-1 ring-offset-[#0B0B12]"
                        : "bg-white/10 text-white/35"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : s}
                </div>
                <span
                  className={`hidden text-[10px] font-medium sm:block ${
                    active ? "text-violet-300" : done ? "text-white/50" : "text-white/25"
                  }`}
                >
                  {STAGE_LABELS[i]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra de progresso por etapa */}
      <div className="flex gap-1.5">
        {([1, 2, 3] as const).map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              s < stage
                ? "bg-violet-500"
                : s === stage
                  ? "bg-gradient-to-r from-violet-500 to-fuchsia-400"
                  : "bg-white/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default QuizProgress;
