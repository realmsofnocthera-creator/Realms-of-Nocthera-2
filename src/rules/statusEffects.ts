export type EfeitoStatus = 'sangramento' | 'veneno' | 'podridaoEscarlate';

/**
 * Tipo de efeito extensível (Bloco B implementa 'instantaneo' e 'dot'; Bloco C adicionará efeitos de controle/debuff).
 */
export type TipoEfeitoStatus = 'instantaneo' | 'dot' | (string & {});

export interface DefinicaoEfeito {
  id: EfeitoStatus;
  nome: string;
  tipo: TipoEfeitoStatus;
  percentualHpMax: number;
  duracaoRodadas?: number;
  chanceAtivacao: number;
}

export const SANGRAMENTO_PERCENTUAL_HP_MAX = 30;
export const SANGRAMENTO_CHANCE_ATIVACAO = 7;

export const VENENO_PERCENTUAL_HP_MAX = 3;
export const VENENO_DURACAO_RODADAS = 10;
export const VENENO_CHANCE_ATIVACAO = 10;

export const PODRIDAO_ESCARLATE_PERCENTUAL_HP_MAX = 8;
export const PODRIDAO_ESCARLATE_DURACAO_RODADAS = 6;
export const PODRIDAO_ESCARLATE_CHANCE_ATIVACAO = 3;

export const DANO_MINIMO_EFEITO = 1;
export const BASE_PERCENTUAL_EFEITO = 100;
export const ESCALA_PRECISAO_SORTEIO = 10000;
export const DIVISOR_PRECISAO_SORTEIO = 100;
export const QUANTIDADE_REMOCAO_BENCAO_DIVINA = 1;

export const HASH_SEED_MULT = 374761393;
export const HASH_RODADA_MULT = 668265263;
export const HASH_ATAQUE_MULT = 2147483647;
export const HASH_MIX_MULT = 1274126177;

export const EFEITOS_STATUS: Record<EfeitoStatus, DefinicaoEfeito> = {
  sangramento: {
    id: 'sangramento',
    nome: 'Sangramento',
    tipo: 'instantaneo',
    percentualHpMax: SANGRAMENTO_PERCENTUAL_HP_MAX,
    chanceAtivacao: SANGRAMENTO_CHANCE_ATIVACAO,
  },
  veneno: {
    id: 'veneno',
    nome: 'Veneno',
    tipo: 'dot',
    percentualHpMax: VENENO_PERCENTUAL_HP_MAX,
    duracaoRodadas: VENENO_DURACAO_RODADAS,
    chanceAtivacao: VENENO_CHANCE_ATIVACAO,
  },
  podridaoEscarlate: {
    id: 'podridaoEscarlate',
    nome: 'Podridão Escarlate',
    tipo: 'dot',
    percentualHpMax: PODRIDAO_ESCARLATE_PERCENTUAL_HP_MAX,
    duracaoRodadas: PODRIDAO_ESCARLATE_DURACAO_RODADAS,
    chanceAtivacao: PODRIDAO_ESCARLATE_CHANCE_ATIVACAO,
  },
};
