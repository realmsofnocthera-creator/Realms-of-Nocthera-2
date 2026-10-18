import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HudMenu } from '@/components/hud/HudMenu';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const html = () => renderToStaticMarkup(<HudMenu onNavigatePersonagem={() => undefined} onNavigateCombate={() => undefined} />);

/** O trecho do botão que contém o rótulo: do "<button" anterior até o "</button>" seguinte. */
function botaoDe(markup: string, rotulo: string): string {
  const i = markup.indexOf(rotulo);
  const inicio = markup.lastIndexOf('<button', i);
  return markup.slice(inicio, markup.indexOf('</button>', i));
}

describe('Menu do Hub: História (Campanha)', () => {
  it('o botão História está ligado; Guilda continua em breve', () => {
    const m = html();
    expect(botaoDe(m, 'História')).not.toContain('disabled');
    expect(botaoDe(m, 'Guilda')).toContain('disabled');
  });
});
