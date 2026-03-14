# Collie Quantum

## Current State
App fetches tickers from Binance, filters top 100 USDT pairs by volume, computes indicators (volatility, distMA, compression, acceleration) via 1h klines, calculates scores, and displays results. User triggers refresh manually via button. No auto-refresh. Score is calculated from basic indicators only.

## Requested Changes (Diff)

### Add
- `fetchKlinesMultiTF(symbol)`: fetches klines for 3m, 5m, and 15m timeframes (180 candles each) from Binance
- `computeMASignal(klines)`: calculates MA20, MA50, MA180 from klines and returns:
  - `maCross`: boolean — true if MA20 > MA180 AND MA50 > MA180 (golden cross)
  - `tradeAcceleration`: ratio of recent 5-candle trade count vs previous 20-candle average (using kline field index 8 = number of trades)
- Score bonus system: after computing initial scores, take top 20 assets by score, fetch multi-TF klines for those 20 only, then apply bonus:
  - MA cross confirmed in all 3 timeframes: +20 points
  - MA cross in 2 timeframes: +10 points
  - MA cross in 1 timeframe: +5 points
  - Trade count acceleration > 1.5x: +10 points
- Auto-refresh every 5 minutes after the first successful data fetch completes
- Countdown timer in header showing time until next auto-refresh (e.g. "Próxima atualização: 4:32")
- Loading message updated to reflect multi-TF analysis phase
- `maCrossSignal` field displayed in PotencialTab expanded card (e.g. "Cruzamento MA: 3/3 TFs" or "Cruzamento MA: 2/3 TFs")

### Modify
- `App.tsx`: after initial score calculation, extract top 20 by score, fetch multi-TF for them only, apply bonuses, re-sort by final score before display
- `App.tsx`: add `useEffect` with `setInterval` (5 min) to call `handleAtualizar` after first load completes
- `PotencialTab.tsx`: accept and display MA cross signal per asset in expanded card indicator grid
- `binance.ts`: add `fetchKlinesMultiTF` and `computeMASignal` functions; extend `BinanceKline` with `tradeCount` field

### Remove
- Nothing removed

## Implementation Plan
1. Extend `BinanceKline` to include `tradeCount` (field index 8 in Binance kline array)
2. Add `fetchKlinesForTF(symbol, interval, limit)` generic helper
3. Add `computeMASignal(klines)` returning `{ maCross: boolean, tradeAcceleration: number }`
4. In `App.tsx` `handleAtualizar`:
   a. After initial score calc, sort by score and take top 20
   b. Fetch klines for 3m, 5m, 15m for each of the 20 (60 total calls, batched 10 at a time)
   c. Compute MA signal per asset per TF
   d. Apply score bonuses
   e. Merge back into full ativosParaSalvar list with updated scores
5. Add `useEffect` to start 5-min interval after `lastUpdated` is set for first time
6. Add countdown display in header
7. Update `PotencialTab` to show MA cross TF count in indicator row
