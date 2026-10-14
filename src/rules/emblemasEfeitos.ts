import type { Elemento } from './elements';

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
  | { tipo: 'reducaoDano'; alvo: 'fisico' | 'magico' | 'todos' | 'chefes'; percentual: number };

/** Por tipo de emblema, os efeitos de cada habilidade (índice 0 a 3); `null` = ainda não vale no combate. */
export const EFEITOS_DOS_EMBLEMAS: Readonly<Record<string, readonly (readonly EfeitoEmblema[] | null)[]>> = {
  dargan: [null, null, null],
  vesper: [null, null, null],
  'kael-draven': [[{ tipo: 'def', percentual: 8 }], [{ tipo: 'reducaoDano', alvo: 'fisico', percentual: 6 }], null],
  elyss: [null, null, null],
  grimhall: [[{ tipo: 'critico', pontos: 6 }], null, null],
  lutero: [[{ tipo: 'atq', percentual: 8 }], null, null],
  morvath: [[{ tipo: 'danoElemental', elemento: 'sombrio', percentual: 10 }], [{ tipo: 'hp', percentual: 8 }], null],
  grizzham: [[{ tipo: 'def', percentual: 10 }], null, [{ tipo: 'reducaoDano', alvo: 'chefes', percentual: 10 }]],
  rhazkida: [null, [{ tipo: 'iniciativa', percentual: 8 }], null],
  vharok: [[{ tipo: 'danoElemental', elemento: 'sombrio', percentual: 10 }], null, null],
  vargheist: [[{ tipo: 'atq', percentual: 7 }, { tipo: 'iniciativa', percentual: 5 }], null, null],
  floragoth: [null, null, null],
  nharzuel: [[{ tipo: 'danoElemental', elemento: 'sombrio', percentual: 10 }], [{ tipo: 'reducaoDano', alvo: 'magico', percentual: 8 }], null],
  seraphel: [[{ tipo: 'danoElemental', elemento: 'sagrado', percentual: 10 }], null, null],
  akumetsu: [[{ tipo: 'atq', percentual: 8 }], null, null],
  azhrak: [[{ tipo: 'danoElemental', elemento: 'fogo', percentual: 12 }], [{ tipo: 'resistenciaElemental', elemento: 'fogo', percentual: 15 }], null],
  nyxara: [null, [{ tipo: 'reducaoDano', alvo: 'magico', percentual: 10 }], null],
  odrak: [[{ tipo: 'hp', percentual: 12 }], [{ tipo: 'reducaoDano', alvo: 'todos', percentual: 10 }], null],
  vaelgrim: [[{ tipo: 'danoElemental', elemento: 'gelo', percentual: 12 }], null, null],
  malachar: [null, null, null],
  lautrec: [[{ tipo: 'atq', percentual: 10 }], null, null, null],
  nimb: [[{ tipo: 'iniciativa', percentual: 10 }], [{ tipo: 'danoElemental', elemento: 'relampago', percentual: 12 }], null, null],
  lana: [null, null, null, null],
  aurelion: [
    [{ tipo: 'atq', percentual: 5 }, { tipo: 'def', percentual: 5 }, { tipo: 'hp', percentual: 5 }],
    [{ tipo: 'resistenciaElemental', elemento: 'todos', percentual: 10 }],
    null,
    null,
  ],
  nymeris: [[{ tipo: 'danoElemental', elemento: 'sombrio', percentual: 12 }], null, null, null],
};

/** A habilidade já vale no combate? */
export function habilidadeDoEmblemaVale(tipoId: string, indice: number): boolean {
  return (EFEITOS_DOS_EMBLEMAS[tipoId]?.[indice] ?? null) !== null;
}
