import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuraDePersonagem, EfeitoDeEntrada, MolduraAnimada } from '@/components/cena/EfeitoDeEntrada';
import { EFEITOS_DE_ENTRADA } from '@/rules/efeitosDeEntrada';
import { ARTE_DAS_AURAS, ARTE_DAS_MOLDURAS } from '@/assets/cosmeticosArte';

describe('EfeitoDeEntrada', () => {
  it('cada efeito desenha as duas camadas (atrás e na frente) com steps de um quadro por passo; id inválido não desenha nada', () => {
    for (const e of Object.values(EFEITOS_DE_ENTRADA)) {
      const html = renderToStaticMarkup(<EfeitoDeEntrada id={e.id} />);
      expect(html).toContain(`/images/loja/cosmeticos/${e.id}-atras.webp`);
      expect(html).toContain(`/images/loja/cosmeticos/${e.id}-frente.webp`);
      expect(html).toContain('steps(30, jump-none)');
      expect(html).toContain('pointer-events-none');
    }
    expect(renderToStaticMarkup(<EfeitoDeEntrada id="nao-existe" />)).toBe('');
  });
  it('toca uma vez na luta e em laço na prévia da loja', () => {
    expect(renderToStaticMarkup(<EfeitoDeEntrada id="efeito-raro-gelo" />)).not.toContain('infinite');
    expect(renderToStaticMarkup(<EfeitoDeEntrada id="efeito-raro-gelo" repetir />)).toContain('infinite');
  });
});

describe('AuraDePersonagem e MolduraAnimada', () => {
  it('a aura toca em laço, com 24 quadros, atrás e na frente', () => {
    for (const id of Object.keys(ARTE_DAS_AURAS)) {
      const html = renderToStaticMarkup(<AuraDePersonagem id={id} />);
      expect(html).toContain(`${id}-atras.webp`);
      expect(html).toContain(`${id}-frente.webp`);
      expect(html).toContain('steps(24, jump-none)');
      expect(html).toContain('infinite');
    }
    expect(renderToStaticMarkup(<AuraDePersonagem id="aura-nada" />)).toBe('');
  });
  it('a moldura animada tem 16 quadros e cobre o buraco do rosto (128 px com buraco de 52 px)', () => {
    for (const id of Object.keys(ARTE_DAS_MOLDURAS)) {
      const html = renderToStaticMarkup(<MolduraAnimada id={id} />);
      expect(html).toContain(`${id}.webp`);
      expect(html).toContain('steps(16, jump-none)');
    }
    // com o rosto em 52/128 da caixa, a moldura mede exatamente a caixa
    expect(renderToStaticMarkup(<MolduraAnimada id="moldura-raro-gelo" rosto={52 / 128} />)).toContain('width:100%');
    expect(renderToStaticMarkup(<MolduraAnimada id="moldura-nada" />)).toBe('');
  });
});
