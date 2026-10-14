import type { Elemento } from './elements';

/** Condição de um efeito do golpe: todas as que estiverem preenchidas precisam valer ao mesmo tempo. */
export interface CondicaoDoEfeito {
  /** HP do alvo abaixo de N% do máximo. */
  alvoHpAbaixo?: number;
  /** HP de quem tem o emblema abaixo / acima de N% do máximo. */
  atacanteHpAbaixo?: number;
  atacanteHpAcima?: number;
  /** O alvo está com pelo menos um destes (sangramento, veneno, queimadura, congelado, maldição). */
  alvoStatus?: readonly CondicaoStatusEmblema[];
  alvoComEscudo?: true;
  /** O alvo tem bônus de atributos (buffs) ativos. */
  alvoComBonus?: true;
  /** O alvo tem algum efeito negativo. */
  alvoComNegativo?: true;
  alvoChefe?: true;
}

export type CondicaoStatusEmblema = 'sangramento' | 'veneno' | 'queimadura' | 'congelado' | 'maldicao';

/**
 * Efeitos das habilidades dos emblemas que já valem no combate. Cada habilidade do catálogo (`emblemasCatalogo`) tem,
 * aqui, uma lista de efeitos com o valor do nível 1; o valor real é esse vezes o multiplicador do nível da habilidade
 * (1×, 1,5×, 2× e 2,5×). Habilidade que não está na tabela ainda não vale no combate (entra nos próximos PRs).
 * Esta primeira parte tem os efeitos fixos: ATQ, DEF, HP, iniciativa, crítico, dano e resistência por elemento e
 * redução do dano recebido.
 */
export type EfeitoEmblema =
  /** +% de dano (físico e mágico). */
  | { tipo: 'atq'; percentual: number }
  /** +% de defesa (sobre a defesa total). */
  | { tipo: 'def'; percentual: number }
  /** +% do HP máximo. */
  | { tipo: 'hp'; percentual: number }
  /** +% de iniciativa (Agilidade). */
  | { tipo: 'iniciativa'; percentual: number }
  /** +pontos percentuais na chance de acerto crítico. */
  | { tipo: 'critico'; pontos: number }
  /** +% de dano nos golpes do elemento. */
  | { tipo: 'danoElemental'; elemento: Elemento; percentual: number }
  /** −% de dano recebido do elemento (`todos` vale para os sete). */
  | { tipo: 'resistenciaElemental'; elemento: Elemento | 'todos'; percentual: number }
  /** −% de dano recebido (físico, mágico, todo o dano ou o dano de chefes). */
  | { tipo: 'reducaoDano'; alvo: 'fisico' | 'magico' | 'todos' | 'chefes'; percentual: number }
  /** +% de dano nos golpes enquanto a condição valer (entra na soma de bônus de dano, regra 1.2.2). */
  | { tipo: 'danoSe'; percentual: number; condicao: CondicaoDoEfeito }
  /** +% de dano nos golpes do elemento enquanto a condição valer. */
  | { tipo: 'danoElementalSe'; elemento: Elemento; percentual: number; condicao: CondicaoDoEfeito }
  /** +% no dano dos acertos críticos (sobre o multiplicador do crítico). */
  | { tipo: 'danoCritico'; percentual: number; condicao?: CondicaoDoEfeito }
  /** +% no dano do status que o personagem causa (o sangramento é um golpe só; os outros, a cada rodada). */
  | { tipo: 'danoStatus'; status: 'veneno' | 'sangramento' | 'queimadura'; percentual: number }
  /** +% na duração do veneno ou dos efeitos de controle (sono e lentidão) que o personagem aplica. */
  | { tipo: 'duracaoStatus'; alvo: 'veneno' | 'controle'; percentual: number }
  /** +% (relativo) na chance de o personagem aplicar o status. */
  | { tipo: 'chanceStatus'; status: 'congelamento' | 'sono'; percentual: number }
  /** −% na chance de sofrer efeitos de estado negativos. */
  | { tipo: 'resistenciaStatus'; percentual: number }
  /** −% no dano recebido de inimigos envenenados ou com qualquer efeito negativo. */
  | { tipo: 'reducaoDanoDeAfetados'; alvo: 'veneno' | 'negativo'; percentual: number };

/** Por tipo de emblema, os efeitos de cada habilidade (índice 0 a 3); `null` = ainda não vale no combate. */
export const EFEITOS_DOS_EMBLEMAS: Readonly<Record<string, readonly (readonly EfeitoEmblema[] | null)[]>> = {
  dargan: [[{ tipo: 'danoSe', percentual: 8, condicao: { alvoHpAbaixo: 40 } }], [{ tipo: 'danoSe', percentual: 6, condicao: { alvoStatus: ['sangramento'] } }], null],
  vesper: [[{ tipo: 'danoStatus', status: 'veneno', percentual: 8 }], [{ tipo: 'duracaoStatus', alvo: 'veneno', percentual: 10 }], [{ tipo: 'reducaoDanoDeAfetados', alvo: 'veneno', percentual: 5 }]],
  'kael-draven': [[{ tipo: 'def', percentual: 8 }], [{ tipo: 'reducaoDano', alvo: 'fisico', percentual: 6 }], null],
  elyss: [[{ tipo: 'resistenciaStatus', percentual: 8 }], [{ tipo: 'duracaoStatus', alvo: 'controle', percentual: 10 }], null],
  grimhall: [
    [{ tipo: 'critico', pontos: 6 }],
    [{ tipo: 'danoSe', percentual: 10, condicao: { alvoHpAbaixo: 50 } }],
    [{ tipo: 'danoCritico', percentual: 8, condicao: { alvoStatus: ['sangramento'] } }],
  ],
  lutero: [[{ tipo: 'atq', percentual: 8 }], null, null],
  morvath: [[{ tipo: 'danoElemental', elemento: 'sombrio', percentual: 10 }], [{ tipo: 'hp', percentual: 8 }], null],
  grizzham: [[{ tipo: 'def', percentual: 10 }], [{ tipo: 'danoSe', percentual: 8, condicao: { atacanteHpAcima: 70 } }], [{ tipo: 'reducaoDano', alvo: 'chefes', percentual: 10 }]],
  rhazkida: [[{ tipo: 'danoStatus', status: 'sangramento', percentual: 10 }], [{ tipo: 'iniciativa', percentual: 8 }], null],
  vharok: [[{ tipo: 'danoElemental', elemento: 'sombrio', percentual: 10 }], null, null],
  vargheist: [[{ tipo: 'atq', percentual: 7 }, { tipo: 'iniciativa', percentual: 5 }], null, null],
  floragoth: [[{ tipo: 'danoStatus', status: 'veneno', percentual: 10 }], null, [{ tipo: 'danoSe', percentual: 8, condicao: { alvoStatus: ['veneno', 'sangramento'] } }]],
  nharzuel: [[{ tipo: 'danoElemental', elemento: 'sombrio', percentual: 10 }], [{ tipo: 'reducaoDano', alvo: 'magico', percentual: 8 }], null],
  seraphel: [[{ tipo: 'danoElemental', elemento: 'sagrado', percentual: 10 }], [{ tipo: 'danoSe', percentual: 10, condicao: { alvoComEscudo: true } }], [{ tipo: 'danoSe', percentual: 8, condicao: { alvoComBonus: true } }]],
  akumetsu: [[{ tipo: 'atq', percentual: 8 }], null, null],
  azhrak: [[{ tipo: 'danoElemental', elemento: 'fogo', percentual: 12 }], [{ tipo: 'resistenciaElemental', elemento: 'fogo', percentual: 15 }], [{ tipo: 'danoSe', percentual: 15, condicao: { alvoStatus: ['queimadura'] } }]],
  nyxara: [[{ tipo: 'resistenciaStatus', percentual: 10 }], [{ tipo: 'reducaoDano', alvo: 'magico', percentual: 10 }], null],
  odrak: [[{ tipo: 'hp', percentual: 12 }], [{ tipo: 'reducaoDano', alvo: 'todos', percentual: 10 }], null],
  vaelgrim: [[{ tipo: 'danoElemental', elemento: 'gelo', percentual: 12 }], [{ tipo: 'chanceStatus', status: 'congelamento', percentual: 10 }], [{ tipo: 'danoElementalSe', elemento: 'gelo', percentual: 12, condicao: { alvoStatus: ['congelado'] } }]],
  malachar: [
    [{ tipo: 'danoSe', percentual: 10, condicao: { alvoStatus: ['maldicao'] } }],
    null,
    [{ tipo: 'danoSe', percentual: 15, condicao: { alvoStatus: ['maldicao'], alvoHpAbaixo: 25 } }],
  ],
  lautrec: [[{ tipo: 'atq', percentual: 10 }], [{ tipo: 'danoCritico', percentual: 12 }], [{ tipo: 'danoSe', percentual: 12, condicao: { alvoChefe: true, atacanteHpAbaixo: 50 } }], null],
  nimb: [[{ tipo: 'iniciativa', percentual: 10 }], [{ tipo: 'danoElemental', elemento: 'relampago', percentual: 12 }], null, null],
  lana: [[{ tipo: 'resistenciaStatus', percentual: 10 }], [{ tipo: 'chanceStatus', status: 'sono', percentual: 15 }], [{ tipo: 'reducaoDanoDeAfetados', alvo: 'negativo', percentual: 10 }], null],
  aurelion: [
    [{ tipo: 'atq', percentual: 5 }, { tipo: 'def', percentual: 5 }, { tipo: 'hp', percentual: 5 }],
    [{ tipo: 'resistenciaElemental', elemento: 'todos', percentual: 10 }],
    null,
    null,
  ],
  nymeris: [[{ tipo: 'danoElemental', elemento: 'sombrio', percentual: 12 }], null, [{ tipo: 'danoSe', percentual: 12, condicao: { alvoComNegativo: true } }], null],
};

/** A habilidade já vale no combate? */
export function habilidadeDoEmblemaVale(tipoId: string, indice: number): boolean {
  return (EFEITOS_DOS_EMBLEMAS[tipoId]?.[indice] ?? null) !== null;
}
