import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { FichaLupaModal, LinhaExplicada } from '@/components/ficha/FichaLupaModal';
import { ATTRIBUTES } from '@/rules/attributes';
import { ATTRIBUTE_DISPLAY_NAMES, getAttributeExplanation } from '@/rules/attributeInfo';
import { ATTRIBUTE_ICONS } from '@/assets/icons';
import { TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';
import type { CharacterDocument } from '@/server/characterService';

const t = TEXTOS_DA_FICHA.lupa;
const personagem = {} as unknown as CharacterDocument;
const render = (isOpen: boolean) => renderToStaticMarkup(<FichaLupaModal isOpen={isOpen} onClose={() => {}} character={personagem} />);

describe('Pop-up das explicações dos atributos (pixel)', () => {
  it('fechado não mostra nada', () => {
    expect(render(false)).toBe('');
  });

  it('aberto mostra o título, o X e os 7 atributos com o ícone de sempre, todos fechados', () => {
    const html = render(true);
    expect(html).toContain('role="dialog"');
    expect(html).toContain(t.titulo);
    expect(html).toContain(`aria-label="${t.fechar}"`);
    expect(html).toContain(t.principais);
    for (const a of ATTRIBUTES) {
      expect(html).toContain(ATTRIBUTE_DISPLAY_NAMES[a]);
      expect(html).toContain(ATTRIBUTE_ICONS[a]);
      expect(html).not.toContain(getAttributeExplanation(a));
    }
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(ATTRIBUTES.length);
    expect(html).not.toContain('aria-expanded="true"');
  });

  it('sem outros bônus mostra o aviso', () => {
    const html = render(true);
    expect(html).toContain(t.outros);
    expect(html).toContain(t.nenhum);
  });

  it('a linha aberta mostra a explicação logo abaixo e marca aria-expanded', () => {
    const texto = getAttributeExplanation(ATTRIBUTES[0]);
    const html = renderToStaticMarkup(<ul><LinhaExplicada id={ATTRIBUTES[0]} nome={ATTRIBUTE_DISPLAY_NAMES[ATTRIBUTES[0]]} texto={texto} aberta aoAlternar={() => {}} /></ul>);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain(texto);
    expect(html).toContain(`id="lupa-${ATTRIBUTES[0]}"`);
  });
});
