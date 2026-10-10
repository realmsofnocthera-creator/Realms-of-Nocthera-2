import { PASSIVAS_SUBCLASSE, SABIO_ARCANO_KIT } from '@/rules/subclasseKits';
import { BONUS_DANO_POR_CONDICAO_PERCENTUAL, CondicaoAlvo } from '@/game/combate/bonusStatusAlvo';
import { DefinicaoHabilidade, DefinicaoPassiva, ResultadoHabilidade } from '@/game/combate/habilidades/tipos';

const BASE: Omit<ResultadoHabilidade, 'nome' | 'tipoDano' | 'percentualDano'> = {
  ignorarDefesaPercentual: 0,
  bonusDanoPercentual: 0,
  bonusContraSobreescudoPercentual: 0,
  curaPercentualDanoCausado: 0,
  curaPercentualHpMax: 0,
};

/** Todas as condições da lista de bônus por status (Sangramento, Veneno, Congelado, Dormindo...). */
const TODAS_AS_CONDICOES = Object.keys(BONUS_DANO_POR_CONDICAO_PERCENTUAL) as CondicaoAlvo[];

/** Sábio Arcano (Feiticeiro de controle): gelo, sono e loucura, com dano maior contra quem está sob status. */
export const HABILIDADES_SABIO_ARCANO: DefinicaoHabilidade[] = [
  {
    id: 'sabio_arcano_lanca_de_gelo',
    espaco: 'basico',
    tipoDano: 'magico',
    executar: () => ({
      ...BASE,
      nome: 'Lança de Gelo',
      tipoDano: 'magico',
      elemento: 'gelo',
      bonusElemental: true,
      percentualDano: SABIO_ARCANO_KIT.LANCA_DE_GELO.PERCENTUAL_DANO,
      statusComChanceNoAlvo: [
        { status: 'congelamento', chanceExtraPercentual: SABIO_ARCANO_KIT.LANCA_DE_GELO.CONGELAMENTO_CHANCE_EXTRA_PERCENTUAL },
      ],
    }),
  },
  {
    id: 'sabio_arcano_feitico_do_torpor',
    espaco: 'especial',
    tipoDano: 'magico',
    executar: () => ({
      ...BASE,
      nome: 'Feitiço do Torpor',
      tipoDano: 'magico',
      percentualDano: SABIO_ARCANO_KIT.FEITICO_DO_TORPOR.PERCENTUAL_DANO,
      statusComChanceNoAlvo: [
        { status: 'sono', chanceExtraPercentual: SABIO_ARCANO_KIT.FEITICO_DO_TORPOR.SONO_CHANCE_EXTRA_PERCENTUAL },
      ],
    }),
  },
  {
    id: 'sabio_arcano_eclipse_da_mente',
    espaco: 'ultimate',
    tipoDano: 'magico',
    executar: () => ({
      ...BASE,
      nome: 'Eclipse da Mente',
      tipoDano: 'magico',
      percentualDano: SABIO_ARCANO_KIT.ECLIPSE_DA_MENTE.PERCENTUAL_DANO,
      ignorarDefesaPercentual: SABIO_ARCANO_KIT.ECLIPSE_DA_MENTE.IGNORAR_DEFESA_PERCENTUAL,
      bonusPorStatusAlvo: TODAS_AS_CONDICOES,
      statusComChanceNoAlvo: [
        { status: 'loucura', chanceExtraPercentual: SABIO_ARCANO_KIT.ECLIPSE_DA_MENTE.LOUCURA_CHANCE_EXTRA_PERCENTUAL },
      ],
    }),
  },
];

export const PASSIVA_SABIO_ARCANO: DefinicaoPassiva = {
  id: 'sabio_arcano_sabedoria_arcana',
  modificadores: () => ({
    bonusDanoFisicoPercentual: 0,
    reducaoDanoFisicoRecebidoPercentual: 0,
    bonusSobreescudoMaxPercentual: 0,
    bonusDanoMagicoPercentual: PASSIVAS_SUBCLASSE.SABEDORIA_ARCANA.BONUS_DANO_MAGICO_PERCENTUAL,
    reducaoDanoMagicoRecebidoPercentual: PASSIVAS_SUBCLASSE.SABEDORIA_ARCANA.REDUCAO_DANO_MAGICO_RECEBIDO_PERCENTUAL,
  }),
};
