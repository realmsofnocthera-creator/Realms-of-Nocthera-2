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

/** Etapa 2 — Kit do Arquimago (Feiticeiro de dano puro): proposta aprovada pelo Yuri em 10/10/2026. */

const ctx = (extra: Partial<ContextoHabilidade['alvo']> = {}): ContextoHabilidade => ({
  atacante: { hp: 100, hpMax: 100, nivel: 30 },
  alvo: { hp: 1000, hpMax: 1000, sobreescudo: 0, mitigacaoFisica: 0, mitigacaoMagica: 0, ...extra },
  danoBase: 100,
});

describe('Arquimago — habilidades', () => {
  beforeEach(() => registrarHabilidadesDeSubclasse());

  it('Bola de Fogo: 115% de dano de Fogo', () => {
    const def = obterHabilidade('arquimago_bola_de_fogo')!;
    expect(def.espaco).toBe('basico');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Bola de Fogo', tipoDano: 'magico', percentualDano: 115, elemento: 'fogo', bonusElemental: true });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto).toBe(115);
  });

  it('Tempestade de Raios: 3 golpes de 60% (180%) de Relâmpago e Paralisia com +7 pontos de chance', () => {
    const def = obterHabilidade('arquimago_tempestade_de_raios')!;
    expect(def.espaco).toBe('especial');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Tempestade de Raios', percentualDano: 60, numeroGolpes: 3, elemento: 'relampago' });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto * 3).toBe(180);
    expect(r.statusComChanceNoAlvo).toEqual([{ status: 'paralisia', chanceExtraPercentual: 7 }]);
  });

  it('Meteoro: 360%, ignora 20% da defesa, +25% contra Sobreescudo e Queimadura garantida', () => {
    const def = obterHabilidade('arquimago_meteoro')!;
    expect(def.espaco).toBe('ultimate');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Meteoro', percentualDano: 360, ignorarDefesaPercentual: 20, bonusContraSobreescudoPercentual: 25, elemento: 'fogo' });
    expect(r.statusForcadosNoAlvo).toEqual(['queimadura']);
    expect(resolverDanoHabilidade(r, ctx()).danoBruto).toBe(360);
    expect(resolverDanoHabilidade(r, ctx({ sobreescudo: 50 })).danoBruto).toBe(450); // 100 × 360% × 125%
  });
});

describe('Arquimago — passiva Poder Arcano', () => {
  it('tier 1: +8% de dano mágico', () => {
    const m = obterModificadoresPassivaSubclasse({ subclasseAtualId: 'arquimago', subclasseTiers: { arquimago: 1 }, hp: 100, hpMax: 100 });
    expect(m).toMatchObject({ bonusDanoMagicoPercentual: 8, reducaoDanoFisicoRecebidoPercentual: 0 });
    const zero = obterModificadoresPassivaSubclasse({ subclasseAtualId: 'arquimago', subclasseTiers: { arquimago: 0 }, hp: 100, hpMax: 100 });
    expect(zero.bonusDanoMagicoPercentual ?? 0).toBe(0);
  });
});

describe('Arquimago — em combate', () => {
  const arquimago = (extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Feiticeiro Arquimago', classeId: 'feiticeiro', nivel: 30, hp: 1000, hpMax: 1000, sobreescudo: 0,
    subclasseAtualId: 'arquimago', subclasseTiers: { arquimago: 4 },
    habilidadesEquipadas: {
      ataqueBasico: 'arquimago_bola_de_fogo',
      habilidadeEspecial: 'arquimago_tempestade_de_raios',
      ultimate: 'arquimago_meteoro',
    },
    atributos: { vigor: 5, sorte: 0, forca: 1, vitalidade: 5, arcano: 4, inteligencia: 100, agilidade: 5 },
    ...extra,
  });
  const alvo = (extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Alvo', hp: 100000, hpMax: 100000, sobreescudo: 0, mitigacao: 0,
    atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 5 },
    ...extra,
  });

  it('a passiva soma +8% ao dano mágico', () => {
    const dano = (tier: number) =>
      turnoDeCombate(arquimago({ subclasseTiers: { arquimago: tier } }), alvo(), 1).turnoLog.ataques[0].danoBruto;
    expect(dano(4)).toBeGreaterThan(dano(0));
  });

  it('a Tempestade de Raios dá 3 golpes e declara a Paralisia com chance', () => {
    const atk = turnoDeCombate(arquimago({ contadorExplosaoArcana: 2 }), alvo(), 1).turnoLog.ataques[0];
    expect(atk.habilidadeAcionada).toBe('Tempestade de Raios');
    expect(atk.golpes).toHaveLength(3);
    expect(atk.statusComChanceNoAlvo).toEqual([{ status: 'paralisia', chanceExtraPercentual: 12 }]); // 7 da habilidade + 5 do Relâmpago
  });

  it('o Meteoro aplica Queimadura sem sorteio e causa mais dano contra Sobreescudo', () => {
    const sem = turnoDeCombate(arquimago({ contadorCataclismoArcano: 6 }), alvo(), 1).turnoLog.ataques[0];
    const com = turnoDeCombate(arquimago({ contadorCataclismoArcano: 6 }), alvo({ sobreescudo: 100000 }), 1).turnoLog.ataques[0];
    expect(sem.habilidadeAcionada).toBe('Meteoro');
    expect(sem.statusForcadosNoAlvo).toEqual(['queimadura']);
    expect(com.danoBruto).toBeGreaterThan(sem.danoBruto);
  });

  it('as cargas de Acúmulo Arcano gastas no ataque valem também para a habilidade equipada', () => {
    const base = arquimago();
    const comCargas = arquimago({ cargasAcumuloArcano: 3 });
    const a = turnoDeCombate(base, alvo(), 1).turnoLog.ataques[0];
    const b = turnoDeCombate(comCargas, alvo(), 1).turnoLog.ataques[0];
    expect(b.danoBruto).toBeGreaterThan(a.danoBruto);
    expect(b.cargasAcumuloConsumidas).toBe(3);
  });

  it('a luta usa as três habilidades', () => {
    const monstro: MonsterDefinition = {
      id: 'saco-de-pancada', nome: 'Saco de Pancada', nivel: 30, hp: 60000, categoriaCorporal: 'blindadoPesado',
      atributos: { vigor: 50, sorte: 0, forca: 10, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 5 },
      xpConcedido: 10, ouroConcedido: { min: 1, max: 1 },
    };
    const r = resolverCombate(arquimago({ hp: 5000, hpMax: 5000 }), monstro, 42);
    const usadas = r.logTurnos.flatMap((t) => t.ataques).filter((a) => a.atacante === 'Feiticeiro Arquimago').map((a) => a.habilidadeAcionada);
    expect(usadas).toContain('Bola de Fogo');
    expect(usadas).toContain('Tempestade de Raios');
    expect(usadas).toContain('Meteoro');
  });
});
