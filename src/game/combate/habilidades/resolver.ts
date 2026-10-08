import { GAME_CONFIG } from '@/rules/config';
import {
  aplicarBonusContraSobreescudo,
  calcularMitigacaoFisicaEfetiva,
  calcularMitigacaoMagicaEfetiva,
} from '@/game/combate/efeitos';
import { ContextoHabilidade, ResultadoHabilidade } from './tipos';

export function resolverDanoHabilidade(
  r: ResultadoHabilidade,
  ctx: ContextoHabilidade
): { danoBruto: number; mitigacaoEfetiva: number } {
  let base = Math.ceil((ctx.danoBase * r.percentualDano) / 100);

  if (r.bonusDanoPercentual > 0) {
    base = Math.ceil((base * (100 + r.bonusDanoPercentual)) / 100);
  }

  base = aplicarBonusContraSobreescudo(
    base,
    ctx.alvo.sobreescudo,
    r.bonusContraSobreescudoPercentual
  );

  const mitigacaoEfetiva =
    r.tipoDano === 'fisico'
      ? calcularMitigacaoFisicaEfetiva(ctx.alvo.mitigacaoFisica, r.ignorarDefesaPercentual)
      : calcularMitigacaoMagicaEfetiva(ctx.alvo.mitigacaoMagica, r.ignorarDefesaPercentual);

  const danoBruto = Math.max(GAME_CONFIG.DANO_MINIMO, base);

  return { danoBruto, mitigacaoEfetiva };
}
