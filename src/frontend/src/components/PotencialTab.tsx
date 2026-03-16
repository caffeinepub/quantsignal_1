import { Progress } from "@/components/ui/progress";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Ativo, Padrao } from "../backend.d";

interface Props {
  ativos: Ativo[];
  padroes: Padrao[];
  maCrossMap: Record<string, number>;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

function formatPrice(n: number): string {
  return n >= 1 ? n.toFixed(4) : n.toFixed(6);
}

interface NiveisTrade {
  entrada: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  riscoPct: string;
  rr1: number;
}

function calcularNiveisTrade(
  preco: number,
  padrao: Padrao | undefined,
): NiveisTrade | null {
  if (!padrao) return null;
  const { volatilidade, distMediaMovel } = padrao;
  const entrada = preco;
  const stopLoss = entrada * (1 - clamp(volatilidade * 1.5, 1.0, 5.0) / 100);
  const tp1 = entrada * (1 + clamp(volatilidade * 1.5, 1.5, 4.0) / 100);
  const tp2 =
    entrada * (1 + clamp(distMediaMovel + volatilidade * 2, 3.0, 10.0) / 100);
  const tp3 =
    entrada *
    (1 + clamp(distMediaMovel * 1.5 + volatilidade * 3, 6.0, 20.0) / 100);
  const riscoPct = `${(((entrada - stopLoss) / entrada) * 100).toFixed(2)}%`;
  const rr1 = (tp1 - entrada) / (entrada - stopLoss);
  return { entrada, stopLoss, tp1, tp2, tp3, riscoPct, rr1 };
}

function gerarAnalise(
  padrao: Padrao,
  score: number,
  maCrossCount: number | undefined,
): string[] {
  const { compressao, aceleracao, distMediaMovel, volatilidade } = padrao;
  const linhas: string[] = [];

  // MA weighted score signal
  if (maCrossCount !== undefined && maCrossCount >= 7) {
    linhas.push(
      "Cruzamento MA forte nos principais timeframes — sinal de entrada de alta qualidade.",
    );
  } else if (maCrossCount !== undefined && maCrossCount >= 4) {
    linhas.push(
      "Cruzamento MA confirmado em múltiplos timeframes — tendência se formando.",
    );
  } else if (maCrossCount !== undefined && maCrossCount >= 1) {
    linhas.push(
      "Início de cruzamento detectado — aguardar confirmação em timeframes maiores.",
    );
  }

  if (compressao > 1.5) {
    linhas.push(
      "Compressão de volatilidade elevada — possível movimento explosivo iminente.",
    );
  } else if (compressao < 0.8) {
    linhas.push(
      "Volatilidade expandida — ativo em movimento ativo, cautela com entradas tardias.",
    );
  }

  if (aceleracao > 1.2) {
    linhas.push(
      "Aceleração de volume positiva — momentum institucional detectado.",
    );
  } else if (aceleracao < 0.8) {
    linhas.push("Volume desacelerando — aguardar confirmação de novo impulso.");
  }

  if (distMediaMovel > 3) {
    linhas.push(
      `Ativo ${distMediaMovel.toFixed(1)}% acima da média móvel — proximidade de resistência dinâmica.`,
    );
  } else if (distMediaMovel < -3) {
    linhas.push(
      `Ativo ${Math.abs(distMediaMovel).toFixed(1)}% abaixo da média móvel — suporte potencial próximo.`,
    );
  } else {
    linhas.push("Preço próximo da média móvel — zona de decisão técnica.");
  }

  if (volatilidade > 4) {
    linhas.push(
      "Alta volatilidade aumenta o potencial de ganho e o risco simultaneamente.",
    );
  }

  if (score >= 70) {
    linhas.push(
      "Score elevado indica forte similaridade com padrões históricos de rali.",
    );
  } else if (score >= 40) {
    linhas.push(
      "Score moderado — monitorar confirmações adicionais antes de entrar.",
    );
  } else {
    linhas.push(
      "Score baixo — padrão ainda em formação, observar desenvolvimento.",
    );
  }

  return linhas;
}

export default function PotencialTab({ ativos, padroes, maCrossMap }: Props) {
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
      {ativos.map((a, i) => {
        const padrao = padroes.find((p) => p.symbol === a.symbol);
        const niveis = calcularNiveisTrade(a.preco, padrao);
        const maCrossCount = maCrossMap[a.symbol];
        const analise = padrao
          ? gerarAnalise(padrao, a.score, maCrossCount)
          : [];

        return (
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
              onClick={() =>
                setExpanded(expanded === a.symbol ? null : a.symbol)
              }
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
                  {maCrossCount !== undefined && maCrossCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/25">
                      MA {maCrossCount}/10
                    </span>
                  )}
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
                  {/* Indicator grid */}
                  <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-6 gap-3 bg-muted/20">
                    <IndicatorCell
                      label="Volatilidade"
                      value={
                        padrao ? `${padrao.volatilidade.toFixed(2)}%` : "—"
                      }
                    />
                    <IndicatorCell
                      label="Volume"
                      value={formatVolume(a.volume)}
                    />
                    <IndicatorCell
                      label="Dist. MA"
                      value={
                        padrao ? `${padrao.distMediaMovel.toFixed(2)}%` : "—"
                      }
                    />
                    <IndicatorCell
                      label="Compressão"
                      value={padrao ? padrao.compressao.toFixed(2) : "—"}
                    />
                    <IndicatorCell
                      label="Aceleração"
                      value={padrao ? padrao.aceleracao.toFixed(2) : "—"}
                    />
                    <IndicatorCell
                      label="MA Cross"
                      value={
                        maCrossCount !== undefined
                          ? `${maCrossCount}/10 pts`
                          : "—"
                      }
                    />
                  </div>

                  {niveis && (
                    <>
                      <div className="mx-4 border-t border-border/60" />

                      {/* Trading Signals */}
                      <div className="px-4 py-3 bg-muted/10">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mb-2.5">
                          Sinais de Trading
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          <TradeCell
                            label="Entrada"
                            value={formatPrice(niveis.entrada)}
                            sub={null}
                            variant="neutral"
                          />
                          <TradeCell
                            label="Stop Loss"
                            value={formatPrice(niveis.stopLoss)}
                            sub={`−${niveis.riscoPct}`}
                            variant="danger"
                          />
                          <TradeCell
                            label="TP1"
                            value={formatPrice(niveis.tp1)}
                            sub={`R/R ${niveis.rr1.toFixed(1)}x`}
                            variant="success-low"
                          />
                          <TradeCell
                            label="TP2"
                            value={formatPrice(niveis.tp2)}
                            sub={`+${(((niveis.tp2 - niveis.entrada) / niveis.entrada) * 100).toFixed(1)}%`}
                            variant="success-mid"
                          />
                          <TradeCell
                            label="TP3"
                            value={formatPrice(niveis.tp3)}
                            sub={`+${(((niveis.tp3 - niveis.entrada) / niveis.entrada) * 100).toFixed(1)}%`}
                            variant="success-high"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {analise.length > 0 && (
                    <>
                      <div className="mx-4 border-t border-border/60" />

                      {/* Technical Analysis */}
                      <div className="px-4 py-3 bg-muted/10">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mb-2">
                          Análise Técnica
                        </p>
                        <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 space-y-1.5">
                          {analise.map((linha, idx) => (
                            // biome-ignore lint/suspicious/noArrayIndexKey: static order
                            <div key={idx} className="flex items-start gap-2">
                              <span className="text-primary/60 text-xs mt-0.5 shrink-0">
                                •
                              </span>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {linha}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

type TradeVariant =
  | "neutral"
  | "danger"
  | "success-low"
  | "success-mid"
  | "success-high";

function TradeCell({
  label,
  value,
  sub,
  variant,
}: {
  label: string;
  value: string;
  sub: string | null;
  variant: TradeVariant;
}) {
  const valueClass = {
    neutral: "text-foreground",
    danger: "text-destructive",
    "success-low": "text-[oklch(0.60_0.18_145)]",
    "success-mid": "text-[oklch(0.65_0.22_145)]",
    "success-high": "text-[oklch(0.70_0.26_145)]",
  }[variant];

  return (
    <div className="text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
        {label}
      </p>
      <p className={`text-sm font-mono font-bold mt-0.5 ${valueClass}`}>
        {value}
      </p>
      {sub && (
        <p
          className={`text-[10px] font-mono mt-0.5 ${variant === "danger" ? "text-destructive/70" : "text-muted-foreground"}`}
        >
          {sub}
        </p>
      )}
    </div>
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
