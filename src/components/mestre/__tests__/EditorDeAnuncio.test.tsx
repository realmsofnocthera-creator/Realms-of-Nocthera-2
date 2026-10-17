import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EditorDeAnuncio } from '@/components/mestre/EditorDeAnuncio';
import { AnunciosScreen } from '@/components/anuncios/AnunciosScreen';
import { anuncioEmBranco } from '@/rules/anuncio';

describe('Anúncios (renderização)', () => {
  it('editor: campos, tipos e janela; sem botão de salvar na leitura', () => {
    const inicial = { ...anuncioEmBranco('Aviso de teste'), ativo: true };
    const edita = renderToStaticMarkup(<EditorDeAnuncio inicial={inicial} podeEditar salvar={async () => null} />);
    expect(edita).toContain('Dados do anúncio');
    expect(edita).toContain('Manutenção');
    expect(edita).toContain('Aparece a partir de');
    expect(edita).toContain('Salvar rascunho');
    const le = renderToStaticMarkup(<EditorDeAnuncio inicial={inicial} podeEditar={false} salvar={async () => null} />);
    expect(le).not.toContain('Salvar rascunho');
    expect(le).toContain('disabled');
  });

  it('tela do jogador: título, voltar ao Menu e estado de carregamento', () => {
    const html = renderToStaticMarkup(<AnunciosScreen tokenFresco={async () => 'x'} />);
    expect(html).toContain('Anúncios');
    expect(html).toContain('Voltar ao Menu');
    expect(html).toContain('Carregando');
  });
});
