import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProvacoesScreen, provacoesPorNivel } from '@/components/provacoes/ProvacoesScreen';
import { PROVACOES } from '@/rules/provacoes';
import { TEXTOS_DAS_PROVACOES as T } from '@/rules/textosDasProvacoes';
import { textoDaFicha } from '@/rules/textosDaFicha';
import { FICHA_UI } from '@/assets/personagemUi';
import type { CharacterDocument } from '@/server/characterService';

vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

const render = (nivel: number) => renderToStaticMarkup(<ProvacoesScreen personagem={{ nome: 'Yuri', nivel } as CharacterDocument} />);

describe('Provações (pixel, em ordem de nível)', () => {
  it('as 7 provações aparecem em ordem de nível, do menor para o maior', () => {
    const ordem = provacoesPorNivel();
    expect(ordem).toHaveLength(PROVACOES.length);
    expect(ordem.map((p) => p.nivelRequerido)).toEqual([...ordem.map((p) => p.nivelRequerido)].sort((a, b) => a - b));
    expect(ordem.map((p) => p.id)).toEqual(['cacada', 'torre-celestial', 'guerreiro', 'expedicao', 'chefe-mundial', 'batalha-sangrenta', 'teste-equipe']);
    const html = render(30);
    const posicoes = ordem.map((p) => html.indexOf(`>${p.nome}</span>`));
    for (const pos of posicoes) expect(pos).toBeGreaterThan(-1);
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
  });

  it('mostra o título, o voltar ao Hub, o jogador e o fundo das ruínas', () => {
    const html = render(14);
    expect(html).toContain(T.titulo);
    expect(html).toContain('href="/hub"');
    expect(html).toContain(`aria-label="${T.voltar}"`);
    expect(html).toContain(textoDaFicha(T.jogador, { nome: 'Yuri', nivel: 14 }));
    expect(html).toContain(FICHA_UI.fundo);
    expect(html).toContain(`aria-label="${T.lista}"`);
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

  it('só a próxima a abrir ganha a faixa "Próxima", com quantos níveis faltam', () => {
    const html = render(14);
    expect(html.match(new RegExp(T.proxima, 'g'))).toHaveLength(1);
    expect(html).toContain(T.falta);
    expect(render(10)).toContain(textoDaFicha(T.faltam, { n: 2 })); // a próxima é a do nível 12
    expect(render(30)).not.toContain(T.proxima);
  });
});
