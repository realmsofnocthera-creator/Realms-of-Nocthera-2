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

/** Etapa 2 — Kit do Kensei (Samurai de golpe único): proposta aprovada pelo Yuri em 09/10/2026. */

const ctx = (alvo: Partial<ContextoHabilidade['alvo']> = {}): ContextoHabilidade => ({
  atacante: { hp: 100, hpMax: 100, nivel: 30 },
  alvo: { hp: 1000, hpMax: 1000, sobreescudo: 0, mitigacaoFisica: 0, mitigacaoMagica: 0, ...alvo },
  danoBase: 100,
});

describe('Kensei — habilidades', () => {
  beforeEach(() => registrarHabilidadesDeSubclasse());

  it('Corte Perfeito: 110% e ignora 10% da defesa', () => {
    const def = obterHabilidade('kensei_corte_perfeito')!;
    expect(def.espaco).toBe('basico');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ nome: 'Corte Perfeito', percentualDano: 110, ignorarDefesaPercentual: 10 });
  });

  it('Lâmina Desembainhada: 175%, ignora 15% da defesa e dá Foco de 30%', () => {
    const def = obterHabilidade('kensei_lamina_desembainhada')!;
    expect(def.espaco).toBe('especial');
    const r = def.executar(ctx());
    expect(r).toMatchObject({ percentualDano: 175, ignorarDefesaPercentual: 15 });
    expect(r.foco).toEqual({ ignorarDefesaPercentual: 30 });
  });

  it('Corte Decisivo: 340%, ignora 15%, sem bônus contra Sobreescudo e +20% só com o alvo abaixo de 30% de HP', () => {
    const def = obterHabilidade('kensei_corte_decisivo')!;
    expect(def.espaco).toBe('ultimate');
    const cheio = def.executar(ctx());
    expect(cheio).toMatchObject({ percentualDano: 340, ignorarDefesaPercentual: 15, bonusContraSobreescudoPercentual: 0, bonusDanoPercentual: 0 });
    const fraco = def.executar(ctx({ hp: 299 }));
    expect(fraco.bonusDanoPercentual).toBe(20);
    expect(def.executar(ctx({ hp: 300 })).bonusDanoPercentual).toBe(0); // 30% exatos: não está abaixo
    expect(resolverDanoHabilidade(cheio, ctx()).danoBruto).toBe(340);
    expect(resolverDanoHabilidade(fraco, ctx({ hp: 299 })).danoBruto).toBe(408); // 340 × 1,20
    expect(resolverDanoHabilidade(cheio, ctx({ sobreescudo: 500 })).danoBruto).toBe(340); // sem bônus contra Sobreescudo
  });
});

describe('Kensei — passiva Lâmina Perfeita', () => {
  it('tier 1: +5% de dano físico; sem tier não dá nada', () => {
    const m = obterModificadoresPassivaSubclasse({ subclasseAtualId: 'kensei', subclasseTiers: { kensei: 1 }, hp: 100, hpMax: 100 });
    expect(m).toEqual({ bonusDanoFisicoPercentual: 5, reducaoDanoFisicoRecebidoPercentual: 0, bonusSobreescudoMaxPercentual: 0 });
    expect(obterModificadoresPassivaSubclasse({ subclasseAtualId: 'kensei', subclasseTiers: { kensei: 0 }, hp: 100, hpMax: 100 }).bonusDanoFisicoPercentual).toBe(0);
  });
});

describe('Kensei — em combate', () => {
  const kensei = (extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Samurai Kensei', classeId: 'samurai', nivel: 30, hp: 5000, hpMax: 5000, sobreescudo: 0,
    subclasseAtualId: 'kensei', subclasseTiers: { kensei: 4 },
    habilidadesEquipadas: {
      ataqueBasico: 'kensei_corte_perfeito',
      habilidadeEspecial: 'kensei_lamina_desembainhada',
      ultimate: 'kensei_corte_decisivo',
    },
    atributos: { vigor: 40, sorte: 0, forca: 60, vitalidade: 10, arcano: 0, inteligencia: 0, agilidade: 5 },
    ...extra,
  });
  const alvo = (mitigacao = 0): Combatente => ({
    nome: 'Alvo', hp: 100000, hpMax: 100000, sobreescudo: 0, mitigacao,
    atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 5 },
  });

  it('a Lâmina Desembainhada deixa o Foco armado para o ataque seguinte', () => {
    const k = kensei({ contadorIaijutsu: 2 });
    const atk = turnoDeCombate(k, alvo(), 1).turnoLog.ataques[0];
    expect(atk.habilidadeAcionada).toBe('Lâmina Desembainhada');
    expect(k.focoProximoAtaque).toBe(30);
  });

  it('a luta usa as três habilidades', () => {
    const monstro: MonsterDefinition = {
      id: 'saco-de-pancada', nome: 'Saco de Pancada', nivel: 30, hp: 60000, categoriaCorporal: 'blindadoPesado',
      atributos: { vigor: 50, sorte: 0, forca: 10, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 5 },
      xpConcedido: 10, ouroConcedido: { min: 1, max: 1 },
    };
    const r = resolverCombate(kensei(), monstro, 42);
    const usadas = r.logTurnos.flatMap((t) => t.ataques).filter((a) => a.atacante === 'Samurai Kensei').map((a) => a.habilidadeAcionada);
    expect(usadas).toContain('Corte Perfeito');
    expect(usadas).toContain('Lâmina Desembainhada');
    expect(usadas).toContain('Corte Decisivo');
  });
});
