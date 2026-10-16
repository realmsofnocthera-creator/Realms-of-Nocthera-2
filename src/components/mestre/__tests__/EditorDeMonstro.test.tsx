import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EditorDeMonstro } from '@/components/mestre/EditorDeMonstro';
import { MONSTROS_CACADA } from '@/rules/cacada';
import { monstroDadosDeDefinicao } from '@/rules/monstroConteudo';

describe('EditorDeMonstro (renderização)', () => {
  const render = (podeEditar: boolean, doCodigo: boolean, id = 'lobo-cinzento') =>
    renderToStaticMarkup(
      <EditorDeMonstro inicial={monstroDadosDeDefinicao(MONSTROS_CACADA.find((m) => m.id === id)!)} podeEditar={podeEditar} doCodigo={doCodigo} salvar={async () => null} />
    );

  it('mostra os campos do monstro e o botão de salvar para quem edita', () => {
    const html = render(true, true);
    expect(html).toContain('Dados do monstro');
    expect(html).toContain('Vida (HP)');
    expect(html).toContain('Categoria corporal');
    expect(html).toContain('Salvar rascunho');
    expect(html).toContain('substitui os números dele');
  });

  it('somente leitura: sem botão de salvar e campos desabilitados', () => {
    const html = render(false, false);
    expect(html).not.toContain('Salvar rascunho');
    expect(html).toContain('disabled');
    expect(html).toContain('Monstro novo');
  });

  it('só mostra fraquezas próprias para a categoria Aberrante', () => {
    const aberrante = MONSTROS_CACADA.find((m) => m.categoriaCorporal === 'aberrante');
    if (aberrante) expect(render(true, true, aberrante.id)).toContain('Fraco a (Aberrante)');
    expect(render(true, true)).not.toContain('Fraco a (Aberrante)');
  });
});
