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
