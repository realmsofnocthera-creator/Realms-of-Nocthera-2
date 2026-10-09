import { PASSIVAS_SUBCLASSE, RONIN_KIT } from '@/rules/subclasseKits';
import { DefinicaoHabilidade, DefinicaoPassiva, ResultadoHabilidade } from '@/game/combate/habilidades/tipos';

const BASE: Omit<ResultadoHabilidade, 'nome' | 'tipoDano' | 'percentualDano'> = {
  ignorarDefesaPercentual: 0,
  bonusDanoPercentual: 0,
  bonusContraSobreescudoPercentual: 0,
  curaPercentualDanoCausado: 0,
  curaPercentualHpMax: 0,
};

/** Ronin (Samurai de golpes rápidos): vários golpes por ação, Exaustão e Sincronismo. */
export const HABILIDADES_RONIN: DefinicaoHabilidade[] = [
  {
    id: 'ronin_corte_relampago',
    espaco: 'basico',
    tipoDano: 'fisico',
    executar: () => ({
      ...BASE,
      nome: 'Corte Relâmpago',
      tipoDano: 'fisico',
      percentualDano: RONIN_KIT.CORTE_RELAMPAGO.PERCENTUAL_DANO_POR_GOLPE,
      numeroGolpes: RONIN_KIT.CORTE_RELAMPAGO.GOLPES,
    }),
  },
  {
    id: 'ronin_danca_da_lamina_solitaria',
    espaco: 'especial',
    tipoDano: 'fisico',
    executar: () => ({
      ...BASE,
      nome: 'Dança da Lâmina Solitária',
      tipoDano: 'fisico',
      percentualDano: RONIN_KIT.DANCA_DA_LAMINA_SOLITARIA.PERCENTUAL_DANO_POR_GOLPE,
      numeroGolpes: RONIN_KIT.DANCA_DA_LAMINA_SOLITARIA.GOLPES,
      efeitosNoAlvo: [
        {
          tipo: 'exaustao',
          percentual: RONIN_KIT.DANCA_DA_LAMINA_SOLITARIA.EXAUSTAO_PERCENTUAL,
          rodadas: RONIN_KIT.DANCA_DA_LAMINA_SOLITARIA.EXAUSTAO_RODADAS,
        },
      ],
    }),
  },
  {
    id: 'ronin_quatro_ventos',
    espaco: 'ultimate',
    tipoDano: 'fisico',
    executar: () => ({
      ...BASE,
      nome: 'Quatro Ventos',
      tipoDano: 'fisico',
      percentualDano: RONIN_KIT.QUATRO_VENTOS.PERCENTUAL_DANO_POR_GOLPE,
      numeroGolpes: RONIN_KIT.QUATRO_VENTOS.GOLPES,
      buffs: [
        {
          tipo: 'atributo',
          atributo: 'agilidade',
          valor: RONIN_KIT.QUATRO_VENTOS.BONUS_AGILIDADE,
          rodadas: RONIN_KIT.QUATRO_VENTOS.BONUS_AGILIDADE_RODADAS,
        },
      ],
      buffsComChance: [
        {
          buff: { tipo: 'sincronismo', rodadas: RONIN_KIT.QUATRO_VENTOS.SINCRONISMO_RODADAS },
          chancePercentual: RONIN_KIT.QUATRO_VENTOS.SINCRONISMO_CHANCE_PERCENTUAL,
        },
      ],
    }),
  },
];

export const PASSIVA_RONIN: DefinicaoPassiva = {
  id: 'ronin_passo_livre',
  modificadores: () => ({
    bonusDanoFisicoPercentual: PASSIVAS_SUBCLASSE.PASSO_LIVRE.BONUS_DANO_FISICO_PERCENTUAL,
    reducaoDanoFisicoRecebidoPercentual: PASSIVAS_SUBCLASSE.PASSO_LIVRE.REDUCAO_DANO_FISICO_RECEBIDO_PERCENTUAL,
    bonusSobreescudoMaxPercentual: 0,
  }),
};
