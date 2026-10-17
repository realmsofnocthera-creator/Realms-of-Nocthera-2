import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JogarMapa } from '@/components/mestre/JogarMapa';

describe('JogarMapa (renderização)', () => {
  it('mostra o cabeçalho com o aviso de teste, o direcional, o botão de interagir e o registro', () => {
    const html = renderToStaticMarkup(<JogarMapa id="vila" tokenFresco={async () => 'x'} />);
    expect(html).toContain('Jogar: vila');
    expect(html).toContain('nada é gravado');
    for (const nome of ['Andar para cima', 'Andar para baixo', 'Andar para a esquerda', 'Andar para a direita', 'Interagir', 'Recomeçar']) expect(html).toContain(`aria-label="${nome}"`);
    expect(html).toContain('Registro do teste');
    expect(html).toContain('Abrindo o mapa');
    expect(html).toContain('/mestre/mapas/vila');
  });
});
