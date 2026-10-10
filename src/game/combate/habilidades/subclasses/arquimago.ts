import { ARQUIMAGO_KIT, PASSIVAS_SUBCLASSE } from '@/rules/subclasseKits';
import { DefinicaoHabilidade, DefinicaoPassiva, ResultadoHabilidade } from '@/game/combate/habilidades/tipos';

const BASE: Omit<ResultadoHabilidade, 'nome' | 'tipoDano' | 'percentualDano'> = {
  ignorarDefesaPercentual: 0,
  bonusDanoPercentual: 0,
  bonusContraSobreescudoPercentual: 0,
  curaPercentualDanoCausado: 0,
  curaPercentualHpMax: 0,
  bonusElemental: true,
};

/** Arquimago (Feiticeiro de dano puro): fogo, raios e meteoros. */
export const HABILIDADES_ARQUIMAGO: DefinicaoHabilidade[] = [
  {
    id: 'arquimago_bola_de_fogo',
    espaco: 'basico',
    tipoDano: 'magico',
    executar: () => ({
      ...BASE,
      nome: 'Bola de Fogo',
      tipoDano: 'magico',
      elemento: 'fogo',
      percentualDano: ARQUIMAGO_KIT.BOLA_DE_FOGO.PERCENTUAL_DANO,
    }),
  },
  {
    id: 'arquimago_tempestade_de_raios',
    espaco: 'especial',
    tipoDano: 'magico',
    executar: () => ({
      ...BASE,
      nome: 'Tempestade de Raios',
      tipoDano: 'magico',
      elemento: 'relampago',
      percentualDano: ARQUIMAGO_KIT.TEMPESTADE_DE_RAIOS.PERCENTUAL_DANO_POR_GOLPE,
      numeroGolpes: ARQUIMAGO_KIT.TEMPESTADE_DE_RAIOS.GOLPES,
      statusComChanceNoAlvo: [
        { status: 'paralisia', chanceExtraPercentual: ARQUIMAGO_KIT.TEMPESTADE_DE_RAIOS.PARALISIA_CHANCE_EXTRA_PERCENTUAL },
      ],
    }),
  },
  {
    id: 'arquimago_meteoro',
    espaco: 'ultimate',
    tipoDano: 'magico',
    executar: () => ({
      ...BASE,
      nome: 'Meteoro',
      tipoDano: 'magico',
      elemento: 'fogo',
      percentualDano: ARQUIMAGO_KIT.METEORO.PERCENTUAL_DANO,
      ignorarDefesaPercentual: ARQUIMAGO_KIT.METEORO.IGNORAR_DEFESA_PERCENTUAL,
      bonusContraSobreescudoPercentual: ARQUIMAGO_KIT.METEORO.BONUS_CONTRA_SOBREESCUDO_PERCENTUAL,
      statusForcadosNoAlvo: ['queimadura'],
    }),
  },
];

export const PASSIVA_ARQUIMAGO: DefinicaoPassiva = {
  id: 'arquimago_poder_arcano',
  modificadores: () => ({
    bonusDanoFisicoPercentual: 0,
    reducaoDanoFisicoRecebidoPercentual: 0,
    bonusSobreescudoMaxPercentual: 0,
    bonusDanoMagicoPercentual: PASSIVAS_SUBCLASSE.PODER_ARCANO.BONUS_DANO_MAGICO_PERCENTUAL,
  }),
};
