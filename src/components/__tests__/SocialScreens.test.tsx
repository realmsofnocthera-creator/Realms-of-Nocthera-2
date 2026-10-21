import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RankingScreen } from '@/components/social/RankingScreen';
import { BuscarScreen } from '@/components/social/BuscarScreen';

vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

describe('Telas sociais (7.1)', () => {
  it('Ranking abre com as quatro abas, a explicação e o aviso de carregamento', () => {
    const html = renderToStaticMarkup(<RankingScreen tokenFresco={async () => 't'} />);
    for (const aba of ['Nível', 'Torre Celestial', 'Batalha Sangrenta', 'Guerreiro']) expect(html).toContain(aba);
    expect(html).toContain('Carregando...');
    expect(html).toContain('href="/menu"');
  });

  it('Buscar abre com o campo de nome e o botão desligado até haver 2 letras', () => {
    const html = renderToStaticMarkup(<BuscarScreen tokenFresco={async () => 't'} />);
    expect(html).toContain('aria-label="Nome do jogador"');
    const i = html.indexOf('type="submit"');
    expect(html.slice(html.lastIndexOf('<button', i), html.indexOf('>', i))).toContain('disabled');
  });
});
