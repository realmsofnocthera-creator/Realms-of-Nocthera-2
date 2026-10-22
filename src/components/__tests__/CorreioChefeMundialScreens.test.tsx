import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChefeMundialScreen } from '@/components/chefeMundial/ChefeMundialScreen';
import { CorreioScreen } from '@/components/correio/CorreioScreen';
import { ProvacoesScreen } from '@/components/provacoes/ProvacoesScreen';
import type { CharacterDocument } from '@/server/characterService';

describe('Correio e Chefe Mundial: telas', () => {
  it('Correio abre com a explicação e o aviso de carregamento', () => {
    const html = renderToStaticMarkup(<CorreioScreen tokenFresco={async () => 't'} />);
    expect(html).toContain('Correio');
    expect(html).toContain('30 dias');
    expect(html).toContain('Carregando...');
  });

  it('Chefe Mundial abre com a explicação, a volta às Provações e o link do Correio', () => {
    const html = renderToStaticMarkup(<ChefeMundialScreen tokenFresco={async () => 't'} />);
    expect(html).toContain('Chefe Mundial');
    expect(html).toContain('href="/provacoes"');
    expect(html).toContain('href="/correio"');
  });

  it('nas Provações, o Chefe Mundial leva à tela dele a partir do nível 18', () => {
    expect(renderToStaticMarkup(<ProvacoesScreen personagem={{ nome: 'Aragorn', nivel: 18 } as CharacterDocument} />)).toContain('href="/chefe-mundial"');
    expect(renderToStaticMarkup(<ProvacoesScreen personagem={{ nome: 'Aragorn', nivel: 17 } as CharacterDocument} />)).not.toContain('href="/chefe-mundial"');
  });
});
