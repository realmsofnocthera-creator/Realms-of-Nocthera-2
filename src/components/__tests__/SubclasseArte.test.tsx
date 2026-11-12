import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { SubclassePanel } from '@/components/desenvolvimento/SubclassePanel';
import { ARTE_DAS_SUBCLASSES, arteDaSubclasse, estandarteDaSubclasse } from '@/assets/subclassesUi';
import { SUBCLASSES } from '@/rules/subclasses';
import type { CharacterDocument } from '@/server/characterService';

const personagem = (classeId: string, extra: Record<string, unknown> = {}) =>
  ({ classeId, nivel: 30, ouro: 100000, fragmentosAlma: 100, diamantes: 300, fragmentosSubclasse: {}, atributos: {}, ...extra }) as unknown as CharacterDocument;
const render = (c: CharacterDocument) => renderToStaticMarkup(<SubclassePanel character={c} idToken="x" onCharacterChange={() => {}} />);

describe('Subclasse em pixel: estandarte e personagem lado a lado', () => {
  it('as 12 subclasses têm personagem e imagem', () => {
    expect(Object.keys(ARTE_DAS_SUBCLASSES).sort()).toEqual(SUBCLASSES.map((s) => s.id).sort());
    for (const id of Object.keys(ARTE_DAS_SUBCLASSES)) {
      expect(SUBCLASSES.some((s) => s.id === id)).toBe(true);
      expect(arteDaSubclasse(id)!.personagem).toBeTruthy();
    }
    expect(arteDaSubclasse('subclasse-inexistente')).toBeNull();
  });

  it('todas as 12 subclasses têm estandarte: o próprio (Berserker e Colosso) ou o padrão na cor da classe', () => {
    for (const s of SUBCLASSES) {
      const e = estandarteDaSubclasse(s.id);
      expect(e.src).toBeTruthy();
      expect(e.proporcao).toBeGreaterThan(0);
    }
    expect(estandarteDaSubclasse('berserker').src).not.toBe(estandarteDaSubclasse('colosso').src);
    expect(estandarteDaSubclasse('berserker').filtro).toBe('none');
    // as outras usam o padrão, com o matiz da classe
    expect(estandarteDaSubclasse('vanguarda').src).toBe(estandarteDaSubclasse('berserker').src);
    expect(estandarteDaSubclasse('vanguarda').filtro).not.toBe('none');
    expect(estandarteDaSubclasse('vanguarda').filtro).toBe(estandarteDaSubclasse('bastiao').filtro);
    expect(estandarteDaSubclasse('vanguarda').filtro).not.toBe(estandarteDaSubclasse('arquimago').filtro);
  });

  it('a escolha do Bárbaro mostra o estandarte e o personagem de cada subclasse, com o botão Desbloquear', () => {
    const html = render(personagem('barbaro'));
    for (const id of ['berserker', 'colosso']) {
      expect(html).toContain(`data-subclasse="${id}"`);
      expect(html).toContain(estandarteDaSubclasse(id).src);
      expect(html).toContain(arteDaSubclasse(id)!.personagem);
    }
    expect(html.match(/Desbloquear/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it.each([
    ['cavaleiro', ['vanguarda', 'bastiao']],
    ['feiticeiro', ['arquimago', 'sabio_arcano']],
    ['bandido', ['assassino', 'duelista']],
    ['profeta', ['sacerdote', 'inquisidor']],
    ['samurai', ['kensei', 'ronin']],
  ])('%s: as duas subclasses aparecem com o personagem e o estandarte padrão', (classe, ids) => {
    const html = render(personagem(classe));
    for (const id of ids) {
      expect(html).toContain(`data-subclasse="${id}"`);
      expect(html).toContain(arteDaSubclasse(id)!.personagem);
      expect(html).toContain(estandarteDaSubclasse(id).src);
    }
  });

  it('com a subclasse ativa mostra o cabeçalho com a arte, a linha de tiers e o botão de resetar', () => {
    const html = render(personagem('barbaro', { subclasseAtualId: 'berserker', subclasseTiers: { berserker: 1 } }));
    expect(html).toContain('data-subclasse-ativa="berserker"');
    expect(html).toContain(estandarteDaSubclasse('berserker').src);
    expect(html).toContain('role="tablist"');
    expect(html).toContain('Resetar subclasse');
  });
});
