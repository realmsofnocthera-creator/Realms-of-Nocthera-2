import { KENSEI_KIT, PASSIVAS_SUBCLASSE } from '@/rules/subclasseKits';
import { DefinicaoHabilidade, DefinicaoPassiva, ResultadoHabilidade } from '@/game/combate/habilidades/tipos';

const BASE: Omit<ResultadoHabilidade, 'nome' | 'tipoDano' | 'percentualDano'> = {
  ignorarDefesaPercentual: 0,
  bonusDanoPercentual: 0,
  bonusContraSobreescudoPercentual: 0,
  curaPercentualDanoCausado: 0,
  curaPercentualHpMax: 0,
};

/** Kensei (Samurai de golpe único): precisão, Foco e execução. */
export const HABILIDADES_KENSEI: DefinicaoHabilidade[] = [
  {
    id: 'kensei_corte_perfeito',
    espaco: 'basico',
    tipoDano: 'fisico',
    executar: () => ({
      ...BASE,
      nome: 'Corte Perfeito',
      tipoDano: 'fisico',
      percentualDano: KENSEI_KIT.CORTE_PERFEITO.PERCENTUAL_DANO,
      ignorarDefesaPercentual: KENSEI_KIT.CORTE_PERFEITO.IGNORAR_DEFESA_PERCENTUAL,
    }),
  },
  {
    id: 'kensei_lamina_desembainhada',
    espaco: 'especial',
    tipoDano: 'fisico',
    executar: () => ({
      ...BASE,
      nome: 'Lâmina Desembainhada',
      tipoDano: 'fisico',
      percentualDano: KENSEI_KIT.LAMINA_DESEMBAINHADA.PERCENTUAL_DANO,
      ignorarDefesaPercentual: KENSEI_KIT.LAMINA_DESEMBAINHADA.IGNORAR_DEFESA_PERCENTUAL,
      foco: { ignorarDefesaPercentual: KENSEI_KIT.LAMINA_DESEMBAINHADA.FOCO_IGNORAR_DEFESA_PERCENTUAL },
    }),
  },
  {
    id: 'kensei_corte_decisivo',
    espaco: 'ultimate',
    tipoDano: 'fisico',
    executar: (ctx) => {
      const alvoFraco =
        ctx.alvo.hpMax > 0 &&
        ctx.alvo.hp < (ctx.alvo.hpMax * KENSEI_KIT.CORTE_DECISIVO.LIMIAR_HP_ALVO_PERCENTUAL) / 100;
      return {
        ...BASE,
        nome: 'Corte Decisivo',
        tipoDano: 'fisico',
        percentualDano: KENSEI_KIT.CORTE_DECISIVO.PERCENTUAL_DANO,
        ignorarDefesaPercentual: KENSEI_KIT.CORTE_DECISIVO.IGNORAR_DEFESA_PERCENTUAL,
        bonusDanoPercentual: alvoFraco ? KENSEI_KIT.CORTE_DECISIVO.BONUS_ALVO_ABAIXO_30_HP_PERCENTUAL : 0,
      };
    },
  },
];

export const PASSIVA_KENSEI: DefinicaoPassiva = {
  id: 'kensei_lamina_perfeita',
  modificadores: () => ({
    bonusDanoFisicoPercentual: PASSIVAS_SUBCLASSE.LAMINA_PERFEITA.BONUS_DANO_FISICO_PERCENTUAL,
    reducaoDanoFisicoRecebidoPercentual: 0,
    bonusSobreescudoMaxPercentual: 0,
  }),
};
