import { GAME_CONFIG } from '@/rules/config';
import {
  calcularDanoComBonusSomados,
  calcularMitigacaoFisicaEfetiva,
  calcularMitigacaoMagicaEfetiva,
} from '@/game/combate/efeitos';
import { ContextoHabilidade, ResultadoHabilidade } from './tipos';

export function resolverDanoHabilidade(
  r: ResultadoHabilidade,
  ctx: ContextoHabilidade
): { danoBruto: number; mitigacaoEfetiva: number } {
  // Regra 1.2.2: todos os bônus de dano somam num grupo só, com um único arredondamento
  const bonusContraSobreescudo = ctx.alvo.sobreescudo > 0 ? r.bonusContraSobreescudoPercentual : 0;
  const base = calcularDanoComBonusSomados(ctx.danoBase, r.percentualDano, [
    r.bonusDanoPercentual,
    ctx.bonusDanoExtraPercentual ?? 0,
    bonusContraSobreescudo,
  ]);

  const mitigacaoEfetiva =
    r.tipoDano === 'fisico'
      ? calcularMitigacaoFisicaEfetiva(ctx.alvo.mitigacaoFisica, r.ignorarDefesaPercentual)
      : calcularMitigacaoMagicaEfetiva(ctx.alvo.mitigacaoMagica, r.ignorarDefesaPercentual);

  const danoBruto = Math.max(GAME_CONFIG.DANO_MINIMO, base);

  return { danoBruto, mitigacaoEfetiva };
}
