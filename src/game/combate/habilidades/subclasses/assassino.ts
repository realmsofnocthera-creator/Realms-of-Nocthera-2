import { ASSASSINO_KIT, PASSIVAS_SUBCLASSE } from '@/rules/subclasseKits';
import { DefinicaoHabilidade, DefinicaoPassiva, ResultadoHabilidade } from '@/game/combate/habilidades/tipos';

const BASE: Omit<ResultadoHabilidade, 'nome' | 'tipoDano' | 'percentualDano'> = {
  ignorarDefesaPercentual: 0,
  bonusDanoPercentual: 0,
  bonusContraSobreescudoPercentual: 0,
  curaPercentualDanoCausado: 0,
  curaPercentualHpMax: 0,
};

/** Assassino (Bandido de golpe preciso): Ponto Fraco e Sangramento. */
export const HABILIDADES_ASSASSINO: DefinicaoHabilidade[] = [
  {
    id: 'assassino_estocada_furtiva',
    espaco: 'basico',
    tipoDano: 'fisico',
    executar: () => ({
      ...BASE,
      nome: 'Estocada Furtiva',
      tipoDano: 'fisico',
      percentualDano: ASSASSINO_KIT.ESTOCADA_FURTIVA.PERCENTUAL_DANO,
      efeitosNoAlvo: [
        { tipo: 'pontoFraco', percentual: ASSASSINO_KIT.ESTOCADA_FURTIVA.PONTO_FRACO_PERCENTUAL },
      ],
    }),
  },
  {
    id: 'assassino_golpe_nas_sombras',
    espaco: 'especial',
    tipoDano: 'fisico',
    executar: () => ({
      ...BASE,
      nome: 'Golpe nas Sombras',
      tipoDano: 'fisico',
      percentualDano: ASSASSINO_KIT.GOLPE_NAS_SOMBRAS.PERCENTUAL_DANO_POR_GOLPE,
      numeroGolpes: ASSASSINO_KIT.GOLPE_NAS_SOMBRAS.GOLPES,
      statusComChanceNoAlvo: [
        {
          status: 'sangramento',
          chanceExtraPercentual: ASSASSINO_KIT.GOLPE_NAS_SOMBRAS.SANGRAMENTO_CHANCE_EXTRA_PERCENTUAL,
        },
      ],
    }),
  },
  {
    id: 'assassino_execucao_silenciosa',
    espaco: 'ultimate',
    tipoDano: 'fisico',
    executar: () => ({
      ...BASE,
      nome: 'Execução Silenciosa',
      tipoDano: 'fisico',
      percentualDano: ASSASSINO_KIT.EXECUCAO_SILENCIOSA.PERCENTUAL_DANO,
      ignorarDefesaPercentual: ASSASSINO_KIT.EXECUCAO_SILENCIOSA.IGNORAR_DEFESA_PERCENTUAL,
      statusComChanceNoAlvo: [
        {
          status: 'sangramento',
          chanceExtraPercentual: ASSASSINO_KIT.EXECUCAO_SILENCIOSA.SANGRAMENTO_CHANCE_EXTRA_PERCENTUAL,
        },
      ],
    }),
  },
];

export const PASSIVA_ASSASSINO: DefinicaoPassiva = {
  id: 'assassino_instinto_letal',
  modificadores: () => ({
    bonusDanoFisicoPercentual: PASSIVAS_SUBCLASSE.INSTINTO_LETAL.BONUS_DANO_FISICO_PERCENTUAL,
    reducaoDanoFisicoRecebidoPercentual: 0,
    bonusSobreescudoMaxPercentual: 0,
  }),
};
