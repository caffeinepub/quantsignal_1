# QuantSignal

## Current State
Novo projeto vazio.

## Requested Changes (Diff)

### Add
- App completo QuantSignal: ferramenta de análise quantitativa de criptoativos
- Backend Motoko: armazena ativos e padrões, calcula score de similaridade (sem HTTP outcalls)
- Frontend React: busca dados da Binance via fetch(), processa e exibe em 3 abas

### Modify
- N/A

### Remove
- N/A

## Implementation Plan

### Backend (Motoko)
- Types: Ativo { symbol, preco, variacao, volume, score }, Padrao { symbol, volatilidade, volume, distMediaMovel, compressao, aceleracao }
- stable var ativos : [Ativo] = []
- stable var padroes : [Padrao] = []
- salvarAtivos(dados: [Ativo]) : async ()
- salvarPadrao(p: Padrao) : async ()
- getAtivos() : async [Ativo]
- getPadroes() : async [Padrao]
- calcularScore(p: Padrao) : async Float — média ponderada vs padrões históricos (volume 30%, volatilidade 25%, distMA 20%, compressão 15%, aceleração 10%); retorna 0.0 se padroes vazio

### Frontend (React)
- Fetch direto à Binance API pública:
  - https://api.binance.com/api/v3/ticker/24hr — lista de preços/variação 24h
  - https://api.binance.com/api/v3/klines — klines por símbolo
- Botão "Atualizar Dados" dispara o fetch
- Aba 1 "Em Alta": ativos com variação >8% (threshold configurável)
- Aba 2 "Potencial": ativos ordenados por score (0-100) com breakdown de indicadores
- Aba 3 "Padrões Históricos": padrões armazenados com perfil estatístico
- UI em português, compacta e clara
