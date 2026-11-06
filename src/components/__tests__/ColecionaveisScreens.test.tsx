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

  it('artes das Memórias: as 30 têm arte própria e cada uma é diferente', () => {
    const memorias = COLECIONAVEIS.filter((c) => c.categoria === 'memorias');
    expect(memorias).toHaveLength(30);
    for (const c of memorias) expect(arteDoColecionavel(c.id), c.id).toBeTruthy();
    expect(new Set(memorias.map((c) => arteDoColecionavel(c.id))).size).toBe(30);
  });

  it('artes das Sonatas: uma por raridade, igual para todas da mesma raridade', () => {
    const sonatas = COLECIONAVEIS.filter((c) => c.categoria === 'sonatas');
    expect(sonatas).toHaveLength(30);
    for (const c of sonatas) expect(arteDoColecionavel(c.id), c.id).toBeTruthy();
    expect(arteDoColecionavel('SO-C01')).toBe(arteDoColecionavel('SO-C15'));
    expect(new Set(['SO-C01', 'SO-MR01', 'SO-L01', 'SO-M01'].map(arteDoColecionavel)).size).toBe(4);
    // as outras categorias continuam sem arte até o Yuri mandar
    expect(arteDoColecionavel('EE-L01')).toBeUndefined();
  });
});
