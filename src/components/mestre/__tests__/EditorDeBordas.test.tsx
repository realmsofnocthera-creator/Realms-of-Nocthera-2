import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EditorDeBordas } from '@/components/mestre/EditorDeBordas';
import { tilesetDeTeste } from '@/test/pngDeTeste';

const base = tilesetDeTeste();
const regra = { id: 'grama', nome: 'Grama', tiles: Array.from({ length: 16 }, (_, i) => i % 8) };

describe('Bordas automáticas no tileset (renderização)', () => {
  it('quem edita vê os terrenos, "+ Terreno", o nome e o salvar; a posição aparece descrita', () => {
    const html = renderToStaticMarkup(<EditorDeBordas dados={{ ...base, bordas: [regra] }} podeEditar salvar={async () => null} />);
    expect(html).toContain('Bordas automáticas');
    expect(html).toContain('Grama');
    expect(html).toContain('+ Terreno');
    expect(html).toContain('Posição 0: Sozinho');
    expect(html).toContain('Completar vazias com o miolo');
    expect(html).toContain('Salvar rascunho das bordas');
    expect(html).toContain('aria-label="Posições da regra"');
  });

  it('sem terrenos: convida a criar; só leitura não mostra botões de edição', () => {
    const vazio = renderToStaticMarkup(<EditorDeBordas dados={base} podeEditar salvar={async () => null} />);
    expect(vazio).toContain('Nenhum terreno ainda');
    const le = renderToStaticMarkup(<EditorDeBordas dados={{ ...base, bordas: [regra] }} podeEditar={false} salvar={async () => null} />);
    expect(le).not.toContain('+ Terreno');
    expect(le).not.toContain('Salvar rascunho das bordas');
    expect(le).not.toContain('Remover terreno');
  });
});
