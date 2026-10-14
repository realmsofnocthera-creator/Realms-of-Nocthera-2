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

/** O que dispara o gatilho. */
export type EventoGatilho =
  /** O personagem acertou um crítico. */
  | { evento: 'criticoDado' }
  /** O personagem sobreviveu a uma ação do inimigo que tirou pelo menos N% do HP máximo (0 = qualquer dano). */
  | { evento: 'danoRecebido'; minimoPercentualHp: number }
  | { evento: 'inimigoMorto' }
  /** O HP do personagem ficou abaixo de N% do máximo. */
  | { evento: 'hpAbaixo'; percentual: number }
  /** Um golpe do elemento atingiu o inimigo (opcionalmente com o HP dele abaixo de N%). */
  | { evento: 'golpeElemental'; elemento: Elemento; alvoHpAbaixo?: number }
  /** O personagem resistiu a um efeito de estado negativo. */
  | { evento: 'efeitoResistido' }
  /** O personagem aplicou sono, congelamento ou outro efeito que incapacita. */
  | { evento: 'controleAplicado' }
  /** O inimigo atacou o personagem. */
  | { evento: 'atacadoPorInimigo' };

/** Bônus temporário: dura N rodadas completas depois da ativação, ou até o personagem dar N golpes. */
export interface BonusTemporario {
  /** +% de dano causado. */
  dano?: number;
  /** +% de DEF. */
  def?: number;
  /** −% de dano recebido. */
  reducao?: number;
  rodadas?: number;
  golpes?: number;
  /** Quantas vezes o bônus acumula (cada ativação renova a duração). */
  pilhasMax?: number;
}

export interface ResultadoGatilho {
  /** Cura (% do HP máximo). */
  cura?: number;
  /** Cura (% do dano causado), com teto por rodada (% do HP máximo). */
  curaDoDano?: { percentual: number; limiteHpMax: number };
  /** Escudo (% do HP máximo) que dura N rodadas. */
  escudo?: { percentual: number; rodadas: number };
  bonus?: BonusTemporario;
  removerNegativos?: true;
  /** Aplica sangramento no inimigo (o sangramento do motor dura até o fim da luta). */
  sangramentoNoInimigo?: true;
  /** Dano extra no inimigo: % do golpe que ativou, ou % do HP atual dele com teto (% do HP máximo do personagem). */
  danoExtra?: { base: 'golpe'; percentual: number } | { base: 'hpAtualDoAlvo'; percentual: number; limiteHpMaxProprio: number };
}

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
  /** +pontos percentuais na chance de crítico enquanto a condição valer. */
  | { tipo: 'criticoSe'; pontos: number; condicao: CondicaoDoEfeito }
  /** Efeito que dispara com um acontecimento da luta (crítico, morte do inimigo, HP baixo...). */
  | { tipo: 'gatilho'; quando: EventoGatilho; chance?: number; usosPorCombate?: number; umaVezPorRodada?: true; resultado: ResultadoGatilho }
  /** −% no dano recebido de inimigos envenenados ou com qualquer efeito negativo. */
  | { tipo: 'reducaoDanoDeAfetados'; alvo: 'veneno' | 'negativo'; percentual: number };

/** Por tipo de emblema, os efeitos de cada habilidade (índice 0 a 3); `null` = ainda não vale no combate. */
export const EFEITOS_DOS_EMBLEMAS: Readonly<Record<string, readonly (readonly EfeitoEmblema[] | null)[]>> = {
  dargan: [
    [{ tipo: 'danoSe', percentual: 8, condicao: { alvoHpAbaixo: 40 } }],
    [{ tipo: 'danoSe', percentual: 6, condicao: { alvoStatus: ['sangramento'] } }],
    [{ tipo: 'gatilho', quando: { evento: 'inimigoMorto' }, usosPorCombate: 2, resultado: { cura: 4 } }],
  ],
  vesper: [[{ tipo: 'danoStatus', status: 'veneno', percentual: 8 }], [{ tipo: 'duracaoStatus', alvo: 'veneno', percentual: 10 }], [{ tipo: 'reducaoDanoDeAfetados', alvo: 'veneno', percentual: 5 }]],
  'kael-draven': [
    [{ tipo: 'def', percentual: 8 }],
    [{ tipo: 'reducaoDano', alvo: 'fisico', percentual: 6 }],
    [{ tipo: 'gatilho', quando: { evento: 'danoRecebido', minimoPercentualHp: 15 }, umaVezPorRodada: true, resultado: { bonus: { dano: 12, golpes: 1 } } }],
  ],
  elyss: [
    [{ tipo: 'resistenciaStatus', percentual: 8 }],
    [{ tipo: 'duracaoStatus', alvo: 'controle', percentual: 10 }],
    [{ tipo: 'gatilho', quando: { evento: 'hpAbaixo', percentual: 30 }, usosPorCombate: 1, resultado: { bonus: { reducao: 12, rodadas: 2 } } }],
  ],
  grimhall: [
    [{ tipo: 'critico', pontos: 6 }],
    [{ tipo: 'danoSe', percentual: 10, condicao: { alvoHpAbaixo: 50 } }],
    [{ tipo: 'danoCritico', percentual: 8, condicao: { alvoStatus: ['sangramento'] } }],
  ],
  lutero: [
    [{ tipo: 'atq', percentual: 8 }],
    [{ tipo: 'gatilho', quando: { evento: 'criticoDado' }, resultado: { bonus: { dano: 5, rodadas: 2, pilhasMax: 3 } } }],
    [{ tipo: 'criticoSe', pontos: 15, condicao: { alvoHpAbaixo: 25 } }],
  ],
  morvath: [
    [{ tipo: 'danoElemental', elemento: 'sombrio', percentual: 10 }],
    [{ tipo: 'hp', percentual: 8 }],
    [{ tipo: 'gatilho', quando: { evento: 'inimigoMorto' }, usosPorCombate: 2, resultado: { cura: 3, bonus: { def: 5, rodadas: 2 } } }],
  ],
  grizzham: [[{ tipo: 'def', percentual: 10 }], [{ tipo: 'danoSe', percentual: 8, condicao: { atacanteHpAcima: 70 } }], [{ tipo: 'reducaoDano', alvo: 'chefes', percentual: 10 }]],
  rhazkida: [[{ tipo: 'danoStatus', status: 'sangramento', percentual: 10 }], [{ tipo: 'iniciativa', percentual: 8 }], null],
  vharok: [
    [{ tipo: 'danoElemental', elemento: 'sombrio', percentual: 10 }],
    [{ tipo: 'gatilho', quando: { evento: 'golpeElemental', elemento: 'sombrio' }, resultado: { curaDoDano: { percentual: 3, limiteHpMax: 5 } } }],
    [{ tipo: 'gatilho', quando: { evento: 'inimigoMorto' }, resultado: { bonus: { dano: 8, rodadas: 2, pilhasMax: 2 } } }],
  ],
  vargheist: [
    [{ tipo: 'atq', percentual: 7 }, { tipo: 'iniciativa', percentual: 5 }],
    null,
    [{ tipo: 'gatilho', quando: { evento: 'criticoDado' }, umaVezPorRodada: true, resultado: { bonus: { dano: 12, golpes: 1 } } }],
  ],
  floragoth: [
    [{ tipo: 'danoStatus', status: 'veneno', percentual: 10 }],
    [{ tipo: 'gatilho', quando: { evento: 'atacadoPorInimigo' }, chance: 10, umaVezPorRodada: true, resultado: { sangramentoNoInimigo: true } }],
    [{ tipo: 'danoSe', percentual: 8, condicao: { alvoStatus: ['veneno', 'sangramento'] } }],
  ],
  nharzuel: [
    [{ tipo: 'danoElemental', elemento: 'sombrio', percentual: 10 }],
    [{ tipo: 'reducaoDano', alvo: 'magico', percentual: 8 }],
    [{ tipo: 'gatilho', quando: { evento: 'hpAbaixo', percentual: 20 }, usosPorCombate: 1, resultado: { escudo: { percentual: 8, rodadas: 2 } } }],
  ],
  seraphel: [[{ tipo: 'danoElemental', elemento: 'sagrado', percentual: 10 }], [{ tipo: 'danoSe', percentual: 10, condicao: { alvoComEscudo: true } }], [{ tipo: 'danoSe', percentual: 8, condicao: { alvoComBonus: true } }]],
  akumetsu: [
    [{ tipo: 'atq', percentual: 8 }],
    [{ tipo: 'danoCritico', percentual: 12 }],
    [{ tipo: 'danoSe', percentual: 12, condicao: { alvoChefe: true, atacanteHpAbaixo: 50 } }],
  ],
  azhrak: [[{ tipo: 'danoElemental', elemento: 'fogo', percentual: 12 }], [{ tipo: 'resistenciaElemental', elemento: 'fogo', percentual: 15 }], [{ tipo: 'danoSe', percentual: 15, condicao: { alvoStatus: ['queimadura'] } }]],
  nyxara: [
    [{ tipo: 'resistenciaStatus', percentual: 10 }],
    [{ tipo: 'reducaoDano', alvo: 'magico', percentual: 10 }],
    [{ tipo: 'gatilho', quando: { evento: 'efeitoResistido' }, umaVezPorRodada: true, resultado: { bonus: { def: 8, rodadas: 2 } } }],
  ],
  odrak: [
    [{ tipo: 'hp', percentual: 12 }],
    [{ tipo: 'reducaoDano', alvo: 'todos', percentual: 10 }],
    [{ tipo: 'gatilho', quando: { evento: 'hpAbaixo', percentual: 30 }, usosPorCombate: 1, resultado: { bonus: { reducao: 10, rodadas: 2 } } }],
  ],
  vaelgrim: [[{ tipo: 'danoElemental', elemento: 'gelo', percentual: 12 }], [{ tipo: 'chanceStatus', status: 'congelamento', percentual: 10 }], [{ tipo: 'danoElementalSe', elemento: 'gelo', percentual: 12, condicao: { alvoStatus: ['congelado'] } }]],
  malachar: [
    [{ tipo: 'danoSe', percentual: 10, condicao: { alvoStatus: ['maldicao'] } }],
    null,
    [{ tipo: 'danoSe', percentual: 15, condicao: { alvoStatus: ['maldicao'], alvoHpAbaixo: 25 } }],
  ],
  lautrec: [
    [{ tipo: 'atq', percentual: 10 }],
    [{ tipo: 'gatilho', quando: { evento: 'danoRecebido', minimoPercentualHp: 0 }, resultado: { bonus: { dano: 3, rodadas: 2, pilhasMax: 3 } } }],
    [{ tipo: 'danoSe', percentual: 12, condicao: { alvoComNegativo: true } }],
    [{ tipo: 'gatilho', quando: { evento: 'hpAbaixo', percentual: 50 }, usosPorCombate: 1, resultado: { bonus: { dano: 20, reducao: 10, rodadas: 2 } } }],
  ],
  nimb: [
    [{ tipo: 'iniciativa', percentual: 10 }],
    [{ tipo: 'danoElemental', elemento: 'relampago', percentual: 12 }],
    null,
    [{ tipo: 'gatilho', quando: { evento: 'criticoDado' }, chance: 30, usosPorCombate: 1, resultado: { danoExtra: { base: 'golpe', percentual: 100 } } }],
  ],
  lana: [
    [{ tipo: 'resistenciaStatus', percentual: 10 }],
    [{ tipo: 'chanceStatus', status: 'sono', percentual: 15 }],
    [{ tipo: 'reducaoDanoDeAfetados', alvo: 'negativo', percentual: 10 }],
    [{ tipo: 'gatilho', quando: { evento: 'controleAplicado' }, usosPorCombate: 1, resultado: { bonus: { dano: 20, rodadas: 2 } } }],
  ],
  aurelion: [
    [{ tipo: 'atq', percentual: 5 }, { tipo: 'def', percentual: 5 }, { tipo: 'hp', percentual: 5 }],
    [{ tipo: 'resistenciaElemental', elemento: 'todos', percentual: 10 }],
    [{ tipo: 'gatilho', quando: { evento: 'hpAbaixo', percentual: 50 }, usosPorCombate: 1, resultado: { bonus: { dano: 10, def: 10, rodadas: 2 } } }],
    [{ tipo: 'gatilho', quando: { evento: 'hpAbaixo', percentual: 20 }, usosPorCombate: 1, resultado: { removerNegativos: true, escudo: { percentual: 15, rodadas: 2 } } }],
  ],
  nymeris: [
    [{ tipo: 'danoElemental', elemento: 'sombrio', percentual: 12 }],
    [{ tipo: 'gatilho', quando: { evento: 'golpeElemental', elemento: 'sombrio' }, resultado: { curaDoDano: { percentual: 4, limiteHpMax: 6 } } }],
    null,
    [{ tipo: 'gatilho', quando: { evento: 'golpeElemental', elemento: 'sombrio', alvoHpAbaixo: 25 }, usosPorCombate: 1, resultado: { danoExtra: { base: 'hpAtualDoAlvo', percentual: 15, limiteHpMaxProprio: 10 } } }],
  ],
};

/** A habilidade já vale no combate? */
export function habilidadeDoEmblemaVale(tipoId: string, indice: number): boolean {
  return (EFEITOS_DOS_EMBLEMAS[tipoId]?.[indice] ?? null) !== null;
}
