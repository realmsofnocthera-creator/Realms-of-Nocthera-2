import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VerificacaoDoMapa } from '@/components/mestre/ConteudoPainel';

describe('VerificacaoDoMapa (renderização)', () => {
  it('explica o que confere e a diferença entre erro e aviso, com o botão de verificar de novo', () => {
    const html = renderToStaticMarkup(<VerificacaoDoMapa base="/api/mestre/conteudo/mapa/vila" tokenFresco={async () => 'x'} />);
    expect(html).toContain('Verificar o mapa antes de publicar');
    expect(html).toContain('impedem a publicação');
    expect(html).toContain('só informam');
    expect(html).toContain('Verificar de novo');
  });
});
