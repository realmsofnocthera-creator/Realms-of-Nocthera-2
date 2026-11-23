import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EfeitoDeEntrada } from '@/components/cena/EfeitoDeEntrada';
import { EFEITOS_DE_ENTRADA } from '@/rules/efeitosDeEntrada';

describe('EfeitoDeEntrada', () => {
  it('cada efeito desenha a folha de quadros e as camadas dele; id inválido não desenha nada', () => {
    for (const e of Object.values(EFEITOS_DE_ENTRADA)) {
      const html = renderToStaticMarkup(<EfeitoDeEntrada id={e.id} />);
      expect(html).toContain(`/images/cacada/pixelfx/${e.fx}.webp`);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('pointer-events-none');
    }
    expect(renderToStaticMarkup(<EfeitoDeEntrada id="nao-existe" />)).toBe('');
  });
  it('toca uma vez na luta e em laço na prévia da loja', () => {
    expect(renderToStaticMarkup(<EfeitoDeEntrada id="efeito-raro-gelo" />)).not.toContain('infinite');
    expect(renderToStaticMarkup(<EfeitoDeEntrada id="efeito-raro-gelo" repetir />)).toContain('infinite');
  });
});
