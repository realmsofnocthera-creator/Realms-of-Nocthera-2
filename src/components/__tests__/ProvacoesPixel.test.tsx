import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { aberturasDoLivro, ProvacoesScreen, provacoesPorNivel, PROVACOES_POR_PAGINA } from '@/components/provacoes/ProvacoesScreen';
import { PROVACOES } from '@/rules/provacoes';
import { TEXTOS_DAS_PROVACOES as T } from '@/rules/textosDasProvacoes';
import { textoDaFicha } from '@/rules/textosDaFicha';
import { LIVRO_DAS_PROVACOES as L, CARTAS_DAS_PROVACOES } from '@/assets/provacoesLivroUi';
import type { CharacterDocument } from '@/server/characterService';

vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

const render = (nivel: number) => renderToStaticMarkup(<ProvacoesScreen personagem={{ nome: 'Yuri', nivel } as CharacterDocument} />);

describe('Provações em forma de livro', () => {
  it('as provações ficam em ordem de nível, do menor para o maior', () => {
    const ordem = provacoesPorNivel();
    expect(ordem).toHaveLength(PROVACOES.length);
    expect(ordem.map((p) => p.id)).toEqual(['cacada', 'torre-celestial', 'guerreiro', 'expedicao', 'chefe-mundial', 'batalha-sangrenta', 'teste-equipe']);
    expect(ordem.map((p) => p.nivelRequerido)).toEqual([...ordem.map((p) => p.nivelRequerido)].sort((a, b) => a - b));
    const html = render(30);
    const posicoes = ordem.map((p) => html.indexOf(`>${p.nome}</span>`));
    for (const pos of posicoes) expect(pos).toBeGreaterThan(-1);
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
  });

  it('cada página leva 2 provações: 7 provações viram 2 aberturas (4 e 3)', () => {
    expect(PROVACOES_POR_PAGINA).toBe(2);
    const aberturas = aberturasDoLivro(provacoesPorNivel());
    expect(aberturas).toHaveLength(2);
    expect(aberturas[0].esquerda.map((p) => p.id)).toEqual(['cacada', 'torre-celestial']);
    expect(aberturas[0].direita.map((p) => p.id)).toEqual(['guerreiro', 'expedicao']);
    expect(aberturas[1].esquerda.map((p) => p.id)).toEqual(['chefe-mundial', 'batalha-sangrenta']);
    expect(aberturas[1].direita.map((p) => p.id)).toEqual(['teste-equipe']);
    for (const a of aberturas) {
      expect(a.esquerda.length).toBeLessThanOrEqual(2);
      expect(a.direita.length).toBeLessThanOrEqual(2);
    }
    expect(aberturasDoLivro([])).toEqual([]);
  });

  it('mostra o título, o voltar ao Hub, o jogador, a mesa de fundo e o livro parado', () => {
    const html = render(14);
    expect(html).toContain(T.titulo);
    expect(html).toContain('href="/hub"');
    expect(html).toContain(`aria-label="${T.voltar}"`);
    expect(html).toContain(textoDaFicha(T.jogador, { nome: 'Yuri', nivel: 14 }));
    expect(html).toContain(L.mesa);
    expect(html).toContain(L.livro);
    expect(html).toContain(`aria-label="${T.livro}"`);
  });

  it('só a abertura atual aparece: a outra fica no documento, escondida, com as imagens já carregadas', () => {
    const html = render(30);
    expect(html.match(/hidden=""/g)).toHaveLength(1); // a abertura 2
    for (const c of Object.values(CARTAS_DAS_PROVACOES)) expect(html).toContain(c.src);
  });

  it('cada provação aberta é um link para a própria tela; as que faltam nível não são', () => {
    const html = render(14);
    for (const href of ['/cacada', '/torre-celestial', '/guerreiro']) expect(html).toContain(`href="${href}"`);
    for (const href of ['/expedicao', '/chefe-mundial', '/batalha-sangrenta', '/teste-equipe']) expect(html).not.toContain(`href="${href}"`);
    const tudo = render(25);
    for (const href of ['/cacada', '/torre-celestial', '/guerreiro', '/expedicao', '/chefe-mundial', '/batalha-sangrenta', '/teste-equipe']) expect(tudo).toContain(`href="${href}"`);
  });

  it('a provação bloqueada mostra o cadeado, o nível que pede e o rótulo de leitor de tela de antes', () => {
    const html = render(14);
    expect(html).toContain('Expedição - Requer Nível 15');
    expect(html).toContain(textoDaFicha(T.abreNoNivel, { n: 15 }));
    expect(html).toContain('aria-label="Nível 15"');
    expect(render(15)).toContain('aria-label="Expedição - Nível 15"');
  });

  it('só a próxima a abrir ganha a fita "Próxima", com quantos níveis faltam', () => {
    const html = render(14);
    const fita = new RegExp(`${T.proxima} · `, 'g'); // a fita; "Próxima página" é o botão do livro
    expect(html.match(fita)).toHaveLength(1);
    expect(html).toContain(T.falta);
    expect(render(10)).toContain(textoDaFicha(T.faltam, { n: 2 })); // a próxima é a do nível 12
    expect(render(30).match(fita)).toBeNull();
  });

  it('tem os botões de página (a anterior apagada na primeira) e o número da página', () => {
    const html = render(14);
    expect(html).toContain(`aria-label="${T.paginaAnterior}"`);
    expect(html).toContain(`aria-label="${T.paginaSeguinte}"`);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Página anterior"|<button[^>]*aria-label="Página anterior"[^>]*disabled=""/);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*aria-label="Próxima página"|<button[^>]*aria-label="Próxima página"[^>]*disabled=""/);
    expect(html).toContain(`aria-label="${textoDaFicha(T.paginaDe, { n: 1, total: 2 })}"`);
    expect(html).toContain(textoDaFicha(T.paginaCurta, { n: 1, total: 2 }));
  });
});
