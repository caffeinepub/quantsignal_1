import { Progress } from "@/components/ui/progress";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Ativo } from "../backend.d";

interface Props {
  ativos: Ativo[];
}

export default function PotencialTab({ ativos }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (ativos.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
          <svg
            className="w-6 h-6 text-primary/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            role="img"
          >
            <title>Potencial</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <p className="text-muted-foreground text-sm">
          Nenhum ativo com score calculado ainda.
        </p>
        <p className="text-muted-foreground/60 text-xs mt-1">
          Clique em &quot;Atualizar Dados&quot; para gerar scores.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2"
      data-ocid="quantsignal.potencial.list"
    >
      {ativos.map((a, i) => (
        <motion.div
          key={a.symbol}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="rounded-lg border border-border bg-card overflow-hidden"
          data-ocid={`quantsignal.potencial.item.${i + 1}`}
        >
          <button
            type="button"
            className="w-full px-4 py-3 flex items-center gap-4 hover:bg-accent/20 transition-colors text-left"
            onClick={() => setExpanded(expanded === a.symbol ? null : a.symbol)}
          >
            <span className="text-muted-foreground/50 font-mono text-xs w-6 shrink-0">
              {i + 1}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono font-semibold text-sm text-foreground">
                  {a.symbol.replace("USDT", "")}
                  <span className="text-muted-foreground/50 text-xs">
                    /USDT
                  </span>
                </span>
                <span
                  className={`text-xs font-mono ${
                    a.variacao >= 0
                      ? "text-[oklch(0.65_0.22_145)]"
                      : "text-destructive"
                  }`}
                >
                  {a.variacao >= 0 ? "+" : ""}
                  {a.variacao.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Progress
                  value={Math.min(a.score, 100)}
                  className="h-1.5 flex-1 bg-muted"
                />
                <span className="text-xs font-mono font-bold text-primary shrink-0 w-12 text-right">
                  {a.score.toFixed(1)}
                </span>
              </div>
            </div>

            <ChevronDown
              className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                expanded === a.symbol ? "rotate-180" : ""
              }`}
            />
          </button>

          <AnimatePresence>
            {expanded === a.symbol && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-border overflow-hidden"
              >
                <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-5 gap-3 bg-muted/20">
                  <IndicatorCell label="Volatilidade" value="—" />
                  <IndicatorCell
                    label="Volume"
                    value={formatVolume(a.volume)}
                  />
                  <IndicatorCell label="Dist. MA" value="—" />
                  <IndicatorCell label="Compressão" value="—" />
                  <IndicatorCell label="Aceleração" value="—" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </motion.div>
  );
}

function IndicatorCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
        {label}
      </p>
      <p className="text-sm font-mono font-semibold text-foreground mt-0.5">
        {value}
      </p>
    </div>
  );
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
  return vol.toFixed(2);
}
