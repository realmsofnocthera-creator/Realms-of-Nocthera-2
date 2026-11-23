import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LojaPagaScreen } from '@/components/lojaPaga/LojaPagaScreen';
import { CONJUNTOS, ITENS_COSMETICOS } from '@/rules/lojaPaga';

describe('Loja Premium (vitrine)', () => {
  const html = renderToStaticMarkup(<LojaPagaScreen nome="Yuri" diamantes={1250} />);

  it('mostra as cinco seções, os preços novos e o saldo', () => {
    for (const s of ['Diamantes', 'Pacotes', 'Passes', 'Cosméticos', 'Conjuntos']) expect(html).toContain(`>${s}<`);
    for (const preco of ['R$&nbsp;14,99', 'R$&nbsp;9,99', 'R$&nbsp;79,90', 'R$&nbsp;149,99', 'R$&nbsp;77,99', 'R$&nbsp;28,99', 'R$&nbsp;99,99', 'R$&nbsp;59,99']) expect(html.replace(/ /g, '&nbsp;')).toContain(preco);
    expect(html).toContain('Passe do Iniciante');
    expect(html).toContain('Expansão da Mochila');
    expect(html).toContain('1.250');
  });

  it('todos os cosméticos e conjuntos aparecem, e nenhum botão de compra está ligado (só vitrine)', () => {
    for (const i of ITENS_COSMETICOS) expect(html).toContain(`aria-label="${i.nome.replace(/&/g, '&amp;')}, `);
    for (const c of CONJUNTOS) expect(html).toContain(c.nome);
    expect((html.match(/Em breve/g) ?? []).length).toBeGreaterThan(40);
    expect(html).not.toMatch(/<button type="button"(?![^>]*disabled)[^>]*>\s*<span[^>]*>R\$/);
  });
});
