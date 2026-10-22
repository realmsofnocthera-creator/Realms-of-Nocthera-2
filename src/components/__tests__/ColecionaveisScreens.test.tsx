import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BuscaScreen } from '@/components/colecionaveis/BuscaScreen';
import { ColecaoScreen } from '@/components/colecao/ColecaoScreen';
import type { CharacterDocument } from '@/server/characterService';

describe('Telas do Buscar e da Coleção', () => {
  it('Buscar abre com a explicação da roleta e o aviso de carregamento', () => {
    const html = renderToStaticMarkup(<BuscaScreen tokenFresco={async () => 't'} />);
    expect(html).toContain('Buscar');
    expect(html).toContain('gasta 10 selos');
    expect(html).toContain('Carregando...');
    expect(html).toContain('href="/menu"');
  });

  it('Coleção abre na aba Colecionáveis, com a aba das cartas da Alma ao lado', () => {
    const html = renderToStaticMarkup(<ColecaoScreen personagem={{ nome: 'Aragorn', nivel: 25 } as CharacterDocument} tokenFresco={async () => 't'} />);
    expect(html).toContain('Colecionáveis');
    expect(html).toContain('Cartas da Alma');
    expect(html).toMatch(/aria-selected="true"[^>]*>Colecionáveis/);
    expect(html).toContain('Carregando...');
  });
});
