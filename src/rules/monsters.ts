import { Attributes } from './attributes';
import {
  Elemento,
  MODIFICADOR_FRAQUEZA,
  MODIFICADOR_IMUNIDADE,
  MODIFICADOR_RESISTENCIA_FORTE,
  ModificadoresElementais,
} from './elements';
import { EfeitoStatus } from './statusEffects';
import { CategoriaCorporal, TipoGolpe } from './corposMonstros';

export interface OuroIntervalo {
  min: number;
  max: number;
}

export interface MonsterDefinition {
  id: string;
  nome: string;
  nivel: number;
  hp: number;
  /** Chefe: imune a Sono, Paralisia e Congelamento (recebe dano contínuo e debuffs). */
  chefe?: boolean;
  /** Todo monstro pertence a uma categoria corporal (define fraquezas e resistências a tipos de dano). */
  categoriaCorporal: CategoriaCorporal;
  /** Só para a categoria Aberrante: as fraquezas e resistências próprias da criatura. */
  fraquezasProprias?: TipoGolpe[];
  resistenciasProprias?: TipoGolpe[];
  atributos: Attributes;
  xpConcedido: number;
  ouroConcedido: OuroIntervalo;
  modificadoresElementais?: ModificadoresElementais;
  elementoAtaque?: Elemento;
  efeitosAplicados?: EfeitoStatus[];
}

export const MONSTERS: readonly MonsterDefinition[] = [
  {
    id: 'rato-da-peste',
    nome: 'Rato da Peste',
    nivel: 1,
    hp: 12,
    categoriaCorporal: 'feral',
    atributos: {
      vigor: 1,
      sorte: 0,
      forca: 2,
      vitalidade: 0,
      arcano: 0,
      inteligencia: 0,
      agilidade: 1,
    },
    xpConcedido: 25,
    ouroConcedido: {
      min: 5,
      max: 15,
    },
    // PROPOSTA de teste para o sistema de elementos (Bloco A)
    modificadoresElementais: {
      fogo: MODIFICADOR_FRAQUEZA,
    },
    // PROPOSTA de teste para efeitos de dano ao longo do tempo (Bloco B)
    efeitosAplicados: ['veneno'],
  },
  {
    id: 'cultista-das-sombras',
    nome: 'Cultista das Sombras',
    nivel: 2,
    hp: 30,
    categoriaCorporal: 'organicoDesprotegido',
    atributos: {
      vigor: 3,
      sorte: 2,
      forca: 3,
      vitalidade: 2,
      arcano: 2,
      inteligencia: 4,
      agilidade: 3,
    },
    xpConcedido: 60,
    ouroConcedido: {
      min: 20,
      max: 40,
    },
    // PROPOSTA de teste para o sistema de elementos (Bloco A)
    modificadoresElementais: {
      sombrio: MODIFICADOR_RESISTENCIA_FORTE,
      sagrado: MODIFICADOR_FRAQUEZA,
    },
    // PROPOSTA de teste para efeitos de dano ao longo do tempo (Bloco B)
    efeitosAplicados: ['podridaoEscarlate'],
  },
  {
    id: 'cavaleiro-do-vazio',
    nome: 'Cavaleiro do Vazio',
    nivel: 5,
    hp: 75,
    categoriaCorporal: 'sombrio',
    atributos: {
      vigor: 6,
      sorte: 2,
      forca: 9,
      vitalidade: 5,
      arcano: 2,
      inteligencia: 2,
      agilidade: 5,
    },
    xpConcedido: 150,
    ouroConcedido: {
      min: 50,
      max: 100,
    },
    // PROPOSTA de teste para o sistema de elementos (Bloco A)
    modificadoresElementais: {
      sombrio: MODIFICADOR_IMUNIDADE,
      sagrado: MODIFICADOR_FRAQUEZA,
    },
    // PROPOSTA de teste para efeitos de dano ao longo do tempo (Bloco B)
    efeitosAplicados: ['sangramento'],
  },
] as const;

export const MONSTERS_MAP: Readonly<Record<string, MonsterDefinition>> = Object.fromEntries(
  MONSTERS.map((m) => [m.id, m])
);
