import { PASSIVAS_SUBCLASSE, VANGUARDA_KIT } from '@/rules/subclasseKits';
import { DefinicaoHabilidade, DefinicaoPassiva, ResultadoHabilidade } from '@/game/combate/habilidades/tipos';

const BASE: Omit<ResultadoHabilidade, 'nome' | 'tipoDano' | 'percentualDano'> = {
  ignorarDefesaPercentual: 0,
  bonusDanoPercentual: 0,
  bonusContraSobreescudoPercentual: 0,
  curaPercentualDanoCausado: 0,
  curaPercentualHpMax: 0,
};

/** Vanguarda (Cavaleiro ofensivo): marca o alvo, enfraquece e quebra a defesa. */
export const HABILIDADES_VANGUARDA: DefinicaoHabilidade[] = [
  {
    id: 'vanguarda_estocada_da_vanguarda',
    espaco: 'basico',
    tipoDano: 'fisico',
    executar: () => ({
      ...BASE,
      nome: 'Estocada da Vanguarda',
      tipoDano: 'fisico',
      percentualDano: VANGUARDA_KIT.ESTOCADA_DA_VANGUARDA.PERCENTUAL_DANO,
      marcar: true,
      bonusPorMarca: true,
    }),
  },
  {
    id: 'vanguarda_carga_esmagadora',
    espaco: 'especial',
    tipoDano: 'fisico',
    executar: () => ({
      ...BASE,
      nome: 'Carga Esmagadora',
      tipoDano: 'fisico',
      percentualDano: VANGUARDA_KIT.CARGA_ESMAGADORA.PERCENTUAL_DANO,
      ignorarDefesaPercentual: VANGUARDA_KIT.CARGA_ESMAGADORA.IGNORAR_DEFESA_PERCENTUAL,
      efeitosNoAlvo: [
        {
          tipo: 'enfraquecimento',
          percentual: VANGUARDA_KIT.CARGA_ESMAGADORA.ENFRAQUECIMENTO_PERCENTUAL,
          rodadas: VANGUARDA_KIT.CARGA_ESMAGADORA.ENFRAQUECIMENTO_RODADAS,
        },
      ],
      marcar: true,
    }),
  },
  {
    id: 'vanguarda_estandarte_de_guerra',
    espaco: 'ultimate',
    tipoDano: 'fisico',
    executar: () => ({
      ...BASE,
      nome: 'Estandarte de Guerra',
      tipoDano: 'fisico',
      percentualDano: VANGUARDA_KIT.ESTANDARTE_DE_GUERRA.PERCENTUAL_DANO,
      ignorarDefesaPercentual: VANGUARDA_KIT.ESTANDARTE_DE_GUERRA.IGNORAR_DEFESA_PERCENTUAL,
      bonusContraSobreescudoPercentual: VANGUARDA_KIT.ESTANDARTE_DE_GUERRA.BONUS_CONTRA_SOBREESCUDO_PERCENTUAL,
      bonusPorMarca: true,
      buffs: [
        {
          tipo: 'atributo',
          atributo: 'forca',
          valor: VANGUARDA_KIT.ESTANDARTE_DE_GUERRA.BONUS_FORCA,
          rodadas: VANGUARDA_KIT.ESTANDARTE_DE_GUERRA.BONUS_FORCA_RODADAS,
        },
      ],
    }),
  },
];

export const PASSIVA_VANGUARDA: DefinicaoPassiva = {
  id: 'vanguarda_linha_de_frente',
  modificadores: () => ({
    bonusDanoFisicoPercentual: PASSIVAS_SUBCLASSE.LINHA_DE_FRENTE.BONUS_DANO_FISICO_PERCENTUAL,
    reducaoDanoFisicoRecebidoPercentual:
      PASSIVAS_SUBCLASSE.LINHA_DE_FRENTE.REDUCAO_DANO_FISICO_RECEBIDO_PERCENTUAL,
    bonusSobreescudoMaxPercentual: 0,
  }),
};
