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
  it('cada recompensa é de um nível que existe, com id único; os 10 níveis com benefício de aparência têm o que mostrar', () => {
    expect(new Set(tabela.map((x) => x.id)).size).toBe(tabela.length);
    for (const x of tabela) expect(x.nivel).toBeGreaterThanOrEqual(1);
    for (const x of tabela) expect(x.nivel).toBeLessThanOrEqual(NIVEIS_DO_VIP.length - 1);
    expect(recompensasDoNivel(10).map((x) => x.tipo).sort()).toEqual(['efeito', 'moldura', 'skin', 'titulo']);
    expect(recompensasDoNivel(0)).toEqual([]);
  });

  it('as 16 já têm arte (pacote do Yuri): títulos e molduras se resgatam agora; skins, aura, emblema, decoração e efeitos esperam o inventário de cosméticos', () => {
    expect(tabela).toHaveLength(16);
    const entregaveis = tabela.filter(recompensaDisponivel);
    expect(entregaveis.map((x) => x.tipo).sort()).toEqual(['moldura', 'moldura', 'moldura', 'moldura', 'moldura', 'titulo', 'titulo', 'titulo']);
    expect(tabela.filter((x) => !recompensaDisponivel(x)).every((x) => x.arte === true)).toBe(true);
    expect(tabela.filter((x) => !recompensaDisponivel(x)).map((x) => x.tipo).sort()).toEqual(['aura', 'decoracao', 'efeito', 'efeito', 'emblema', 'skin', 'skin', 'skin']);
    // o título e a moldura de cada uma existem no jogo
    for (const x of entregaveis) {
      if ('titulo' in x.entrega!) expect(TITULOS.some((t) => t.id === (x.entrega as { titulo: string }).titulo)).toBe(true);
    }
  });

  it('a recompensa fica pronta só para quem tem o nível e ainda não resgatou', () => {
    const nivel2 = 3_000; // nível 2
    expect(nivelDoVip(nivel2)).toBe(2);
    const prontas = recompensasParaResgatar({ gastoReal: nivel2 });
    expect(prontas.map((x) => x.id).sort()).toEqual(['vip-1-moldura', 'vip-2-titulo']);
    expect(recompensasParaResgatar({ gastoReal: 1_000 }).map((x) => x.id)).toEqual(['vip-1-moldura']); // nível 1
    expect(recompensasParaResgatar({ gastoReal: 0 })).toEqual([]);
    expect(recompensasParaResgatar({ gastoReal: nivel2, vipResgatados: ['vip-2-titulo', 'vip-1-moldura'] })).toEqual([]);
  });

  it('o documento só guarda ids da tabela', () => {
    expect(resgatadosDoDocumento(['vip-1-moldura', 'vip-2-titulo', 'lixo', 5, 'vip-99-moldura'])).toEqual(['vip-1-moldura', 'vip-2-titulo']);
    expect(resgatadosDoDocumento(undefined)).toBeUndefined();
    expect(resgatadosDoDocumento([])).toBeUndefined();
  });
});
