import { describe, it, expect, beforeEach } from 'vitest';
import { Combatente, resolverCombate, turnoDeCombate } from '@/game/combat';
import {
  ContextoHabilidade,
  obterHabilidade,
  obterModificadoresPassivaSubclasse,
  registrarHabilidadesDeSubclasse,
  resolverDanoHabilidade,
} from '@/game/combate/habilidades';
import { agilidadeComExaustao } from '@/game/combate/efeitosDebuffs';
import { MonsterDefinition } from '@/rules/monsters';

/** Etapa 2 — Kit do Ronin (Samurai de golpes rápidos): proposta aprovada pelo Yuri em 09/10/2026. */

const ctx = (): ContextoHabilidade => ({
  atacante: { hp: 100, hpMax: 100, nivel: 30 },
  alvo: { hp: 1000, hpMax: 1000, sobreescudo: 0, mitigacaoFisica: 0, mitigacaoMagica: 0 },
  danoBase: 100,
});

describe('Ronin — habilidades', () => {
  beforeEach(() => registrarHabilidadesDeSubclasse());

  it('Corte Relâmpago: Golpe Duplo, 2 golpes de 55% (110% no total)', () => {
    const def = obterHabilidade('ronin_corte_relampago')!;
    expect(def.espaco).toBe('basico');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Corte Relâmpago', percentualDano: 55, numeroGolpes: 2 });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto * (r.numeroGolpes ?? 1)).toBe(110);
  });

  it('Dança da Lâmina Solitária: Dano Replicado, 3 golpes de 55% (165%) e Exaustão de 30% por 2 rodadas', () => {
    const def = obterHabilidade('ronin_danca_da_lamina_solitaria')!;
    expect(def.espaco).toBe('especial');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ percentualDano: 55, numeroGolpes: 3 });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto * 3).toBe(165);
    expect(r.efeitosNoAlvo).toEqual([{ tipo: 'exaustao', percentual: 30, rodadas: 2 }]);
  });

  it('Quatro Ventos: 4 golpes de 85% (340%), +4 de Agilidade por 3 rodadas e Sincronismo com 30% de chance', () => {
    const def = obterHabilidade('ronin_quatro_ventos')!;
    expect(def.espaco).toBe('ultimate');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Quatro Ventos', percentualDano: 85, numeroGolpes: 4 });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto * 4).toBe(340);
    expect(r.buffs).toEqual([{ tipo: 'atributo', atributo: 'agilidade', valor: 4, rodadas: 3 }]);
    expect(r.buffsComChance).toEqual([{ buff: { tipo: 'sincronismo', rodadas: 3 }, chancePercentual: 30 }]);
  });
});

describe('Ronin — passiva Passo Livre', () => {
  it('tier 1: +5% de dano físico e −5% de dano físico recebido', () => {
    const m = obterModificadoresPassivaSubclasse({ subclasseAtualId: 'ronin', subclasseTiers: { ronin: 1 }, hp: 100, hpMax: 100 });
    expect(m).toEqual({ bonusDanoFisicoPercentual: 5, reducaoDanoFisicoRecebidoPercentual: 5, bonusSobreescudoMaxPercentual: 0 });
    expect(obterModificadoresPassivaSubclasse({ subclasseAtualId: 'ronin', subclasseTiers: { ronin: 0 }, hp: 100, hpMax: 100 }).bonusDanoFisicoPercentual).toBe(0);
  });
});

describe('Ronin — em combate', () => {
  const ronin = (extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Samurai Ronin', classeId: 'samurai', nivel: 30, hp: 5000, hpMax: 5000, sobreescudo: 0,
    subclasseAtualId: 'ronin', subclasseTiers: { ronin: 4 },
    habilidadesEquipadas: {
      ataqueBasico: 'ronin_corte_relampago',
      habilidadeEspecial: 'ronin_danca_da_lamina_solitaria',
      ultimate: 'ronin_quatro_ventos',
    },
    atributos: { vigor: 40, sorte: 0, forca: 40, vitalidade: 10, arcano: 0, inteligencia: 0, agilidade: 20 },
    ...extra,
  });
  const alvo = (): Combatente => ({
    nome: 'Alvo', hp: 100000, hpMax: 100000, sobreescudo: 0, mitigacao: 0,
    atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 20 },
  });
  // Sorteio fixo: golpes reais nunca criticam (99) e o sorteio do buff (golpe 99) vale `buff`
  const sorteios = (buff: number) => ({ sorteioCritico: (_i: number, g: number) => (g === 99 ? buff : 99) });

  it('o Corte Relâmpago dá 2 golpes e a Dança 3 golpes com Exaustão no alvo', () => {
    const basico = turnoDeCombate(ronin(), alvo(), 1, sorteios(99)).turnoLog.ataques[0];
    expect(basico.golpes).toHaveLength(2);
    const r = ronin({ contadorIaijutsu: 2 });
    const a = alvo();
    const dança = turnoDeCombate(r, a, 1, sorteios(99)).turnoLog.ataques[0];
    expect(dança.habilidadeAcionada).toBe('Dança da Lâmina Solitária');
    expect(dança.golpes).toHaveLength(3);
    expect(agilidadeComExaustao(20, a.debuffs)).toBe(14); // −30%
  });

  it('Quatro Ventos: sempre dá +4 de Agilidade e o Sincronismo entra só dentro dos 30%', () => {
    const base = { contadorCorteDoVazio: 6 };
    const tem = (buffs: Combatente['buffs'], tipo: string) => (buffs ?? []).some((b) => b.tipo === tipo);

    const com = ronin(base);
    const atk = turnoDeCombate(com, alvo(), 1, sorteios(10)).turnoLog.ataques[0];
    expect(atk.habilidadeAcionada).toBe('Quatro Ventos');
    expect(atk.golpes).toHaveLength(4);
    expect(tem(com.buffs, 'aumentoAtributo')).toBe(true);
    expect(tem(com.buffs, 'sincronismo')).toBe(true);

    const sem = ronin(base);
    turnoDeCombate(sem, alvo(), 1, sorteios(30)); // 30 não está abaixo de 30
    expect(tem(sem.buffs, 'aumentoAtributo')).toBe(true);
    expect(tem(sem.buffs, 'sincronismo')).toBe(false);
  });

  it('sem sorteio na luta o Sincronismo não entra (não há aleatoriedade para decidir)', () => {
    const r = ronin({ contadorCorteDoVazio: 6 });
    turnoDeCombate(r, alvo(), 1);
    expect((r.buffs ?? []).some((b) => b.tipo === 'sincronismo')).toBe(false);
  });

  it('a luta usa as três habilidades', () => {
    const monstro: MonsterDefinition = {
      id: 'saco-de-pancada', nome: 'Saco de Pancada', nivel: 30, hp: 60000, categoriaCorporal: 'blindadoPesado',
      atributos: { vigor: 50, sorte: 0, forca: 10, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 5 },
      xpConcedido: 10, ouroConcedido: { min: 1, max: 1 },
    };
    const r = resolverCombate(ronin(), monstro, 42);
    const usadas = r.logTurnos.flatMap((t) => t.ataques).filter((a) => a.atacante === 'Samurai Ronin').map((a) => a.habilidadeAcionada);
    expect(usadas).toContain('Corte Relâmpago');
    expect(usadas).toContain('Dança da Lâmina Solitária');
    expect(usadas).toContain('Quatro Ventos');
  });
});
