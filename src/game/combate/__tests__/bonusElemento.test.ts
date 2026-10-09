import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Combatente, resolverCombate, turnoDeCombate } from '@/game/combat';
import { aplicarBonusElemental, pacoteDoElemento, BONUS_ELEMENTO_RODADAS } from '@/game/combate/bonusElemento';
import {
  DefinicaoHabilidade,
  ResultadoHabilidade,
  limparRegistroParaTestes,
  registrarHabilidade,
  resolverDanoHabilidade,
} from '@/game/combate/habilidades';
import { MonsterDefinition } from '@/rules/monsters';
import { tentarAplicarEfeito } from '@/game/statusEffects';

/** 1.9.1 — Bônus por elemento ativo (catálogo 1.2): cada pacote dura 2 rodadas (decisão do Yuri, 09/10/2026). */

const base: ResultadoHabilidade = {
  nome: 'Teste', tipoDano: 'fisico', percentualDano: 100, ignorarDefesaPercentual: 0, bonusDanoPercentual: 0,
  bonusContraSobreescudoPercentual: 0, curaPercentualDanoCausado: 0, curaPercentualHpMax: 0,
};

describe('1.9.1 — pacotes por elemento', () => {
  it('todos duram 2 rodadas', () => {
    expect(BONUS_ELEMENTO_RODADAS).toBe(2);
    for (const e of ['fogo', 'gelo', 'relampago', 'terra', 'vento'] as const) {
      const p = pacoteDoElemento(e);
      for (const b of p.buffs) expect(b.rodadas, e).toBe(2);
      for (const d of p.efeitosNoUsuario) expect(d.duracaoRodadas, e).toBe(2);
    }
  });

  it('Fogo +5% de dano; Gelo +3% de dano e −3% de dano recebido; Relâmpago +5% de dano e +5% de chance de Paralisia', () => {
    expect(pacoteDoElemento('fogo').buffs.map((b) => b.tipo === 'bonusDano' && b.percentual)).toEqual([5, 5]);
    const gelo = pacoteDoElemento('gelo');
    expect(gelo.buffs.map((b) => b.tipo === 'bonusDano' && b.percentual)).toEqual([3, 3]);
    expect(gelo.efeitosNoUsuario.map((d) => [d.efeito, d.valorPercentual])).toEqual([['resistenciaFisica', 3], ['resistenciaMagica', 3]]);
    const rel = pacoteDoElemento('relampago');
    expect(rel.buffs.map((b) => b.tipo === 'bonusDano' && b.percentual)).toEqual([5, 5]);
    expect(rel.chanceExtraParalisia).toBe(5);
  });

  it('Terra +7% de Sobreescudo (Escudo Temporário) e Vento +2 de Agilidade', () => {
    expect(pacoteDoElemento('terra').efeitosNoUsuario).toEqual([{ efeito: 'escudoTemporario', valorPercentual: 7, duracaoRodadas: 2 }]);
    expect(pacoteDoElemento('vento').buffs).toEqual([{ tipo: 'atributo', atributo: 'agilidade', valor: 2, rodadas: 2 }]);
  });

  it('Sagrado e Sombrio: +5% de dano contra o elemento oposto', () => {
    expect(pacoteDoElemento('sagrado').bonusContraElementoAlvo).toEqual({ elemento: 'sombrio', percentual: 5 });
    expect(pacoteDoElemento('sombrio').bonusContraElementoAlvo).toEqual({ elemento: 'sagrado', percentual: 5 });
  });

  it('só vale se a habilidade declara elemento E bonusElemental', () => {
    expect(aplicarBonusElemental({ ...base, elemento: 'fogo' })).toEqual({ ...base, elemento: 'fogo' });
    expect(aplicarBonusElemental({ ...base, bonusElemental: true })).toEqual({ ...base, bonusElemental: true });
    expect(aplicarBonusElemental({ ...base, elemento: 'fogo', bonusElemental: true }).buffs).toHaveLength(2);
  });

  it('Relâmpago soma +5 pontos à chance da Paralisia declarada pela habilidade (e só a ela)', () => {
    const r = aplicarBonusElemental({
      ...base, elemento: 'relampago', bonusElemental: true,
      statusComChanceNoAlvo: [{ status: 'paralisia' }, { status: 'veneno' }],
    });
    expect(r.statusComChanceNoAlvo).toEqual([
      { status: 'paralisia', chanceExtraPercentual: 5 },
      { status: 'veneno' },
    ]);
  });

  it('a chance extra entra na fronteira do sorteio: Paralisia 3% vira 8%', () => {
    expect(tentarAplicarEfeito(new Map(), 'paralisia', 7.5).resultado).toBe('nao_ativou');
    expect(tentarAplicarEfeito(new Map(), 'paralisia', 7.5, 0, 5).resultado).toBe('controle');
    expect(tentarAplicarEfeito(new Map(), 'paralisia', 8, 0, 5).resultado).toBe('nao_ativou');
  });
});

describe('1.9.1 — "vs Sombrio" é o elemento do alvo', () => {
  const ctx = (elemento?: 'sombrio' | 'sagrado' | 'fogo') => ({
    atacante: { hp: 100, hpMax: 100, nivel: 1 },
    alvo: { hp: 1000, hpMax: 1000, sobreescudo: 0, mitigacaoFisica: 0, mitigacaoMagica: 0, elemento },
    danoBase: 100,
  });
  const sagrada = aplicarBonusElemental({ ...base, elemento: 'sagrado', bonusElemental: true });

  it('Sagrado causa +5% em alvo do elemento Sombrio e nada nos outros', () => {
    expect(resolverDanoHabilidade(sagrada, ctx('sombrio')).danoBruto).toBe(105);
    expect(resolverDanoHabilidade(sagrada, ctx('fogo')).danoBruto).toBe(100);
    expect(resolverDanoHabilidade(sagrada, ctx()).danoBruto).toBe(100);
  });
});

describe('1.9.1 — em combate', () => {
  const habilidade = (id: string, extra: Partial<ResultadoHabilidade>): DefinicaoHabilidade => ({
    id, espaco: 'basico', tipoDano: 'fisico', executar: () => ({ ...base, nome: id, ...extra }),
  });
  beforeEach(() => {
    limparRegistroParaTestes();
    registrarHabilidade(habilidade('teste_fogo', { elemento: 'fogo', bonusElemental: true }));
    registrarHabilidade(habilidade('teste_terra', { elemento: 'terra', bonusElemental: true }));
    registrarHabilidade(habilidade('teste_vento', { elemento: 'vento', bonusElemental: true }));
    registrarHabilidade(habilidade('teste_gelo', { elemento: 'gelo', bonusElemental: true }));
    registrarHabilidade(habilidade('teste_raio', { elemento: 'relampago', bonusElemental: true, statusComChanceNoAlvo: [{ status: 'paralisia' }] }));
  });
  afterEach(() => limparRegistroParaTestes());

  const heroi = (id: string): Combatente => ({
    nome: 'Heroi', classeId: 'barbaro', nivel: 1, hp: 5000, hpMax: 5000, sobreescudo: 0,
    habilidadesEquipadas: { ataqueBasico: id, habilidadeEspecial: 'barbaro_furia_selvagem', ultimate: 'barbaro_ira_do_barbaro' },
    atributos: { vigor: 40, sorte: 0, forca: 20, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 5 },
  });
  const alvo = (): Combatente => ({
    nome: 'Alvo', hp: 5000, hpMax: 5000, sobreescudo: 0, mitigacao: 0,
    atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 5 },
  });

  it('Fogo: coloca os buffs de +5% de dano por 2 rodadas', () => {
    const h = heroi('teste_fogo');
    turnoDeCombate(h, alvo(), 1);
    expect(h.buffs?.filter((b) => b.tipo === 'bonusDano').map((b) => [b.tipoDano, b.bonusDanoPercentual, b.rodadasRestantes])).toEqual([
      ['fisico', 5, 2],
      ['magico', 5, 2],
    ]);
  });

  it('Terra: ganha Sobreescudo temporário de 7% do máximo', () => {
    const h = heroi('teste_terra');
    turnoDeCombate(h, alvo(), 1);
    expect(h.sobreescudo).toBeGreaterThan(0);
    expect(h.efeitosDefensivos?.[0]).toMatchObject({ efeito: 'escudoTemporario', valorPercentual: 7 });
  });

  it('Vento: +2 de Agilidade por 2 rodadas', () => {
    const h = heroi('teste_vento');
    turnoDeCombate(h, alvo(), 1);
    expect(h.buffs?.[0]).toMatchObject({ tipo: 'aumentoAtributo', atributo: 'agilidade', valor: 2, rodadasRestantes: 2 });
  });

  it('Gelo: reduz 3% do dano físico e mágico recebido', () => {
    const h = heroi('teste_gelo');
    turnoDeCombate(h, alvo(), 1);
    expect(h.efeitosDefensivos?.map((d) => [d.efeito, d.valorPercentual])).toEqual([['resistenciaFisica', 3], ['resistenciaMagica', 3]]);
  });

  it('Relâmpago com Paralisia: a chance extra de 5% decide o sorteio (3% + 5% = 8%)', () => {
    const monstro: MonsterDefinition = {
      id: 'alvo-raio', nome: 'Alvo do Raio', nivel: 1, hp: 3000, categoriaCorporal: 'feral',
      atributos: { vigor: 1, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
      xpConcedido: 1, ouroConcedido: { min: 1, max: 1 },
    };
    const comSorteio = (valor: number) => {
      const r = resolverCombate(heroi('teste_raio'), monstro, 1, { rngStatus: (_r, i) => (i >= 100 ? valor : 99) });
      return r.logTurnos.flatMap((t) => t.eventosEfeitos ?? []).filter((e) => e.efeito === 'paralisia');
    };
    expect(comSorteio(7.5).some((e) => e.tipo === 'controle' && e.alvo === 'Alvo do Raio')).toBe(true);
    expect(comSorteio(8.5)).toHaveLength(0);
  });
});
