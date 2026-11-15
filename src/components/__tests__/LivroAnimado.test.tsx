import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LivroAnimado, posicaoDoQuadro, sequenciaDeQuadros } from '@/components/provacoes/LivroAnimado';
import { LIVRO_DAS_PROVACOES as L } from '@/assets/provacoesLivroUi';

describe('Livro animado (virada de página)', () => {
  it('para frente toca os quadros em ordem; para trás, os mesmos ao contrário', () => {
    expect(sequenciaDeQuadros(1)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(sequenciaDeQuadros(-1)).toEqual([7, 6, 5, 4, 3, 2, 1, 0]);
    expect(sequenciaDeQuadros(1, 3)).toEqual([0, 1, 2]);
    expect(sequenciaDeQuadros(1)).toHaveLength(L.quadros);
  });

  it('acha cada quadro na folha (grade de 4 colunas por 2 linhas), em % para o background-position', () => {
    expect(L.colunas * L.linhas).toBe(L.quadros);
    expect(posicaoDoQuadro(0)).toEqual({ x: 0, y: 0 });
    expect(posicaoDoQuadro(3)).toEqual({ x: 100, y: 0 });
    expect(posicaoDoQuadro(4)).toEqual({ x: 0, y: 100 });
    expect(posicaoDoQuadro(7)).toEqual({ x: 100, y: 100 });
    const x = posicaoDoQuadro(1).x;
    expect(x).toBeCloseTo(100 / 3, 5);
    expect(posicaoDoQuadro(0, 1, 1)).toEqual({ x: 0, y: 0 });
  });

  it('parado mostra só o livro e a primeira abertura; a folha da virada não aparece até virar a página', () => {
    const html = renderToStaticMarkup(
      <LivroAnimado
        rotulo="Livro"
        aberturas={[
          { esquerda: <b>E1</b>, direita: <b>D1</b> },
          { esquerda: <b>E2</b>, direita: <b>D2</b> },
        ]}
      />
    );
    expect(html).toContain(L.livro);
    expect(html).not.toContain(L.virada);
    expect(html).toContain('E1');
    expect(html).toContain('D2'); // a segunda abertura fica no documento, escondida
    expect(html.match(/hidden=""/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Página 1 de 2"');
  });

  it('com uma abertura só, nenhum botão de página fica ligado', () => {
    const html = renderToStaticMarkup(<LivroAnimado rotulo="Livro" aberturas={[{ esquerda: <i>a</i>, direita: <i>b</i> }]} />);
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Página 1 de 1"');
  });

  it('o tempo de cada quadro segue a referência (70 ms) e a virada inteira fica abaixo de um segundo', () => {
    expect(L.msPorQuadro).toBe(70);
    expect(L.quadros * L.msPorQuadro).toBeLessThan(1000);
  });
});
