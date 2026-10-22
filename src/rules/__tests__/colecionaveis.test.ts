import { describe, it, expect } from 'vitest';
import {
  CATEGORIAS_DE_COLECIONAVEL,
  CHANCES_DO_SELO,
  COLECIONAVEIS,
  colecionaveisDoDocumento,
  contadorPorSeloDoDocumento,
  custoDaEstrela,
  nivelMaximoDoReforco,
  RARIDADE_DO_SELO,
  RARIDADES_DE_COLECIONAVEL,
  SELOS_DE_BUSCA,
  sortearResultado,
  valorDoColecionavel,
} from '@/rules/colecionaveis';

describe('Colecionáveis: catálogo e regras', () => {
  it('120 colecionáveis com a contagem do catálogo do Yuri, códigos e nomes únicos', () => {
    expect(COLECIONAVEIS).toHaveLength(120);
    const conta = (cat: string, r: string) => COLECIONAVEIS.filter((c) => c.categoria === cat && c.raridade === r).length;
    expect([conta('reliquias', 'comum'), conta('reliquias', 'muitoRaro'), conta('reliquias', 'lendario'), conta('reliquias', 'mitico')]).toEqual([15, 9, 4, 2]);
    expect([conta('sonatas', 'comum'), conta('sonatas', 'muitoRaro'), conta('sonatas', 'lendario'), conta('sonatas', 'mitico')]).toEqual([15, 9, 5, 1]);
    expect([conta('memorias', 'comum'), conta('memorias', 'muitoRaro'), conta('memorias', 'lendario'), conta('memorias', 'mitico')]).toEqual([15, 9, 4, 2]);
    expect([conta('ecos', 'comum'), conta('ecos', 'muitoRaro'), conta('ecos', 'lendario'), conta('ecos', 'mitico')]).toEqual([15, 9, 5, 1]);
    expect(new Set(COLECIONAVEIS.map((c) => c.id)).size).toBe(120);
    expect(new Set(COLECIONAVEIS.map((c) => c.nome)).size).toBe(120);
    const porId = Object.fromEntries(COLECIONAVEIS.map((c) => [c.id, c.nome]));
    expect(porId['RI-C01']).toBe('Medalhão do Viajante');
    expect(porId['RI-M02']).toBe('O Selo de Lautrec');
    expect(porId['SO-M01']).toBe('A Canção Antes da Criação');
    expect(porId['ME-L02']).toBe('O Despertar de Lana');
    expect(porId['EE-M01']).toBe('Nimb, o Caos Primordial');
    expect(porId['EE-MR09']).toBe('Espectro da Coroa Partida');
  });

  it('os atributos seguem as categorias e a Sorte é rara (só em 3 Memórias)', () => {
    const atributos = (cat: string) => new Set(COLECIONAVEIS.filter((c) => c.categoria === cat).map((c) => c.atributo));
    expect(atributos('reliquias')).toEqual(new Set(['forca', 'vitalidade']));
    expect(atributos('sonatas')).toEqual(new Set(['inteligencia', 'arcano']));
    expect(atributos('ecos')).toEqual(new Set(['agilidade', 'vigor']));
    const sorte = COLECIONAVEIS.filter((c) => c.atributo === 'sorte');
    expect(sorte).toHaveLength(3);
    expect(sorte.every((c) => c.categoria === 'memorias' && (c.raridade === 'comum' || c.raridade === 'muitoRaro'))).toBe(true);
    expect(CATEGORIAS_DE_COLECIONAVEL).toHaveLength(4);
    expect(RARIDADES_DE_COLECIONAVEL).toEqual(['comum', 'muitoRaro', 'lendario', 'mitico']);
  });

  it('as chances de cada selo somam 100% e seguem o que o Yuri definiu', () => {
    for (const selo of SELOS_DE_BUSCA) expect(CHANCES_DO_SELO[selo].reduce((s, l) => s + l.chance, 0)).toBeCloseTo(100);
    const chance = (selo: (typeof SELOS_DE_BUSCA)[number], r: string, inteiro: boolean) => CHANCES_DO_SELO[selo].find((l) => l.raridade === r && l.inteiro === inteiro)?.chance;
    expect([chance('desgastado', 'lendario', false), chance('desgastado', 'lendario', true)]).toEqual([0.9, 0.1]);
    expect([chance('encantado', 'mitico', false), chance('encantado', 'mitico', true)]).toEqual([0.9, 0.1]);
    expect([chance('eternidade', 'mitico', false), chance('eternidade', 'mitico', true)]).toEqual([5, 1]);
    expect([chance('origem', 'mitico', false), chance('origem', 'mitico', true)]).toEqual([95, 5]);
    expect(CHANCES_DO_SELO.desgastado.some((l) => l.raridade === 'mitico')).toBe(false);
    expect(CHANCES_DO_SELO.encantado.some((l) => l.raridade === 'comum')).toBe(false);
    expect(new Set(CHANCES_DO_SELO.eternidade.map((l) => l.raridade))).toEqual(new Set(['lendario', 'mitico']));
    expect(RARIDADE_DO_SELO).toEqual({ desgastado: 'comum', encantado: 'muitoRaro', eternidade: 'lendario', origem: 'mitico' });
    expect(sortearResultado('origem', () => 0.99)).toEqual({ raridade: 'mitico', inteiro: true });
    expect(sortearResultado('desgastado', () => 0)).toEqual({ raridade: 'comum', inteiro: false });
  });

  it('reforço: limite 5 com 0★ e +5 por estrela até 30; o valor é sempre inteiro e sobe em níveis e estrelas marcados', () => {
    expect([0, 1, 2, 3, 4, 5].map(nivelMaximoDoReforco)).toEqual([5, 10, 15, 20, 25, 30]);
    expect([valorDoColecionavel('comum', 1, 0), valorDoColecionavel('muitoRaro', 1, 0), valorDoColecionavel('lendario', 1, 0), valorDoColecionavel('mitico', 1, 0)]).toEqual([1, 2, 3, 5]);
    expect([valorDoColecionavel('comum', 30, 5), valorDoColecionavel('muitoRaro', 30, 5), valorDoColecionavel('lendario', 30, 5), valorDoColecionavel('mitico', 30, 5)]).toEqual([5, 7, 11, 20]);
    expect(valorDoColecionavel('comum', 9, 1)).toBe(1);
    expect(valorDoColecionavel('comum', 10, 1)).toBe(2);
    expect(valorDoColecionavel('muitoRaro', 5, 0)).toBe(3);
    expect(valorDoColecionavel('mitico', 6, 1)).toBe(8);
    for (const r of ['comum', 'muitoRaro', 'lendario', 'mitico'] as const) {
      for (let n = 1; n <= 30; n++) for (let e = 0; e <= 5; e++) expect(Number.isInteger(valorDoColecionavel(r, n, e))).toBe(true);
    }
    expect(custoDaEstrela('comum', 1)).toEqual({ fragmentos: 10, pedras: 1 });
    expect(custoDaEstrela('mitico', 5)).toEqual({ fragmentos: 200, pedras: 25 });
  });

  it('a leitura do banco descarta o que não existe e respeita os limites', () => {
    expect(colecionaveisDoDocumento({ 'RI-C01': { fragmentos: 3, nivel: 99, estrelas: 9 }, 'XX-C01': { fragmentos: 1 }, 'SO-C01': { fragmentos: 0 } })).toEqual({
      'RI-C01': { fragmentos: 3, nivel: 30, estrelas: 5 },
    });
    expect(colecionaveisDoDocumento({ 'ME-C01': { fragmentos: 4, nivel: 0 } })).toEqual({ 'ME-C01': { fragmentos: 4 } });
    expect(colecionaveisDoDocumento([])).toBeUndefined();
    expect(contadorPorSeloDoDocumento({ desgastado: 30, origem: -2, outro: 5 })).toEqual({ desgastado: 30 });
    expect(contadorPorSeloDoDocumento({})).toBeUndefined();
  });
});
