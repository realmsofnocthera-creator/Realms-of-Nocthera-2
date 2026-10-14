import { describe, it, expect } from 'vitest';
import { Combatente, resolverCombate } from '@/game/combat';
import { bonusDosGatilhos, consumirGolpeDosGatilhos, dispararGatilhos, novoEstadoGatilhos } from '@/game/combate/gatilhosEmblema';
import { EquipamentoCombate } from '@/game/combate/equipamentoCombate';
import { EmblemaItem } from '@/game/emblemas';
import { efeitosEstaticosDosEmblemas, efeitosVazios, emblemasNoCombate, EmblemasNoCombate, GatilhoNoCombate } from '@/game/emblemasEfeitos';
import { MONSTERS_MAP, MonsterDefinition } from '@/rules/monsters';

const item = (id: string, tipo: string, estrelas = 1): EmblemaItem => ({ id, tipo, estrelas });
const gat = (extra: Partial<GatilhoNoCombate> & Pick<GatilhoNoCombate, 'quando' | 'resultado'>): GatilhoNoCombate => ({
  id: 'teste:0',
  nome: 'Teste',
  ...extra,
});
const emb = (...gatilhos: GatilhoNoCombate[]): EmblemasNoCombate => ({ ...efeitosVazios(), gatilhos });
const ctx = (rodada: number, sorteio = 0) => ({ rodada, hpMaxProprio: 1000, sorteio: () => sorteio });

describe('Gatilhos dos emblemas (estado)', () => {
  it('só dispara com o acontecimento certo', () => {
    const e = emb(gat({ quando: { evento: 'inimigoMorto' }, resultado: { cura: 4 } }));
    expect(dispararGatilhos(e, novoEstadoGatilhos(), { evento: 'criticoDado', danoDoGolpe: 10 }, ctx(1))).toHaveLength(0);
    const [d] = dispararGatilhos(e, novoEstadoGatilhos(), { evento: 'inimigoMorto' }, ctx(1));
    expect(d.cura).toBe(40); // 4% de 1000
  });

  it('respeita os usos por combate e o uma vez por rodada', () => {
    const e = emb(gat({ quando: { evento: 'inimigoMorto' }, usosPorCombate: 2, resultado: { cura: 4 } }));
    const est = novoEstadoGatilhos();
    const n = () => dispararGatilhos(e, est, { evento: 'inimigoMorto' }, ctx(1)).length;
    expect([n(), n(), n()]).toEqual([1, 1, 0]);

    const r = emb(gat({ quando: { evento: 'criticoDado' }, umaVezPorRodada: true, resultado: { bonus: { dano: 10, golpes: 1 } } }));
    const est2 = novoEstadoGatilhos();
    const c = (rodada: number) => dispararGatilhos(r, est2, { evento: 'criticoDado', danoDoGolpe: 10 }, ctx(rodada)).length;
    expect([c(1), c(1), c(2)]).toEqual([1, 0, 1]);
  });

  it('a chance usa o sorteio, e o uso só é gasto quando dispara', () => {
    const e = emb(gat({ quando: { evento: 'criticoDado' }, chance: 30, usosPorCombate: 1, resultado: { danoExtra: { base: 'golpe', percentual: 100 } } }));
    const est = novoEstadoGatilhos();
    const falha = dispararGatilhos(e, est, { evento: 'criticoDado', danoDoGolpe: 200 }, ctx(1, 50));
    expect(falha).toHaveLength(0);
    const [ok] = dispararGatilhos(e, est, { evento: 'criticoDado', danoDoGolpe: 200 }, ctx(1, 10));
    expect(ok.danoExtra).toBe(200);
    expect(dispararGatilhos(e, est, { evento: 'criticoDado', danoDoGolpe: 200 }, ctx(2, 10))).toHaveLength(0);
  });

  it('HP baixo e dano recebido usam os limiares', () => {
    const baixo = emb(gat({ quando: { evento: 'hpAbaixo', percentual: 30 }, usosPorCombate: 1, resultado: { escudo: { percentual: 8, rodadas: 2 } } }));
    expect(dispararGatilhos(baixo, novoEstadoGatilhos(), { evento: 'hpAbaixo', hpPercentual: 30 }, ctx(1))).toHaveLength(0);
    expect(dispararGatilhos(baixo, novoEstadoGatilhos(), { evento: 'hpAbaixo', hpPercentual: 29 }, ctx(1))[0].escudoPercentual).toBe(8);
    const dano = emb(gat({ quando: { evento: 'danoRecebido', minimoPercentualHp: 15 }, resultado: { bonus: { dano: 12, golpes: 1 } } }));
    expect(dispararGatilhos(dano, novoEstadoGatilhos(), { evento: 'danoRecebido', percentualHpPerdido: 14 }, ctx(1))).toHaveLength(0);
    expect(dispararGatilhos(dano, novoEstadoGatilhos(), { evento: 'danoRecebido', percentualHpPerdido: 15 }, ctx(1))).toHaveLength(1);
  });

  it('cura do dano: tem teto por rodada e só vale para o elemento certo', () => {
    const e = emb(gat({ quando: { evento: 'golpeElemental', elemento: 'sombrio' }, resultado: { curaDoDano: { percentual: 10, limiteHpMax: 5 } } }));
    const est = novoEstadoGatilhos();
    const golpe = (elemento: 'sombrio' | 'fogo', rodada: number, dano: number) =>
      dispararGatilhos(e, est, { evento: 'golpeElemental', elemento, danoCausado: dano, hpAtualDoAlvo: 100, hpMaxDoAlvo: 100 }, ctx(rodada))[0]?.cura ?? 0;
    expect(golpe('fogo', 1, 400)).toBe(0);
    expect(golpe('sombrio', 1, 400)).toBe(40); // 10% do dano
    expect(golpe('sombrio', 1, 1000)).toBe(10); // teto de 5% de 1000 = 50, já curou 40
    expect(golpe('sombrio', 1, 1000)).toBe(0); // teto gasto: nem dispara
    expect(golpe('sombrio', 2, 400)).toBe(40); // rodada nova
  });

  it('dano extra do HP atual do alvo tem teto no HP máximo do personagem (Devoradora da Existência)', () => {
    const e = emb(
      gat({
        quando: { evento: 'golpeElemental', elemento: 'sombrio', alvoHpAbaixo: 25 },
        usosPorCombate: 1,
        resultado: { danoExtra: { base: 'hpAtualDoAlvo', percentual: 15, limiteHpMaxProprio: 10 } },
      })
    );
    const alvoCheio = { evento: 'golpeElemental', elemento: 'sombrio', danoCausado: 1, hpAtualDoAlvo: 900, hpMaxDoAlvo: 1000 } as const;
    expect(dispararGatilhos(e, novoEstadoGatilhos(), alvoCheio, ctx(1))).toHaveLength(0);
    const quase = { ...alvoCheio, hpAtualDoAlvo: 240 };
    expect(dispararGatilhos(e, novoEstadoGatilhos(), quase, ctx(1))[0].danoExtra).toBe(36); // 15% de 240
    const muito = { ...alvoCheio, hpAtualDoAlvo: 249, hpMaxDoAlvo: 100000 };
    expect(dispararGatilhos(e, novoEstadoGatilhos(), muito, ctx(1))[0].danoExtra).toBe(37);
  });
});

describe('Bônus temporários', () => {
  it('duram N rodadas completas depois da ativação', () => {
    const e = emb(gat({ quando: { evento: 'hpAbaixo', percentual: 50 }, resultado: { bonus: { dano: 10, def: 10, reducao: 5, rodadas: 2 } } }));
    const est = novoEstadoGatilhos();
    dispararGatilhos(e, est, { evento: 'hpAbaixo', hpPercentual: 40 }, ctx(3));
    expect([3, 4, 5, 6].map((r) => bonusDosGatilhos(est, r).dano)).toEqual([0, 10, 10, 0]);
    expect(bonusDosGatilhos(est, 4)).toEqual({ dano: 10, def: 10, reducao: 5 });
  });

  it('acumulam até o máximo de pilhas e renovam a duração', () => {
    const e = emb(gat({ quando: { evento: 'criticoDado' }, resultado: { bonus: { dano: 5, rodadas: 2, pilhasMax: 3 } } }));
    const est = novoEstadoGatilhos();
    for (const r of [1, 2, 3, 4]) dispararGatilhos(e, est, { evento: 'criticoDado', danoDoGolpe: 1 }, ctx(r));
    expect(bonusDosGatilhos(est, 5).dano).toBe(15); // 3 pilhas (a 4ª não passa do máximo)
    expect(bonusDosGatilhos(est, 7).dano).toBe(0); // venceu 2 rodadas depois da última ativação (rodada 4)
  });

  it('bônus de "próximo ataque" vale para um golpe só', () => {
    const e = emb(gat({ quando: { evento: 'criticoDado' }, resultado: { bonus: { dano: 12, golpes: 1 } } }));
    const est = novoEstadoGatilhos();
    dispararGatilhos(e, est, { evento: 'criticoDado', danoDoGolpe: 1 }, ctx(1));
    expect(bonusDosGatilhos(est, 1).dano).toBe(0); // o golpe que deu o crítico não conta
    expect(bonusDosGatilhos(est, 2).dano).toBe(12);
    consumirGolpeDosGatilhos(est, 2);
    expect(bonusDosGatilhos(est, 2).dano).toBe(0);
    expect(bonusDosGatilhos(est, 3).dano).toBe(0);
  });
});

describe('Gatilhos na tabela dos emblemas', () => {
  it('o multiplicador do nível vale para cura, escudo e bônus, e não para chance e usos', () => {
    const um = efeitosEstaticosDosEmblemas([item('a', 'dargan', 3)]).gatilhos[0];
    expect([um.resultado.cura, um.usosPorCombate]).toEqual([4, 2]);
    const quatro = efeitosEstaticosDosEmblemas([1, 2, 3, 4].map((i) => item(`d${i}`, 'dargan', 3))).gatilhos[0];
    expect([quatro.resultado.cura, quatro.usosPorCombate]).toEqual([10, 2]); // nível 4: 2,5×

    const nimb = efeitosEstaticosDosEmblemas([1, 2].map((i) => item(`n${i}`, 'nimb', 4))).gatilhos[0];
    expect([nimb.chance, nimb.resultado.danoExtra]).toEqual([30, { base: 'golpe', percentual: 150 }]);
  });

  it('o nome do gatilho é o da habilidade, e a chave identifica a habilidade', () => {
    const [g] = efeitosEstaticosDosEmblemas([item('a', 'dargan', 3)]).gatilhos;
    expect([g.nome, g.id]).toEqual(['Último Saque', 'dargan:2']);
  });

  it('Delírio Carniceiro vira chance de crítico condicional', () => {
    const e = efeitosEstaticosDosEmblemas([item('a', 'lutero', 3)]);
    expect(e.criticoSe).toEqual([{ percentual: 15, condicao: { alvoHpAbaixo: 25 } }]);
    expect(emblemasNoCombate(e)?.gatilhos).toHaveLength(1);
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
const comGatilhos = (...g: GatilhoNoCombate[]): EquipamentoCombate => ({ ...SEM_BONUS, emblemas: emb(...g) });
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
const mensagens = (r: ReturnType<typeof resolverCombate>) => r.logTurnos.flatMap((t) => t.eventosMecanica ?? []);
const SEM_STATUS = { rngStatus: () => 99.9 };

describe('Gatilhos no motor de combate', () => {
  it('Último Saque: ao derrotar o inimigo, recupera HP (vale nas lutas que levam o HP adiante)', () => {
    const fraco: MonsterDefinition = { ...ALVO, hp: 1 };
    const base = resolverCombate(heroi(SEM_BONUS, { hp: 3000, atributos: { ...heroi().atributos, agilidade: 500 } }), fraco, 7, SEM_STATUS);
    const com = resolverCombate(
      heroi(comGatilhos(gat({ quando: { evento: 'inimigoMorto' }, usosPorCombate: 2, resultado: { cura: 4 } })), { hp: 3000, atributos: { ...heroi().atributos, agilidade: 500 } }),
      fraco,
      7,
      SEM_STATUS
    );
    expect(base.vencedor).toBe('personagem');
    expect(com.personagemFinal.hp - base.personagemFinal.hp).toBe(200); // 4% de 5000
    expect(mensagens(com).some((m) => m.includes('Teste') && m.includes('recupera 200'))).toBe(true);
  });

  it('HP baixo dispara uma vez só e dá escudo', () => {
    const r = resolverCombate(
      heroi(comGatilhos(gat({ quando: { evento: 'hpAbaixo', percentual: 20 }, usosPorCombate: 1, resultado: { escudo: { percentual: 8, rodadas: 2 } } })), { hp: 900 }),
      ALVO,
      7,
      SEM_STATUS
    );
    const avisos = mensagens(r).filter((m) => m.includes('ganha 400 de escudo')); // 8% de 5000
    expect(avisos).toHaveLength(1);
  });

  it('crítico dispara o bônus de dano da próxima rodada', () => {
    const crit = { rngStatus: () => 99.9, rngCritico: () => 0 };
    const equip = comGatilhos(gat({ quando: { evento: 'criticoDado' }, resultado: { bonus: { dano: 100, rodadas: 2 } } }));
    const atributos = { vigor: 20, sorte: 500, forca: 60, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 10 };
    const bruto = (c: Combatente, rodada: number) =>
      resolverCombate(c, ALVO, 11, crit).logTurnos[rodada].ataques.find((a) => a.atacante === 'Herói')!.danoBruto;
    const sem = heroi(SEM_BONUS, { atributos });
    expect(bruto(heroi(equip, { atributos }), 0)).toBe(bruto(sem, 0)); // o golpe do crítico ainda não tem o bônus
    expect(bruto(heroi(equip, { atributos }), 1)).toBeGreaterThan(bruto(sem, 1));
  });

  it('ser atacado dispara sangramento no inimigo (Espinhos Predatórios)', () => {
    const r = resolverCombate(
      heroi(comGatilhos(gat({ quando: { evento: 'atacadoPorInimigo' }, chance: 100, umaVezPorRodada: true, resultado: { sangramentoNoInimigo: true } }))),
      ALVO,
      7,
      SEM_STATUS
    );
    const sangrou = r.logTurnos.flatMap((t) => t.eventosEfeitos).some((e) => e.efeito === 'sangramento' && e.alvo === ALVO.nome);
    expect(sangrou).toBe(true);
  });

  it('dano recebido (Dor Transfigurada) acumula bônus de dano', () => {
    const r = resolverCombate(
      heroi(comGatilhos(gat({ quando: { evento: 'danoRecebido', minimoPercentualHp: 0 }, resultado: { bonus: { dano: 20, rodadas: 2, pilhasMax: 3 } } }))),
      ALVO,
      7,
      SEM_STATUS
    );
    const brutos = r.logTurnos.slice(0, 4).map((t) => t.ataques.find((a) => a.atacante === 'Herói')!.danoBruto);
    expect(brutos[1]).toBeGreaterThan(brutos[0]);
    expect(brutos[3]).toBeGreaterThanOrEqual(brutos[1]);
  });

  it('o redutor de dano temporário diminui o dano que o personagem recebe', () => {
    const base = resolverCombate(heroi(SEM_BONUS, { hp: 4000 }), ALVO, 7, SEM_STATUS);
    const com = resolverCombate(
      heroi(comGatilhos(gat({ quando: { evento: 'hpAbaixo', percentual: 90 }, usosPorCombate: 1, resultado: { bonus: { reducao: 50, rodadas: 100 } } })), { hp: 4000 }),
      ALVO,
      7,
      SEM_STATUS
    );
    const recebido = (r: typeof base, rodada: number) => r.logTurnos[rodada].ataques.find((a) => a.atacante !== 'Herói')!.danoEfetivo;
    expect(recebido(com, 3)).toBeLessThan(recebido(base, 3));
  });
});

describe('Monstro com DEF e as habilidades que mexem nela', () => {
  const blindado = (mitigacao: number): MonsterDefinition => ({ ...ALVO, mitigacao });
  const golpeDoHeroi = (c: Combatente, alvo: MonsterDefinition, rodada = 0) =>
    resolverCombate(c, alvo, 11, SEM_STATUS).logTurnos[rodada].ataques.find((a) => a.atacante === 'Herói')!;

  it('o monstro com DEF recebe menos dano: cada ponto tira 1 de dano de cada golpe', () => {
    const sem = golpeDoHeroi(heroi(SEM_BONUS), blindado(0)).danoEfetivo;
    const com = golpeDoHeroi(heroi(SEM_BONUS), blindado(30)).danoEfetivo;
    expect(sem - com).toBe(30);
  });

  it('ignorar DEF devolve parte do dano perdido', () => {
    const base = golpeDoHeroi(heroi(SEM_BONUS), blindado(30)).danoEfetivo;
    const ignora = golpeDoHeroi(heroi({ ...SEM_BONUS, emblemas: { ...efeitosVazios(), ignorarDefesa: [{ percentual: 50, condicao: {} }] } }), blindado(30)).danoEfetivo;
    expect(ignora - base).toBe(15); // metade dos 30 pontos de DEF
  });

  it('só ignora a DEF quando a condição vale (Sentença Irrevogável: alvo amaldiçoado)', () => {
    const equip: EquipamentoCombate = {
      ...SEM_BONUS,
      emblemas: { ...efeitosVazios(), ignorarDefesa: [{ percentual: 100, condicao: { alvoStatus: ['maldicao'] } }] },
    };
    expect(golpeDoHeroi(heroi(equip), blindado(30)).danoEfetivo).toBe(golpeDoHeroi(heroi(SEM_BONUS), blindado(30)).danoEfetivo);
  });

  it('Gravidade do Abismo: o golpe sombrio reduz a DEF do inimigo nas rodadas seguintes', () => {
    const equip = comGatilhos(
      gat({ quando: { evento: 'golpeElemental', elemento: 'sombrio' }, resultado: { debuffDefesaNoInimigo: { percentual: 50, rodadas: 3 } } })
    );
    const sombrio = { elementoAtaque: 'sombrio' as const };
    const alvo = blindado(40);
    const primeira = golpeDoHeroi(heroi(equip, sombrio), alvo, 0).danoEfetivo;
    const segunda = golpeDoHeroi(heroi(equip, sombrio), alvo, 1).danoEfetivo;
    const semEmblema = golpeDoHeroi(heroi(SEM_BONUS, sombrio), alvo, 1).danoEfetivo;
    expect(primeira).toBeLessThanOrEqual(segunda);
    expect(segunda).toBeGreaterThan(semEmblema);
    expect(mensagens(resolverCombate(heroi(equip, sombrio), alvo, 11, SEM_STATUS)).some((m) => m.includes('perde 50% de DEF'))).toBe(true);
  });

  it('Investida Voraz: do segundo golpe da ação em diante, mais dano', () => {
    const veloz = { atributos: { ...heroi().atributos, agilidade: 500 } };
    const equip: EquipamentoCombate = { ...SEM_BONUS, emblemas: { ...efeitosVazios(), danoGolpesSeguidosPercentual: 100 } };
    const ataques = (c: Combatente) => resolverCombate(c, ALVO, 11, SEM_STATUS).logTurnos[0].ataques.filter((a) => a.atacante === 'Herói');
    const [a1, a2] = ataques(heroi(equip, veloz));
    expect(a2.danoBruto).toBeGreaterThan(a1.danoBruto);
    const [b1, b2] = ataques(heroi(SEM_BONUS, veloz));
    expect(b2.danoBruto).toBeLessThanOrEqual(b1.danoBruto + 5); // sem o emblema, os dois golpes são parecidos
    expect(a1.danoBruto).toBe(b1.danoBruto);
  });

  it('Ritmo da Tempestade: com chance, o personagem ataca duas vezes sem ter Agilidade para isso', () => {
    // contra um alvo mais ágil que o herói, ele não ataca duas vezes por Agilidade
    const agil: MonsterDefinition = { ...ALVO, atributos: { ...ALVO.atributos, agilidade: 1000 } };
    const acoes = (chance: number) =>
      resolverCombate(heroi({ ...SEM_BONUS, emblemas: { ...efeitosVazios(), chanceAtaqueAdicional: chance } }), agil, 11, SEM_STATUS).logTurnos[0].ataques.filter(
        (a) => a.atacante === 'Herói'
      ).length;
    expect(acoes(0)).toBe(1);
    expect(acoes(100)).toBe(2);
  });

  it('as habilidades chegam do catálogo com os valores certos', () => {
    expect(efeitosEstaticosDosEmblemas([item('a', 'vargheist', 2)]).danoGolpesSeguidosPercentual).toBe(10);
    expect(efeitosEstaticosDosEmblemas([item('a', 'nimb', 3)]).chanceAtaqueAdicional).toBe(10);
    expect(efeitosEstaticosDosEmblemas([item('a', 'rhazkida', 3)]).ignorarDefesa).toEqual([{ percentual: 8, condicao: { alvoStatus: ['sangramento'] } }]);
    const gravidade = efeitosEstaticosDosEmblemas([item('a', 'nymeris', 3)]).gatilhos.find((g) => g.id === 'nymeris:2')!;
    expect(gravidade.resultado.debuffDefesaNoInimigo).toEqual({ percentual: 10, rodadas: 2 });
  });
});
