import { describe, it, expect } from 'vitest';
import { Combatente, resolverCombate } from '@/game/combat';
import { EquipamentoCombate } from '@/game/combate/equipamentoCombate';
import { EmblemaItem } from '@/game/emblemas';
import { efeitosEstaticosDosEmblemas, efeitosVazios, emblemasNoCombate, EmblemasNoCombate } from '@/game/emblemasEfeitos';
import { bonusDanoCondicionalDeEmblemas, condicaoDoEmblemaVale, ContextoEmblema, duracaoComBonus, fatorDanoCriticoDeEmblemas } from '@/game/combate/emblemasCombate';
import { reducaoDanoDeEmblemas } from '@/game/combat';
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

  it('54 habilidades já valem (fixas e condicionais); as 26 com gatilho ou que dependem da DEF dos monstros entram depois', () => {
    let vale = 0;
    for (const t of TIPOS_EMBLEMA) t.habilidades.forEach((_, i) => { if (habilidadeDoEmblemaVale(t.id, i)) vale++; });
    expect(vale).toBe(54);
    expect(habilidadeDoEmblemaVale('dargan', 0)).toBe(true); // condicional
    expect(habilidadeDoEmblemaVale('dargan', 2)).toBe(false); // gatilho: vem depois
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
    expect(emblemasNoCombate(efeitosEstaticosDosEmblemas([item('a', 'lutero', 3)]))).toBeUndefined();
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
const EMBLEMAS_ZERO: EmblemasNoCombate = efeitosVazios();
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

// ---- efeitos condicionais ----
const CTX: ContextoEmblema = {
  hpAlvo: 100,
  hpMaxAlvo: 100,
  hpAtacante: 100,
  hpMaxAtacante: 100,
  alvoChefe: false,
  alvoComEscudo: false,
  alvoComBonus: false,
  alvoComNegativo: false,
  alvoStatus: new Set(),
};

describe('Condições dos emblemas', () => {
  it('HP do alvo e de quem ataca', () => {
    expect(condicaoDoEmblemaVale({ alvoHpAbaixo: 40 }, { ...CTX, hpAlvo: 39 })).toBe(true);
    expect(condicaoDoEmblemaVale({ alvoHpAbaixo: 40 }, { ...CTX, hpAlvo: 40 })).toBe(false);
    expect(condicaoDoEmblemaVale({ atacanteHpAcima: 70 }, { ...CTX, hpAtacante: 71 })).toBe(true);
    expect(condicaoDoEmblemaVale({ atacanteHpAcima: 70 }, { ...CTX, hpAtacante: 70 })).toBe(false);
    expect(condicaoDoEmblemaVale({ atacanteHpAbaixo: 50 }, { ...CTX, hpAtacante: 10 })).toBe(true);
  });

  it('status do alvo: basta um da lista; escudo, bônus, negativo e chefe', () => {
    const c = { alvoStatus: ['veneno', 'sangramento'] } as const;
    expect(condicaoDoEmblemaVale(c, { ...CTX, alvoStatus: new Set(['sangramento']) })).toBe(true);
    expect(condicaoDoEmblemaVale(c, { ...CTX, alvoStatus: new Set(['queimadura']) })).toBe(false);
    expect(condicaoDoEmblemaVale({ alvoComEscudo: true }, { ...CTX, alvoComEscudo: true })).toBe(true);
    expect(condicaoDoEmblemaVale({ alvoComBonus: true }, CTX)).toBe(false);
    expect(condicaoDoEmblemaVale({ alvoComNegativo: true }, { ...CTX, alvoComNegativo: true })).toBe(true);
    expect(condicaoDoEmblemaVale({ alvoChefe: true }, { ...CTX, alvoChefe: true })).toBe(true);
  });

  it('com várias condições, todas precisam valer (Execução dos Juramentos: maldito e com menos de 25% de HP)', () => {
    const c = { alvoStatus: ['maldicao'], alvoHpAbaixo: 25 } as const;
    expect(condicaoDoEmblemaVale(c, { ...CTX, alvoStatus: new Set(['maldicao']), hpAlvo: 10 })).toBe(true);
    expect(condicaoDoEmblemaVale(c, { ...CTX, alvoStatus: new Set(['maldicao']) })).toBe(false);
    expect(condicaoDoEmblemaVale(c, { ...CTX, hpAlvo: 10 })).toBe(false);
  });

  it('a soma vem dos emblemas equipados, com o multiplicador do nível', () => {
    const um = emblemasNoCombate(efeitosEstaticosDosEmblemas([item('a', 'dargan')]))!;
    expect(bonusDanoCondicionalDeEmblemas(um, { ...CTX, hpAlvo: 10 })).toBe(8);
    expect(bonusDanoCondicionalDeEmblemas(um, CTX)).toBe(0);
    const quatro = emblemasNoCombate(efeitosEstaticosDosEmblemas(varios('dargan', 4)))!;
    expect(bonusDanoCondicionalDeEmblemas(quatro, { ...CTX, hpAlvo: 10 })).toBe(20);
  });

  it('dano crítico só vale com a condição', () => {
    const lautrec = emblemasNoCombate(efeitosEstaticosDosEmblemas([item('a', 'lautrec', 2)]))!;
    expect(fatorDanoCriticoDeEmblemas(lautrec, CTX)).toBeCloseTo(1.12);
    const grimhall = emblemasNoCombate(efeitosEstaticosDosEmblemas([item('a', 'grimhall', 3)]))!;
    expect(fatorDanoCriticoDeEmblemas(grimhall, CTX)).toBe(1);
    expect(fatorDanoCriticoDeEmblemas(grimhall, { ...CTX, alvoStatus: new Set(['sangramento']) })).toBeCloseTo(1.08);
  });

  it('status: dano, duração, chance e resistência', () => {
    const e = efeitosEstaticosDosEmblemas([item('a', 'vesper', 3), item('b', 'floragoth'), item('c', 'rhazkida'), item('d', 'elyss', 2), item("e", "lana", 3), item("f", "nyxara")]);
    expect(e.danoStatus).toEqual({ veneno: 18, sangramento: 10, queimadura: 0 });
    expect(e.duracaoStatus).toEqual({ veneno: 10, controle: 10 });
    expect(e.chanceStatus).toEqual({ congelamento: 0, sono: 15 });
    expect(e.resistenciaStatusPercentual).toBe(8 + 10 + 10);
    expect(e.reducaoDanoDeAfetados).toEqual({ veneno: 5, negativo: 10 });
  });

  it('duração: arredonda para o inteiro mais próximo e nunca encurta', () => {
    expect(duracaoComBonus(10, 10)).toBe(11);
    expect(duracaoComBonus(10, 25)).toBe(13);
    expect(duracaoComBonus(2, 10)).toBe(2);
    expect(duracaoComBonus(2, 25)).toBe(3);
    expect(duracaoComBonus(5, 0)).toBe(5);
  });

  it('o dano recebido de inimigos afetados cai (Febre Devoradora e Reflexo da Lua)', () => {
    const e = emblemasNoCombate(efeitosEstaticosDosEmblemas([item('a', 'vesper', 3), item('b', 'lana', 3)]))!;
    expect(reducaoDanoDeEmblemas(e, true, false)).toBe(0);
    expect(reducaoDanoDeEmblemas(e, true, false, { veneno: true, negativo: false })).toBe(5);
    expect(reducaoDanoDeEmblemas(e, true, false, { veneno: true, negativo: true })).toBe(15);
  });
});

describe('Efeitos condicionais no motor de combate', () => {
  const dano = (e: Partial<EmblemasNoCombate>, extra: Partial<Combatente> = {}, alvo: MonsterDefinition = ALVO) =>
    golpe(heroi(comEmblemas(e), extra), alvo).danoEfetivo;

  it('Último Duelo: +% contra chefe só com o HP do personagem abaixo de 50%', () => {
    const chefe: MonsterDefinition = { ...ALVO, chefe: true };
    const e = { danoSe: [{ percentual: 50, condicao: { alvoChefe: true as const, atacanteHpAbaixo: 50 } }] };
    const base = dano({}, { hp: 1000 }, chefe);
    expect(dano(e, { hp: 1000 }, chefe)).toBeGreaterThan(base); // chefe e 20% de HP
    expect(dano(e, { hp: 5000 }, chefe)).toBe(dano({}, { hp: 5000 }, chefe)); // HP cheio
    expect(dano(e, { hp: 1000 })).toBe(dano({}, { hp: 1000 })); // não é chefe
  });

  it('Corte Perfeito: o crítico causa mais dano', () => {
    const critico = (e: Partial<EmblemasNoCombate>) =>
      resolverCombate(heroi(comEmblemas(e), { atributos: { vigor: 20, sorte: 500, forca: 60, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 10 } }), ALVO, 11, {
        rngStatus: () => 99.9,
        rngCritico: () => 0,
      }).logTurnos[0].ataques.find((a) => a.atacante === 'Herói')!.danoEfetivo;
    expect(critico({ danoCritico: [{ percentual: 50, condicao: {} }] })).toBeGreaterThan(critico({}));
  });
});
