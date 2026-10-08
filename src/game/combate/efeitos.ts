import { GAME_CONFIG } from '../../rules/config';

/**
 * Aplica bônus percentual de dano contra o Sobreescudo do alvo se o alvo possuir Sobreescudo ativo (> 0).
 * Arredondamento para cima (Math.ceil), idêntico à regra original do Cataclismo Arcano e Corte do Vazio.
 */
export function aplicarBonusContraSobreescudo(
  dano: number,
  sobreescudoAlvo: number,
  percentual: number
): number {
  if (sobreescudoAlvo <= 0 || percentual <= 0) {
    return dano;
  }
  return Math.ceil((dano * (100 + percentual)) / 100);
}

/**
 * Aplica redução percentual no dano bruto recebido pelo defensor.
 * Arredondamento para baixo (Math.floor), respeitando o dano mínimo de GAME_CONFIG.DANO_MINIMO (1).
 * Idêntico à regra original utilizada em aplicarDefesaCavaleiro.
 */
export function reduzirDanoPercentual(danoBruto: number, percentual: number): number {
  if (percentual <= 0) {
    return Math.max(GAME_CONFIG.DANO_MINIMO, danoBruto);
  }
  const fator = Math.max(0, 100 - percentual);
  const reduzido = Math.floor((danoBruto * fator) / 100);
  return Math.max(GAME_CONFIG.DANO_MINIMO, reduzido);
}

/**
 * Reduz a mitigação mágica aplicada em determinado percentual (ex: 10% para Explosão Arcana,
 * 20% para Cataclismo Arcano) antes do cálculo de dano.
 */
export function calcularMitigacaoMagicaEfetiva(
  mitigacaoMagica: number,
  percentualIgnorado: number
): number {
  if (mitigacaoMagica <= 0) return 0;
  if (percentualIgnorado <= 0) return mitigacaoMagica;
  return Math.floor((mitigacaoMagica * Math.max(0, 100 - percentualIgnorado)) / 100);
}

/**
 * Reduz a Defesa Física / mitigação física aplicada em determinado percentual
 * (ex: 5% por golpe em Dança das Lâminas do Bandido) antes do cálculo de dano.
 */
export function calcularMitigacaoFisicaEfetiva(
  mitigacaoFisica: number,
  percentualIgnorado: number
): number {
  if (mitigacaoFisica <= 0) return 0;
  if (percentualIgnorado <= 0) return mitigacaoFisica;
  return Math.floor((mitigacaoFisica * Math.max(0, 100 - percentualIgnorado)) / 100);
}
