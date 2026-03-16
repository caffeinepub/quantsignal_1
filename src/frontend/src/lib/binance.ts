export interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
}

export interface BinanceKline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeCount: number;
}

export interface ComputedIndicators {
  volatilidade: number;
  distMediaMovel: number;
  compressao: number;
  aceleracao: number;
  volume: number;
}

export interface MASignal {
  maCross: boolean;
  tradeAcceleration: number;
  descolamento: boolean;
  volumeSpike: boolean;
  tfWeight: number;
}

export interface RadarSignal {
  decision: "approve" | "manual_review" | "reject";
  confidence: number;
  reason_short: string;
  pros: string[];
  cons: string[];
  risk_flags: string[];
  expVsBtc: number;
  lsr: number;
  oiDirection: "up" | "down" | "stable";
  tradeHeat: number;
}

export async function fetchTickers(): Promise<BinanceTicker[]> {
  const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");
  if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
  const data = await res.json();
  return data;
}

export async function fetchKlines(symbol: string): Promise<BinanceKline[]> {
  const res = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=24`,
  );
  if (!res.ok) throw new Error(`Klines error for ${symbol}: ${res.status}`);
  const raw: unknown[][] = await res.json();
  return raw.map((k) => ({
    openTime: Number(k[0]),
    open: Number.parseFloat(String(k[1])),
    high: Number.parseFloat(String(k[2])),
    low: Number.parseFloat(String(k[3])),
    close: Number.parseFloat(String(k[4])),
    volume: Number.parseFloat(String(k[5])),
    tradeCount: Number(k[8]),
  }));
}

export async function fetchKlinesForTF(
  symbol: string,
  interval: string,
  limit: number,
): Promise<BinanceKline[]> {
  const res = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
  );
  if (!res.ok)
    throw new Error(`Klines error for ${symbol}/${interval}: ${res.status}`);
  const raw: unknown[][] = await res.json();
  return raw.map((k) => ({
    openTime: Number(k[0]),
    open: Number.parseFloat(String(k[1])),
    high: Number.parseFloat(String(k[2])),
    low: Number.parseFloat(String(k[3])),
    close: Number.parseFloat(String(k[4])),
    volume: Number.parseFloat(String(k[5])),
    tradeCount: Number(k[8]),
  }));
}

export async function fetchFuturesOIHist(
  symbol: string,
): Promise<{ longRate: number; shortRate: number } | null> {
  try {
    const res = await fetch(
      `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=2`,
    );
    if (!res.ok) return null;
    const data: { longAccount: string; shortAccount: string }[] =
      await res.json();
    if (!data || data.length === 0) return null;
    return {
      longRate: Number(data[0].longAccount),
      shortRate: Number(data[0].shortAccount),
    };
  } catch {
    return null;
  }
}

export async function fetchFuturesOIDirection(
  symbol: string,
): Promise<"up" | "down" | "stable" | null> {
  try {
    const res = await fetch(
      `https://fapi.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=5m&limit=3`,
    );
    if (!res.ok) return null;
    const data: { sumOpenInterest: string }[] = await res.json();
    if (!data || data.length < 2) return null;
    const first = Number(data[0].sumOpenInterest);
    const last = Number(data[data.length - 1].sumOpenInterest);
    if (last > first * 1.02) return "up";
    if (last < first * 0.98) return "down";
    return "stable";
  } catch {
    return null;
  }
}

export function computeExpVsBtc(
  coinKlines: BinanceKline[],
  btcKlines: BinanceKline[],
): number {
  const ret = (klines: BinanceKline[]) => {
    const sliced = klines.slice(-10);
    if (sliced.length < 2) return 0;
    return (
      ((sliced[sliced.length - 1].close - sliced[0].close) / sliced[0].close) *
      100
    );
  };
  return ret(coinKlines) - ret(btcKlines);
}

export function computeRadarSignal(params: {
  symbol: string;
  expVsBtc: number;
  oiDirection: "up" | "down" | "stable" | null;
  lsr: number | null;
  tradeHeat: number;
  volumeSpike: boolean;
}): RadarSignal {
  const { expVsBtc, oiDirection, lsr, tradeHeat, volumeSpike } = params;

  const pros: string[] = [];
  const cons: string[] = [];
  const risk_flags: string[] = [];

  // pros
  if (expVsBtc > 3) {
    pros.push("Força relativa forte vs BTC — liderança clara");
  } else if (expVsBtc > 1) {
    pros.push("Força relativa positiva vs BTC");
  }
  if (oiDirection === "up") pros.push("OI em crescimento — entrada de capital");
  if (lsr !== null && lsr < 1.0)
    pros.push("LSR favorável — potencial de short squeeze");
  else if (lsr !== null && lsr < 1.5) pros.push("LSR saudável para long");
  if (tradeHeat > 1.3) pros.push("Atividade de trades acima da média");
  if (volumeSpike) pros.push("Spike de volume detectado");

  // cons
  if (expVsBtc < -1) cons.push("Fraqueza relativa vs BTC");
  if (oiDirection === "down") cons.push("OI caindo — saída de capital");
  if (lsr !== null && lsr > 3.0)
    cons.push("LSR extremo — sinal tardio ou manipulado");
  else if (lsr !== null && lsr > 2.0)
    cons.push("LSR elevado — risco de crowding");
  if (tradeHeat < 0.8) cons.push("Atividade de trades abaixo da média");

  // risk_flags
  if (lsr !== null && lsr > 2.5) risk_flags.push("Crowding");
  if (tradeHeat < 0.6) risk_flags.push("Baixa liquidez");
  if (oiDirection === "down" && expVsBtc < 0) risk_flags.push("Fluxo saindo");

  // decision
  let decision: "approve" | "manual_review" | "reject";
  if (
    (lsr !== null && lsr > 2.5) ||
    expVsBtc < -3 ||
    (oiDirection === "down" && expVsBtc < -1 && tradeHeat < 0.8)
  ) {
    decision = "reject";
  } else if (
    expVsBtc > 0 &&
    (lsr === null || lsr < 1.8) &&
    oiDirection !== "down" &&
    tradeHeat >= 1.0 &&
    pros.length >= 2
  ) {
    decision = "approve";
  } else {
    decision = "manual_review";
  }

  // confidence
  let confidence: number;
  if (decision === "approve") {
    confidence = Math.min(10, 5 + pros.length);
  } else if (decision === "manual_review") {
    confidence = 5;
  } else {
    confidence = Math.max(1, 4 - risk_flags.length);
  }

  // reason_short
  let reason_short: string;
  if (decision === "approve") {
    reason_short = "Contexto forte e coerente";
  } else if (decision === "manual_review") {
    reason_short = "Sinais mistos — revisar contexto";
  } else {
    reason_short =
      risk_flags.length > 0 ? risk_flags[0] : "Sinal fraco ou tardio";
  }

  return {
    decision,
    confidence,
    reason_short,
    pros,
    cons,
    risk_flags,
    expVsBtc,
    lsr: lsr ?? 0,
    oiDirection: oiDirection ?? "stable",
    tradeHeat,
  };
}

export function computeMASignal(
  klines: BinanceKline[],
  tfWeight = 1,
): MASignal {
  const closes = klines.map((k) => k.close);
  const n = closes.length;

  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

  const ma20 = avg(closes.slice(Math.max(0, n - 20)));
  const ma50 = avg(closes.slice(Math.max(0, n - 50)));
  const ma180 = avg(closes.slice(Math.max(0, n - 180)));

  const maCross = ma20 > ma180 && ma50 > ma180;

  // descolamento: crossover is recent — spread < 5% of MA180
  const descolamento =
    maCross &&
    ma180 > 0 &&
    (ma20 - ma180) / ma180 < 0.05 &&
    (ma50 - ma180) / ma180 < 0.05;

  // volumeSpike: last 5 candles avg vs previous 20
  const volumes = klines.map((k) => k.volume);
  const last5Vol = avg(volumes.slice(Math.max(0, volumes.length - 5)));
  const prev20Vol = avg(
    volumes.slice(
      Math.max(0, volumes.length - 25),
      Math.max(0, volumes.length - 5),
    ),
  );
  const volumeSpike = prev20Vol > 0 && last5Vol > prev20Vol * 1.5;

  // tradeAcceleration
  const tradeCounts = klines.map((k) => k.tradeCount);
  const last5 = tradeCounts.slice(Math.max(0, tradeCounts.length - 5));
  const prev20 = tradeCounts.slice(
    Math.max(0, tradeCounts.length - 25),
    Math.max(0, tradeCounts.length - 5),
  );
  const lastAvg = avg(last5);
  const prevAvg = avg(prev20);
  const tradeAcceleration = prevAvg === 0 ? 1.0 : lastAvg / prevAvg;

  return { maCross, tradeAcceleration, descolamento, volumeSpike, tfWeight };
}

export function computeIndicators(klines: BinanceKline[]): ComputedIndicators {
  const closes = klines.map((k) => k.close);
  const volumes = klines.map((k) => k.volume);
  const highs = klines.map((k) => k.high);
  const lows = klines.map((k) => k.low);

  const mean = closes.reduce((a, b) => a + b, 0) / closes.length;
  const variance =
    closes.reduce((a, b) => a + (b - mean) ** 2, 0) / closes.length;
  const volatilidade = (Math.sqrt(variance) / mean) * 100;

  const ma24 = mean;
  const currentPrice = closes[closes.length - 1];
  const distMediaMovel = ((currentPrice - ma24) / ma24) * 100;

  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);
  const meanPrice = (maxHigh + minLow) / 2;
  const compressao = ((maxHigh - minLow) / meanPrice) * 100;

  const firstHalf = volumes.slice(0, 6);
  const lastHalf = volumes.slice(-6);
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const lastAvg = lastHalf.reduce((a, b) => a + b, 0) / lastHalf.length;
  const aceleracao = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;

  const totalVolume = volumes.reduce((a, b) => a + b, 0);

  return {
    volatilidade,
    distMediaMovel,
    compressao,
    aceleracao,
    volume: totalVolume,
  };
}
