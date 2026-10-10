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

/** Etapa 2 — Kit do Sacerdote (Profeta de cura e sustentação): proposta aprovada pelo Yuri em 10/10/2026. */

const ctx = (): ContextoHabilidade => ({
  atacante: { hp: 100, hpMax: 100, nivel: 30 },
  alvo: { hp: 1000, hpMax: 1000, sobreescudo: 0, mitigacaoFisica: 0, mitigacaoMagica: 0 },
  danoBase: 100,
});

describe('Sacerdote — habilidades', () => {
  beforeEach(() => registrarHabilidadesDeSubclasse());

  it('Toque Sagrado: 100% de dano sagrado e Cura Direta de 3%', () => {
    const def = obterHabilidade('sacerdote_toque_sagrado')!;
    expect(def.espaco).toBe('basico');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Toque Sagrado', tipoDano: 'magico', percentualDano: 100, elemento: 'sagrado' });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto).toBe(100);
    expect(r.efeitosCura).toEqual([{ efeito: 'curaDireta', percentualHpMax: 3 }]);
  });

  it('Prece de Cura: 85% de dano sagrado, Limpeza de 1 efeito e cura de 10%', () => {
    const def = obterHabilidade('sacerdote_prece_de_cura')!;
    expect(def.espaco).toBe('especial');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Prece de Cura', percentualDano: 85 });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto).toBe(85);
    expect(r.efeitosCura).toEqual([{ efeito: 'limpeza', quantidadeEfeitos: 1, percentualHpMax: 10 }]);
  });

  it('Graça Redentora: 200% de dano, Limpeza de 3, Cura Contínua 5% por 3 rodadas e Ressurreição Parcial de 30%', () => {
    const def = obterHabilidade('sacerdote_graca_redentora')!;
    expect(def.espaco).toBe('ultimate');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Graça Redentora', percentualDano: 200 });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto).toBe(200);
    expect(r.efeitosCura).toEqual([
      { efeito: 'limpeza', quantidadeEfeitos: 3, percentualHpMax: 0 },
      { efeito: 'curaContinua', percentualHpMax: 5, duracaoRodadas: 3 },
      { efeito: 'ressurreicaoParcial', percentualHpMax: 30 },
    ]);
  });

});

describe('Sacerdote — passiva Aura Sagrada', () => {
  it('tier 1: −5% de dano mágico recebido e +10% de eficácia de cura', () => {
    const m = obterModificadoresPassivaSubclasse({ subclasseAtualId: 'sacerdote', subclasseTiers: { sacerdote: 1 }, hp: 100, hpMax: 100 });
    expect(m).toMatchObject({ reducaoDanoMagicoRecebidoPercentual: 5, bonusEficaciaCuraPercentual: 10, reducaoDanoFisicoRecebidoPercentual: 0 });
    const zero = obterModificadoresPassivaSubclasse({ subclasseAtualId: 'sacerdote', subclasseTiers: { sacerdote: 0 }, hp: 100, hpMax: 100 });
    expect(zero.bonusEficaciaCuraPercentual ?? 0).toBe(0);
  });
});

describe('Sacerdote — em combate', () => {
  const sacerdote = (extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Profeta Sacerdote', classeId: 'profeta', nivel: 30, hp: 500, hpMax: 1000, sobreescudo: 0,
    subclasseAtualId: 'sacerdote', subclasseTiers: { sacerdote: 4 },
    habilidadesEquipadas: {
      ataqueBasico: 'sacerdote_toque_sagrado',
      habilidadeEspecial: 'sacerdote_prece_de_cura',
      ultimate: 'sacerdote_graca_redentora',
    },
    atributos: { vigor: 40, sorte: 0, forca: 1, vitalidade: 5, arcano: 0, inteligencia: 30, agilidade: 5 },
    ...extra,
  });
  const alvo = (): Combatente => ({
    nome: 'Alvo', hp: 100000, hpMax: 100000, sobreescudo: 0, mitigacao: 0,
    atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 5 },
  });

  it('o Toque Sagrado cura 3% do HP máximo (+10% de eficácia: 3,3%)', () => {
    const s = sacerdote({ contadorBencaoDivina: 0, contadorMilagreDivino: 0 });
    const atk = turnoDeCombate(s, alvo(), 1).turnoLog.ataques[0];
    expect(atk.habilidadeAcionada).toBe('Toque Sagrado');
    expect(atk.efeitosCuraAplicados).toEqual(['curaDireta']);
    expect(s.hp).toBe(500 + 33);
  });

  it('sem a passiva (tier 0) o Toque Sagrado cura os 3% exatos', () => {
    const s = sacerdote({ subclasseTiers: { sacerdote: 0 }, contadorBencaoDivina: 0, contadorMilagreDivino: 0 });
    turnoDeCombate(s, alvo(), 1);
    expect(s.hp).toBe(500 + 30);
  });

  it('a Prece de Cura toma o lugar da Bênção Divina sem somar a cura da classe', () => {
    const s = sacerdote({ contadorBencaoDivina: 2, contadorMilagreDivino: 0 });
    const atk = turnoDeCombate(s, alvo(), 1).turnoLog.ataques[0];
    expect(atk.habilidadeAcionada).toBe('Prece de Cura');
    // 10% (+10% de eficácia = 11%) = 110; a cura de 15% da classe não pode entrar
    expect(s.hp).toBe(500 + 110);
  });

  it('a luta usa as três habilidades', () => {
    const monstro: MonsterDefinition = {
      id: 'saco-de-pancada', nome: 'Saco de Pancada', nivel: 30, hp: 60000, categoriaCorporal: 'blindadoPesado',
      atributos: { vigor: 50, sorte: 0, forca: 10, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 5 },
      xpConcedido: 10, ouroConcedido: { min: 1, max: 1 },
    };
    const r = resolverCombate(sacerdote({ hp: 1000 }), monstro, 42);
    const usadas = r.logTurnos.flatMap((t) => t.ataques).filter((a) => a.atacante === 'Profeta Sacerdote').map((a) => a.habilidadeAcionada);
    expect(usadas).toContain('Toque Sagrado');
    expect(usadas).toContain('Prece de Cura');
    expect(usadas).toContain('Graça Redentora');
  });

  it('a Graça Redentora prepara a Ressurreição Parcial e a Cura Contínua', () => {
    const s = sacerdote({ contadorBencaoDivina: 0, contadorMilagreDivino: 6, hp: 1000 });
    const atk = turnoDeCombate(s, alvo(), 1).turnoLog.ataques[0];
    expect(atk.habilidadeAcionada).toBe('Graça Redentora');
    expect(s.ressurreicaoParcial).toMatchObject({ percentualHpMax: 30, usada: false });
    expect(s.curaContinua).toMatchObject({ percentualHpMax: 5, rodadasRestantes: 3 });
    // O buff do Milagre Divino da classe não vem junto: a habilidade é outra
    expect(s.buffs?.some((b) => b.tipo === 'bonusDanoDefesa')).toBeFalsy();
  });

  it('a passiva reduz 5% do dano mágico recebido (e não o físico)', () => {
    const atacante = (inteligencia: number, forca: number): Combatente => ({
      nome: 'Mago', classeId: 'feiticeiro', nivel: 30, hp: 5000, hpMax: 5000, sobreescudo: 0,
      atributos: { vigor: 0, sorte: 0, forca, vitalidade: 0, arcano: 0, inteligencia, agilidade: 5 },
    });
    const alvoSac = (tier: number): Combatente => sacerdote({ hp: 100000, hpMax: 100000, subclasseTiers: { sacerdote: tier }, habilidadesEquipadas: undefined });
    const com = turnoDeCombate(atacante(60, 0), alvoSac(4), 1).turnoLog.ataques[0].danoBruto;
    const sem = turnoDeCombate(atacante(60, 0), alvoSac(0), 1).turnoLog.ataques[0].danoBruto;
    expect(com).toBeLessThan(sem);
  });
});
