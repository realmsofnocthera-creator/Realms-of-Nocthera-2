import { afterEach, describe, expect, it } from 'vitest';
import { formatarPontosVip, NIVEIS_DO_VIP, nivelDoVip, pontosDoVip } from '@/rules/vip';
import { RECOMPENSAS_DO_VIP, recompensaDisponivel, recompensasDoNivel, recompensasParaResgatar, resgatadosDoDocumento, type RecompensaDoVip } from '@/rules/vipRecompensas';
import { TITULOS } from '@/rules/titulos';

describe('pontos VIP', () => {
  it('1 ponto = R$ 1 gasto (centavos quebrados caem para baixo)', () => {
    expect(pontosDoVip(0)).toBe(0);
    expect(pontosDoVip(99)).toBe(0);
    expect(pontosDoVip(100)).toBe(1);
    expect(pontosDoVip(1_999)).toBe(19);
    expect(pontosDoVip(300_000)).toBe(3000);
    expect(pontosDoVip(undefined)).toBe(0);
    expect(pontosDoVip(-5)).toBe(0);
    expect(formatarPontosVip(1)).toBe('1 ponto VIP');
    expect(formatarPontosVip(1250)).toMatch(/^1\.250 pontos VIP$/);
  });
});

describe('recompensas do VIP', () => {
  const tabela = RECOMPENSAS_DO_VIP as RecompensaDoVip[];
  const tamanho = tabela.length;
  afterEach(() => { tabela.length = tamanho; for (const x of tabela) delete x.entrega; });

  it('cada recompensa é de um nível que existe, com id único; os 10 níveis com benefício de aparência têm o que mostrar', () => {
    expect(new Set(tabela.map((x) => x.id)).size).toBe(tabela.length);
    for (const x of tabela) expect(x.nivel).toBeGreaterThanOrEqual(1);
    for (const x of tabela) expect(x.nivel).toBeLessThanOrEqual(NIVEIS_DO_VIP.length - 1);
    expect(recompensasDoNivel(10).map((x) => x.tipo).sort()).toEqual(['efeito', 'moldura', 'skin', 'titulo']);
    expect(recompensasDoNivel(0)).toEqual([]);
  });

  it('hoje nenhuma está pronta para resgatar (as artes ainda estão em produção)', () => {
    expect(tabela.some(recompensaDisponivel)).toBe(false);
    expect(recompensasParaResgatar({ gastoReal: 300_000 })).toEqual([]);
  });

  it('quando o título existe no jogo, a recompensa fica pronta só para quem tem o nível e ainda não resgatou', () => {
    tabela.find((x) => x.id === 'vip-2-titulo')!.entrega = { titulo: TITULOS[0].id };
    const nivel2 = 3_000; // nível 2
    expect(nivelDoVip(nivel2)).toBe(2);
    const prontas = recompensasParaResgatar({ gastoReal: nivel2 }).filter((x) => x.entrega);
    expect(prontas.map((x) => x.entrega!.titulo)).toEqual([TITULOS[0].id]);
    expect(recompensasParaResgatar({ gastoReal: 1_000 }).filter((x) => x.entrega)).toEqual([]); // nível 1: ainda não
    expect(recompensasParaResgatar({ gastoReal: nivel2, vipResgatados: ['vip-2-titulo'] }).filter((x) => x.entrega)).toEqual([]);
  });

  it('o documento só guarda ids da tabela', () => {
    expect(resgatadosDoDocumento(['vip-1-moldura', 'vip-2-titulo', 'lixo', 5, 'vip-99-moldura'])).toEqual(['vip-1-moldura', 'vip-2-titulo']);
    expect(resgatadosDoDocumento(undefined)).toBeUndefined();
    expect(resgatadosDoDocumento([])).toBeUndefined();
  });
});
