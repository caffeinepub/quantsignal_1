import Float "mo:core/Float";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Int "mo:core/Int";

actor {
  // Types
  type Ativo = {
    symbol : Text;
    preco : Float;
    variacao : Float;
    volume : Float;
    score : Float;
  };

  type Padrao = {
    symbol : Text;
    volatilidade : Float;
    volume : Float;
    distMediaMovel : Float;
    compressao : Float;
    aceleracao : Float;
  };

  // Stable state
  var ativos : [Ativo] = [];
  var padroes : [Padrao] = [];

  // Public functions

  // 1. Salvar ativos
  public shared ({ caller }) func salvarAtivos(dados : [Ativo]) : async () {
    ativos := dados;
  };

  // 2. Salvar novo padrão
  public shared ({ caller }) func salvarPadrao(p : Padrao) : async () {
    padroes := padroes.concat([p]);
  };

  // 3. Get all ativos
  public query ({ caller }) func getAtivos() : async [Ativo] {
    ativos;
  };

  // 4. Get all padroes
  public query ({ caller }) func getPadroes() : async [Padrao] {
    padroes;
  };

  // Helper for clamping floats between min and max
  func clamp(value : Float, min : Float, max : Float) : Float {
    if (value < min) { return min };
    if (value > max) { return max };
    value;
  };

  // 5. Calcular score de similaridade
  public query ({ caller }) func calcularScore(p : Padrao) : async Float {
    if (padroes.size() == 0) { return 0.0 };

    // Calculate averages
    var sumVolatilidade = 0.0;
    var sumVolume = 0.0;
    var sumDistMediaMovel = 0.0;
    var sumCompressao = 0.0;
    var sumAceleracao = 0.0;

    for (padrao in padroes.values()) {
      sumVolatilidade += padrao.volatilidade;
      sumVolume += padrao.volume;
      sumDistMediaMovel += padrao.distMediaMovel;
      sumCompressao += padrao.compressao;
      sumAceleracao += padrao.aceleracao;
    };

    let count = padroes.size().toInt().toFloat();
    let avgVolatilidade = sumVolatilidade / count;
    let avgVolume = sumVolume / count;
    let avgDistMediaMovel = sumDistMediaMovel / count;
    let avgCompressao = sumCompressao / count;
    let avgAceleracao = sumAceleracao / count;

    // Proximity formula
    func proximity(val : Float, avg : Float) : Float {
      clamp(100.0 - Float.abs((val - avg) / avg * 100.0), 0.0, 100.0);
    };

    let scoreVolume = proximity(p.volume, avgVolume) * 0.3;
    let scoreVolatilidade = proximity(p.volatilidade, avgVolatilidade) * 0.25;
    let scoreDistMediaMovel = proximity(p.distMediaMovel, avgDistMediaMovel) * 0.2;
    let scoreCompressao = proximity(p.compressao, avgCompressao) * 0.15;
    let scoreAceleracao = proximity(p.aceleracao, avgAceleracao) * 0.1;

    // Weighted average final score
    let rawScore = scoreVolume + scoreVolatilidade + scoreDistMediaMovel + scoreCompressao + scoreAceleracao;

    clamp(rawScore, 0.0, 100.0);
  };

  // 6. Limpar dados
  public shared ({ caller }) func limparDados() : async () {
    ativos := [];
    padroes := [];
  };
};
