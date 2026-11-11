import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { AtributosPanel } from '@/components/desenvolvimento/AtributosPanel';
import { DesenvolvimentoMenu } from '@/components/desenvolvimento/DesenvolvimentoMenu';
import { ATTRIBUTES } from '@/rules/attributes';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import { ATTRIBUTE_ICONS } from '@/assets/icons';
import { BOTOES_DE_ATRIBUTO } from '@/assets/atributosUi';
import { TEXTOS_DA_FICHA, textoDaFicha } from '@/rules/textosDaFicha';
import type { CharacterDocument } from '@/server/characterService';
import type { PendingAttributes } from '@/lib/attributeState';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, replace: () => {} }) }));

const t = TEXTOS_DA_FICHA.desenvolvimentoTela;
const personagem = (pontos: number) =>
  ({ nivel: 30, pontosDisponiveis: pontos, hpMax: 407, sobreescudoMax: 177, chanceCritico: 3, atributos: { vigor: 65, sorte: 10, forca: 100, vitalidade: 70, arcano: 0, inteligencia: 0, agilidade: 0 } }) as unknown as CharacterDocument;
const zero = { vigor: 0, sorte: 0, forca: 0, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 } as PendingAttributes;
const render = (pontos: number, pendente: PendingAttributes = zero, extra: Partial<React.ComponentProps<typeof AtributosPanel>> = {}) =>
  renderToStaticMarkup(<AtributosPanel character={personagem(pontos)} pendente={pendente} onAdjust={() => {}} onLimpar={() => {}} onConfirmar={() => {}} isSubmitting={false} isResetting={false} feedback={null} {...extra} />);

describe('Distribuição de atributos (pixel)', () => {
  it('tem as 7 linhas com os ícones de sempre e os botões − e + de cada atributo', () => {
    const html = render(5);
    expect(html.match(/<li /g)).toHaveLength(7);
    for (const a of ATTRIBUTES) {
      expect(html).toContain(ATTRIBUTE_DISPLAY_NAMES[a]);
      expect(html).toContain(ATTRIBUTE_ICONS[a]);
      expect(html).toContain(`aria-label="${textoDaFicha(t.aumentar, { nome: ATTRIBUTE_DISPLAY_NAMES[a] })}"`);
      expect(html).toContain(`aria-label="${textoDaFicha(t.diminuir, { nome: ATTRIBUTE_DISPLAY_NAMES[a] })}"`);
    }
  });

  it('mostra os pontos disponíveis; os botões + acendem com pontos e apagam sem eles', () => {
    expect(render(5)).toContain(textoDaFicha(t.pontos, { n: 5 }));
    const com = render(5);
    expect(com).toContain(BOTOES_DE_ATRIBUTO.mais);
    expect(com).not.toContain('Aumentar Vigor" disabled');
    const sem = render(0);
    expect(sem).toContain(t.semPontos);
    expect(sem).toContain(BOTOES_DE_ATRIBUTO.maisApagado);
    expect(sem).toMatch(/aria-label="Aumentar Vigor"[^>]*>|disabled=""[^>]*aria-label="Aumentar Vigor"/);
  });

  it('o ponto pendente aparece somado, desconta dos disponíveis e liga Confirmar com a conta', () => {
    const html = render(5, { ...zero, vigor: 2 });
    expect(html).toContain('>67<');
    expect(html).toContain(textoDaFicha(t.pontos, { n: 3 }));
    expect(html).toContain(`${t.confirmar} (2)`);
    expect(html).toContain(t.limpar);
  });

  it('mostra a mensagem de resultado e o texto "Gravando..." ao confirmar', () => {
    expect(render(5, zero, { feedback: { type: 'success', message: t.atributosAtualizados } })).toContain(t.atributosAtualizados);
    expect(render(5, { ...zero, vigor: 1 }, { isSubmitting: true })).toContain(t.gravando);
  });

  it('o menu das seções marca a aberta e avisa quando há pontos', () => {
    const html = renderToStaticMarkup(<DesenvolvimentoMenu secaoAtiva="atributos" onSelectSecao={() => {}} pontosDisponiveis={3} />);
    expect(html).toContain(`aria-label="${t.menu}"`);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('role="status"');
    expect(renderToStaticMarkup(<DesenvolvimentoMenu secaoAtiva="subclasse" onSelectSecao={() => {}} pontosDisponiveis={0} />)).not.toContain('role="status"');
  });
});
