import { describe, it, expect } from 'vitest';
import {
  bonusDaMaestriaDeArma,
  bonusDaMaestriaDeChefes,
  bonusDaMaestriaDeExpedicao,
  bonusDaMaestriaDeForja,
  descontoDaForja,
  ganharXpDeMaestria,
  itensGastos,
  maestriasDoDocumento,
  nivelDaMaestria,
  TETO_DIARIO_DE_XP,
  textoDoBonusDaTrilha,
  TRILHAS_DE_MAESTRIA,
  XP_TOTAL,
  xpAteONivel,
  xpDasVitorias,
  xpParaSubir,
} from '@/rules/maestrias';

const DIA = '2026-10-23';
const noNivel = (id: string, nivel: number) => ({ [id]: { xp: xpAteONivel(nivel) } });

describe('Maestrias: regras', () => {
  it('22 trilhas: 6 de arma, Chefes, Forja, Expedição e 13 de monstro (bloqueadas)', () => {
    expect(TRILHAS_DE_MAESTRIA).toHaveLength(22);
    expect(TRILHAS_DE_MAESTRIA.filter((t) => t.grupo === 'armas')).toHaveLength(6);
    expect(TRILHAS_DE_MAESTRIA.filter((t) => t.grupo === 'monstros').every((t) => t.bloqueada)).toBe(true);
    expect(TRILHAS_DE_MAESTRIA.filter((t) => t.grupo === 'monstros')).toHaveLength(13);
  });

  it('curva: 20 + 5n por nível, 26.750 XP até o 100; com o teto de 350 por dia, no mínimo 77 dias', () => {
    expect([xpParaSubir(0), xpParaSubir(1), xpParaSubir(99)]).toEqual([20, 25, 515]);
    expect(XP_TOTAL).toBe(26750);
    expect(xpAteONivel(100)).toBe(XP_TOTAL);
    expect(Math.ceil(XP_TOTAL / TETO_DIARIO_DE_XP)).toBeGreaterThanOrEqual(77);
  });

  it('nível a partir do XP', () => {
    expect(nivelDaMaestria(0)).toEqual({ nivel: 0, xpNoNivel: 0, xpParaProximo: 20 });
    expect(nivelDaMaestria(44)).toEqual({ nivel: 1, xpNoNivel: 24, xpParaProximo: 25 });
    expect(nivelDaMaestria(45).nivel).toBe(2);
    expect(nivelDaMaestria(XP_TOTAL)).toEqual({ nivel: 100, xpNoNivel: 0, xpParaProximo: null });
    expect(nivelDaMaestria(XP_TOTAL * 2).nivel).toBe(100);
  });

  it('XP com teto diário por trilha, que zera no dia seguinte; trilhas bloqueadas ou desconhecidas não ganham', () => {
    const a = ganharXpDeMaestria(undefined, { 'arma:katana': 300, chefes: 25, 'monstro:feras': 50, xyz: 10 }, DIA)!;
    expect(a).toEqual({ 'arma:katana': { xp: 300, dia: DIA, hoje: 300 }, chefes: { xp: 25, dia: DIA, hoje: 25 } });
    const b = ganharXpDeMaestria(a, { 'arma:katana': 100 }, DIA)!;
    expect(b['arma:katana']).toEqual({ xp: 350, dia: DIA, hoje: 350 });
    expect(ganharXpDeMaestria(b, { 'arma:katana': 10 }, DIA)).toBeNull();
    expect(ganharXpDeMaestria(b, { 'arma:katana': 10 }, '2026-10-24')!['arma:katana']).toEqual({ xp: 360, dia: '2026-10-24', hoje: 10 });
    expect(ganharXpDeMaestria({ forja: { xp: XP_TOTAL - 5 } }, { forja: 100 }, DIA)!.forja.xp).toBe(XP_TOTAL);
    expect(ganharXpDeMaestria({ forja: { xp: XP_TOTAL } }, { forja: 100 }, DIA)).toBeNull();
  });

  it('XP das vitórias: 10 com a arma (30 contra chefe) e 25 de Chefes por chefe', () => {
    expect(xpDasVitorias('katana', [false, false, true])).toEqual({ 'arma:katana': 50, chefes: 25 });
    expect(xpDasVitorias(undefined, [true])).toEqual({ chefes: 25 });
    expect(xpDasVitorias('cajado', [])).toEqual({});
  });

  it('bônus por nível e por marco', () => {
    expect(bonusDaMaestriaDeArma(noNivel('arma:lanca', 35), 'lanca')).toEqual({ danoPercentual: 7, criticoPontos: 3 });
    expect(bonusDaMaestriaDeArma(noNivel('arma:lanca', 35), 'katana')).toEqual({ danoPercentual: 0, criticoPontos: 0 });
    expect(bonusDaMaestriaDeChefes(noNivel('chefes', 100))).toEqual({ danoPercentual: 20, reducaoPercentual: 10 });
    expect(bonusDaMaestriaDeForja(noNivel('forja', 3))).toEqual({ descontoOuroPercentual: 0.6, descontoMateriaisPercentual: 0 });
    expect(bonusDaMaestriaDeExpedicao(noNivel('expedicao', 49))).toEqual({ reducaoDeTempoPercentual: 9.8, materiaisExtras: 4, vagasExtras: 0 });
    expect(bonusDaMaestriaDeExpedicao(noNivel('expedicao', 100))).toEqual({ reducaoDeTempoPercentual: 20, materiaisExtras: 10, vagasExtras: 2 });
  });

  it('desconto da Forja: ouro por nível e materiais por marco (arredondado para baixo)', () => {
    const plano = { inventario: { a: 0, b: 5 }, ouroGasto: 1000 };
    expect(descontoDaForja(noNivel('forja', 50), { a: 100, b: 15 }, plano)).toEqual({ inventario: { a: 5, b: 5 }, ouroGasto: 900 });
    expect(descontoDaForja(noNivel('forja', 50), { a: 100, b: 15 }, plano, false)).toEqual({ inventario: plano.inventario, ouroGasto: 900 });
    expect(descontoDaForja(undefined, { a: 100 }, plano)).toEqual({ inventario: plano.inventario, ouroGasto: 1000 });
    expect(itensGastos({ x: 5, y: 2 }, { x: 1 })).toBe(6);
  });

  it('leitura tolerante do banco', () => {
    expect(maestriasDoDocumento(null)).toBeUndefined();
    expect(
      maestriasDoDocumento({ 'arma:katana': { xp: 120.7, dia: DIA, hoje: 999 }, chefes: { xp: -1 }, 'monstro:feras': { xp: 50 }, xyz: { xp: 5 }, forja: { xp: XP_TOTAL + 10, dia: 'ontem' } })
    ).toEqual({ 'arma:katana': { xp: 120, dia: DIA, hoje: TETO_DIARIO_DE_XP }, forja: { xp: XP_TOTAL } });
  });

  it('texto do bônus atual na tela', () => {
    expect(textoDoBonusDaTrilha('arma:katana', 15)).toBe('+3% de dano · +1% de crítico');
    expect(textoDoBonusDaTrilha('forja', 3)).toBe('−0,6% de ouro · −0% de materiais');
    expect(textoDoBonusDaTrilha('expedicao', 50)).toBe('−10% no tempo · +5 material comum · +1 vaga');
    expect(textoDoBonusDaTrilha('monstro:feras', 10)).toBe('Em breve.');
  });
});
