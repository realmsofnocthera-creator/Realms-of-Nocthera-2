import { COLOSSO_KIT, PASSIVAS_SUBCLASSE } from '@/rules/subclasseKits';
import { DefinicaoHabilidade, DefinicaoPassiva } from '@/game/combate/habilidades/tipos';

export const HABILIDADES_COLOSSO: DefinicaoHabilidade[] = [
  {
    id: 'colosso_golpe_esmagador',
    espaco: 'basico',
    tipoDano: 'fisico',
    executar: () => ({
      nome: 'Golpe Esmagador',
      tipoDano: 'fisico',
      percentualDano: COLOSSO_KIT.GOLPE_ESMAGADOR.PERCENTUAL_DANO,
      ignorarDefesaPercentual: 0,
      bonusDanoPercentual: 0,
      bonusContraSobreescudoPercentual: 0,
      curaPercentualDanoCausado: COLOSSO_KIT.GOLPE_ESMAGADOR.CURA_PERCENTUAL_DANO_CAUSADO,
      curaPercentualHpMax: 0,
      efeitosNoUsuario: [
        {
          efeito: 'resistenciaFisica',
          valorPercentual: COLOSSO_KIT.GOLPE_ESMAGADOR.RESISTENCIA_FISICA_PERCENTUAL,
          duracaoRodadas: COLOSSO_KIT.GOLPE_ESMAGADOR.RESISTENCIA_FISICA_RODADAS,
        },
      ],
    }),
  },
  {
    id: 'colosso_impacto_sismico',
    espaco: 'especial',
    tipoDano: 'fisico',
    executar: () => ({
      nome: 'Impacto Sísmico',
      tipoDano: 'fisico',
      percentualDano: COLOSSO_KIT.IMPACTO_SISMICO.PERCENTUAL_DANO,
      ignorarDefesaPercentual: 0,
      bonusDanoPercentual: 0,
      bonusContraSobreescudoPercentual: 0,
      curaPercentualDanoCausado: 0,
      curaPercentualHpMax: COLOSSO_KIT.IMPACTO_SISMICO.CURA_PERCENTUAL_HP_MAX,
      efeitosNoUsuario: [
        {
          efeito: 'escudoTemporario',
          valorPercentual: COLOSSO_KIT.IMPACTO_SISMICO.ESCUDO_TEMPORARIO_PERCENTUAL,
          duracaoRodadas: COLOSSO_KIT.IMPACTO_SISMICO.ESCUDO_TEMPORARIO_RODADAS,
        },
      ],
    }),
  },
  {
    id: 'colosso_furia_do_colosso',
    espaco: 'ultimate',
    tipoDano: 'fisico',
    executar: () => ({
      nome: 'Fúria do Colosso',
      tipoDano: 'fisico',
      percentualDano: COLOSSO_KIT.FURIA_DO_COLOSSO.PERCENTUAL_DANO,
      ignorarDefesaPercentual: 0,
      bonusDanoPercentual: 0,
      bonusContraSobreescudoPercentual:
        COLOSSO_KIT.FURIA_DO_COLOSSO.BONUS_CONTRA_SOBREESCUDO_PERCENTUAL,
      curaPercentualDanoCausado: 0,
      curaPercentualHpMax: COLOSSO_KIT.FURIA_DO_COLOSSO.CURA_PERCENTUAL_HP_MAX,
      efeitosNoUsuario: [
        {
          efeito: 'escudoTemporario',
          valorPercentual: COLOSSO_KIT.FURIA_DO_COLOSSO.ESCUDO_TEMPORARIO_PERCENTUAL,
          duracaoRodadas: COLOSSO_KIT.FURIA_DO_COLOSSO.RODADAS,
        },
        {
          efeito: 'resistenciaFisica',
          valorPercentual: COLOSSO_KIT.FURIA_DO_COLOSSO.RESISTENCIA_FISICA_PERCENTUAL,
          duracaoRodadas: COLOSSO_KIT.FURIA_DO_COLOSSO.RODADAS,
        },
      ],
    }),
  },
];

export const PASSIVA_COLOSSO: DefinicaoPassiva = {
  id: 'colosso_casca_de_pedra',
  modificadores: () => ({
    bonusDanoFisicoPercentual: 0,
    reducaoDanoFisicoRecebidoPercentual:
      PASSIVAS_SUBCLASSE.CASCA_DE_PEDRA.REDUCAO_DANO_FISICO_RECEBIDO_PERCENTUAL,
    bonusSobreescudoMaxPercentual:
      PASSIVAS_SUBCLASSE.CASCA_DE_PEDRA.BONUS_SOBREESCUDO_MAX_PERCENTUAL,
  }),
};

