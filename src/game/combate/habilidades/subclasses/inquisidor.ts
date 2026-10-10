import { INQUISIDOR_KIT, PASSIVAS_SUBCLASSE } from '@/rules/subclasseKits';
import { BONUS_DANO_POR_CONDICAO_PERCENTUAL, CondicaoAlvo } from '@/game/combate/bonusStatusAlvo';
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

/** Todas as condições da lista de bônus por status (Sangramento, Veneno, Congelado, Dormindo...). */
const TODAS_AS_CONDICOES = Object.keys(BONUS_DANO_POR_CONDICAO_PERCENTUAL) as CondicaoAlvo[];

/** Inquisidor (Profeta de dano e punição): fogo sagrado, status e cura pelo dano causado. */
export const HABILIDADES_INQUISIDOR: DefinicaoHabilidade[] = [
  {
    id: 'inquisidor_sentenca',
    espaco: 'basico',
    tipoDano: 'magico',
    executar: () => ({
      ...BASE,
      nome: 'Sentença',
      tipoDano: 'magico',
      percentualDano: INQUISIDOR_KIT.SENTENCA.PERCENTUAL_DANO,
      bonusContraElementoAlvo: { elemento: 'sombrio', percentual: INQUISIDOR_KIT.SENTENCA.BONUS_CONTRA_SOMBRIO_PERCENTUAL },
    }),
  },
  {
    id: 'inquisidor_fogo_sagrado',
    espaco: 'especial',
    tipoDano: 'magico',
    executar: () => ({
      ...BASE,
      nome: 'Fogo Sagrado',
      tipoDano: 'magico',
      percentualDano: INQUISIDOR_KIT.FOGO_SAGRADO.PERCENTUAL_DANO,
      statusComChanceNoAlvo: [
        { status: 'queimadura', chanceExtraPercentual: INQUISIDOR_KIT.FOGO_SAGRADO.QUEIMADURA_CHANCE_EXTRA_PERCENTUAL },
      ],
      efeitosNoAlvo: [
        {
          tipo: 'enfraquecimento',
          percentual: INQUISIDOR_KIT.FOGO_SAGRADO.ENFRAQUECIMENTO_PERCENTUAL,
          rodadas: INQUISIDOR_KIT.FOGO_SAGRADO.ENFRAQUECIMENTO_RODADAS,
        },
      ],
    }),
  },
  {
    id: 'inquisidor_julgamento_final',
    espaco: 'ultimate',
    tipoDano: 'magico',
    executar: () => ({
      ...BASE,
      nome: 'Julgamento Final',
      tipoDano: 'magico',
      percentualDano: INQUISIDOR_KIT.JULGAMENTO_FINAL.PERCENTUAL_DANO,
      ignorarDefesaPercentual: INQUISIDOR_KIT.JULGAMENTO_FINAL.IGNORAR_DEFESA_PERCENTUAL,
      bonusContraElementoAlvo: { elemento: 'sombrio', percentual: INQUISIDOR_KIT.JULGAMENTO_FINAL.BONUS_CONTRA_SOMBRIO_PERCENTUAL },
      bonusPorStatusAlvo: TODAS_AS_CONDICOES,
      curaPercentualDanoCausado: INQUISIDOR_KIT.JULGAMENTO_FINAL.CURA_PERCENTUAL_DANO_CAUSADO,
    }),
  },
];

export const PASSIVA_INQUISIDOR: DefinicaoPassiva = {
  id: 'inquisidor_olhar_julgador',
  modificadores: () => ({
    bonusDanoFisicoPercentual: 0,
    reducaoDanoFisicoRecebidoPercentual: 0,
    bonusSobreescudoMaxPercentual: 0,
    bonusDanoMagicoPercentual: PASSIVAS_SUBCLASSE.OLHAR_JULGADOR.BONUS_DANO_MAGICO_PERCENTUAL,
    bonusDanoMagicoContraStatusPercentual: PASSIVAS_SUBCLASSE.OLHAR_JULGADOR.BONUS_DANO_MAGICO_CONTRA_STATUS_PERCENTUAL,
  }),
};
