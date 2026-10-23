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
import type { ResultadoHabilidade } from '@/game/combate/habilidades/tipos';
import type { MecanicaChefeId } from '@/game/combate/mecanicasChefe';

/** Uma ação de habilidade do monstro: o nome que aparece no log e o efeito (mesmos campos das habilidades, catálogo 1.2). */
export interface AcaoMonstro {
  nome: string;
  efeito: Partial<Omit<ResultadoHabilidade, 'nome' | 'tipoDano'>>;
}

/**
 * Habilidade de monstro (Caçada): dispara a cada N ataques no lugar do ataque básico.
 * Com mais de uma ação, elas se alternam a cada disparo (ex.: Agarrão, depois Esmagamento).
 */
export interface HabilidadeMonstro {
  aCada: number;
  acoes: readonly AcaoMonstro[];
}

export interface OuroIntervalo {
  min: number;
  max: number;
}

/**
 * Passivas próprias dos chefes Especiais da Batalha Sangrenta (todas em %). Valem só para o monstro que as define.
 */
export interface PassivasMonstro {
  /** +% de dano enquanto o HP está abaixo de 50% (Darius). */
  bonusDanoAbaixoMetadePercentual?: number;
  /** −% de dano físico recebido (Nyméria). */
  reducaoDanoFisicoPercentual?: number;
  /** Fúria: +% de dano por acúmulo; ganha 1 acúmulo a cada rodada que passa, até o máximo (Grizzham). */
  furia?: { percentualPorAcumulo: number; maximoAcumulos: number };
  /** −% de dano recebido enquanto o Sobreescudo (Núcleo Ancestral) estiver de pé (Othrak). */
  reducaoDanoComNucleoPercentual?: number;
  /** +% de dano a cada N rodadas, até o limite (Varkhazar). */
  bonusDanoACada?: { rodadas: number; percentual: number; limitePercentual: number };
  /** −% de dano recebido enquanto o HP está abaixo de 50% (Noctharion). */
  reducaoDanoAbaixoMetadePercentual?: number;
}

export interface MonsterDefinition {
  id: string;
  nome: string;
  nivel: number;
  hp: number;
  /** DEF do monstro (pontos de mitigação por golpe, como a armadura de um personagem). Sem ela, vale a DEF automática (`defDoMonstro`). */
  mitigacao?: number;
  /** Blindado (perfil da Caçada): ganha DEF automática, como os chefes. */
  blindado?: boolean;
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
  /** Segundo elemento: os golpes alternam com o elementoAtaque, um por rodada (subespécies de dois elementos). */
  elementoAlternado?: Elemento;
  /** % a mais no dano dos golpes elementais (subespécie de elemento intensificado). */
  danoElementalPercentual?: number;
  /** Enfurece abaixo desta % de vida (padrão: ENFURECIDO_LIMIAR_HP_PERCENTUAL). */
  enfurecidoLimiarPercentual?: number;
  efeitosAplicados?: EfeitoStatus[];
  /** Habilidades próprias do monstro, a cada N ataques (Caçada). */
  habilidades?: readonly HabilidadeMonstro[];
  /** Enfurecido: abaixo de 50% de HP ganha +20% de dano (representa ferir uma cabeça, quebrar chifres, expor o núcleo). */
  enfurecido?: boolean;
  /** Passivas dos chefes Especiais (Batalha Sangrenta). */
  passivas?: PassivasMonstro;
  /** Mecânica única de um chefe da Provação do Guerreiro. */
  mecanica?: MecanicaChefeId;
  /** Status a que o monstro é imune (além dos de chefe). Ex.: Esqueleto imune a Sangramento e Veneno. */
  imunidadesStatus?: EfeitoStatus[];
  /** Sobreescudo do início da luta, quando não sai do HP (Incursões: a vida é a global, o escudo é o de uma luta). */
  sobreescudoInicial?: number;
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

/**
 * DEF dos monstros (5.1.11, opção 3, decidida pelo Yuri em 23/10/2026): só os blindados e os chefes têm DEF, e ela
 * vale metade da Vitalidade. Os monstros comuns continuam sem DEF. Valor inicial, a calibrar no simulador (4.13).
 */
export const DEF_DO_MONSTRO_PERCENTUAL_DA_VITALIDADE = 50;

/** A DEF que o combate usa: a definida no monstro, ou a automática (blindados e chefes), ou 0. */
export function defDoMonstro(m: Pick<MonsterDefinition, 'mitigacao' | 'blindado' | 'chefe' | 'atributos'>): number {
  if (m.mitigacao !== undefined && m.mitigacao > 0) return m.mitigacao;
  if (m.blindado === true || m.chefe === true) return Math.floor((m.atributos.vitalidade * DEF_DO_MONSTRO_PERCENTUAL_DA_VITALIDADE) / 100);
  return 0;
}
