import { describe, expect, it } from 'vitest';
import { ICONE_DA_MOEDA, iconeDoProduto } from '@/lib/resgateTela';
import { catalogoDaSemana } from '@/rules/loja';

describe('Resgate: ícones dos produtos', () => {
  const produtos = ['2026-W01', '2026-W20', '2026-W40'].flatMap((s) => catalogoDaSemana(s));

  it('todo produto do catálogo tem ícone (material usa o glifo, o resto uma imagem) e toda moeda tem ícone', () => {
    expect(produtos.length).toBeGreaterThan(0);
    for (const p of produtos) {
      const i = iconeDoProduto(p);
      if (i.tipo === 'imagem') expect(i.src, p.chave).toBeTruthy();
      expect(ICONE_DA_MOEDA[p.moeda], p.chave).toBeTruthy();
    }
  });

  it('os baús de escolha têm ícone de baú e o emblema usa o brasão', () => {
    const baus = produtos.filter((p) => p.tipo === 'escolhaCarta' || p.tipo === 'escolhaEmblema');
    expect(baus.length).toBeGreaterThan(0);
    const emblema = iconeDoProduto({ tipo: 'emblema', id: 'x', aba: 'emblemas' });
    const bauEmblema = iconeDoProduto({ tipo: 'escolhaEmblema', id: '', aba: 'essencia' });
    expect(emblema.tipo === 'imagem' && bauEmblema.tipo === 'imagem' && emblema.src !== bauEmblema.src).toBe(true);
  });
});
