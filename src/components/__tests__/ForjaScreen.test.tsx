import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FerreiroScreen } from '@/components/forja/FerreiroScreen';
import { ForjaScreen } from '@/components/forja/ForjaScreen';
import type { CharacterDocument } from '@/server/characterService';

vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

const personagem = { uid: 'u', nome: 'Yuri', nivel: 12, ouro: 1500, inventario: {}, armas: [] } as unknown as CharacterDocument;

describe('Ferreiro e Forja', () => {
  it('o Ferreiro tem 3 opções; só Fabricar equipamentos leva à Forja', () => {
    const html = renderToStaticMarkup(<FerreiroScreen character={personagem} />);
    expect(html).toContain('Fabricar equipamentos');
    expect(html).toContain('Melhorar armadura');
    expect(html).toContain('Fabricar cosméticos');
    expect(html).toContain('href="/forja"');
    expect(html.match(/aria-disabled="true"/g)).toHaveLength(2);
  });

  it('a Forja abre na árvore das Espadas grandes, na 1★, com as abas e as 6 categorias', () => {
    const html = renderToStaticMarkup(<ForjaScreen character={personagem} onCharacterChange={() => {}} tokenFresco={async () => 't'} />);
    expect(html).toContain('Árvore de armas');
    expect(html).toContain('Lista de forja (0)');
    for (const c of ['Espada grande', 'Katana', 'Lança', 'Espada e escudo', 'Grimório', 'Cajado']) expect(html).toContain(c);
    expect(html).toContain('Árvore de Rato da Floresta');
    expect(html).toContain('Rato das Cinzas');
    expect(html).toContain('Ferro de Caçada, Comum. Falta material ou ouro');
    expect(html).not.toContain('Árvore de Grizzharn');
    expect(html).not.toContain('role="dialog"');
  });
});
