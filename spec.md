# Collie Quantum — Filtro Eliminatório de MA

## Current State
A aba Potencial exibe os top 20 ativos por score. O cruzamento de MA20/MA50 acima de MA180 nos timeframes 3m, 5m e 15m é analisado apenas para esses top 20, e o resultado é aplicado como bônus no score (não é eliminatório). O timeframe de 1m não é analisado. A lógica atual não detecta se o descolamento está iniciando.

## Requested Changes (Diff)

### Add
- Timeframe 1m na análise (peso muito forte = 4)
- Detecção de descolamento iniciando: MA20 e MA50 acima de MA180, com spread < 4% e crescendo
- Detecção de injeção financeira: spike de volume recente
- Score ponderado por timeframe: 1m=4, 3m=3, 5m=2, 15m=1 (máx 10)

### Modify
- computeMASignal em binance.ts: retornar descolamento, volumeSpike e weightedScore
- App.tsx: buscar 1m klines, filtro eliminatório (weightedScore > 0), remover bônus de score
- PotencialTab.tsx: badge MA mostrando score ponderado

### Remove
- Lógica de bônus de score por crossCount

## Implementation Plan
1. Atualizar computeMASignal em binance.ts
2. Atualizar App.tsx com fetch 1m e filtro eliminatório
3. Atualizar PotencialTab.tsx com badge atualizado
