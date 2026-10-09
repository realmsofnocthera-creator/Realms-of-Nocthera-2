import { DUELISTA_KIT, PASSIVAS_SUBCLASSE } from '@/rules/subclasseKits';
import { DefinicaoHabilidade, DefinicaoPassiva, ResultadoHabilidade } from '@/game/combate/habilidades/tipos';

const BASE: Omit<ResultadoHabilidade, 'nome' | 'tipoDano' | 'percentualDano'> = {
  ignorarDefesaPercentual: 0,
  bonusDanoPercentual: 0,
  bonusContraSobreescudoPercentual: 0,
  curaPercentualDanoCausado: 0,
  curaPercentualHpMax: 0,
};

/** Duelista (Bandido de velocidade e controle): vários golpes, Distração e Sincronismo. */
export const HABILIDADES_DUELISTA: DefinicaoHabilidade[] = [
  {
    id: 'duelista_estocada_dupla',
    espaco: 'basico',
    tipoDano: 'fisico',
    executar: () => ({
      ...BASE,
      nome: 'Estocada Dupla',
      tipoDano: 'fisico',
      percentualDano: DUELISTA_KIT.ESTOCADA_DUPLA.PERCENTUAL_DANO_POR_GOLPE,
      numeroGolpes: DUELISTA_KIT.ESTOCADA_DUPLA.GOLPES,
    }),
  },
  {
    id: 'duelista_finta',
    espaco: 'especial',
    tipoDano: 'fisico',
    executar: () => ({
      ...BASE,
      nome: 'Finta',
      tipoDano: 'fisico',
      percentualDano: DUELISTA_KIT.FINTA.PERCENTUAL_DANO_POR_GOLPE,
      numeroGolpes: DUELISTA_KIT.FINTA.GOLPES,
      efeitosNoAlvo: [{ tipo: 'distracao', acoes: DUELISTA_KIT.FINTA.DISTRACAO_ACOES }],
    }),
  },
  {
    id: 'duelista_duelo_final',
    espaco: 'ultimate',
    tipoDano: 'fisico',
    executar: () => ({
      ...BASE,
      nome: 'Duelo Final',
      tipoDano: 'fisico',
      percentualDano: DUELISTA_KIT.DUELO_FINAL.PERCENTUAL_DANO_POR_GOLPE,
      numeroGolpes: DUELISTA_KIT.DUELO_FINAL.GOLPES,
      buffs: [{ tipo: 'sincronismo', rodadas: DUELISTA_KIT.DUELO_FINAL.SINCRONISMO_RODADAS }],
    }),
  },
];

export const PASSIVA_DUELISTA: DefinicaoPassiva = {
  id: 'duelista_postura_de_duelo',
  modificadores: () => ({
    bonusDanoFisicoPercentual: PASSIVAS_SUBCLASSE.POSTURA_DE_DUELO.BONUS_DANO_FISICO_PERCENTUAL,
    reducaoDanoFisicoRecebidoPercentual: PASSIVAS_SUBCLASSE.POSTURA_DE_DUELO.REDUCAO_DANO_FISICO_RECEBIDO_PERCENTUAL,
    bonusSobreescudoMaxPercentual: 0,
  }),
};
