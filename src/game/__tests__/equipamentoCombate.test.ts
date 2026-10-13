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
