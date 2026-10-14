import { describe, it, expect } from 'vitest';
import { Combatente, resolverCombate } from '@/game/combat';
import { EquipamentoCombate } from '@/game/combate/equipamentoCombate';
import { EmblemaItem } from '@/game/emblemas';
import { efeitosEstaticosDosEmblemas, emblemasNoCombate, EmblemasNoCombate } from '@/game/emblemasEfeitos';
import { calcularFichaEquipamento } from '@/game/equipamento';
import { TIPOS_EMBLEMA } from '@/rules/emblemasCatalogo';
import { EFEITOS_DOS_EMBLEMAS, habilidadeDoEmblemaVale } from '@/rules/emblemasEfeitos';
import { ELEMENTOS } from '@/rules/elements';
import { MONSTERS_MAP, MonsterDefinition } from '@/rules/monsters';

const item = (id: string, tipo: string, estrelas = 1): EmblemaItem => ({ id, tipo, estrelas });
const varios = (tipo: string, n: number, estrelas = 1) => Array.from({ length: n }, (_, i) => item(`${tipo}${i}`, tipo, estrelas));

describe('Efeitos dos emblemas (tabela)', () => {
  it('a tabela cobre os 25 emblemas, uma entrada por habilidade', () => {
    for (const t of TIPOS_EMBLEMA) {
      expect(EFEITOS_DOS_EMBLEMAS[t.id], t.id).toBeDefined();
      expect(EFEITOS_DOS_EMBLEMAS[t.id], t.id).toHaveLength(t.habilidades.length);
    }
    expect(Object.keys(EFEITOS_DOS_EMBLEMAS)).toHaveLength(25);
  });

  it('27 habilidades já valem nesta parte (efeitos fixos); as outras entram depois', () => {
    let vale = 0;
    for (const t of TIPOS_EMBLEMA) t.habilidades.forEach((_, i) => { if (habilidadeDoEmblemaVale(t.id, i)) vale++; });
    expect(vale).toBe(27);
    expect(habilidadeDoEmblemaVale('dargan', 0)).toBe(false); // condicional: vem depois
    expect(habilidadeDoEmblemaVale('lutero', 0)).toBe(true);
    expect(habilidadeDoEmblemaVale('lutero', 1)).toBe(false);
  });
});

describe('Soma dos efeitos fixos', () => {
  it('um Lutero 1★ dá +8% de ATQ; com 4 iguais, o nível 4 vale 2,5×: +20%', () => {
    expect(efeitosEstaticosDosEmblemas([item('a', 'lutero')]).atqPercentual).toBe(8);
    expect(efeitosEstaticosDosEmblemas(varios('lutero', 2)).atqPercentual).toBe(12);
    expect(efeitosEstaticosDosEmblemas(varios('lutero', 4)).atqPercentual).toBe(20);
  });

  it('emblemas diferentes se somam: Lutero (8) + Akumetsu (8) + Lautrec (10)', () => {
    expect(efeitosEstaticosDosEmblemas([item('a', 'lutero'), item('b', 'akumetsu'), item('c', 'lautrec')]).atqPercentual).toBe(26);
  });

  it('só vale a habilidade que a estrela do emblema desbloqueou', () => {
    // Kael 1★: só a DEF; 2★: DEF e a redução de dano físico
    const um = efeitosEstaticosDosEmblemas([item('a', 'kael-draven', 1)]);
    expect([um.defPercentual, um.reducaoDano.fisico]).toEqual([8, 0]);
    const dois = efeitosEstaticosDosEmblemas([item('a', 'kael-draven', 2)]);
    expect([dois.defPercentual, dois.reducaoDano.fisico]).toEqual([8, 6]);
  });

  it('um emblema com vários efeitos (Vargheist: ATQ e iniciativa; Aurelion: ATQ, DEF e HP)', () => {
    const v = efeitosEstaticosDosEmblemas([item('a', 'vargheist')]);
    expect([v.atqPercentual, v.iniciativaPercentual]).toEqual([7, 5]);
    const a = efeitosEstaticosDosEmblemas([item('a', 'aurelion')]);
    expect([a.atqPercentual, a.defPercentual, a.hpPercentual]).toEqual([5, 5, 5]);
  });

  it('crítico, iniciativa, HP, dano e resistência por elemento', () => {
    expect(efeitosEstaticosDosEmblemas([item('a', 'grimhall')]).criticoPontos).toBe(6);
    expect(efeitosEstaticosDosEmblemas([item('a', 'nimb')]).iniciativaPercentual).toBe(10);
    expect(efeitosEstaticosDosEmblemas([item('a', 'odrak')]).hpPercentual).toBe(12);
    expect(efeitosEstaticosDosEmblemas([item('a', 'nymeris')]).danoElemental).toEqual({ sombrio: 12 });
    // sombrio soma entre emblemas diferentes
    expect(efeitosEstaticosDosEmblemas([item('a', 'nymeris'), item('b', 'vharok')]).danoElemental.sombrio).toBe(22);
    expect(efeitosEstaticosDosEmblemas([item('a', 'azhrak', 2)]).resistenciaElemental).toEqual({ fogo: 15 });
    expect(efeitosEstaticosDosEmblemas([item('a', 'azhrak', 2)]).danoElemental).toEqual({ fogo: 12 });
  });

  it('Aurelion 2★ resiste a todos os sete elementos', () => {
    const r = efeitosEstaticosDosEmblemas([item('a', 'aurelion', 2)]).resistenciaElemental;
    expect(Object.keys(r).sort()).toEqual([...ELEMENTOS].sort());
    expect(Object.values(r).every((v) => v === 10)).toBe(true);
  });

  it('redução de dano: física, mágica, total e de chefes', () => {
    expect(efeitosEstaticosDosEmblemas([item('a', 'nharzuel', 2)]).reducaoDano.magico).toBe(8);
    expect(efeitosEstaticosDosEmblemas([item('a', 'nyxara', 2)]).reducaoDano.magico).toBe(10);
    expect(efeitosEstaticosDosEmblemas([item('a', 'odrak', 2)]).reducaoDano.todos).toBe(10);
    expect(efeitosEstaticosDosEmblemas([item('a', 'grizzham', 3)]).reducaoDano.chefes).toBe(10);
  });

  it('sem emblemas, ou só com habilidades que ainda não valem, nada muda', () => {
    expect(efeitosEstaticosDosEmblemas([]).atqPercentual).toBe(0);
    expect(emblemasNoCombate(efeitosEstaticosDosEmblemas([item('a', 'dargan', 3)]))).toBeUndefined();
  });
});

describe('Efeitos dos emblemas na ficha de equipamento', () => {
  it('ATQ, iniciativa, crítico, HP e resistência elemental entram na ficha, mesmo sem arma nem armadura', () => {
    const ficha = calcularFichaEquipamento(undefined, [], [], [item('a', 'vargheist'), item('b', 'grimhall'), item('c', 'odrak'), item('d', 'azhrak', 2)]);
    expect(ficha.percentuais).toMatchObject({ danoFisico: 7, danoMagico: 7, agilidade: 5, chanceCritico: 6 });
    expect(ficha.hpPercentual).toBe(12);
    expect(ficha.resistenciaElemental).toEqual({ fogo: 15 });
    expect(ficha.emblemas.danoElemental).toEqual({ fogo: 12 });
  });
});

// ---- no motor ----
const SEM_BONUS: EquipamentoCombate = {
  bonusDanoFisicoPercentual: 0,
  bonusDanoMagicoPercentual: 0,
  bonusChanceCriticoPontos: 0,
  bonusChanceEfeitosPontos: 0,
  statusArma: [],
  elementosArma: [],
};
const EMBLEMAS_ZERO: EmblemasNoCombate = { defPercentual: 0, danoElemental: {}, reducaoDano: { fisico: 0, magico: 0, todos: 0, chefes: 0 } };
const comEmblemas = (e: Partial<EmblemasNoCombate>): EquipamentoCombate => ({ ...SEM_BONUS, emblemas: { ...EMBLEMAS_ZERO, ...e } });

const ALVO: MonsterDefinition = {
  ...MONSTERS_MAP['rato-da-peste'],
  id: 'alvo-de-teste',
  nome: 'Alvo de Teste',
  hp: 5000,
  efeitosAplicados: undefined,
  modificadoresElementais: undefined,
  atributos: { vigor: 1, sorte: 0, forca: 400, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
};

function heroi(equipamento?: EquipamentoCombate, extra: Partial<Combatente> = {}): Combatente {
  return {
    nome: 'Herói',
    racaId: 'humano',
    classeId: 'barbaro',
    nivel: 10,
    hp: 5000,
    hpMax: 5000,
    sobreescudo: 0,
    mitigacao: 40,
    atributos: { vigor: 20, sorte: 0, forca: 60, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 10 },
    ...(equipamento ? { equipamento } : {}),
    ...extra,
  };
}
const golpe = (p: Combatente, alvo: MonsterDefinition = ALVO, quem: 'heroi' | 'monstro' = 'heroi') =>
  resolverCombate(p, alvo, 11, { rngStatus: () => 99.9 }).logTurnos[0].ataques.find((a) => (quem === 'heroi' ? a.atacante === 'Herói' : a.atacante !== 'Herói'))!;

describe('Efeitos dos emblemas no motor de combate', () => {
  it('dano elemental: só o golpe do elemento ganha o bônus', () => {
    const base = golpe(heroi(SEM_BONUS, { elementoAtaque: 'sombrio' })).danoBruto;
    const com = golpe(heroi(comEmblemas({ danoElemental: { sombrio: 50 } }), { elementoAtaque: 'sombrio' })).danoBruto;
    expect(com).toBeGreaterThan(base);
    const outro = golpe(heroi(comEmblemas({ danoElemental: { sombrio: 50 } }), { elementoAtaque: 'fogo' })).danoBruto;
    const baseFogo = golpe(heroi(SEM_BONUS, { elementoAtaque: 'fogo' })).danoBruto;
    expect(outro).toBe(baseFogo);
  });

  it('DEF dos emblemas reduz o dano que o personagem recebe', () => {
    const base = golpe(heroi(SEM_BONUS), ALVO, 'monstro').danoEfetivo;
    const com = golpe(heroi(comEmblemas({ defPercentual: 50 })), ALVO, 'monstro').danoEfetivo;
    expect(com).toBeLessThan(base);
  });

  it('a redução de dano física não mexe no dano mágico, e a total vale para os dois', () => {
    const fisicoBase = golpe(heroi(SEM_BONUS), ALVO, 'monstro').danoEfetivo;
    const fisico = golpe(heroi(comEmblemas({ reducaoDano: { ...EMBLEMAS_ZERO.reducaoDano, fisico: 30 } })), ALVO, 'monstro').danoEfetivo;
    expect(fisico).toBeLessThan(fisicoBase);
    const magico = golpe(heroi(comEmblemas({ reducaoDano: { ...EMBLEMAS_ZERO.reducaoDano, magico: 30 } })), ALVO, 'monstro').danoEfetivo;
    expect(magico).toBe(fisicoBase);
    const todos = golpe(heroi(comEmblemas({ reducaoDano: { ...EMBLEMAS_ZERO.reducaoDano, todos: 30 } })), ALVO, 'monstro').danoEfetivo;
    expect(todos).toBe(fisico);
  });

  it('a redução contra chefes só vale contra monstro chefe', () => {
    const chefe: MonsterDefinition = { ...ALVO, chefe: true };
    const e = comEmblemas({ reducaoDano: { ...EMBLEMAS_ZERO.reducaoDano, chefes: 30 } });
    const normalBase = golpe(heroi(SEM_BONUS), ALVO, 'monstro').danoEfetivo;
    expect(golpe(heroi(e), ALVO, 'monstro').danoEfetivo).toBe(normalBase);
    const chefeBase = golpe(heroi(SEM_BONUS), chefe, 'monstro').danoEfetivo;
    expect(golpe(heroi(e), chefe, 'monstro').danoEfetivo).toBeLessThan(chefeBase);
  });
});
