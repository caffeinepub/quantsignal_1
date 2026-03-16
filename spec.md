# QuantSignal

## Current State
- App has 3 tabs: Em Alta, Potencial, Padrões Históricos
- Potencial tab shows top 20 assets filtered by MA20/MA50/MA180 eliminatory crossover (1m/3m/5m/15m weighted)
- Cards expandidos mostram indicadores, sinais de trading e análise técnica
- Auto-refresh a cada 5 minutos com countdown no header

## Requested Changes (Diff)

### Add
- Avaliação do sinal Radar (approve/manual_review/reject) calculada para cada ativo que passou o filtro MA, exibida nos cards da aba Potencial
- Badge visual no card: verde (approve), amarelo (manual_review), vermelho (reject)
- Seção expandida "Avaliação Radar" com: decisão, confidence, reason_short, pros, cons, risk_flags
- Funções em binance.ts: fetchFuturesOIHist, fetchFuturesLSR, fetchFuturesKlines, computeRadarSignal
- BTC return calculado uma vez por ciclo e reutilizado para todos os ativos

### Modify
- Intervalo de auto-refresh: 5 minutos → 30 segundos
- Countdown no header: 300s → 30s
- PotencialTab: aceitar radarMap prop e exibir avaliação nos cards
- App.tsx: após fase MA, fase adicional de Radar fetch para ativos que passaram o filtro

### Remove
- Nada removido

## Implementation Plan
1. binance.ts: adicionar fetchFuturesOIHist, fetchFuturesLSR, computeRadarSignal (EXP simplificado via retorno relativo vs BTC)
2. App.tsx: mudar intervalo para 30s, adicionar fase Radar após MA, passar radarMap para PotencialTab
3. PotencialTab.tsx: aceitar RadarSignal map, exibir badge de decisão no header do card e seção detalhada expandida
