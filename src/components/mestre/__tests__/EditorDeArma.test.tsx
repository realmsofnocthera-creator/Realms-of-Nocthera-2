import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EditorDeArma } from '@/components/mestre/EditorDeArma';
import { armaDadosDeBase } from '@/rules/armaConteudo';
import { ARMAS_BASE_MAP } from '@/rules/armasCatalogo';

describe('EditorDeArma (renderização)', () => {
  const render = (podeEditar: boolean) =>
    renderToStaticMarkup(<EditorDeArma inicial={armaDadosDeBase(ARMAS_BASE_MAP['ferro-de-cacada'])} podeEditar={podeEditar} salvar={async () => null} />);

  it('mostra nomes das 6 categorias, receita e botão de salvar para quem edita', () => {
    const html = render(true);
    expect(html).toContain('Dados da arma');
    expect(html).toContain('Nome (Espada grande)');
    expect(html).toContain('Nome (Cajado)');
    expect(html).toContain('Ouro da receita');
    expect(html).toContain('Materiais do monstro');
    expect(html).toContain('pelo-de-rato');
    expect(html).toContain('Salvar rascunho');
  });

  it('somente leitura: sem salvar nem botões de material', () => {
    const html = render(false);
    expect(html).not.toContain('Salvar rascunho');
    expect(html).not.toContain('Tirar material');
    expect(html).toContain('disabled');
  });
});
