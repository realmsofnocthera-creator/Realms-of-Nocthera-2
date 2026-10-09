import { describe, it, expect, beforeEach } from 'vitest';
import { Combatente, resolverCombate, turnoDeCombate } from '@/game/combat';
import {
  ContextoHabilidade,
  obterHabilidade,
  obterModificadoresPassivaSubclasse,
  registrarHabilidadesDeSubclasse,
  resolverDanoHabilidade,
} from '@/game/combate/habilidades';
import { percentualPontoFraco } from '@/game/combate/efeitosDebuffs';
import { MonsterDefinition } from '@/rules/monsters';

/** Etapa 2 — Kit do Assassino (Bandido de golpe preciso): proposta aprovada pelo Yuri em 09/10/2026. */

const ctx = (): ContextoHabilidade => ({
  atacante: { hp: 100, hpMax: 100, nivel: 30 },
  alvo: { hp: 1000, hpMax: 1000, sobreescudo: 0, mitigacaoFisica: 0, mitigacaoMagica: 0 },
  danoBase: 100,
});

describe('Assassino — habilidades', () => {
  beforeEach(() => registrarHabilidadesDeSubclasse());

  it('Estocada Furtiva: 100% e Ponto Fraco de 15%', () => {
    const def = obterHabilidade('assassino_estocada_furtiva')!;
    expect(def.espaco).toBe('basico');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Estocada Furtiva', percentualDano: 100 });
    expect(r.efeitosNoAlvo).toEqual([{ tipo: 'pontoFraco', percentual: 15 }]);
  });

  it('Golpe nas Sombras: 2 golpes de 80% (160%) e 20% de chance de Sangramento (+17 pontos)', () => {
    const def = obterHabilidade('assassino_golpe_nas_sombras')!;
    expect(def.espaco).toBe('especial');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ percentualDano: 80, numeroGolpes: 2 });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto * 2).toBe(160);
    expect(r.statusComChanceNoAlvo).toEqual([{ status: 'sangramento', chanceExtraPercentual: 17 }]);
  });

  it('Execução Silenciosa: 340%, ignora 20% da defesa e 25% de chance de Sangramento (+22 pontos)', () => {
    const def = obterHabilidade('assassino_execucao_silenciosa')!;
    expect(def.espaco).toBe('ultimate');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ percentualDano: 340, ignorarDefesaPercentual: 20 });
    expect(r.statusComChanceNoAlvo).toEqual([{ status: 'sangramento', chanceExtraPercentual: 22 }]);
  });
});

describe('Assassino — passiva Instinto Letal', () => {
  it('tier 1: +6% de dano físico; sem tier não dá nada', () => {
    const m = obterModificadoresPassivaSubclasse({ subclasseAtualId: 'assassino', subclasseTiers: { assassino: 1 }, hp: 100, hpMax: 100 });
    expect(m).toEqual({ bonusDanoFisicoPercentual: 6, reducaoDanoFisicoRecebidoPercentual: 0, bonusSobreescudoMaxPercentual: 0 });
    expect(obterModificadoresPassivaSubclasse({ subclasseAtualId: 'assassino', subclasseTiers: { assassino: 0 }, hp: 100, hpMax: 100 }).bonusDanoFisicoPercentual).toBe(0);
  });
});

describe('Assassino — em combate', () => {
  const assassino = (extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Bandido Assassino', classeId: 'bandido', nivel: 30, hp: 5000, hpMax: 5000, sobreescudo: 0,
    subclasseAtualId: 'assassino', subclasseTiers: { assassino: 4 },
    habilidadesEquipadas: {
      ataqueBasico: 'assassino_estocada_furtiva',
      habilidadeEspecial: 'assassino_golpe_nas_sombras',
      ultimate: 'assassino_execucao_silenciosa',
    },
    atributos: { vigor: 40, sorte: 0, forca: 60, vitalidade: 10, arcano: 0, inteligencia: 0, agilidade: 10 },
    ...extra,
  });
  const alvo = (): Combatente => ({
    nome: 'Alvo', hp: 100000, hpMax: 100000, sobreescudo: 0, mitigacao: 0,
    atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 10 },
  });

  it('a Estocada Furtiva deixa o Ponto Fraco no alvo e o ataque seguinte aproveita', () => {
    const a = alvo();
    const b = assassino();
    const primeiro = turnoDeCombate(b, a, 1).turnoLog.ataques[0].danoBruto;
    expect(percentualPontoFraco(a.debuffs)).toBe(15);
    const segundo = turnoDeCombate(b, a, 2).turnoLog.ataques[0];
    expect(segundo.danoEfetivo).toBeGreaterThan(primeiro); // +15% do Ponto Fraco no dano recebido
  });

  it('o Golpe nas Sombras aplica Sangramento dentro dos 20% e não fora', () => {
    const monstro: MonsterDefinition = {
      id: 'alvo-sangra', nome: 'Alvo Sangra', nivel: 1, hp: 20000, categoriaCorporal: 'feral',
      atributos: { vigor: 1, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
      xpConcedido: 1, ouroConcedido: { min: 1, max: 1 },
    };
    const com = (valor: number) =>
      resolverCombate(assassino({ contadorRajadaGolpes: 2 }), monstro, 3, { rngStatus: (_r, i) => (i >= 100 ? valor : 99) })
        .logTurnos.flatMap((t) => t.eventosEfeitos ?? []).filter((e) => e.efeito === 'sangramento' && e.alvo === 'Alvo Sangra');
    expect(com(15).length).toBeGreaterThan(0);
    expect(com(25)).toHaveLength(0);
  });

  it('a luta usa as três habilidades', () => {
    const monstro: MonsterDefinition = {
      id: 'saco-de-pancada', nome: 'Saco de Pancada', nivel: 30, hp: 60000, categoriaCorporal: 'blindadoPesado',
      atributos: { vigor: 50, sorte: 0, forca: 10, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 5 },
      xpConcedido: 10, ouroConcedido: { min: 1, max: 1 },
    };
    const r = resolverCombate(assassino(), monstro, 42);
    const usadas = r.logTurnos.flatMap((t) => t.ataques).filter((a) => a.atacante === 'Bandido Assassino').map((a) => a.habilidadeAcionada);
    expect(usadas).toContain('Estocada Furtiva');
    expect(usadas).toContain('Golpe nas Sombras');
    expect(usadas).toContain('Execução Silenciosa');
  });
});
