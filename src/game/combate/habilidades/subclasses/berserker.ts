import { BERSERKER_KIT, PASSIVAS_SUBCLASSE } from '@/rules/subclasseKits';
import { DefinicaoHabilidade, DefinicaoPassiva } from '@/game/combate/habilidades/tipos';

export const HABILIDADES_BERSERKER: DefinicaoHabilidade[] = [
  {
    id: 'berserker_golpe_desenfreado',
    espaco: 'basico',
    tipoDano: 'fisico',
    executar: () => ({
      nome: 'Golpe Desenfreado',
      tipoDano: 'fisico',
      percentualDano: BERSERKER_KIT.GOLPE_DESENFREADO.PERCENTUAL_DANO,
      ignorarDefesaPercentual: 0,
      bonusDanoPercentual: 0,
      bonusContraSobreescudoPercentual: 0,
      curaPercentualDanoCausado: 0,
      curaPercentualHpMax: 0,
    }),
  },
  {
    id: 'berserker_investida_sangrenta',
    espaco: 'especial',
    tipoDano: 'fisico',
    executar: (ctx) => {
      const hpAbaixo50 =
        ctx.atacante.hpMax > 0 &&
        ctx.atacante.hp <
          (ctx.atacante.hpMax * BERSERKER_KIT.INVESTIDA_SANGRENTA.LIMIAR_HP_CONDICIONAL_PERCENTUAL) / 100;

      const percentualDano = hpAbaixo50
        ? BERSERKER_KIT.INVESTIDA_SANGRENTA.PERCENTUAL_DANO_ABAIXO_50_HP
        : BERSERKER_KIT.INVESTIDA_SANGRENTA.PERCENTUAL_DANO_NORMAL;

      return {
        nome: 'Investida Sangrenta',
        tipoDano: 'fisico',
        percentualDano,
        ignorarDefesaPercentual: BERSERKER_KIT.INVESTIDA_SANGRENTA.IGNORAR_DEFESA_PERCENTUAL,
        bonusDanoPercentual: 0,
        bonusContraSobreescudoPercentual: 0,
        curaPercentualDanoCausado: 0,
        curaPercentualHpMax: 0,
      };
    },
  },
  {
    id: 'berserker_desvario_final',
    espaco: 'ultimate',
    tipoDano: 'fisico',
    executar: (ctx) => {
      const hpAbaixo30 =
        ctx.atacante.hpMax > 0 &&
        ctx.atacante.hp <
          (ctx.atacante.hpMax * BERSERKER_KIT.DESVARIO_FINAL.LIMIAR_HP_CONDICIONAL_PERCENTUAL) / 100;

      const bonusDanoPercentual = hpAbaixo30
        ? BERSERKER_KIT.DESVARIO_FINAL.BONUS_DANO_ABAIXO_30_HP_PERCENTUAL
        : 0;

      return {
        nome: 'Desvario Final',
        tipoDano: 'fisico',
        percentualDano: BERSERKER_KIT.DESVARIO_FINAL.PERCENTUAL_DANO,
        ignorarDefesaPercentual: BERSERKER_KIT.DESVARIO_FINAL.IGNORAR_DEFESA_PERCENTUAL,
        bonusDanoPercentual,
        bonusContraSobreescudoPercentual:
          BERSERKER_KIT.DESVARIO_FINAL.BONUS_CONTRA_SOBREESCUDO_PERCENTUAL,
        curaPercentualDanoCausado: 0,
        curaPercentualHpMax: 0,
      };
    },
  },
];

export const PASSIVA_BERSERKER: DefinicaoPassiva = {
  id: 'berserker_frenesi',
  modificadores: ({ hp, hpMax }) => {
    if (hpMax <= 0 || hp >= hpMax) {
      return {
        bonusDanoFisicoPercentual: 0,
        reducaoDanoFisicoRecebidoPercentual: 0,
        bonusSobreescudoMaxPercentual: 0,
      };
    }
    const hpPerdidoPercentual = ((hpMax - Math.max(0, hp)) / hpMax) * 100;
    const bonus = Math.min(
      PASSIVAS_SUBCLASSE.FRENESI.TETO_BONUS_DANO_PERCENTUAL,
      Math.floor(hpPerdidoPercentual / PASSIVAS_SUBCLASSE.FRENESI.PONTOS_PERCENTUAIS_POR_BONUS)
    );
    return {
      bonusDanoFisicoPercentual: bonus,
      reducaoDanoFisicoRecebidoPercentual: 0,
      bonusSobreescudoMaxPercentual: 0,
    };
  },
};

