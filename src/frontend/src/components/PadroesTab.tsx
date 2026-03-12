import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { motion } from "motion/react";
import type { Padrao } from "../backend.d";

interface Props {
  padroes: Padrao[];
}

export default function PadroesTab({ padroes }: Props) {
  if (padroes.length === 0) {
    return (
      <div
        className="rounded-lg border border-border bg-card p-12 text-center"
        data-ocid="quantsignal.padroes.empty_state"
      >
        <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
          <svg
            className="w-6 h-6 text-primary/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            role="img"
          >
            <title>Padrões Históricos</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <p className="text-muted-foreground text-sm">
          Nenhum padrão registrado ainda.
        </p>
        <p className="text-muted-foreground/60 text-xs mt-1">
          Clique em &quot;Atualizar Dados&quot; para detectar ativos em alta.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-lg border border-border overflow-hidden"
      data-ocid="quantsignal.padroes.table"
    >
      <Table>
        <TableHeader>
          <TableRow className="border-border bg-card/80 hover:bg-card/80">
            <TableHead className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
              Símbolo
            </TableHead>
            <TableHead className="text-muted-foreground font-mono text-xs uppercase tracking-wider text-right">
              Volatilidade
            </TableHead>
            <TableHead className="text-muted-foreground font-mono text-xs uppercase tracking-wider text-right hidden sm:table-cell">
              Volume
            </TableHead>
            <TableHead className="text-muted-foreground font-mono text-xs uppercase tracking-wider text-right">
              Dist. MA
            </TableHead>
            <TableHead className="text-muted-foreground font-mono text-xs uppercase tracking-wider text-right hidden md:table-cell">
              Compressão
            </TableHead>
            <TableHead className="text-muted-foreground font-mono text-xs uppercase tracking-wider text-right hidden md:table-cell">
              Aceleração
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {padroes.map((p, i) => (
            <motion.tr
              key={p.symbol}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="border-border hover:bg-accent/30 transition-colors"
              data-ocid={`quantsignal.padroes.item.${i + 1}`}
            >
              <TableCell className="font-mono font-semibold text-sm text-foreground">
                {p.symbol.replace("USDT", "")}
                <span className="text-muted-foreground/50 text-xs">/USDT</span>
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {p.volatilidade.toFixed(2)}%
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground hidden sm:table-cell">
                {formatVolume(p.volume)}
              </TableCell>
              <TableCell
                className={`text-right font-mono text-xs ${
                  p.distMediaMovel >= 0
                    ? "text-[oklch(0.65_0.22_145)]"
                    : "text-destructive"
                }`}
              >
                {p.distMediaMovel >= 0 ? "+" : ""}
                {p.distMediaMovel.toFixed(2)}%
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground hidden md:table-cell">
                {p.compressao.toFixed(2)}%
              </TableCell>
              <TableCell
                className={`text-right font-mono text-xs hidden md:table-cell ${
                  p.aceleracao >= 0
                    ? "text-[oklch(0.65_0.22_145)]"
                    : "text-destructive"
                }`}
              >
                {p.aceleracao >= 0 ? "+" : ""}
                {p.aceleracao.toFixed(2)}%
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
  return vol.toFixed(2);
}
