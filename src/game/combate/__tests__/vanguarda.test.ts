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

/** Etapa 2 — Kit da Vanguarda (Cavaleiro ofensivo): proposta aprovada pelo Yuri em 09/10/2026. */

const ctx = (extra: Partial<ContextoHabilidade['alvo']> = {}): ContextoHabilidade => ({
  atacante: { hp: 100, hpMax: 100, nivel: 30 },
  alvo: { hp: 1000, hpMax: 1000, sobreescudo: 0, mitigacaoFisica: 0, mitigacaoMagica: 0, ...extra },
  danoBase: 100,
});

describe('Vanguarda — habilidades', () => {
  beforeEach(() => registrarHabilidadesDeSubclasse());

  it('Estocada da Vanguarda: 110%, marca o alvo e ganha +3% por marca', () => {
    const def = obterHabilidade('vanguarda_estocada_da_vanguarda')!;
    expect(def.espaco).toBe('basico');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Estocada da Vanguarda', percentualDano: 110, marcar: true, bonusPorMarca: true });
    expect(resolverDanoHabilidade(r, ctx()).danoBruto).toBe(110);
    expect(resolverDanoHabilidade(r, ctx({ marcas: 3 })).danoBruto).toBe(120); // 110 × 1,09 = 119,9 → 120
    expect(resolverDanoHabilidade(r, ctx({ marcas: 5 })).danoBruto).toBe(127); // 110 × 1,15 = 126,5 → 127
  });

  it('Carga Esmagadora: 165%, ignora 15% da defesa, Enfraquecimento de 20% por 2 rodadas e Marca', () => {
    const def = obterHabilidade('vanguarda_carga_esmagadora')!;
    expect(def.espaco).toBe('especial');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Carga Esmagadora', percentualDano: 165, ignorarDefesaPercentual: 15, marcar: true });
    expect(r.efeitosNoAlvo).toEqual([{ tipo: 'enfraquecimento', percentual: 20, rodadas: 2 }]);
  });

  it('Estandarte de Guerra: 330%, ignora 20% da defesa, +25% contra Sobreescudo, dano por Marca e +4 de Força por 3 rodadas', () => {
    const def = obterHabilidade('vanguarda_estandarte_de_guerra')!;
    expect(def.espaco).toBe('ultimate');
    const r = def.executar(ctx());
    expect(r).toMatchObject({
      nome: 'Estandarte de Guerra', percentualDano: 330, ignorarDefesaPercentual: 20,
      bonusContraSobreescudoPercentual: 25, bonusPorMarca: true,
    });
    expect(r.buffs).toEqual([{ tipo: 'atributo', atributo: 'forca', valor: 4, rodadas: 3 }]);
    // 100 × 3,30 × (1 + 0,25 + 0,15) = 462 com Sobreescudo no alvo e 5 marcas
    expect(resolverDanoHabilidade(r, ctx({ sobreescudo: 50, marcas: 5 })).danoBruto).toBe(462);
  });
});

describe('Vanguarda — passiva Linha de Frente', () => {
  it('tier 1: +5% de dano físico e −5% de dano físico recebido; sem tier ou outra subclasse não dá nada', () => {
    const m = obterModificadoresPassivaSubclasse({ subclasseAtualId: 'vanguarda', subclasseTiers: { vanguarda: 1 }, hp: 100, hpMax: 100 });
    expect(m).toEqual({ bonusDanoFisicoPercentual: 5, reducaoDanoFisicoRecebidoPercentual: 5, bonusSobreescudoMaxPercentual: 0 });
    const semTier = obterModificadoresPassivaSubclasse({ subclasseAtualId: 'vanguarda', subclasseTiers: { vanguarda: 0 }, hp: 100, hpMax: 100 });
    expect(semTier.bonusDanoFisicoPercentual).toBe(0);
  });
});

describe('Vanguarda — em combate', () => {
  const vanguarda = (extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Cavaleiro Vanguarda', classeId: 'cavaleiro', nivel: 30, hp: 5000, hpMax: 5000, sobreescudo: 0,
    subclasseAtualId: 'vanguarda', subclasseTiers: { vanguarda: 4 },
    habilidadesEquipadas: {
      ataqueBasico: 'vanguarda_estocada_da_vanguarda',
      habilidadeEspecial: 'vanguarda_carga_esmagadora',
      ultimate: 'vanguarda_estandarte_de_guerra',
    },
    atributos: { vigor: 40, sorte: 0, forca: 40, vitalidade: 30, arcano: 0, inteligencia: 0, agilidade: 5 },
    ...extra,
  });
  const alvo = (): Combatente => ({
    nome: 'Alvo', hp: 100000, hpMax: 100000, sobreescudo: 0, mitigacao: 0,
    atributos: { vigor: 100, sorte: 0, forca: 30, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 5 },
  });

  it('a Estocada coloca Marcas que somam até 5 e o dano cresce', () => {
    const v = vanguarda();
    const a = alvo();
    const danos: number[] = [];
    for (let t = 1; t <= 2; t++) danos.push(turnoDeCombate(v, a, t).turnoLog.ataques[0].danoBruto);
    expect(a.marcas).toBe(2);
    expect(danos[1]).toBeGreaterThan(danos[0]);
  });

  it('a luta usa as três habilidades', () => {
    const monstro: MonsterDefinition = {
      id: 'saco-de-pancada', nome: 'Saco de Pancada', nivel: 30, hp: 60000, categoriaCorporal: 'blindadoPesado',
      atributos: { vigor: 50, sorte: 0, forca: 10, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 5 },
      xpConcedido: 10, ouroConcedido: { min: 1, max: 1 },
    };
    const r = resolverCombate(vanguarda(), monstro, 42);
    const usadas = r.logTurnos.flatMap((t) => t.ataques).filter((a) => a.atacante === 'Cavaleiro Vanguarda').map((a) => a.habilidadeAcionada);
    expect(usadas).toContain('Estocada da Vanguarda');
    expect(usadas).toContain('Carga Esmagadora');
    expect(usadas).toContain('Estandarte de Guerra');
  });
});
