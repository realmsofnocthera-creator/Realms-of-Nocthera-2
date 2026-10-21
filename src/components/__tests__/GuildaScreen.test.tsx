import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GuildaScreen } from '@/components/guilda/GuildaScreen';

vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

describe('Tela da Guilda (7.3)', () => {
  it('abre com o título, a volta ao Hub e o aviso de carregamento', () => {
    const html = renderToStaticMarkup(<GuildaScreen tokenFresco={async () => 't'} />);
    expect(html).toContain('Guilda');
    expect(html).toContain('href="/hud"');
    expect(html).toContain('Carregando...');
  });
});
