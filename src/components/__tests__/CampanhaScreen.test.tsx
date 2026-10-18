import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CampanhaScreen } from '@/components/campanha/CampanhaScreen';

vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

describe('Tela da Campanha', () => {
  it('abre com o título, o aviso de carregamento, a volta ao hub e os controles desligados até o mundo abrir', () => {
    const html = renderToStaticMarkup(<CampanhaScreen tokenFresco={async () => 't'} />);
    expect(html).toContain('História');
    expect(html).toContain('Abrindo o mundo...');
    expect(html).toContain('href="/hud"');
    for (const nome of ['Andar para cima', 'Andar para baixo', 'Andar para a esquerda', 'Andar para a direita', 'Interagir']) {
      const i = html.indexOf(`aria-label="${nome}"`);
      expect(i, nome).toBeGreaterThan(-1);
      expect(html.slice(html.lastIndexOf('<button', i), html.indexOf('>', i))).toContain('disabled');
    }
  });
});
