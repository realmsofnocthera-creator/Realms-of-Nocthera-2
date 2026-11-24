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

describe('Loja Premium: as artes do Yuri nos pacotes', () => {
  const html = renderToStaticMarkup(<LojaPagaScreen nome="Yuri" diamantes={1250} gastoCentavos={0} />).replace(/ /g, ' ');

  it('todos os arquivos de arte existem em public', async () => {
    const { existsSync } = await import('node:fs');
    const { MOLDURA_DO_MENSAL, BANNER_DO_PASSE, ILUSTRACAO_DA_LOJA } = await import('@/assets/lojaPagaArte');
    for (const m of [...Object.values(MOLDURA_DO_MENSAL), ...Object.values(BANNER_DO_PASSE)]) expect(existsSync(`public${m.src}`), m.src).toBe(true);
    for (const src of [ILUSTRACAO_DA_LOJA.mochila, ILUSTRACAO_DA_LOJA.vagaDeExpedicao, ILUSTRACAO_DA_LOJA.iniciante, ...Object.values(ILUSTRACAO_DA_LOJA.diamantes)]) expect(existsSync(`public${src}`), src).toBe(true);
  });

  it('os 12 pacotes mensais e os 4 passes aparecem dentro das molduras, com nome, preço e itens', () => {
    for (const trecho of ['Coleção', 'Ouro', 'Expedição']) expect(html).toContain(`Pacote mensal · ${trecho}`);
    for (const t of ['R$ 4,99', 'R$ 29,99', 'R$ 59,99', 'R$ 99,99', '30.000 de ouro', '128 Avanços de expedição', '100 Selos da Origem']) expect(html).toContain(t);
    for (const t of ['Passe Premium', 'Passe Deluxe', 'Passe do Invocador', 'Passe de Diamantes', '+10% de XP', '20 Diamantes']) expect(html).toContain(t);
    expect((html.match(/role="group"/g) ?? []).length).toBe(12 + 4);
  });

  it('o pacote do iniciante lista o que leva, e a vaga e a mochila têm a arte e as regras', () => {
    for (const t of ['4.000 de ouro', '200 Diamantes', '1 baú de escolha de emblema épico', '+1 vaga de expedição', 'Até 5 vagas no total', '+20 espaços por pacote', '/images/loja/mochila.webp', '/images/loja/vaga-expedicao.webp', '/images/loja/iniciante.webp']) expect(html).toContain(t);
  });

  it('os diamantes 2 a 6 usam o monte de diamantes e o 1º só um diamante', () => {
    for (const n of [2, 3, 4, 5, 6]) expect(html).toContain(`/images/loja/diamantes-${n}.webp`);
    expect(html).not.toContain('/images/loja/diamantes-1.webp');
  });
});
