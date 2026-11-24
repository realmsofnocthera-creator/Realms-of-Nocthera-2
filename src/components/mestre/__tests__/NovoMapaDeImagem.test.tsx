import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NovoMapaDeImagem } from '@/components/mestre/NovoMapaDeImagem';

describe('Novo mapa a partir de uma imagem (renderização)', () => {
  it('mostra o aviso dos limites e o seletor da imagem; o formulário só aparece depois de escolher a imagem', () => {
    const html = renderToStaticMarkup(<NovoMapaDeImagem tokenFresco={async () => 't'} criado={() => {}} />);
    expect(html).toContain('Novo mapa a partir de uma imagem');
    expect(html).toContain('Escolher a imagem');
    expect(html).toContain('8192 px de lado');
    expect(html).toContain('24 MB');
    expect(html).toContain('você mesmo pinta a colisão');
    expect(html).toContain('accept="image/*"');
    expect(html).not.toContain('Tile da colisão');
    expect(html).not.toContain('Criar o mapa');
  });
});

describe('Enviar a imagem do mapa', () => {
  it('o PNG vai para a memória antes do envio (não é o arquivo escolhido) e os bytes ficam iguais', async () => {
    const { prepararPng } = await import('@/components/mestre/NovoMapaDeImagem');
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5]);
    const arquivo = new File([bytes], 'mapa.png', { type: 'image/png' });
    const blob = await prepararPng(arquivo);
    expect(blob).not.toBe(arquivo);
    expect(blob instanceof File).toBe(false);
    expect(blob.type).toBe('image/png');
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
  });
});
