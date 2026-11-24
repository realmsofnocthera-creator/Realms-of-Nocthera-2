import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NovoMapaDeImagem } from '@/components/mestre/NovoMapaDeImagem';

describe('Novo mapa a partir de uma imagem (renderização)', () => {
  it('mostra o aviso dos limites e o seletor da imagem; o formulário só aparece depois de escolher a imagem', () => {
    const html = renderToStaticMarkup(<NovoMapaDeImagem tokenFresco={async () => 't'} criado={() => {}} />);
    expect(html).toContain('Novo mapa a partir de uma imagem');
    expect(html).toContain('Escolher a imagem');
    expect(html).toContain('8192 px de lado');
    expect(html).toContain('24 MB');
    expect(html).toContain('você mesmo pinta a colisão');
    expect(html).toContain('accept="image/*"');
    expect(html).not.toContain('Tile da colisão');
    expect(html).not.toContain('Criar o mapa');
  });
});
