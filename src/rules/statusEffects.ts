export type EfeitoStatus =
  | 'sangramento'
  | 'veneno'
  | 'podridaoEscarlate'
  | 'congelamento'
  | 'sono'
  | 'loucura'
  | 'maldicao'
  | 'paralisia'
  | 'queimadura';

/**
 * Tipo de efeito extensível (Bloco B implementa 'instantaneo' e 'dot'; Bloco C adicionará efeitos de controle/debuff).
 */
export type TipoEfeitoStatus = 'instantaneo' | 'dot' | 'controle' | (string & {});

export interface DefinicaoEfeito {
  id: EfeitoStatus;
  nome: string;
  tipo: TipoEfeitoStatus;
  percentualHpMax: number;
  duracaoRodadas?: number;
  chanceAtivacao: number;
  /** Natureza do status, usada pelas resistências raciais (1.4.3). */
  natureza: 'fisico' | 'magico';
  /** Bloco C: o alvo perde N ações (Sono, Loucura). */
  incapacitaAcoes?: number;
  /** Bloco C: o alvo não age até ser atingido uma vez (Paralisia). */
  incapacitaAteSerAtingido?: boolean;
  /** Bloco C: lentidão (queda de Agilidade) aplicada junto do status (Congelamento). */
  lentidao?: { percentual: number; rodadas: number };
  /** Bloco C: lentidão que o alvo recebe quando a incapacitação termina (Paralisia). */
  lentidaoAoAcordar?: { percentual: number; rodadas: number };
  /** Bloco C: um golpe desse elemento encerra a lentidão do status antes do fim (Congelamento: fogo). */
  encerradoPorElemento?: 'fogo';
}

export const SANGRAMENTO_PERCENTUAL_HP_MAX = 30;
export const SANGRAMENTO_CHANCE_ATIVACAO = 3;

export const VENENO_PERCENTUAL_HP_MAX = 3;
export const VENENO_DURACAO_RODADAS = 10;
export const VENENO_CHANCE_ATIVACAO = 8;

// Queimadura (1.6.5): dano contínuo de fogo, proposta aprovada pelo Yuri em 09/10/2026
export const QUEIMADURA_PERCENTUAL_HP_MAX = 6;
export const QUEIMADURA_DURACAO_RODADAS = 5;
export const QUEIMADURA_CHANCE_ATIVACAO = 6;

// Chances de ativação (decisão do Yuri de 09/10/2026)
export const CONGELAMENTO_CHANCE_ATIVACAO = 5;
export const CONGELAMENTO_PERCENTUAL_HP_MAX = 15;
export const CONGELAMENTO_LENTIDAO_PERCENTUAL = 30;
export const CONGELAMENTO_LENTIDAO_RODADAS = 3;

export const SONO_CHANCE_ATIVACAO = 3;
export const SONO_ACOES_PERDIDAS = 2;

export const LOUCURA_CHANCE_ATIVACAO = 5;
export const LOUCURA_PERCENTUAL_HP_MAX = 10;
export const LOUCURA_ACOES_PERDIDAS = 1;

export const MALDICAO_CHANCE_ATIVACAO = 1;
export const MALDICAO_PERCENTUAL_HP_MAX = 60;

export const PARALISIA_CHANCE_ATIVACAO = 3;
export const PARALISIA_LENTIDAO_PERCENTUAL = 20;
export const PARALISIA_LENTIDAO_RODADAS = 2;

/** Status a que os chefes são imunes (1.6.3); eles ainda recebem dano contínuo e debuffs. */
export const STATUS_QUE_CHEFES_RESISTEM: readonly EfeitoStatus[] = ['sono', 'paralisia', 'congelamento'];

export const PODRIDAO_ESCARLATE_PERCENTUAL_HP_MAX = 8;
export const PODRIDAO_ESCARLATE_DURACAO_RODADAS = 6;
export const PODRIDAO_ESCARLATE_CHANCE_ATIVACAO = 5;

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
    natureza: 'fisico',
  },
  veneno: {
    id: 'veneno',
    nome: 'Veneno',
    tipo: 'dot',
    percentualHpMax: VENENO_PERCENTUAL_HP_MAX,
    duracaoRodadas: VENENO_DURACAO_RODADAS,
    chanceAtivacao: VENENO_CHANCE_ATIVACAO,
    natureza: 'fisico',
  },
  podridaoEscarlate: {
    id: 'podridaoEscarlate',
    nome: 'Podridão Escarlate',
    tipo: 'dot',
    percentualHpMax: PODRIDAO_ESCARLATE_PERCENTUAL_HP_MAX,
    duracaoRodadas: PODRIDAO_ESCARLATE_DURACAO_RODADAS,
    chanceAtivacao: PODRIDAO_ESCARLATE_CHANCE_ATIVACAO,
    natureza: 'magico',
  },
  congelamento: {
    id: 'congelamento',
    nome: 'Congelamento',
    tipo: 'controle',
    percentualHpMax: CONGELAMENTO_PERCENTUAL_HP_MAX,
    chanceAtivacao: CONGELAMENTO_CHANCE_ATIVACAO,
    natureza: 'magico',
    lentidao: { percentual: CONGELAMENTO_LENTIDAO_PERCENTUAL, rodadas: CONGELAMENTO_LENTIDAO_RODADAS },
    encerradoPorElemento: 'fogo',
  },
  sono: {
    id: 'sono',
    nome: 'Sono',
    tipo: 'controle',
    percentualHpMax: 0,
    chanceAtivacao: SONO_CHANCE_ATIVACAO,
    natureza: 'magico',
    incapacitaAcoes: SONO_ACOES_PERDIDAS,
  },
  loucura: {
    id: 'loucura',
    nome: 'Loucura',
    tipo: 'controle',
    percentualHpMax: LOUCURA_PERCENTUAL_HP_MAX,
    chanceAtivacao: LOUCURA_CHANCE_ATIVACAO,
    natureza: 'magico',
    incapacitaAcoes: LOUCURA_ACOES_PERDIDAS,
  },
  maldicao: {
    id: 'maldicao',
    nome: 'Maldição',
    tipo: 'instantaneo',
    percentualHpMax: MALDICAO_PERCENTUAL_HP_MAX,
    chanceAtivacao: MALDICAO_CHANCE_ATIVACAO,
    natureza: 'magico',
  },
  queimadura: {
    id: 'queimadura',
    nome: 'Queimadura',
    tipo: 'dot',
    percentualHpMax: QUEIMADURA_PERCENTUAL_HP_MAX,
    duracaoRodadas: QUEIMADURA_DURACAO_RODADAS,
    chanceAtivacao: QUEIMADURA_CHANCE_ATIVACAO,
    natureza: 'magico',
  },
  paralisia: {
    id: 'paralisia',
    nome: 'Paralisia',
    tipo: 'controle',
    percentualHpMax: 0,
    chanceAtivacao: PARALISIA_CHANCE_ATIVACAO,
    natureza: 'fisico',
    incapacitaAteSerAtingido: true,
    lentidaoAoAcordar: { percentual: PARALISIA_LENTIDAO_PERCENTUAL, rodadas: PARALISIA_LENTIDAO_RODADAS },
  },
};
