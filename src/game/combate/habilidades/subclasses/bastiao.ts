import { BASTIAO_KIT, PASSIVAS_SUBCLASSE } from '@/rules/subclasseKits';
import { DefinicaoHabilidade, DefinicaoPassiva, ResultadoHabilidade } from '@/game/combate/habilidades/tipos';

const BASE: Omit<ResultadoHabilidade, 'nome' | 'tipoDano' | 'percentualDano'> = {
  ignorarDefesaPercentual: 0,
  bonusDanoPercentual: 0,
  bonusContraSobreescudoPercentual: 0,
  curaPercentualDanoCausado: 0,
  curaPercentualHpMax: 0,
};

/** Bastião (Cavaleiro defensivo): Sobreescudo, resistências e counter. */
export const HABILIDADES_BASTIAO: DefinicaoHabilidade[] = [
  {
    id: 'bastiao_golpe_de_escudo',
    espaco: 'basico',
    tipoDano: 'fisico',
    executar: () => ({
      ...BASE,
      nome: 'Golpe de Escudo',
      tipoDano: 'fisico',
      percentualDano: BASTIAO_KIT.GOLPE_DE_ESCUDO.PERCENTUAL_DANO,
      efeitosNoUsuario: [
        {
          efeito: 'resistenciaFisica',
          valorPercentual: BASTIAO_KIT.GOLPE_DE_ESCUDO.RESISTENCIA_FISICA_PERCENTUAL,
          duracaoRodadas: BASTIAO_KIT.GOLPE_DE_ESCUDO.RESISTENCIA_FISICA_RODADAS,
        },
      ],
    }),
  },
  {
    id: 'bastiao_muralha_inabalavel',
    espaco: 'especial',
    tipoDano: 'fisico',
    executar: () => ({
      ...BASE,
      nome: 'Muralha Inabalável',
      tipoDano: 'fisico',
      percentualDano: BASTIAO_KIT.MURALHA_INABALAVEL.PERCENTUAL_DANO,
      efeitosNoUsuario: [
        {
          efeito: 'escudoTemporario',
          valorPercentual: BASTIAO_KIT.MURALHA_INABALAVEL.ESCUDO_TEMPORARIO_PERCENTUAL,
          duracaoRodadas: BASTIAO_KIT.MURALHA_INABALAVEL.RODADAS,
        },
        {
          efeito: 'resistenciaFisica',
          valorPercentual: BASTIAO_KIT.MURALHA_INABALAVEL.RESISTENCIA_PERCENTUAL,
          duracaoRodadas: BASTIAO_KIT.MURALHA_INABALAVEL.RODADAS,
        },
        {
          efeito: 'resistenciaMagica',
          valorPercentual: BASTIAO_KIT.MURALHA_INABALAVEL.RESISTENCIA_PERCENTUAL,
          duracaoRodadas: BASTIAO_KIT.MURALHA_INABALAVEL.RODADAS,
        },
      ],
    }),
  },
  {
    id: 'bastiao_ultimo_juramento',
    espaco: 'ultimate',
    tipoDano: 'fisico',
    executar: () => ({
      ...BASE,
      nome: 'Último Juramento',
      tipoDano: 'fisico',
      percentualDano: BASTIAO_KIT.ULTIMO_JURAMENTO.PERCENTUAL_DANO,
      efeitosNoUsuario: [
        {
          efeito: 'imortalidadeBreve',
          valorPercentual: 0,
          duracaoRodadas: BASTIAO_KIT.ULTIMO_JURAMENTO.IMORTALIDADE_RODADAS,
        },
        {
          efeito: 'redirecionamento',
          valorPercentual: BASTIAO_KIT.ULTIMO_JURAMENTO.REDIRECIONAMENTO_PERCENTUAL,
          duracaoRodadas: BASTIAO_KIT.ULTIMO_JURAMENTO.RODADAS,
        },
        {
          efeito: 'escudoTemporario',
          valorPercentual: BASTIAO_KIT.ULTIMO_JURAMENTO.ESCUDO_TEMPORARIO_PERCENTUAL,
          duracaoRodadas: BASTIAO_KIT.ULTIMO_JURAMENTO.RODADAS,
        },
      ],
    }),
  },
];

export const PASSIVA_BASTIAO: DefinicaoPassiva = {
  id: 'bastiao_fortaleza_viva',
  modificadores: () => ({
    bonusDanoFisicoPercentual: 0,
    reducaoDanoFisicoRecebidoPercentual:
      PASSIVAS_SUBCLASSE.FORTALEZA_VIVA.REDUCAO_DANO_FISICO_RECEBIDO_PERCENTUAL,
    bonusSobreescudoMaxPercentual: PASSIVAS_SUBCLASSE.FORTALEZA_VIVA.BONUS_SOBREESCUDO_MAX_PERCENTUAL,
  }),
};
