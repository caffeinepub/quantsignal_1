import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, BookOpen, RefreshCw, TrendingUp, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Ativo, Padrao } from "./backend.d";
import EmAltaTab from "./components/EmAltaTab";
import PadroesTab from "./components/PadroesTab";
import PotencialTab from "./components/PotencialTab";
import { useActor } from "./hooks/useActor";
import { useGetAtivos, useGetPadroes } from "./hooks/useQueries";
import {
  type MASignal,
  computeIndicators,
  computeMASignal,
  fetchKlines,
  fetchKlinesForTF,
  fetchTickers,
} from "./lib/binance";

const ALTA_THRESHOLD = 8;

export default function App() {
  const { actor } = useActor();
  const { data: storedAtivos = [], refetch: refetchAtivos } = useGetAtivos();
  const { data: padroes = [], refetch: refetchPadroes } = useGetPadroes();

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [displayAtivos, setDisplayAtivos] = useState<Ativo[]>([]);
  const [maCrossMap, setMaCrossMap] = useState<Record<string, number>>({});
  const [nextRefreshIn, setNextRefreshIn] = useState<number | null>(null);

  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAutoStarted = useRef(false);

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    },
    [],
  );

  const startCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setNextRefreshIn(300);
    let remaining = 300;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        remaining = 300;
        setNextRefreshIn(300);
      } else {
        setNextRefreshIn(remaining);
      }
    }, 1000);
  }, []);

  const handleAtualizar = useCallback(async () => {
    if (!actor) {
      toast.error("Backend não conectado. Aguarde...");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      setLoadingMsg("Buscando dados da Binance...");
      const tickers = await fetchTickers();

      const usdtPairs = tickers
        .filter((t) => t.symbol.endsWith("USDT"))
        .sort(
          (a, b) =>
            Number.parseFloat(b.quoteVolume) - Number.parseFloat(a.quoteVolume),
        )
        .slice(0, 100);

      const highCandidates = usdtPairs.filter(
        (t) => Math.abs(Number.parseFloat(t.priceChangePercent)) > 5,
      );

      setLoadingMsg(
        `Calculando indicadores (${highCandidates.length} ativos)...`,
      );

      const BATCH = 10;
      const indicatorsMap: Record<
        string,
        ReturnType<typeof computeIndicators>
      > = {};

      for (let i = 0; i < highCandidates.length; i += BATCH) {
        const batch = highCandidates.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(async (t) => {
            const klines = await fetchKlines(t.symbol);
            return { symbol: t.symbol, indicators: computeIndicators(klines) };
          }),
        );
        for (const r of results) {
          if (r.status === "fulfilled") {
            indicatorsMap[r.value.symbol] = r.value.indicators;
          }
        }
        if (i + BATCH < highCandidates.length) {
          await new Promise((res) => setTimeout(res, 200));
        }
      }

      setLoadingMsg("Calculando scores...");

      const ativosParaSalvar: Ativo[] = [];
      const padroesParaSalvar: Padrao[] = [];

      for (const t of usdtPairs) {
        const variacao = Number.parseFloat(t.priceChangePercent);
        const preco = Number.parseFloat(t.lastPrice);
        const volume = Number.parseFloat(t.quoteVolume);
        const ind = indicatorsMap[t.symbol];

        let score = 0;
        let padrao: Padrao | null = null;

        if (ind) {
          padrao = {
            symbol: t.symbol,
            volatilidade: ind.volatilidade,
            volume: ind.volume,
            distMediaMovel: ind.distMediaMovel,
            compressao: ind.compressao,
            aceleracao: ind.aceleracao,
          };
          try {
            score = await actor.calcularScore(padrao);
          } catch {
            score = 0;
          }
        }

        ativosParaSalvar.push({
          symbol: t.symbol,
          preco,
          variacao,
          volume,
          score,
        });

        if (variacao > ALTA_THRESHOLD && padrao) {
          padroesParaSalvar.push(padrao);
        }
      }

      // --- MA Cross phase: top 20 by score ---
      setLoadingMsg("Analisando cruzamentos de médias móveis (top 20)...");

      const top20 = [...ativosParaSalvar]
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
      const top20Symbols = new Set(top20.map((a) => a.symbol));
      const maSignalsMap: Record<
        string,
        { tf3m: MASignal; tf5m: MASignal; tf15m: MASignal }
      > = {};
      const top20Array = Array.from(top20Symbols);
      const MA_BATCH = 5;

      for (let i = 0; i < top20Array.length; i += MA_BATCH) {
        const batch = top20Array.slice(i, i + MA_BATCH);
        await Promise.allSettled(
          batch.map(async (symbol) => {
            const [k3m, k5m, k15m] = await Promise.all([
              fetchKlinesForTF(symbol, "3m", 200),
              fetchKlinesForTF(symbol, "5m", 200),
              fetchKlinesForTF(symbol, "15m", 200),
            ]);
            maSignalsMap[symbol] = {
              tf3m: computeMASignal(k3m),
              tf5m: computeMASignal(k5m),
              tf15m: computeMASignal(k15m),
            };
          }),
        );
        if (i + MA_BATCH < top20Array.length) {
          await new Promise((res) => setTimeout(res, 300));
        }
      }

      // Apply score bonuses
      const maCrossCountMap: Record<string, number> = {};
      for (const a of ativosParaSalvar) {
        if (!top20Symbols.has(a.symbol)) continue;
        const signals = maSignalsMap[a.symbol];
        if (!signals) continue;
        const crossCount = [signals.tf3m, signals.tf5m, signals.tf15m].filter(
          (s) => s.maCross,
        ).length;
        maCrossCountMap[a.symbol] = crossCount;
        let bonus = 0;
        if (crossCount === 3) bonus += 20;
        else if (crossCount === 2) bonus += 10;
        else if (crossCount === 1) bonus += 5;
        const tradeAccel = Math.max(
          signals.tf3m.tradeAcceleration,
          signals.tf5m.tradeAcceleration,
          signals.tf15m.tradeAcceleration,
        );
        if (tradeAccel > 1.5) bonus += 10;
        a.score = Math.min(a.score + bonus, 100);
      }

      setMaCrossMap(maCrossCountMap);

      setLoadingMsg("Salvando dados...");

      await actor.salvarAtivos(ativosParaSalvar);

      for (const p of padroesParaSalvar) {
        try {
          await actor.salvarPadrao(p);
        } catch {
          // ignore individual failures
        }
      }

      setDisplayAtivos(ativosParaSalvar);
      setLastUpdated(new Date());
      await Promise.all([refetchAtivos(), refetchPadroes()]);

      toast.success(
        `Dados atualizados! ${ativosParaSalvar.filter((a) => a.variacao > ALTA_THRESHOLD).length} ativos em alta detectados.`,
      );

      // Start auto-refresh after first successful load
      if (!hasAutoStarted.current) {
        hasAutoStarted.current = true;
        autoRefreshRef.current = setInterval(
          () => {
            handleAtualizar();
          },
          5 * 60 * 1000,
        );
        startCountdown();
      } else {
        startCountdown();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(msg);
      toast.error(`Erro ao buscar dados: ${msg}`);
    } finally {
      setIsLoading(false);
      setLoadingMsg("");
    }
  }, [actor, refetchAtivos, refetchPadroes, startCountdown]);

  const ativos = displayAtivos.length > 0 ? displayAtivos : storedAtivos;
  const emAlta = ativos
    .filter((a) => a.variacao > ALTA_THRESHOLD)
    .sort((a, b) => b.variacao - a.variacao);
  const potencial = [...ativos].sort((a, b) => b.score - a.score).slice(0, 20);

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster position="top-right" />

      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-foreground">
                QuantSignal
              </h1>
              <p className="text-xs text-muted-foreground">
                Análise Quantitativa de Cripto
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                Atualizado: {lastUpdated.toLocaleTimeString("pt-BR")}
              </span>
            )}
            {nextRefreshIn !== null && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                Próxima: {Math.floor(nextRefreshIn / 60)}:
                {String(nextRefreshIn % 60).padStart(2, "0")}
              </span>
            )}
            <Button
              onClick={handleAtualizar}
              disabled={isLoading}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2 shadow-glow"
              data-ocid="quantsignal.primary_button"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              {isLoading ? "Atualizando..." : "Atualizar Dados"}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3"
              data-ocid="quantsignal.loading_state"
            >
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-sm text-primary font-mono">
                {loadingMsg || "Processando..."}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3"
              data-ocid="quantsignal.error_state"
            >
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span className="text-sm text-destructive font-mono">
                {error}
              </span>
              <button
                type="button"
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setError(null)}
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-4 flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs font-mono border-primary/30 text-primary/80"
          >
            Threshold de alta: &gt;{ALTA_THRESHOLD}%
          </Badge>
          <Badge
            variant="outline"
            className="text-xs font-mono border-border text-muted-foreground"
          >
            Top 100 pares USDT por volume
          </Badge>
        </div>

        <Tabs defaultValue="em-alta">
          <TabsList className="bg-card border border-border mb-6 w-full sm:w-auto">
            <TabsTrigger
              value="em-alta"
              className="gap-2 font-medium"
              data-ocid="quantsignal.em_alta.tab"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Em Alta
              {emAlta.length > 0 && (
                <Badge className="ml-1 h-4 px-1.5 text-[10px] bg-primary/20 text-primary border-primary/30">
                  {emAlta.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="potencial"
              className="gap-2 font-medium"
              data-ocid="quantsignal.potencial.tab"
            >
              <Zap className="w-3.5 h-3.5" />
              Potencial
              {potencial.length > 0 && (
                <Badge className="ml-1 h-4 px-1.5 text-[10px] bg-primary/20 text-primary border-primary/30">
                  {potencial.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="padroes"
              className="gap-2 font-medium"
              data-ocid="quantsignal.padroes.tab"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Padrões Históricos
              {padroes.length > 0 && (
                <Badge className="ml-1 h-4 px-1.5 text-[10px] bg-primary/20 text-primary border-primary/30">
                  {padroes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="em-alta">
            <EmAltaTab ativos={emAlta} threshold={ALTA_THRESHOLD} />
          </TabsContent>

          <TabsContent value="potencial">
            <PotencialTab
              ativos={potencial}
              padroes={padroes}
              maCrossMap={maCrossMap}
            />
          </TabsContent>

          <TabsContent value="padroes">
            <PadroesTab padroes={padroes} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border/50 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()}. Feito com ❤️ usando{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
