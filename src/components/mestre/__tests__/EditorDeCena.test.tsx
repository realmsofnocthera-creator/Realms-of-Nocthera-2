import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EditorDeCena } from '@/components/mestre/EditorDeCena';
import { CenaPlayer } from '@/components/cena/CenaPlayer';
import type { CenaDados } from '@/rules/cena';

const img = (c: string, ext = 'png') => `https://pub.exemplo.test/cenas/${c.repeat(64)}.${ext}`;
const cena: CenaDados = {
  formato: 1,
  titulo: 'Abertura',
  personagens: [{ id: 'chefe', nome: 'Comandante', retrato: img('a', 'webp'), voz: 'masculina-grave' }],
  telas: [
    { tipo: 'narracao', texto: 'O mundo está em guerra.', fundo: img('b', 'jpg') },
    { tipo: 'fala', personagem: 'chefe', texto: 'Bem-vindo.' },
  ],
};

describe('Cenas (renderização)', () => {
  it('editor: personagens, telas, fotos e botões; sem salvar na leitura', () => {
    const edita = renderToStaticMarkup(<EditorDeCena inicial={cena} podeEditar salvar={async () => null} enviarImagem={async () => ''} />);
    expect(edita).toContain('Personagens que falam');
    expect(edita).toContain('Comandante');
    expect(edita).toContain('Trocar foto');
    expect(edita).toContain('Novo fundo');
    expect(edita).toContain('Fala: Jogador');
    expect(edita).toContain('Salvar rascunho');
    expect(edita).toContain('Ver a cena');
    expect(edita).toContain('Vozes (bipes');
    expect(edita).toContain('Masculina grave');
    expect(edita).toContain('Ouvir: Voz de Comandante');
    const le = renderToStaticMarkup(<EditorDeCena inicial={cena} podeEditar={false} salvar={async () => null} enviarImagem={async () => ''} />);
    expect(le).not.toContain('Salvar rascunho');
    expect(le).not.toContain('+ Tela');
  });

  it('player: narração mostra o fundo e o texto, sem retrato nem nome', () => {
    const html = renderToStaticMarkup(<CenaPlayer cena={cena} jogador={{ nome: 'Yuri' }} aoTerminar={() => {}} />);
    expect(html).toContain('O mundo está em guerra.');
    expect(html).toContain('data-testid="cena-fundo"');
    expect(html).not.toContain('cena-retrato');
    expect(html).not.toContain('cena-nome');
    expect(html).toContain('Pular');
  });

  it('player: a fala mostra o nome e o retrato de quem fala acima da caixa', () => {
    const html = renderToStaticMarkup(<CenaPlayer cena={{ ...cena, telas: [cena.telas[1]] }} jogador={{ nome: 'Yuri' }} aoTerminar={() => {}} />);
    expect(html).toContain('Comandante');
    expect(html.indexOf('cena-retrato')).toBeGreaterThan(-1);
    expect(html.indexOf('cena-retrato')).toBeLessThan(html.indexOf('cena-texto'));
    expect(html).toContain('Toque para ver tudo');
  });
});
