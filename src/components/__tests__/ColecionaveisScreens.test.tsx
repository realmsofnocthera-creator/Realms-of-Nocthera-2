import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BuscaScreen } from '@/components/colecionaveis/BuscaScreen';
import { ColecaoScreen, contagemDoQuadro } from '@/components/colecao/ColecaoScreen';
import { arteDoColecionavel } from '@/assets/colecionaveis';
import { COLECIONAVEIS } from '@/rules/colecionaveis';
import type { CharacterDocument } from '@/server/characterService';

describe('Telas do Buscar e da Coleção', () => {
  it('Buscar abre com a explicação da roleta e o aviso de carregamento', () => {
    const html = renderToStaticMarkup(<BuscaScreen tokenFresco={async () => 't'} />);
    expect(html).toContain('Buscar');
    expect(html).toContain('gasta 10 selos');
    expect(html).toContain('Carregando...');
    expect(html).toContain('href="/menu"');
  });

  it('Coleção abre no hub, com um quadro para cada parte e quantos o jogador tem', () => {
    const html = renderToStaticMarkup(<ColecaoScreen personagem={{ nome: 'Aragorn', nivel: 25 } as CharacterDocument} tokenFresco={async () => 't'} />);
    for (const nome of ['Relíquias Icônicas', 'Sonatas', 'Ecos e Entidades', 'Memórias', 'Cartas da Alma']) expect(html).toContain(nome);
    expect(html).toContain('aria-label="Sonatas: 0 de 30"');
    expect(html).toContain('href="/menu"');
    expect(html).toContain('href="/buscar"');
  });

  it('contagem do quadro: colecionáveis ativados da categoria e cartas descobertas', () => {
    const p = { colecionaveis: { 'RI-C01': { nivel: 1 }, 'RI-C02': { nivel: 0 }, 'SO-C01': { nivel: 3 } }, cartasDescobertas: ['a', 'b'] } as unknown as CharacterDocument;
    expect(contagemDoQuadro(p, 'reliquias')).toEqual({ tenho: 1, total: 30 });
    expect(contagemDoQuadro(p, 'sonatas').tenho).toBe(1);
    expect(contagemDoQuadro(p, 'memorias').tenho).toBe(0);
    expect(contagemDoQuadro(p, 'alma').tenho).toBe(2);
  });

  it('artes dos colecionáveis: as 30 Relíquias têm arte e cada código do catálogo existe', () => {
    const reliquias = COLECIONAVEIS.filter((c) => c.categoria === 'reliquias');
    expect(reliquias).toHaveLength(30);
    for (const c of reliquias) expect(arteDoColecionavel(c.id), c.id).toBeTruthy();
    expect(arteDoColecionavel('XX-C01')).toBeUndefined();
  });
});
