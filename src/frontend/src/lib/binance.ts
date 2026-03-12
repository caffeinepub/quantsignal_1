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
}

export interface ComputedIndicators {
  volatilidade: number;
  distMediaMovel: number;
  compressao: number;
  aceleracao: number;
  volume: number;
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
  }));
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
