import { describe, it, expect, beforeEach } from 'vitest';
import { Combatente, resolverCombate, turnoDeCombate } from '@/game/combat';
import {
  ContextoHabilidade,
  obterHabilidade,
  registrarHabilidadesDeSubclasse,
} from '@/game/combate/habilidades';
import { MonsterDefinition } from '@/rules/monsters';

/** Berserker e Colosso com os efeitos do catálogo (aprovado pelo Yuri em 09/10/2026). */

const ctx = (): ContextoHabilidade => ({
  atacante: { hp: 100, hpMax: 100, nivel: 30 },
  alvo: { hp: 1000, hpMax: 1000, sobreescudo: 0, mitigacaoFisica: 0, mitigacaoMagica: 0 },
  danoBase: 100,
});

describe('Berserker — efeitos nas habilidades', () => {
  beforeEach(() => registrarHabilidadesDeSubclasse());

  it('Golpe Desenfreado: mantém 115% e ganha Dano Acumulativo (+2% por golpe, até +10%)', () => {
    const r = obterHabilidade('berserker_golpe_desenfreado')!.executar(ctx());
    expect(r.percentualDano).toBe(115);
    expect(r.acumulativo).toEqual({ percentualPorAtaque: 2, limitePercentual: 10 });
  });

  it('Investida Sangrenta: mantém 170%/210% e tenta Sangramento com +17 pontos de chance (20%)', () => {
    const r = obterHabilidade('berserker_investida_sangrenta')!.executar(ctx());
    expect(r.percentualDano).toBe(170);
    expect(r.ignorarDefesaPercentual).toBe(10);
    expect(r.statusComChanceNoAlvo).toEqual([{ status: 'sangramento', chanceExtraPercentual: 17 }]);
  });

  it('Desvario Final: mantém 350% e ganha Ímpeto Imprudente (3 ataques, +25% de dano, −20% de defesa)', () => {
    const r = obterHabilidade('berserker_desvario_final')!.executar(ctx());
    expect(r.percentualDano).toBe(350);
    expect(r.ignorarDefesaPercentual).toBe(20);
    expect(r.impeto).toEqual({ ataques: 3, bonusDanoPercentual: 25, reducaoDefesaPercentual: 20 });
  });
});

describe('Berserker — em combate', () => {
  const berserker = (extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Berserker', classeId: 'barbaro', nivel: 30, hp: 5000, hpMax: 5000, sobreescudo: 0,
    subclasseAtualId: 'berserker', subclasseTiers: { berserker: 4 },
    habilidadesEquipadas: {
      ataqueBasico: 'berserker_golpe_desenfreado',
      habilidadeEspecial: 'berserker_investida_sangrenta',
      ultimate: 'berserker_desvario_final',
    },
    atributos: { vigor: 40, sorte: 0, forca: 60, vitalidade: 10, arcano: 0, inteligencia: 0, agilidade: 5 },
    ...extra,
  });
  const alvo = (): Combatente => ({
    nome: 'Alvo', hp: 100000, hpMax: 100000, sobreescudo: 0, mitigacao: 0,
    atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 5 },
  });

  it('os golpes básicos acumulam raiva: o dano cresce até o limite de +10%', () => {
    const b = berserker();
    const a = alvo();
    const basicos: number[] = [];
    for (let t = 1; t <= 14; t++) {
      const atk = turnoDeCombate(b, a, t).turnoLog.ataques[0];
      if (atk.habilidadeAcionada === 'Golpe Desenfreado') basicos.push(atk.danoBruto);
    }
    expect(basicos.length).toBeGreaterThanOrEqual(8);
    expect(basicos[1]).toBeGreaterThan(basicos[0]);
    expect(basicos[5]).toBeGreaterThan(basicos[2]);
    expect(basicos[basicos.length - 1]).toBe(basicos[basicos.length - 2]); // no limite de +10%
  });

  it('a Investida Sangrenta aplica Sangramento conforme a chance de 20%', () => {
    const monstro: MonsterDefinition = {
      id: 'alvo-sangra', nome: 'Alvo Sangra', nivel: 1, hp: 20000, categoriaCorporal: 'feral',
      atributos: { vigor: 1, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
      xpConcedido: 1, ouroConcedido: { min: 1, max: 1 },
    };
    const com = (valor: number) =>
      resolverCombate(berserker({ contadorFuriaSelvagem: 2, contadorPosturaGuardiao: 2 }), monstro, 3, { rngStatus: (_r, i) => (i >= 100 ? valor : 99) })
        .logTurnos.flatMap((t) => t.eventosEfeitos ?? []).filter((e) => e.efeito === 'sangramento' && e.alvo === 'Alvo Sangra');
    expect(com(15).length).toBeGreaterThan(0); // dentro dos 20%
    expect(com(25)).toHaveLength(0); // fora
  });
});

describe('Colosso — efeitos defensivos nas habilidades', () => {
  beforeEach(() => registrarHabilidadesDeSubclasse());

  it('Golpe Esmagador: mantém 105% e 5% de roubo de vida; ganha −3% de dano físico recebido por 1 rodada', () => {
    const r = obterHabilidade('colosso_golpe_esmagador')!.executar(ctx());
    expect(r.percentualDano).toBe(105);
    expect(r.curaPercentualDanoCausado).toBe(5);
    expect(r.efeitosNoUsuario).toEqual([{ efeito: 'resistenciaFisica', valorPercentual: 3, duracaoRodadas: 1 }]);
  });

  it('Impacto Sísmico: mantém 160% e 10% de cura; ganha Escudo Temporário de 10% por 2 rodadas', () => {
    const r = obterHabilidade('colosso_impacto_sismico')!.executar(ctx());
    expect(r.percentualDano).toBe(160);
    expect(r.curaPercentualHpMax).toBe(10);
    expect(r.efeitosNoUsuario).toEqual([{ efeito: 'escudoTemporario', valorPercentual: 10, duracaoRodadas: 2 }]);
  });

  it('Fúria do Colosso: mantém 320% e 15% de cura; ganha Escudo Temporário de 15% e −10% de dano físico por 2 rodadas', () => {
    const r = obterHabilidade('colosso_furia_do_colosso')!.executar(ctx());
    expect(r.percentualDano).toBe(320);
    expect(r.curaPercentualHpMax).toBe(15);
    expect(r.bonusContraSobreescudoPercentual).toBe(25);
    expect(r.efeitosNoUsuario).toEqual([
      { efeito: 'escudoTemporario', valorPercentual: 15, duracaoRodadas: 2 },
      { efeito: 'resistenciaFisica', valorPercentual: 10, duracaoRodadas: 2 },
    ]);
  });

  it('em combate o Colosso ganha a resistência e o Sobreescudo temporário', () => {
    const colosso: Combatente = {
      nome: 'Colosso', classeId: 'barbaro', nivel: 30, hp: 4000, hpMax: 5000, sobreescudo: 0,
      subclasseAtualId: 'colosso', subclasseTiers: { colosso: 4 },
      habilidadesEquipadas: {
        ataqueBasico: 'colosso_golpe_esmagador',
        habilidadeEspecial: 'colosso_impacto_sismico',
        ultimate: 'colosso_furia_do_colosso',
      },
      atributos: { vigor: 40, sorte: 0, forca: 40, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 5 },
    };
    const alvo: Combatente = {
      nome: 'Alvo', hp: 100000, hpMax: 100000, sobreescudo: 0, mitigacao: 0,
      atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 5 },
    };
    turnoDeCombate(colosso, alvo, 1);
    expect(colosso.efeitosDefensivos?.[0]).toMatchObject({ efeito: 'resistenciaFisica', valorPercentual: 3 });
  });
});
