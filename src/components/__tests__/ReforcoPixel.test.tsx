import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ReforcoPanel } from '@/components/desenvolvimento/ReforcoPanel';
import { ATTRIBUTES } from '@/rules/attributes';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import { ATTRIBUTE_ICONS } from '@/assets/icons';
import { ICONES_DE_SALDO } from '@/assets/mochilaUi';
import { EMBLEMA_DO_REFORCO } from '@/assets/reforcoUi';
import { estadoDoReforco } from '@/lib/progressaoHabilidadeTela';
import { textoDaFicha, TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';
import type { CharacterDocument } from '@/server/characterService';

const t = TEXTOS_DA_FICHA.reforco;
const personagem = (extra: Record<string, unknown> = {}) =>
  ({ classeId: 'barbaro', nivel: 30, reforcoHabilidade: 12, essenciaHabilidade: 5000, bonusReforco: { vigor: 4, forca: 6 }, atributos: {}, ...extra }) as unknown as CharacterDocument;
const render = (c: CharacterDocument) => renderToStaticMarkup(<ReforcoPanel character={c} idToken="x" onCharacterChange={() => {}} />);

describe('Melhorar Habilidade / Reforço (pixel)', () => {
  it('mostra o emblema da seta, o título, o nível e a barra de progresso', () => {
    const html = render(personagem());
    expect(html).toContain(EMBLEMA_DO_REFORCO);
    expect(html).toContain(t.titulo);
    expect(html).toContain(textoDaFicha(t.nivel, { n: 12, max: 30 }));
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="12"');
    expect(html).toContain('width:40%');
  });

  it('o saldo de essência usa o ícone da chama roxa da Mochila', () => {
    const html = render(personagem({ essenciaHabilidade: 1234 }));
    expect(html).toContain(ICONES_DE_SALDO.essenciaHabilidade);
    expect(html).toContain(`aria-label="${t.essencia}: 1234"`);
  });

  it('mostra os 7 atributos com os ícones de sempre e o bônus de cada um', () => {
    const html = render(personagem());
    for (const a of ATTRIBUTES) {
      expect(html).toContain(ATTRIBUTE_DISPLAY_NAMES[a]);
      expect(html).toContain(ATTRIBUTE_ICONS[a]);
    }
    expect(html).toContain('+4');
    expect(html).toContain('+6');
  });

  it('com essência suficiente o botão de reforçar fica ligado, com o custo', () => {
    const c = personagem();
    const e = estadoDoReforco(c);
    expect(e.habilitado).toBe(true);
    const html = render(c);
    expect(html).toContain(textoDaFicha(t.reforcar, { n: 13 }));
    // o atributo disabled do botão (a classe disabled: do estilo não conta)
    expect(html).not.toMatch(/<button[^>]*\sdisabled=""/);
  });

  it('sem essência o botão fica apagado e o custo aparece como insuficiente', () => {
    const c = personagem({ essenciaHabilidade: 0 });
    const html = render(c);
    expect(html).toMatch(/<button[^>]*\sdisabled=""/);
    expect(html).toContain(`(${t.insuficiente})`);
    expect(html).toContain('Essência de habilidade insuficiente');
  });

  it('no nível máximo não mostra o botão e avisa', () => {
    const html = render(personagem({ reforcoHabilidade: 30 }));
    expect(html).not.toContain(textoDaFicha(t.reforcar, { n: 31 }));
    expect(html).toContain('Reforço no nível máximo');
  });
});
