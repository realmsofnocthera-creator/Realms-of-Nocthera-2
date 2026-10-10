import { describe, it, expect, beforeEach } from 'vitest';
import { Combatente, resolverCombate, turnoDeCombate } from '@/game/combat';
import {
  ContextoHabilidade,
  obterHabilidade,
  obterModificadoresPassivaSubclasse,
  registrarHabilidadesDeSubclasse,
  resolverDanoHabilidade,
} from '@/game/combate/habilidades';
import { incapacitacaoAtiva } from '@/game/combate/efeitosDebuffs';
import { multiplicadorAgilidadeParaDuplo } from '@/game/combate/efeitosBuffs';
import { MonsterDefinition } from '@/rules/monsters';

/** Etapa 2 — Kit do Duelista (Bandido de velocidade e controle): proposta aprovada pelo Yuri em 09/10/2026. */

const ctx = (): ContextoHabilidade => ({
  atacante: { hp: 100, hpMax: 100, nivel: 30 },
  alvo: { hp: 1000, hpMax: 1000, sobreescudo: 0, mitigacaoFisica: 0, mitigacaoMagica: 0 },
  danoBase: 100,
});

describe('Duelista — habilidades', () => {
  beforeEach(() => registrarHabilidadesDeSubclasse());

  it('Estocada Dupla: Golpe Duplo, 2 golpes de 55% (110%)', () => {
    const def = obterHabilidade('duelista_estocada_dupla')!;
    expect(def.espaco).toBe('basico');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Estocada Dupla', percentualDano: 55, numeroGolpes: 2 });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto * 2).toBe(110);
  });

  it('Finta: 3 golpes de 55% (165%) e Distração de 1 ação', () => {
    const def = obterHabilidade('duelista_finta')!;
    expect(def.espaco).toBe('especial');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ percentualDano: 55, numeroGolpes: 3 });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto * 3).toBe(165);
    expect(r.efeitosNoAlvo).toEqual([{ tipo: 'distracao', acoes: 1 }]);
  });

  it('Duelo Final: 5 golpes de 68% (340%) e Sincronismo garantido por 2 rodadas', () => {
    const def = obterHabilidade('duelista_duelo_final')!;
    expect(def.espaco).toBe('ultimate');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Duelo Final', percentualDano: 68, numeroGolpes: 5 });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto * 5).toBe(340);
    expect(r.buffs).toEqual([{ tipo: 'sincronismo', rodadas: 2 }]);
    expect(r.buffsComChance).toBeUndefined();
  });
});

describe('Duelista — passiva Postura de Duelo', () => {
  it('tier 1: +3% de dano físico e −6% de dano físico recebido', () => {
    const m = obterModificadoresPassivaSubclasse({ subclasseAtualId: 'duelista', subclasseTiers: { duelista: 1 }, hp: 100, hpMax: 100 });
    expect(m).toEqual({ bonusDanoFisicoPercentual: 3, reducaoDanoFisicoRecebidoPercentual: 6, bonusSobreescudoMaxPercentual: 0 });
    expect(obterModificadoresPassivaSubclasse({ subclasseAtualId: 'duelista', subclasseTiers: { duelista: 0 }, hp: 100, hpMax: 100 }).reducaoDanoFisicoRecebidoPercentual).toBe(0);
  });
});

describe('Duelista — em combate', () => {
  const duelista = (extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Bandido Duelista', classeId: 'bandido', nivel: 30, hp: 5000, hpMax: 5000, sobreescudo: 0,
    subclasseAtualId: 'duelista', subclasseTiers: { duelista: 4 },
    habilidadesEquipadas: {
      ataqueBasico: 'duelista_estocada_dupla',
      habilidadeEspecial: 'duelista_finta',
      ultimate: 'duelista_duelo_final',
    },
    atributos: { vigor: 40, sorte: 0, forca: 40, vitalidade: 10, arcano: 0, inteligencia: 0, agilidade: 30 },
    ...extra,
  });
  const alvo = (): Combatente => ({
    nome: 'Alvo', hp: 100000, hpMax: 100000, sobreescudo: 0, mitigacao: 0,
    atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 10 },
  });

  it('a Finta faz o alvo perder a próxima ação', () => {
    const a = alvo();
    const atk = turnoDeCombate(duelista({ contadorRajadaGolpes: 2 }), a, 1).turnoLog.ataques[0];
    expect(atk.habilidadeAcionada).toBe('Finta');
    expect(atk.golpes).toHaveLength(3);
    expect(incapacitacaoAtiva(a.debuffs)).toBe('distracao');
    const perdida = turnoDeCombate(a, duelista(), 2).turnoLog.ataques[0];
    expect(perdida.incapacitado).toBe('distracao');
  });

  it('o Duelo Final dá 5 golpes e Sincronismo sempre', () => {
    const d = duelista({ contadorDancaLaminas: 6 });
    const atk = turnoDeCombate(d, alvo(), 1).turnoLog.ataques[0];
    expect(atk.habilidadeAcionada).toBe('Duelo Final');
    expect(atk.golpes).toHaveLength(5);
    expect(d.buffs?.some((b) => b.tipo === 'sincronismo')).toBe(true);
    // Passa a valer a partir da próxima ação: o ataque duplo exige 1,5x a Agilidade
    expect(multiplicadorAgilidadeParaDuplo(d.buffs?.map((b) => ({ ...b, recemAplicado: false })))).toBe(1.5);
  });

  it('a luta usa as três habilidades', () => {
    const monstro: MonsterDefinition = {
      id: 'saco-de-pancada', nome: 'Saco de Pancada', nivel: 30, hp: 60000, categoriaCorporal: 'blindadoPesado',
      atributos: { vigor: 50, sorte: 0, forca: 10, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 5 },
      xpConcedido: 10, ouroConcedido: { min: 1, max: 1 },
    };
    const r = resolverCombate(duelista(), monstro, 42);
    const usadas = r.logTurnos.flatMap((t) => t.ataques).filter((a) => a.atacante === 'Bandido Duelista').map((a) => a.habilidadeAcionada);
    expect(usadas).toContain('Estocada Dupla');
    expect(usadas).toContain('Finta');
    expect(usadas).toContain('Duelo Final');
  });
});
