import { GAME_CONFIG } from '@/rules/config';
import {
  calcularDanoComBonusSomados,
  calcularMitigacaoFisicaEfetiva,
  calcularMitigacaoMagicaEfetiva,
} from '@/game/combate/efeitos';
import { bonusDanoPorMarcas, bonusDanoPorStatus } from '@/game/combate/bonusStatusAlvo';
import { ContextoHabilidade, ResultadoHabilidade } from './tipos';

export function resolverDanoHabilidade(
  r: ResultadoHabilidade,
  ctx: ContextoHabilidade
): { danoBruto: number; mitigacaoEfetiva: number } {
  // Regra 1.2.2: todos os bônus de dano somam num grupo só, com um único arredondamento
  const bonusContraSobreescudo = ctx.alvo.sobreescudo > 0 ? r.bonusContraSobreescudoPercentual : 0;

  // Dano Invertido: quanto mais Sobreescudo o alvo tem, mais dano (entra na mesma soma)
  const bonusInvertido = r.danoInvertido
    ? Math.min(
        r.danoInvertido.tetoPercentual,
        Math.floor(ctx.alvo.sobreescudo / Math.max(1, r.danoInvertido.pontosEscudoPorPasso)) *
          r.danoInvertido.percentualPorPasso
      )
    : 0;

  // Dano Escalado: o dano parte de X% do HP perdido do usuário, no lugar do dano base
  const danoBaseEfetivo = r.danoEscalado
    ? Math.ceil(
        (Math.max(0, ctx.atacante.hpMax - ctx.atacante.hp) * r.danoEscalado.percentualHpPerdido) / 100
      )
    : ctx.danoBase;

  const base = calcularDanoComBonusSomados(danoBaseEfetivo, r.percentualDano, [
    bonusInvertido,
    r.bonusDanoPercentual,
    ctx.bonusDanoExtraPercentual ?? 0,
    bonusContraSobreescudo,
    bonusDanoPorStatus(ctx.alvo.condicoes ?? [], r.bonusPorStatusAlvo),
    r.bonusPorMarca ? bonusDanoPorMarcas(ctx.alvo.marcas) : 0,
  ]);

  const mitigacaoEfetiva =
    r.tipoDano === 'fisico'
      ? calcularMitigacaoFisicaEfetiva(ctx.alvo.mitigacaoFisica, r.ignorarDefesaPercentual)
      : calcularMitigacaoMagicaEfetiva(ctx.alvo.mitigacaoMagica, r.ignorarDefesaPercentual);

  const danoBruto = Math.max(GAME_CONFIG.DANO_MINIMO, base);

  return { danoBruto, mitigacaoEfetiva };
}
