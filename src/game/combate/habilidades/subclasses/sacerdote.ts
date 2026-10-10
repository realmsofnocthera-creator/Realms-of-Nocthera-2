import { PASSIVAS_SUBCLASSE, SACERDOTE_KIT } from '@/rules/subclasseKits';
import { DefinicaoHabilidade, DefinicaoPassiva, ResultadoHabilidade } from '@/game/combate/habilidades/tipos';

const BASE: Omit<ResultadoHabilidade, 'nome' | 'tipoDano' | 'percentualDano'> = {
  ignorarDefesaPercentual: 0,
  bonusDanoPercentual: 0,
  bonusContraSobreescudoPercentual: 0,
  curaPercentualDanoCausado: 0,
  curaPercentualHpMax: 0,
  elemento: 'sagrado',
  bonusElemental: true,
};

/** Sacerdote (Profeta de cura e sustentação): dano sagrado que cura, limpa e traz de volta. */
export const HABILIDADES_SACERDOTE: DefinicaoHabilidade[] = [
  {
    id: 'sacerdote_toque_sagrado',
    espaco: 'basico',
    tipoDano: 'magico',
    executar: () => ({
      ...BASE,
      nome: 'Toque Sagrado',
      tipoDano: 'magico',
      percentualDano: SACERDOTE_KIT.TOQUE_SAGRADO.PERCENTUAL_DANO,
      efeitosCura: [
        { efeito: 'curaDireta', percentualHpMax: SACERDOTE_KIT.TOQUE_SAGRADO.CURA_DIRETA_PERCENTUAL_HP_MAX },
      ],
    }),
  },
  {
    id: 'sacerdote_prece_de_cura',
    espaco: 'especial',
    tipoDano: 'magico',
    executar: () => ({
      ...BASE,
      nome: 'Prece de Cura',
      tipoDano: 'magico',
      percentualDano: SACERDOTE_KIT.PRECE_DE_CURA.PERCENTUAL_DANO,
      efeitosCura: [
        {
          efeito: 'limpeza',
          quantidadeEfeitos: SACERDOTE_KIT.PRECE_DE_CURA.LIMPEZA_EFEITOS,
          percentualHpMax: SACERDOTE_KIT.PRECE_DE_CURA.CURA_PERCENTUAL_HP_MAX,
        },
      ],
    }),
  },
  {
    id: 'sacerdote_graca_redentora',
    espaco: 'ultimate',
    tipoDano: 'magico',
    executar: () => ({
      ...BASE,
      nome: 'Graça Redentora',
      tipoDano: 'magico',
      percentualDano: SACERDOTE_KIT.GRACA_REDENTORA.PERCENTUAL_DANO,
      efeitosCura: [
        { efeito: 'limpeza', quantidadeEfeitos: SACERDOTE_KIT.GRACA_REDENTORA.LIMPEZA_EFEITOS, percentualHpMax: 0 },
        {
          efeito: 'curaContinua',
          percentualHpMax: SACERDOTE_KIT.GRACA_REDENTORA.CURA_CONTINUA_PERCENTUAL_HP_MAX,
          duracaoRodadas: SACERDOTE_KIT.GRACA_REDENTORA.CURA_CONTINUA_RODADAS,
        },
        {
          efeito: 'ressurreicaoParcial',
          percentualHpMax: SACERDOTE_KIT.GRACA_REDENTORA.RESSURREICAO_PERCENTUAL_HP_MAX,
        },
      ],
    }),
  },
];

export const PASSIVA_SACERDOTE: DefinicaoPassiva = {
  id: 'sacerdote_aura_sagrada',
  modificadores: () => ({
    bonusDanoFisicoPercentual: 0,
    reducaoDanoFisicoRecebidoPercentual: 0,
    bonusSobreescudoMaxPercentual: 0,
    reducaoDanoMagicoRecebidoPercentual: PASSIVAS_SUBCLASSE.AURA_SAGRADA.REDUCAO_DANO_MAGICO_RECEBIDO_PERCENTUAL,
    bonusEficaciaCuraPercentual: PASSIVAS_SUBCLASSE.AURA_SAGRADA.BONUS_EFICACIA_CURA_PERCENTUAL,
  }),
};
