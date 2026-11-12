import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { AscensaoPanel } from '@/components/desenvolvimento/AscensaoPanel';
import { ICONES_DE_SALDO } from '@/assets/mochilaUi';
import { EMBLEMA_DA_ASCENSAO } from '@/assets/reforcoUi';
import { textoDaFicha, TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';
import type { CharacterDocument } from '@/server/characterService';

const t = TEXTOS_DA_FICHA.ascensao;
const personagem = (extra: Record<string, unknown> = {}) =>
  ({ classeId: 'barbaro', nivel: 30, reforcoHabilidade: 30, ascensaoHabilidade: 3, fragmentosAscensao: 4, atributos: {}, ...extra }) as unknown as CharacterDocument;
const render = (c: CharacterDocument) => renderToStaticMarkup(<AscensaoPanel character={c} idToken="x" onCharacterChange={() => {}} />);
const botaoDesligado = /<button[^>]*\sdisabled=""/;

describe('Avanço de Habilidade / Ascensão (pixel)', () => {
  it('mostra o emblema da estrela, o título e o passo atual', () => {
    const html = render(personagem());
    expect(html).toContain(EMBLEMA_DA_ASCENSAO);
    expect(html).toContain(t.titulo);
    expect(html).toContain(textoDaFicha(t.nivel, { n: 3 }));
  });

  it('o saldo usa o ícone dos fragmentos de ascensão da Mochila', () => {
    const html = render(personagem({ fragmentosAscensao: 7 }));
    expect(html).toContain(ICONES_DE_SALDO.fragmentosAscensao);
    expect(html).toContain(`aria-label="${t.fragmentos}: 7"`);
  });

  it('tem as duas fileiras com os 10 passos e marca comprado, próximo e bloqueado', () => {
    const html = render(personagem());
    expect(html).toContain(t.fileiraNivel2);
    expect(html).toContain(t.fileiraNivel3);
    expect(html.match(/role="tab"/g)).toHaveLength(10);
    expect(html).toContain('A1: Ataque Básico nível 2 (comprado)');
    expect(html).toContain('A4: Passiva II nível 2 (próximo)');
    expect(html).toContain('A10: ');
    expect(html).toContain('(bloqueado)');
  });

  it('o passo escolhido (o próximo) explica o efeito e mostra o botão ligado com o custo', () => {
    const html = render(personagem());
    expect(html).toContain('A4 · Passiva II nível 2');
    expect(html).toContain('+10% no dano ou efeito de:');
    expect(html).toContain(textoDaFicha(t.ascender, { n: 4 }));
    expect(html).not.toMatch(botaoDesligado);
  });

  it('sem fragmentos o botão fica apagado e o custo aparece como insuficiente', () => {
    const html = render(personagem({ fragmentosAscensao: 0 }));
    expect(html).toMatch(botaoDesligado);
    expect(html).toContain('Fragmentos de ascensão insuficientes');
  });

  it('antes do Reforço no nível 30 avisa e apaga o botão', () => {
    const html = render(personagem({ reforcoHabilidade: 10 }));
    expect(html).toMatch(botaoDesligado);
    expect(html).toContain('Libera com o Reforço de Habilidade no nível 30');
  });

  it('com a Ascensão completa não mostra o botão', () => {
    const html = render(personagem({ ascensaoHabilidade: 10 }));
    expect(html).not.toContain('Ascender para');
    expect(html).toContain('Ascensão completa (A10)');
  });
});
