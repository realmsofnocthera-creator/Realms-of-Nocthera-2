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
