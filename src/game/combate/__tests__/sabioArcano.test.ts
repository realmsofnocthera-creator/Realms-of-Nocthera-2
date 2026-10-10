import { describe, it, expect, beforeEach } from 'vitest';
import { Combatente, resolverCombate, turnoDeCombate } from '@/game/combat';
import {
  ContextoHabilidade,
  obterHabilidade,
  obterModificadoresPassivaSubclasse,
  registrarHabilidadesDeSubclasse,
  resolverDanoHabilidade,
} from '@/game/combate/habilidades';
import { MonsterDefinition } from '@/rules/monsters';

/** Etapa 2 — Kit do Sábio Arcano (Feiticeiro de controle): proposta aprovada pelo Yuri em 10/10/2026 (Loucura em 15%). */

const ctx = (extra: Partial<ContextoHabilidade['alvo']> = {}): ContextoHabilidade => ({
  atacante: { hp: 100, hpMax: 100, nivel: 30 },
  alvo: { hp: 1000, hpMax: 1000, sobreescudo: 0, mitigacaoFisica: 0, mitigacaoMagica: 0, ...extra },
  danoBase: 100,
});

describe('Sábio Arcano — habilidades', () => {
  beforeEach(() => registrarHabilidadesDeSubclasse());

  it('Lança de Gelo: 105% de dano de Gelo e Congelamento com +5 pontos de chance (10%)', () => {
    const def = obterHabilidade('sabio_arcano_lanca_de_gelo')!;
    expect(def.espaco).toBe('basico');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Lança de Gelo', tipoDano: 'magico', percentualDano: 105, elemento: 'gelo', bonusElemental: true });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto).toBe(105);
    expect(r.statusComChanceNoAlvo).toEqual([{ status: 'congelamento', chanceExtraPercentual: 5 }]);
  });

  it('Feitiço do Torpor: 160% de dano mágico e Sono com +12 pontos de chance (15%)', () => {
    const def = obterHabilidade('sabio_arcano_feitico_do_torpor')!;
    expect(def.espaco).toBe('especial');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Feitiço do Torpor', percentualDano: 160 });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto).toBe(160);
    expect(r.statusComChanceNoAlvo).toEqual([{ status: 'sono', chanceExtraPercentual: 12 }]);
  });

  it('Eclipse da Mente: 330%, ignora 10% da defesa, bônus por status e Loucura com +10 pontos (15%)', () => {
    const def = obterHabilidade('sabio_arcano_eclipse_da_mente')!;
    expect(def.espaco).toBe('ultimate');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Eclipse da Mente', percentualDano: 330, ignorarDefesaPercentual: 10 });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto).toBe(330);
    expect(r.statusComChanceNoAlvo).toEqual([{ status: 'loucura', chanceExtraPercentual: 10 }]);
    // Dormindo (+15%) e Congelado (+10%) somam no mesmo grupo: 100 × 330% × 125% = 412,5
    expect(resolverDanoHabilidade(r, ctx({ condicoes: ['dormindo', 'congelado'] })).danoBruto).toBe(413);
  });
});

describe('Sábio Arcano — passiva Sabedoria Arcana', () => {
  it('tier 1: +4% de dano mágico e −5% de dano mágico recebido', () => {
    const m = obterModificadoresPassivaSubclasse({ subclasseAtualId: 'sabio_arcano', subclasseTiers: { sabio_arcano: 1 }, hp: 100, hpMax: 100 });
    expect(m).toMatchObject({ bonusDanoMagicoPercentual: 4, reducaoDanoMagicoRecebidoPercentual: 5, reducaoDanoFisicoRecebidoPercentual: 0 });
    const zero = obterModificadoresPassivaSubclasse({ subclasseAtualId: 'sabio_arcano', subclasseTiers: { sabio_arcano: 0 }, hp: 100, hpMax: 100 });
    expect(zero.reducaoDanoMagicoRecebidoPercentual ?? 0).toBe(0);
  });
});

describe('Sábio Arcano — em combate', () => {
  const sabio = (extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Feiticeiro Sábio', classeId: 'feiticeiro', nivel: 30, hp: 1000, hpMax: 1000, sobreescudo: 0,
    subclasseAtualId: 'sabio_arcano', subclasseTiers: { sabio_arcano: 4 },
    habilidadesEquipadas: {
      ataqueBasico: 'sabio_arcano_lanca_de_gelo',
      habilidadeEspecial: 'sabio_arcano_feitico_do_torpor',
      ultimate: 'sabio_arcano_eclipse_da_mente',
    },
    atributos: { vigor: 5, sorte: 0, forca: 1, vitalidade: 5, arcano: 12, inteligencia: 100, agilidade: 5 },
    ...extra,
  });
  const alvo = (extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Alvo', hp: 100000, hpMax: 100000, sobreescudo: 0, mitigacao: 0,
    atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 5 },
    ...extra,
  });

  it('a Lança de Gelo declara o Congelamento e dá o pacote de Gelo (−3% de dano recebido)', () => {
    const s = sabio();
    const atk = turnoDeCombate(s, alvo(), 1).turnoLog.ataques[0];
    expect(atk.habilidadeAcionada).toBe('Lança de Gelo');
    expect(atk.statusComChanceNoAlvo).toEqual([{ status: 'congelamento', chanceExtraPercentual: 5 }]);
    expect(s.efeitosDefensivos?.map((d) => [d.efeito, d.valorPercentual])).toEqual([['resistenciaFisica', 3], ['resistenciaMagica', 3]]);
  });

  it('o Feitiço do Torpor e o Eclipse da Mente declaram Sono e Loucura com chance', () => {
    const torpor = turnoDeCombate(sabio({ contadorExplosaoArcana: 2 }), alvo(), 1).turnoLog.ataques[0];
    expect(torpor.habilidadeAcionada).toBe('Feitiço do Torpor');
    expect(torpor.statusComChanceNoAlvo).toEqual([{ status: 'sono', chanceExtraPercentual: 12 }]);
    const eclipse = turnoDeCombate(sabio({ contadorCataclismoArcano: 6 }), alvo(), 1).turnoLog.ataques[0];
    expect(eclipse.habilidadeAcionada).toBe('Eclipse da Mente');
    expect(eclipse.statusComChanceNoAlvo).toEqual([{ status: 'loucura', chanceExtraPercentual: 10 }]);
  });

  it('o Eclipse da Mente causa mais dano contra alvo sob status', () => {
    const sem = turnoDeCombate(sabio({ contadorCataclismoArcano: 6 }), alvo(), 1).turnoLog.ataques[0].danoBruto;
    const com = turnoDeCombate(sabio({ contadorCataclismoArcano: 6 }), alvo({ estadosDeLuta: ['sangramento'] }), 1).turnoLog.ataques[0].danoBruto;
    expect(com).toBeGreaterThan(sem);
  });

  it('a passiva reduz o dano mágico recebido', () => {
    const mago = (): Combatente => ({
      nome: 'Mago', classeId: 'feiticeiro', nivel: 30, hp: 5000, hpMax: 5000, sobreescudo: 0,
      atributos: { vigor: 0, sorte: 0, forca: 0, vitalidade: 0, arcano: 0, inteligencia: 60, agilidade: 5 },
    });
    const alvoSabio = (tier: number): Combatente =>
      sabio({ hp: 100000, hpMax: 100000, subclasseTiers: { sabio_arcano: tier }, habilidadesEquipadas: undefined });
    const com = turnoDeCombate(mago(), alvoSabio(4), 1).turnoLog.ataques[0].danoBruto;
    const sem = turnoDeCombate(mago(), alvoSabio(0), 1).turnoLog.ataques[0].danoBruto;
    expect(com).toBeLessThan(sem);
  });

  it('a luta usa as três habilidades', () => {
    const monstro: MonsterDefinition = {
      id: 'saco-de-pancada', nome: 'Saco de Pancada', nivel: 30, hp: 60000, categoriaCorporal: 'blindadoPesado',
      atributos: { vigor: 50, sorte: 0, forca: 10, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 5 },
      xpConcedido: 10, ouroConcedido: { min: 1, max: 1 },
    };
    const r = resolverCombate(sabio({ hp: 5000, hpMax: 5000 }), monstro, 42);
    const usadas = r.logTurnos.flatMap((t) => t.ataques).filter((a) => a.atacante === 'Feiticeiro Sábio').map((a) => a.habilidadeAcionada);
    expect(usadas).toContain('Lança de Gelo');
    expect(usadas).toContain('Feitiço do Torpor');
    expect(usadas).toContain('Eclipse da Mente');
  });
});
