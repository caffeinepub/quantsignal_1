import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { motion } from "motion/react";
import type { Ativo } from "../backend.d";

interface Props {
  ativos: Ativo[];
  threshold: number;
}

export default function EmAltaTab({ ativos, threshold }: Props) {
  if (ativos.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <TrendingUpIcon />
        <p className="text-muted-foreground text-sm mt-3">
          Nenhum ativo com variação &gt;{threshold}% detectado ainda.
        </p>
        <p className="text-muted-foreground/60 text-xs mt-1">
          Clique em &quot;Atualizar Dados&quot; para buscar os dados da Binance.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-lg border border-border overflow-hidden"
      data-ocid="quantsignal.em_alta.table"
    >
      <Table>
        <TableHeader>
          <TableRow className="border-border bg-card/80 hover:bg-card/80">
            <TableHead className="text-muted-foreground font-mono text-xs uppercase tracking-wider w-12">
              #
            </TableHead>
            <TableHead className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
              Símbolo
            </TableHead>
            <TableHead className="text-muted-foreground font-mono text-xs uppercase tracking-wider text-right">
              Preço (USDT)
            </TableHead>
            <TableHead className="text-muted-foreground font-mono text-xs uppercase tracking-wider text-right">
              Variação 24h
            </TableHead>
            <TableHead className="text-muted-foreground font-mono text-xs uppercase tracking-wider text-right hidden sm:table-cell">
              Volume
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ativos.map((a, i) => (
            <motion.tr
              key={a.symbol}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="border-border hover:bg-accent/30 transition-colors"
              data-ocid={`quantsignal.em_alta.item.${i + 1}`}
            >
              <TableCell className="text-muted-foreground/50 font-mono text-xs">
                {i + 1}
              </TableCell>
              <TableCell className="font-mono font-semibold text-foreground text-sm">
                {a.symbol.replace("USDT", "")}
                <span className="text-muted-foreground/50 text-xs">/USDT</span>
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatPrice(a.preco)}
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={`font-mono font-bold text-sm ${
                    a.variacao >= 0
                      ? "text-[oklch(0.65_0.22_145)]"
                      : "text-destructive"
                  }`}
                >
                  {a.variacao >= 0 ? "+" : ""}
                  {a.variacao.toFixed(2)}%
                </span>
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground hidden sm:table-cell">
                {formatVolume(a.volume)}
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}

function TrendingUpIcon() {
  return (
    <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
      <svg
        className="w-6 h-6 text-primary/50"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
        role="img"
      >
        <title>Trending Up</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    </div>
  );
}

function formatPrice(price: number): string {
  if (price >= 1000)
    return price.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (price >= 1)
    return price.toLocaleString("pt-BR", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  return price.toLocaleString("pt-BR", {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  });
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
  return vol.toFixed(2);
}
