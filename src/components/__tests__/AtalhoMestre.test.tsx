import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));
vi.mock('@/lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({ onAuthStateChanged: vi.fn(() => () => {}) }));

import { AtalhoMestre, BotaoDoPainel } from '@/components/mestre/AtalhoMestre';

describe('Atalho do Painel do Mestre no menu', () => {
  it('o botão leva a /mestre', () => {
    const html = renderToStaticMarkup(<BotaoDoPainel />);
    expect(html).toContain('href="/mestre"');
    expect(html).toContain('Painel do Mestre');
  });

  it('começa escondido: só aparece depois que o servidor confirmar o papel', () => {
    expect(renderToStaticMarkup(<AtalhoMestre />)).toBe('');
  });
});
