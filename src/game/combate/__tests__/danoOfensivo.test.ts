import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Combatente, turnoDeCombate } from '@/game/combat';
import { resolverDanoHabilidade } from '@/game/combate/habilidades/resolver';
import {
  ContextoHabilidade,
  DefinicaoHabilidade,
  ResultadoHabilidade,
  limparRegistroParaTestes,
  registrarHabilidade,
} from '@/game/combate/habilidades';

/** 1.2.4 — Catálogo, categoria Dano ofensivo. */

const resultadoBase: ResultadoHabilidade = {
  nome: 'Teste',
  tipoDano: 'fisico',
  percentualDano: 100,
  ignorarDefesaPercentual: 0,
  bonusDanoPercentual: 0,
  bonusContraSobreescudoPercentual: 0,
  curaPercentualDanoCausado: 0,
  curaPercentualHpMax: 0,
};

const ctx = (extra: Partial<ContextoHabilidade['alvo']> = {}, atacante = { hp: 100, hpMax: 100, nivel: 1 }): ContextoHabilidade => ({
  atacante,
  alvo: { hp: 500, hpMax: 500, sobreescudo: 0, mitigacaoFisica: 0, mitigacaoMagica: 0, ...extra },
  danoBase: 20,
});

describe('1.2.4 — Dano ofensivo: cálculo da habilidade', () => {
  it('Dano Escalado: o dano parte de X% do HP perdido do usuário', () => {
    const r = { ...resultadoBase, danoEscalado: { percentualHpPerdido: 50 } };
    // perdeu 80 de 100 HP → 50% = 40
    expect(resolverDanoHabilidade(r, ctx({}, { hp: 20, hpMax: 100, nivel: 1 })).danoBruto).toBe(40);
    // HP cheio: nada perdido → só o dano mínimo
    expect(resolverDanoHabilidade(r, ctx()).danoBruto).toBe(1);
  });

  it('Dano Invertido: +% por passo de Sobreescudo do alvo, até o teto', () => {
    const r = { ...resultadoBase, danoInvertido: { percentualPorPasso: 10, pontosEscudoPorPasso: 10, tetoPercentual: 50 } };
    expect(resolverDanoHabilidade(r, ctx({ sobreescudo: 0 })).danoBruto).toBe(20);
    expect(resolverDanoHabilidade(r, ctx({ sobreescudo: 30 })).danoBruto).toBe(26); // 20 × (100+30)%
    expect(resolverDanoHabilidade(r, ctx({ sobreescudo: 500 })).danoBruto).toBe(30); // teto de +50%
  });

  it('Dano Invertido soma com os outros bônus de dano (regra 1.2.2)', () => {
    const r = {
      ...resultadoBase,
      bonusDanoPercentual: 20,
      danoInvertido: { percentualPorPasso: 10, pontosEscudoPorPasso: 10, tetoPercentual: 50 },
    };
    expect(resolverDanoHabilidade(r, ctx({ sobreescudo: 30 })).danoBruto).toBe(30); // 20 × (100+30+20)%
  });
});

describe('1.2.4 — Dano ofensivo no turno de combate', () => {
  const golpeDuplo = (id: string, nome: string, n: number): DefinicaoHabilidade => ({
    id,
    espaco: 'basico',
    tipoDano: 'fisico',
    executar: () => ({ ...resultadoBase, nome, percentualDano: 60, numeroGolpes: n }),
  });

  beforeEach(() => {
    limparRegistroParaTestes();
    registrarHabilidade(golpeDuplo('teste_golpe_duplo', 'Golpe Duplo', 2));
    registrarHabilidade(golpeDuplo('teste_replicado', 'Dano Replicado', 3));
    registrarHabilidade({
      id: 'teste_acumulativo',
      espaco: 'basico',
      tipoDano: 'fisico',
      executar: () => ({ ...resultadoBase, nome: 'Fúria Crescente', acumulativo: { percentualPorAtaque: 10, limitePercentual: 25 } }),
    });
    registrarHabilidade({
      id: 'teste_impeto',
      espaco: 'basico',
      tipoDano: 'fisico',
      executar: () => ({
        ...resultadoBase,
        nome: 'Ímpeto Imprudente',
        impeto: { ataques: 2, bonusDanoPercentual: 50, reducaoDefesaPercentual: 50 },
      }),
    });
    registrarHabilidade({
      id: 'teste_forcado',
      espaco: 'basico',
      tipoDano: 'fisico',
      executar: () => ({ ...resultadoBase, nome: 'Chama Forçada', ignorarResistenciaElemental: true }),
    });
    registrarHabilidade({
      id: 'teste_compartilhado',
      espaco: 'basico',
      tipoDano: 'fisico',
      executar: () => ({ ...resultadoBase, nome: 'Dano Compartilhado', curaPercentualDanoCausado: 50 }),
    });
  });
  afterEach(() => limparRegistroParaTestes());

  const barbaro = (habilidadeId: string, extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Bárbaro Teste',
    classeId: 'barbaro',
    nivel: 1,
    hp: 100,
    hpMax: 200,
    sobreescudo: 0,
    habilidadesEquipadas: {
      ataqueBasico: habilidadeId,
      habilidadeEspecial: 'barbaro_furia_selvagem',
      ultimate: 'barbaro_ira_do_barbaro',
    },
    atributos: { vigor: 40, sorte: 0, forca: 20, vitalidade: 10, arcano: 0, inteligencia: 0, agilidade: 1 },
    ...extra,
  });

  const alvo = (mitigacao = 0, extra: Partial<Combatente> = {}): Combatente => ({
    nome: 'Alvo',
    hp: 5000,
    hpMax: 5000,
    sobreescudo: 0,
    mitigacao,
    atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
    ...extra,
  });

  it('Golpe Duplo: 2 golpes juntos, cada um com a % da habilidade e a defesa descontada em cada um', () => {
    const atk = turnoDeCombate(barbaro('teste_golpe_duplo'), alvo(5), 1).turnoLog.ataques[0];
    expect(atk.numeroGolpes).toBe(2);
    expect(atk.golpes).toEqual([12, 12]); // 60% de 20
    expect(atk.danoBruto).toBe(24);
    expect(atk.danoEfetivo).toBe(14); // (12 − 5) × 2
  });

  it('Dano Replicado: 3 golpes', () => {
    const atk = turnoDeCombate(barbaro('teste_replicado'), alvo(5), 1).turnoLog.ataques[0];
    expect(atk.numeroGolpes).toBe(3);
    expect(atk.golpes).toEqual([12, 12, 12]);
    expect(atk.danoEfetivo).toBe(21);
  });

  it('cada golpe do Golpe Duplo sorteia o crítico separado', () => {
    const atk = turnoDeCombate(barbaro('teste_golpe_duplo'), alvo(5), 1, {
      sorteioCritico: (_i, golpe) => (golpe === 0 ? 0 : 99.99),
    }).turnoLog.ataques[0];
    expect(atk.golpesCriticos).toBe(1);
    expect(atk.danoEfetivo).toBe((12 - 5) * 2 + (12 - 5)); // 1º crítico (14) + 2º normal (7)
  });

  it('Dano Acumulativo: +10% a cada uso, até o limite de 25%', () => {
    const b = barbaro('teste_acumulativo');
    const a = alvo();
    const danos = [1, 2, 3, 4].map((t) => turnoDeCombate(b, a, t).turnoLog.ataques[0].danoBruto);
    // base 20; bônus usado: 0, 10, 20, 25 (limite)
    expect(danos).toEqual([20, 22, 24, 25]);
    expect(b.danoAcumulativoPercentual).toBe(25);
  });

  it('Ímpeto Imprudente: +50% de dano nos próximos 2 ataques; a defesa do usuário cai pela metade', () => {
    const b = barbaro('teste_impeto');
    const a = alvo();
    const [primeiro, segundo, terceiro, quarto] = [1, 2, 3, 4].map(
      (t) => turnoDeCombate(b, a, t).turnoLog.ataques[0]
    );
    // O ataque que dá o Ímpeto não recebe o bônus; os 2 seguintes recebem
    expect(primeiro.danoBruto).toBe(20);
    expect(primeiro.impetoImprudenteAtivo).toBeUndefined();
    expect(segundo.danoBruto).toBe(30);
    expect(segundo.impetoImprudenteAtivo).toBe(true);
    expect(terceiro.danoBruto).toBe(30);
    // O 3º ataque da habilidade renova o Ímpeto (ela o aplica de novo)
    expect(quarto.danoBruto).toBe(30);
  });

  it('Ímpeto Imprudente: enquanto dura, quem o usa sofre com a defesa reduzida', () => {
    const portador = barbaro('teste_impeto', { mitigacao: 20, impeto: { ataquesRestantes: 2, bonusDanoPercentual: 50, reducaoDefesaPercentual: 50 } });
    const atacante: Combatente = alvo(0, { atributos: { vigor: 1, sorte: 0, forca: 50, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 } });
    expect(turnoDeCombate(atacante, portador, 1).turnoLog.ataques[0].danoEfetivo).toBe(40); // 50 − (20 × 50%)
    portador.impeto = undefined;
    expect(turnoDeCombate(atacante, portador, 2).turnoLog.ataques[0].danoEfetivo).toBe(30); // 50 − 20
  });

  it('Dano Compartilhado: parte do dano causado volta como cura', () => {
    const b = barbaro('teste_compartilhado');
    const atk = turnoDeCombate(b, alvo(), 1).turnoLog.ataques[0];
    expect(atk.danoEfetivo).toBe(20);
    expect(b.hp).toBe(110); // 100 + 50% de 20
  });

  it('Dano Elemental Forçado: ignora a resistência elemental do alvo', () => {
    const resistenteAFogo = alvo(0, { modificadoresElementais: { fogo: -50 } });
    const normal = barbaro('teste_acumulativo', { elementoAtaque: 'fogo' });
    const forcado = barbaro('teste_forcado', { elementoAtaque: 'fogo' });
    expect(turnoDeCombate(normal, { ...resistenteAFogo }, 1).turnoLog.ataques[0].danoBruto).toBe(10);
    const atk = turnoDeCombate(forcado, { ...resistenteAFogo }, 1).turnoLog.ataques[0];
    expect(atk.danoBruto).toBe(20);
    expect(atk.multiplicadorElemental).toBe(1);
  });

  it('Dano Elemental Forçado: a fraqueza do alvo continua valendo', () => {
    const fracoAFogo = alvo(0, { modificadoresElementais: { fogo: 50 } });
    const forcado = barbaro('teste_forcado', { elementoAtaque: 'fogo' });
    expect(turnoDeCombate(forcado, fracoAFogo, 1).turnoLog.ataques[0].danoBruto).toBe(30);
  });
});
