import { describe, it, expect } from 'vitest';
import { ativarColecionavel, atributosDosColecionaveis, buscar, reforcarColecionavel, subirEstrela } from '@/game/colecionaveis';
import { COLECIONAVEL_MAP, custoDoReforco } from '@/rules/colecionaveis';

/** Sorteio fixo: sempre o mesmo número. */
const fixo = (v: number) => () => v;

describe('Buscar e colecionáveis (regras puras)', () => {
  it('cada busca gasta 10 selos; sem selos suficientes não busca', () => {
    expect(buscar({ desgastado: 9 }, {}, {}, 'desgastado', 1, fixo(0))).toEqual({ ok: false, motivo: 'selosInsuficientes' });
    expect(buscar({ desgastado: 50 }, {}, {}, 'desgastado', 10, fixo(0))).toEqual({ ok: false, motivo: 'selosInsuficientes' });
    const r = buscar({ desgastado: 25 }, {}, {}, 'desgastado', 1, fixo(0));
    if (!r.ok) throw new Error();
    expect(r.selos).toEqual({ desgastado: 15 });
    expect(r.garantia).toEqual({ desgastado: 1 });
    // sorteio 0: Comum em fragmentos, o primeiro comum do catálogo
    expect(r.resultados).toEqual([{ id: 'RI-C01', nome: 'Medalhão do Viajante', raridade: 'comum', inteiro: false, fragmentos: 5, ativou: false, garantido: false }]);
    expect(r.colecionaveis).toEqual({ 'RI-C01': { fragmentos: 5 } });
  });

  it('a 10ª busca com o mesmo selo dá um inteiro da raridade do selo, e o contador recomeça', () => {
    const r = buscar({ origem: 100 }, { origem: 3 }, {}, 'origem', 10, fixo(0));
    if (!r.ok) throw new Error();
    expect(r.resultados.map((x) => x.garantido)).toEqual([false, false, false, false, false, false, true, false, false, false]);
    expect(r.resultados[6]).toMatchObject({ raridade: 'mitico', inteiro: true, ativou: true });
    expect(r.garantia).toEqual({ origem: 3 });
    expect(r.selos).toEqual({});
    const d = buscar({ desgastado: 10 }, { desgastado: 9 }, {}, 'desgastado', 1, fixo(0.5));
    if (!d.ok) throw new Error();
    expect(d.resultados[0]).toMatchObject({ raridade: 'comum', inteiro: true, garantido: true, ativou: true });
    expect(d.garantia).toEqual({});
  });

  it('um inteiro ativa; se já estava ativo, vira os fragmentos de ativar', () => {
    const a = buscar({ origem: 10 }, {}, {}, 'origem', 1, fixo(0.99));
    if (!a.ok) throw new Error();
    const id = a.resultados[0].id;
    expect(COLECIONAVEL_MAP[id].raridade).toBe('mitico');
    expect(a.colecionaveis[id]).toEqual({ fragmentos: 0, nivel: 1 });
    const b = buscar({ origem: 10 }, {}, a.colecionaveis, 'origem', 1, fixo(0.99));
    if (!b.ok) throw new Error();
    expect(b.resultados[0]).toMatchObject({ id, inteiro: true, ativou: false, fragmentos: 80 });
    expect(b.colecionaveis[id]).toEqual({ fragmentos: 80, nivel: 1 });
  });

  it('ativar gasta os fragmentos; não ativa duas vezes nem sem fragmentos', () => {
    expect(ativarColecionavel({ 'RI-C01': { fragmentos: 19 } }, 'RI-C01')).toEqual({ ok: false, motivo: 'fragmentosInsuficientes' });
    expect(ativarColecionavel({}, 'nada')).toEqual({ ok: false, motivo: 'colecionavelNaoEncontrado' });
    const r = ativarColecionavel({ 'RI-C01': { fragmentos: 23 } }, 'RI-C01');
    expect(r).toEqual({ ok: true, colecionaveis: { 'RI-C01': { fragmentos: 3, nivel: 1 } } });
    expect(ativarColecionavel({ 'RI-C01': { fragmentos: 30, nivel: 1 } }, 'RI-C01')).toEqual({ ok: false, motivo: 'jaAtivo' });
  });

  it('reforçar gasta Fragmentos de Memória e para no limite das estrelas', () => {
    const base = { 'RI-C01': { fragmentos: 0, nivel: 1 } };
    expect(reforcarColecionavel({}, 999, 'RI-C01', 1)).toEqual({ ok: false, motivo: 'naoAtivo' });
    const custo4 = [1, 2, 3, 4].reduce((s, n) => s + custoDoReforco('comum', n), 0);
    expect(reforcarColecionavel(base, custo4 - 1, 'RI-C01', 4)).toEqual({ ok: false, motivo: 'memoriaInsuficiente' });
    const r = reforcarColecionavel(base, custo4, 'RI-C01', 4);
    expect(r).toEqual({ ok: true, colecionaveis: { 'RI-C01': { fragmentos: 0, nivel: 5 } }, memoria: 0, nivel: 5 });
    expect(reforcarColecionavel({ 'RI-C01': { fragmentos: 0, nivel: 5 } }, 999, 'RI-C01', 1)).toEqual({ ok: false, motivo: 'nivelMaximo' });
    expect(reforcarColecionavel({ 'RI-C01': { fragmentos: 0, nivel: 5, estrelas: 1 } }, 999, 'RI-C01', 1)).toMatchObject({ ok: true, nivel: 6 });
  });

  it('subir estrela gasta os fragmentos do próprio colecionável e Pedras da Recordação, até 5★', () => {
    expect(subirEstrela({ 'RI-C01': { fragmentos: 10, nivel: 5 } }, 0, 'RI-C01')).toEqual({ ok: false, motivo: 'pedrasInsuficientes' });
    expect(subirEstrela({ 'RI-C01': { fragmentos: 9, nivel: 5 } }, 5, 'RI-C01')).toEqual({ ok: false, motivo: 'fragmentosInsuficientes' });
    expect(subirEstrela({ 'RI-C01': { fragmentos: 12, nivel: 5 } }, 5, 'RI-C01')).toEqual({ ok: true, colecionaveis: { 'RI-C01': { fragmentos: 2, nivel: 5, estrelas: 1 } }, pedras: 4, estrelas: 1 });
    expect(subirEstrela({ 'RI-C01': { fragmentos: 999, nivel: 5, estrelas: 5 } }, 99, 'RI-C01')).toEqual({ ok: false, motivo: 'estrelasMaximas' });
  });

  it('os atributos somam os pontos inteiros dos ativados', () => {
    // RI-C01 e RI-C03 dão Força: +1 cada no nível 1; RI-C02 dá Vitalidade
    const r = atributosDosColecionaveis({ 'RI-C01': { fragmentos: 0, nivel: 1 }, 'RI-C03': { fragmentos: 0, nivel: 10, estrelas: 1 }, 'RI-C02': { fragmentos: 0, nivel: 1 } });
    expect([r.forca, r.vitalidade, r.sorte]).toEqual([3, 1, 0]);
    // fragmentos sem ativar não contam
    expect(atributosDosColecionaveis({ 'RI-M01': { fragmentos: 70 } }).forca).toBe(0);
    expect(atributosDosColecionaveis({ 'RI-M01': { fragmentos: 0, nivel: 30, estrelas: 5 } }).forca).toBe(20);
  });
});
