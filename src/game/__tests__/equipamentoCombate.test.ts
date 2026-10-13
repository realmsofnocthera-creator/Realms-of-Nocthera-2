import { describe, it, expect } from 'vitest';
import { Combatente, resolverCombate } from '@/game/combat';
import { elementoDaArmaNaRodada, EquipamentoCombate } from '@/game/combate/equipamentoCombate';
import { MONSTERS_MAP, MonsterDefinition } from '@/rules/monsters';

/** O motor só lê a ficha do equipamento: bônus de dano, crítico, status e elemento da arma. */

const SEM_BONUS: EquipamentoCombate = {
  bonusDanoFisicoPercentual: 0,
  bonusDanoMagicoPercentual: 0,
  bonusChanceCriticoPontos: 0,
  bonusChanceEfeitosPontos: 0,
  statusArma: [],
  elementosArma: [],
};

// Monstro de teste: muito HP para durar várias rodadas, sem efeitos próprios
const ALVO: MonsterDefinition = {
  ...MONSTERS_MAP['rato-da-peste'],
  id: 'alvo-de-teste',
  nome: 'Alvo de Teste',
  hp: 5000,
  efeitosAplicados: undefined,
  modificadoresElementais: undefined,
  atributos: { vigor: 1, sorte: 0, forca: 0, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
};

function personagem(equipamento?: EquipamentoCombate, extra: Partial<Combatente> = {}): Combatente {
  return {
    nome: 'Herói',
    racaId: 'humano',
    classeId: 'barbaro',
    nivel: 10,
    hp: 5000,
    hpMax: 5000,
    sobreescudo: 1000,
    mitigacao: 0,
    atributos: { vigor: 20, sorte: 0, forca: 60, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 10 },
    ...(equipamento ? { equipamento } : {}),
    ...extra,
  };
}

const primeiroAtaque = (p: Combatente, opcoes = {}) =>
  resolverCombate(p, ALVO, 11, { rngStatus: () => 99.9, ...opcoes }).logTurnos[0].ataques.find((a) => a.atacante === 'Herói')!;

describe('Equipamento no motor de combate', () => {
  it('sem equipamento o combate é o de sempre', () => {
    const a = resolverCombate(personagem(), ALVO, 11);
    const b = resolverCombate(personagem(SEM_BONUS), ALVO, 11);
    expect(b.logTurnos).toEqual(a.logTurnos);
  });

  it('bônus de dano físico da arma soma ao dano do golpe', () => {
    const base = primeiroAtaque(personagem(SEM_BONUS));
    const com = primeiroAtaque(personagem({ ...SEM_BONUS, bonusDanoFisicoPercentual: 50 }));
    expect(com.danoBruto).toBeGreaterThan(base.danoBruto);
    const penalizado = primeiroAtaque(personagem({ ...SEM_BONUS, bonusDanoFisicoPercentual: -10 }));
    expect(penalizado.danoBruto).toBeLessThan(base.danoBruto);
  });

  it('o bônus de dano mágico não mexe no dano físico', () => {
    const base = primeiroAtaque(personagem(SEM_BONUS));
    const magico = primeiroAtaque(personagem({ ...SEM_BONUS, bonusDanoMagicoPercentual: 50 }));
    expect(magico.danoBruto).toBe(base.danoBruto);
  });

  it('pontos de crítico da arma aumentam a chance de crítico', () => {
    const certo = primeiroAtaque(personagem({ ...SEM_BONUS, bonusChanceCriticoPontos: 100 }));
    expect(certo.golpesCriticos).toBe(1);
    expect(primeiroAtaque(personagem(SEM_BONUS)).golpesCriticos ?? 0).toBe(0);
  });

  it('o subtipo da arma vira o tipo do golpe e conta contra o corpo do alvo (Amorfo: fraco a perfuração, resiste a corte)', () => {
    const amorfo: MonsterDefinition = { ...ALVO, categoriaCorporal: 'amorfo' };
    const golpe = (tipo?: 'corte' | 'perfuracao') =>
      resolverCombate(personagem(SEM_BONUS, tipo ? { tipoDanoFisico: tipo } : {}), amorfo, 11, { rngStatus: () => 99.9 }).logTurnos[0].ataques.find(
        (a) => a.atacante === 'Herói'
      )!;
    expect(golpe('perfuracao')).toMatchObject({ tipoGolpe: 'perfuracao', reacaoTipoDano: 'fraqueza' });
    expect(golpe('corte')).toMatchObject({ tipoGolpe: 'corte', reacaoTipoDano: 'resistência' });
    expect(golpe(undefined).tipoGolpe).toBeUndefined(); // sem arma, sem tipo
  });

  it('o elemento da arma entra no golpe; com dois elementos, alternam por rodada', () => {
    const r = resolverCombate(personagem({ ...SEM_BONUS, elementosArma: ['gelo', 'sombrio'] }), ALVO, 11, { rngStatus: () => 99.9 });
    const doHeroi = r.logTurnos.slice(0, 4).map((t) => t.ataques.find((a) => a.atacante === 'Herói')!.elemento);
    expect(doHeroi).toEqual(['gelo', 'sombrio', 'gelo', 'sombrio']);
    expect(elementoDaArmaNaRodada([], 3)).toBeUndefined();
    expect(elementoDaArmaNaRodada(['fogo'], 7)).toBe('fogo');
  });

  it('status da arma: cada golpe tenta aplicar com a chance do status (sorteio 0 sempre ativa)', () => {
    const r = resolverCombate(personagem({ ...SEM_BONUS, statusArma: ['veneno'] }), ALVO, 11, { rngStatus: () => 0 });
    expect(r.logTurnos[0].eventosEfeitos[0]).toMatchObject({ tipo: 'aplicado', efeito: 'veneno', alvo: 'Alvo de Teste' });
    const sem = resolverCombate(personagem({ ...SEM_BONUS, statusArma: ['veneno'] }), ALVO, 11, { rngStatus: () => 99.9 });
    expect(sem.logTurnos[0].eventosEfeitos.some((e) => e.efeito === 'veneno')).toBe(false);
  });

  it('pontos de chance de efeitos (Grimório) aumentam a chance do status da arma', () => {
    // Veneno tem 8% de chance: o sorteio 10 só passa com +5 pontos ou mais
    const sorteio = () => 10;
    const base = resolverCombate(personagem({ ...SEM_BONUS, statusArma: ['veneno'] }), ALVO, 11, { rngStatus: sorteio });
    const com = resolverCombate(personagem({ ...SEM_BONUS, statusArma: ['veneno'], bonusChanceEfeitosPontos: 5 }), ALVO, 11, { rngStatus: sorteio });
    expect(base.logTurnos[0].eventosEfeitos.some((e) => e.efeito === 'veneno')).toBe(false);
    expect(com.logTurnos[0].eventosEfeitos.some((e) => e.efeito === 'veneno' && e.tipo === 'aplicado')).toBe(true);
  });
});

describe('Habilidades de armadura que dependem do estado da luta', () => {
  const comHabilidades = (habilidadesArmadura: Record<string, number>, extra: Partial<Combatente> = {}) =>
    personagem({ ...SEM_BONUS, habilidadesArmadura, sobreescudoMaximo: 1000 }, extra);

  it('Reforço de Ataque: dano +% e, a partir do nível 4, +3 de crítico', async () => {
    const { bonusDanoDeArmadura, bonusCriticoDeArmadura } = await import('@/game/combate/habilidadesArmaduraCombate');
    const e = { hpAtacante: 100, hpMaxAtacante: 100, sobreescudoAtacante: 0, sobreescudoMaxAtacante: 0, hpAlvo: 100, hpMaxAlvo: 100, alvoEnfurecido: false };
    expect([1, 4, 7].map((n) => bonusDanoDeArmadura({ 'reforco-de-ataque': n }, e))).toEqual([1, 4, 7]);
    expect([3, 4, 7].map((n) => bonusCriticoDeArmadura({ 'reforco-de-ataque': n }, e, false))).toEqual([0, 3, 3]);
  });

  it('Olho Crítico soma pontos de crítico por nível', async () => {
    const { bonusCriticoDeArmadura } = await import('@/game/combate/habilidadesArmaduraCombate');
    const e = { hpAtacante: 100, hpMaxAtacante: 100, sobreescudoAtacante: 0, sobreescudoMaxAtacante: 0, hpAlvo: 100, hpMaxAlvo: 100, alvoEnfurecido: false };
    expect([1, 3, 6, 7].map((n) => bonusCriticoDeArmadura({ 'olho-critico': n }, e, false))).toEqual([3, 9, 18, 24]);
  });

  it('as condições de HP: Desempenho Máximo (acima de 90%), Indignação (abaixo de 60%), Heroísmo (abaixo de 35%)', async () => {
    const { bonusDanoDeArmadura, bonusMitigacaoDeArmadura } = await import('@/game/combate/habilidadesArmaduraCombate');
    const estado = (hp: number) => ({ hpAtacante: hp, hpMaxAtacante: 100, sobreescudoAtacante: 0, sobreescudoMaxAtacante: 0, hpAlvo: 100, hpMaxAlvo: 100, alvoEnfurecido: false });
    const h = { 'desempenho-maximo': 3, indignacao: 5, heroismo: 7 };
    expect(bonusDanoDeArmadura(h, estado(100))).toBe(8); // só Desempenho Máximo
    expect(bonusDanoDeArmadura(h, estado(90))).toBe(0); // 90% não é "acima de 90%"
    expect(bonusDanoDeArmadura(h, estado(59))).toBe(10); // Indignação
    expect(bonusDanoDeArmadura(h, estado(34))).toBe(10 + 24); // Indignação e Heroísmo somam
    expect(bonusMitigacaoDeArmadura(h, 34, 100)).toBe(30);
    expect(bonusMitigacaoDeArmadura(h, 35, 100)).toBe(0);
    expect(bonusMitigacaoDeArmadura(undefined, 1, 100)).toBe(0);
  });

  it('Agitador e Quebra-parte só valem contra monstro Enfurecido', async () => {
    const { bonusDanoDeArmadura, bonusCriticoDeArmadura } = await import('@/game/combate/habilidadesArmaduraCombate');
    const base = { hpAtacante: 100, hpMaxAtacante: 100, sobreescudoAtacante: 0, sobreescudoMaxAtacante: 0, hpAlvo: 40, hpMaxAlvo: 100 };
    const h = { agitador: 7, 'quebra-parte': 3 };
    expect(bonusDanoDeArmadura(h, { ...base, alvoEnfurecido: false })).toBe(0);
    expect(bonusDanoDeArmadura(h, { ...base, alvoEnfurecido: true })).toBe(11 + 15);
    expect(bonusCriticoDeArmadura(h, { ...base, alvoEnfurecido: true }, false)).toBe(12);
  });

  it('Exploração de Fraqueza: crítico contra fraqueza, e mais com o alvo abaixo de 50% de HP', async () => {
    const { bonusCriticoDeArmadura } = await import('@/game/combate/habilidadesArmaduraCombate');
    const e = (hpAlvo: number) => ({ hpAtacante: 100, hpMaxAtacante: 100, sobreescudoAtacante: 0, sobreescudoMaxAtacante: 0, hpAlvo, hpMaxAlvo: 100, alvoEnfurecido: false });
    const h = { 'exploracao-de-fraqueza': 3 };
    expect(bonusCriticoDeArmadura(h, e(100), false)).toBe(0);
    expect(bonusCriticoDeArmadura(h, e(100), true)).toBe(18);
    expect(bonusCriticoDeArmadura(h, e(49), true)).toBe(18 + 12);
  });

  it('Poder Máximo: com HP cheio; no nível 5, até sofrer o primeiro golpe (HP e Sobreescudo cheios)', async () => {
    const { bonusCriticoDeArmadura } = await import('@/game/combate/habilidadesArmaduraCombate');
    const e = (hp: number, esc: number) => ({ hpAtacante: hp, hpMaxAtacante: 100, sobreescudoAtacante: esc, sobreescudoMaxAtacante: 50, hpAlvo: 100, hpMaxAlvo: 100, alvoEnfurecido: false });
    expect(bonusCriticoDeArmadura({ 'poder-maximo': 2 }, e(100, 0), false)).toBe(12); // Sobreescudo não conta nos níveis 1 a 4
    expect(bonusCriticoDeArmadura({ 'poder-maximo': 2 }, e(99, 50), false)).toBe(0);
    expect(bonusCriticoDeArmadura({ 'poder-maximo': 5 }, e(100, 50), false)).toBe(24);
    expect(bonusCriticoDeArmadura({ 'poder-maximo': 5 }, e(100, 49), false)).toBe(0); // o Sobreescudo já levou um golpe
  });

  it('no combate: Reforço de Ataque aumenta o dano do primeiro golpe e Olho Crítico garante o crítico', () => {
    const base = primeiroAtaque(comHabilidades({}));
    expect(primeiroAtaque(comHabilidades({ 'reforco-de-ataque': 7 })).danoBruto).toBeGreaterThan(base.danoBruto);
    // Olho Crítico 7 = +24 pontos; com a chance base e o sorteio do teste, 24 não garante: usa a arma com +100 para provar a soma
    const critico = primeiroAtaque(personagem({ ...SEM_BONUS, bonusChanceCriticoPontos: 80, habilidadesArmadura: { 'olho-critico': 7 } }));
    expect(critico.golpesCriticos).toBe(1); // 80 da arma + 24 da habilidade passam de 100%
  });

  it('no combate: o Heroísmo reduz o dano recebido com o HP abaixo de 35%', () => {
    const golpeDoAlvo = (habilidades: Record<string, number>) =>
      resolverCombate(comHabilidades(habilidades, { hp: 1000, hpMax: 5000, mitigacao: 100 }), { ...ALVO, atributos: { ...ALVO.atributos, forca: 400 } }, 11, { rngStatus: () => 99.9 })
        .logTurnos[0].ataques.find((a) => a.atacante === 'Alvo de Teste')!;
    const sem = golpeDoAlvo({});
    const com = golpeDoAlvo({ heroismo: 7 });
    expect(com.danoEfetivo).toBeLessThan(sem.danoEfetivo); // +30% sobre a mitigação de 100: 400 − 100 contra 400 − 130
  });
});

describe('Dano elemental e status de ataque das habilidades de armadura', () => {
  const comHabilidades = (extra: Partial<EquipamentoCombate>, habilidadesArmadura: Record<string, number> = {}) =>
    personagem({ ...SEM_BONUS, ...extra, habilidadesArmadura, sobreescudoMaximo: 1000 });
  const estado = { hpAtacante: 100, hpMaxAtacante: 100, sobreescudoAtacante: 10, sobreescudoMaxAtacante: 10, hpAlvo: 100, hpMaxAlvo: 100, alvoEnfurecido: false };

  it('dano elemental: +10% da arma no elemento dela e as habilidades de cada elemento (Água é o Vento; Dragão, o Sombrio)', async () => {
    const m = await import('@/game/combate/habilidadesArmaduraCombate');
    expect(m.bonusDanoElementalDeArmadura({}, ['fogo'], 'fogo', estado)).toBe(10);
    expect(m.bonusDanoElementalDeArmadura({}, ['fogo'], 'gelo', estado)).toBe(0);
    expect(m.bonusDanoElementalDeArmadura({}, undefined, undefined, estado)).toBe(0);
    expect(m.bonusDanoElementalDeArmadura({ 'ataque-de-fogo': 6 }, ['fogo'], 'fogo', estado)).toBe(10 + 20);
    expect(m.bonusDanoElementalDeArmadura({ 'ataque-de-fogo': 6 }, [], 'gelo', estado)).toBe(0);
    expect([1, 3, 4, 6].map((n) => m.bonusDanoElementalDeArmadura({ 'ataque-de-agua': n }, [], 'vento', estado))).toEqual([3, 10, 13, 20]);
    expect(m.bonusDanoElementalDeArmadura({ 'ataque-de-raio': 2, 'ataque-de-dragao': 2 }, [], 'relampago', estado)).toBe(6);
    expect(m.bonusDanoElementalDeArmadura({ 'ataque-de-dragao': 2 }, [], 'sombrio', estado)).toBe(6);
    expect(m.bonusDanoElementalDeArmadura({ 'artilharia-pesada': 2 }, [], 'fogo', estado)).toBe(50);
    expect(m.bonusDanoElementalDeArmadura({ 'tormenta-de-reydras': 3 }, [], 'relampago', estado)).toBe(15);
  });

  it('Coalescência: com a vida abaixo de 50%, dano e dano elemental', async () => {
    const m = await import('@/game/combate/habilidadesArmaduraCombate');
    const baixo = { ...estado, hpAtacante: 40 };
    expect(m.bonusDanoDeArmadura({ coalescencia: 3 }, baixo)).toBe(7);
    expect(m.bonusDanoDeArmadura({ coalescencia: 3 }, estado)).toBe(0);
    expect(m.bonusDanoElementalDeArmadura({ coalescencia: 3 }, [], 'terra', baixo)).toBe(18);
    expect(m.bonusDanoElementalDeArmadura({ coalescencia: 3 }, [], 'terra', estado)).toBe(0);
  });

  it('chance de status: o bônus é relativo à chance base (Veneno 8% com +20% = +1,6 pontos)', async () => {
    const m = await import('@/game/combate/habilidadesArmaduraCombate');
    expect([1, 2, 3, 4].map((n) => m.bonusChanceStatusRelativa({ 'ataque-de-veneno': n }, 'veneno', estado))).toEqual([10, 20, 40, 60]);
    expect(m.bonusChanceStatusRelativa({ 'ataque-de-veneno': 4 }, 'sono', estado)).toBe(0);
    expect(m.bonusChanceStatusRelativa({ 'ataque-de-explosao': 2 }, 'queimadura', estado)).toBe(20);
    expect([1, 5].map((n) => m.bonusChanceStatusRelativa({ atordoante: n }, 'loucura', estado))).toEqual([20, 60]);
    expect(m.bonusChanceStatusRelativa({ 'tormenta-de-reydras': 3 }, 'paralisia', estado)).toBe(30);
    expect(m.bonusChanceStatusRelativa({ coalescencia: 2 }, 'veneno', { ...estado, hpAtacante: 10 })).toBe(20);
    expect(m.bonusChanceStatusRelativa({ 'poder-de-diablos': 3 }, 'loucura', { ...estado, sobreescudoAtacante: 0 })).toBe(10);
    expect(m.bonusChanceStatusRelativa({ 'poder-de-diablos': 3 }, 'loucura', estado)).toBe(0);
    expect(m.chanceExtraRelativaEmPontos('veneno', 20)).toBeCloseTo(1.6);
  });

  it('Poder de Diablos (nível 3): dano +8% com o Sobreescudo zerado', async () => {
    const m = await import('@/game/combate/habilidadesArmaduraCombate');
    expect(m.bonusDanoDeArmadura({ 'poder-de-diablos': 3 }, { ...estado, sobreescudoAtacante: 0 })).toBe(8);
    expect(m.bonusDanoDeArmadura({ 'poder-de-diablos': 3 }, estado)).toBe(0);
  });

  it('Adição de status: só quando a arma não aplica aquele status', async () => {
    const m = await import('@/game/combate/habilidadesArmaduraCombate');
    const todas = { 'adicao-de-veneno': 1, 'adicao-de-paralisia': 1, 'adicao-de-sono': 1, 'adicao-de-explosao': 1 };
    expect(m.adicoesDeStatus(todas, [])).toEqual([
      { status: 'veneno', chancePercentual: 3 }, { status: 'paralisia', chancePercentual: 2 },
      { status: 'sono', chancePercentual: 2 }, { status: 'queimadura', chancePercentual: 4 },
    ]);
    expect(m.adicoesDeStatus(todas, ['veneno', 'queimadura']).map((a) => a.status)).toEqual(['paralisia', 'sono']);
    expect(m.adicoesDeStatus(undefined, [])).toEqual([]);
  });

  it('Queimadura: Bombardeiro (+10% a +50%) e Artilharia Pesada (+25% e +50%) somam', async () => {
    const m = await import('@/game/combate/habilidadesArmaduraCombate');
    expect(m.bonusDanoQueimaduraDeArmadura({ bombardeiro: 5 })).toBe(50);
    expect(m.bonusDanoQueimaduraDeArmadura({ bombardeiro: 2, 'artilharia-pesada': 1 })).toBe(45);
    expect(m.bonusDanoQueimaduraDeArmadura(undefined)).toBe(0);
  });

  it('no combate: o elemento da arma dá +10% e o Ataque de Fogo soma por cima', () => {
    const sem = primeiroAtaque(comHabilidades({ elementosArma: ['fogo'] }));
    const com = primeiroAtaque(comHabilidades({ elementosArma: ['fogo'] }, { 'ataque-de-fogo': 6 }));
    const neutro = primeiroAtaque(comHabilidades({}));
    expect(sem.elemento).toBe('fogo');
    expect(sem.danoBruto).toBeGreaterThan(neutro.danoBruto);
    expect(com.danoBruto).toBeGreaterThan(sem.danoBruto);
    // Os +10% da arma e os +20% da habilidade somam (+30%)
    expect(com.danoBruto).toBe(Math.floor((neutro.danoBruto * 130) / 100));
  });

  it('no combate: Ataque de Veneno aumenta a chance do Veneno da arma (8% base, +60% = 12,8%)', () => {
    const aplicou = (habilidades: Record<string, number>) =>
      resolverCombate(comHabilidades({ statusArma: ['veneno'] }, habilidades), ALVO, 11, { rngStatus: () => 12 }).logTurnos[0].eventosEfeitos.some(
        (e) => e.efeito === 'veneno' && e.tipo === 'aplicado'
      );
    expect(aplicou({})).toBe(false); // 12 não passa de 8%
    expect(aplicou({ 'ataque-de-veneno': 4 })).toBe(true); // 12 < 12,8
    expect(aplicou({ 'ataque-de-veneno': 3 })).toBe(false); // +40% = 11,2%
  });

  it('no combate: Adição de Veneno dá 3% de chance por golpe mesmo sem status na arma', () => {
    const aplicou = (sorteio: number) =>
      resolverCombate(comHabilidades({}, { 'adicao-de-veneno': 1 }), ALVO, 11, { rngStatus: () => sorteio }).logTurnos[0].eventosEfeitos.some(
        (e) => e.efeito === 'veneno' && e.tipo === 'aplicado'
      );
    expect(aplicou(2)).toBe(true);
    expect(aplicou(3)).toBe(false);
  });

  it('no combate: Bombardeiro aumenta o dano da Queimadura no monstro', () => {
    const tick = (habilidades: Record<string, number>) =>
      resolverCombate(comHabilidades({ statusArma: ['queimadura'] }, habilidades), ALVO, 11, { rngStatus: () => 0 })
        .logTurnos[0].eventosEfeitos.find((e) => e.efeito === 'queimadura' && e.tipo === 'dano')!.dano!;
    const base = tick({});
    expect(tick({ bombardeiro: 5 })).toBe(Math.floor((base * 150) / 100));
  });
});

describe('Resistências a status, Bênção Divina e cura das habilidades de armadura', () => {
  const comHabilidades = (habilidadesArmadura: Record<string, number>, extra: Partial<Combatente> = {}) =>
    personagem({ ...SEM_BONUS, habilidadesArmadura, sobreescudoMaximo: 1000 }, extra);
  const monstroCom = (efeitosAplicados: NonNullable<MonsterDefinition['efeitosAplicados']>, atributos: Partial<MonsterDefinition['atributos']> = {}): MonsterDefinition => ({
    ...ALVO,
    efeitosAplicados,
    atributos: { ...ALVO.atributos, ...atributos },
  });
  const eventos = (h: Record<string, number>, monstro: MonsterDefinition, rngStatus: () => number, extra: Partial<Combatente> = {}) =>
    resolverCombate(comHabilidades(h, extra), monstro, 11, { rngStatus }).logTurnos[0].eventosEfeitos;
  const aplicou = (ev: ReturnType<typeof eventos>, efeito: string) => ev.some((e) => e.efeito === efeito && e.tipo === 'aplicado' && !e.alvo);

  it('as tabelas: chance, dano e duração por status', async () => {
    const m = await import('@/game/combate/habilidadesArmaduraCombate');
    expect([1, 2, 3].map((n) => m.reducaoChanceStatusDeArmadura({ 'resistencia-a-veneno': n }, 'veneno'))).toEqual([25, 50, 100]);
    expect([1, 2, 3].map((n) => m.reducaoChanceStatusDeArmadura({ 'resistencia-a-atordoamento': n }, 'loucura'))).toEqual([40, 70, 100]);
    expect([1, 2, 3].map((n) => m.reducaoChanceStatusDeArmadura({ 'resistencia-a-sangramento': n }, 'sangramento'))).toEqual([0, 0, 100]);
    expect(m.reducaoChanceStatusDeArmadura({ 'resistencia-a-veneno': 3 }, 'sono')).toBe(0);
    expect(m.reducaoChanceStatusDeArmadura(undefined, 'veneno')).toBe(0);
    expect([1, 2, 3].map((n) => m.reducaoDanoStatusDeArmadura({ 'resistencia-a-explosao': n }, 'queimadura'))).toEqual([15, 30, 100]);
    expect(m.reducaoDanoStatusDeArmadura({ 'bloqueio-de-calor': 1 }, 'queimadura')).toBe(100);
    expect(m.reducaoDanoStatusDeArmadura({ 'especialista-em-efluvios': 1 }, 'podridaoEscarlate')).toBe(100);
    expect(m.reducaoDanoStatusDeArmadura({ 'especialista-em-efluvios': 1 }, 'veneno')).toBe(20);
    expect(m.reducaoDanoStatusDeArmadura({ 'resistencia-a-sangramento': 2 }, 'sangramento')).toBe(30);
    expect([1, 2, 3].map((n) => m.reducaoDuracaoStatusDeArmadura({ 'resistencia-a-flagelo': n }, 'queimadura'))).toEqual([50, 75, 100]);
    expect(m.reducaoDuracaoStatusDeArmadura({ 'resistencia-a-flagelo': 3 }, 'veneno')).toBe(0);
  });

  it('Bênção Divina: 25% de chance (40% no nível 5) de reduzir 15/30/50/60/60%; sem sorteio não dispara', async () => {
    const m = await import('@/game/combate/habilidadesArmaduraCombate');
    expect([1, 2, 3, 4, 5].map((n) => m.bencaoDivinaDeArmadura({ 'bencao-divina': n }, 0))).toEqual([15, 30, 50, 60, 60]);
    expect(m.bencaoDivinaDeArmadura({ 'bencao-divina': 4 }, 25)).toBe(0);
    expect(m.bencaoDivinaDeArmadura({ 'bencao-divina': 5 }, 39)).toBe(60);
    expect(m.bencaoDivinaDeArmadura({ 'bencao-divina': 5 }, 40)).toBe(0);
    expect(m.bencaoDivinaDeArmadura({ 'bencao-divina': 5 }, undefined)).toBe(0);
    expect(m.bencaoDivinaDeArmadura(undefined, 0)).toBe(0);
  });

  it('cura: Aumento de Regeneração e Sobrevivente somam', async () => {
    const m = await import('@/game/combate/habilidadesArmaduraCombate');
    expect([1, 2, 3].map((n) => m.bonusCuraDeArmadura({ 'aumento-de-regeneracao': n }))).toEqual([10, 20, 30]);
    expect([1, 2, 3].map((n) => m.bonusCuraDeArmadura({ sobrevivente: n }))).toEqual([5, 8, 10]);
    expect(m.bonusCuraDeArmadura({ 'aumento-de-regeneracao': 3, sobrevivente: 3 })).toBe(40);
    expect(m.bonusCuraDeArmadura(undefined)).toBe(0);
  });

  it('no combate: Resistência a Veneno reduz a chance (8% base, −25% = 6%) e o nível 3 deixa imune', () => {
    const veneno = monstroCom(['veneno']);
    expect(aplicou(eventos({}, veneno, () => 7), 'veneno')).toBe(true); // 7 < 8
    expect(aplicou(eventos({ 'resistencia-a-veneno': 1 }, veneno, () => 7), 'veneno')).toBe(false); // 7 não passa de 6
    expect(aplicou(eventos({ 'resistencia-a-veneno': 1 }, veneno, () => 5), 'veneno')).toBe(true);
    expect(aplicou(eventos({ 'resistencia-a-veneno': 3 }, veneno, () => 0), 'veneno')).toBe(false); // imune
  });

  it('no combate: Resistência a Sangramento reduz o dano instantâneo; o nível 3 anula o status', () => {
    const sangra = monstroCom(['sangramento']);
    const dano = (h: Record<string, number>) => eventos(h, sangra, () => 0).find((e) => e.efeito === 'sangramento' && e.tipo === 'instantaneo')?.dano;
    const base = dano({})!;
    expect(base).toBeGreaterThan(0);
    expect(dano({ 'resistencia-a-sangramento': 2 })).toBe(Math.floor((base * 70) / 100));
    expect(dano({ 'resistencia-a-sangramento': 3 })).toBeUndefined();
  });

  it('no combate: Bloqueio de Calor anula o dano da Queimadura e Resistência a Flagelo encurta a duração', () => {
    const queima = monstroCom(['queimadura']);
    const tick = (h: Record<string, number>) => eventos(h, queima, () => 0).find((e) => e.efeito === 'queimadura' && e.tipo === 'dano')?.dano;
    expect(tick({})!).toBeGreaterThan(0);
    expect(tick({ 'bloqueio-de-calor': 1 })).toBe(0);
    const duracao = (h: Record<string, number>) => eventos(h, queima, () => 0).find((e) => e.efeito === 'queimadura' && e.tipo === 'aplicado')?.rodadasRestantes;
    expect(duracao({})).toBe(5);
    expect(duracao({ 'resistencia-a-flagelo': 1 })).toBe(3); // −50% de 5, arredondado para cima
    expect(duracao({ 'resistencia-a-flagelo': 3 })).toBe(1); // some no fim da rodada
  });

  it('no combate: a Bênção Divina reduz o golpe do monstro quando dispara', () => {
    const forte = { ...ALVO, atributos: { ...ALVO.atributos, forca: 400 } };
    const golpe = (h: Record<string, number>, rng: number) =>
      resolverCombate(comHabilidades(h, { mitigacao: 0 }), forte, 11, { rngStatus: () => rng }).logTurnos[0].ataques.find((a) => a.atacante === 'Alvo de Teste')!;
    const sem = golpe({}, 0).danoBruto;
    expect(golpe({ 'bencao-divina': 4 }, 0).danoBruto).toBe(Math.floor((sem * 40) / 100)); // dispara: −60%
    expect(golpe({ 'bencao-divina': 4 }, 50).danoBruto).toBe(sem); // não dispara
  });

  it('no combate: Aumento de Regeneração aumenta a cura que o Profeta faz em si', () => {
    const cura = (h: Record<string, number>) =>
      resolverCombate(comHabilidades(h, { classeId: 'profeta', hp: 1000, hpMax: 5000, atributos: { vigor: 20, sorte: 0, forca: 0, vitalidade: 20, arcano: 0, inteligencia: 80, agilidade: 10 } }), ALVO, 11, { rngStatus: () => 99.9 })
        .logTurnos[0].ataques.find((a) => a.atacante === 'Herói')?.curaHp ?? 0;
    const base = cura({});
    if (base > 0) expect(cura({ 'aumento-de-regeneracao': 3 })).toBeGreaterThan(base);
  });
});
