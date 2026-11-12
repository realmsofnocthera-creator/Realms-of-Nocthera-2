import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { SubclassePanel } from '@/components/desenvolvimento/SubclassePanel';
import { ARTE_DAS_SUBCLASSES, arteDaSubclasse } from '@/assets/subclassesUi';
import { SUBCLASSES } from '@/rules/subclasses';
import type { CharacterDocument } from '@/server/characterService';

const personagem = (classeId: string, extra: Record<string, unknown> = {}) =>
  ({ classeId, nivel: 30, ouro: 100000, fragmentosAlma: 100, diamantes: 300, fragmentosSubclasse: {}, atributos: {}, ...extra }) as unknown as CharacterDocument;
const render = (c: CharacterDocument) => renderToStaticMarkup(<SubclassePanel character={c} idToken="x" onCharacterChange={() => {}} />);

describe('Subclasse em pixel: estandarte e personagem lado a lado', () => {
  it('as 4 subclasses com arte existem e têm o estandarte e o personagem', () => {
    expect(Object.keys(ARTE_DAS_SUBCLASSES).sort()).toEqual(['berserker', 'colosso']);
    for (const id of Object.keys(ARTE_DAS_SUBCLASSES)) {
      expect(SUBCLASSES.some((s) => s.id === id)).toBe(true);
      const a = arteDaSubclasse(id)!;
      expect(a.estandarte).toBeTruthy();
      expect(a.personagem).toBeTruthy();
    }
    expect(arteDaSubclasse('kensei')).toBeNull();
    expect(arteDaSubclasse('vanguarda')).toBeNull();
    expect(arteDaSubclasse('bastiao')).toBeNull();
  });

  it('a escolha do Bárbaro mostra o estandarte e o personagem de cada subclasse, com o botão Desbloquear', () => {
    const html = render(personagem('barbaro'));
    for (const id of ['berserker', 'colosso']) {
      expect(html).toContain(`data-subclasse="${id}"`);
      expect(html).toContain(arteDaSubclasse(id)!.estandarte);
      expect(html).toContain(arteDaSubclasse(id)!.personagem);
    }
    expect(html.match(/Desbloquear/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('o Cavaleiro ainda não tem arte: a Vanguarda e o Bastião aparecem com o degradê, sem imagem', () => {
    const html = render(personagem('cavaleiro'));
    expect(html).toContain('data-subclasse="vanguarda"');
    expect(html).toContain('data-subclasse="bastiao"');
    expect(html).not.toContain(arteDaSubclasse('berserker')!.estandarte);
    expect(html).not.toContain(arteDaSubclasse('colosso')!.estandarte);
  });

  it('subclasse sem arte ainda aparece (degradê da cor da classe), sem imagens quebradas', () => {
    const html = render(personagem('samurai'));
    expect(html).toContain('data-subclasse="kensei"');
    expect(html).not.toContain(arteDaSubclasse('berserker')!.estandarte);
  });

  it('com a subclasse ativa mostra o cabeçalho com a arte, a linha de tiers e o botão de resetar', () => {
    const html = render(personagem('barbaro', { subclasseAtualId: 'berserker', subclasseTiers: { berserker: 1 } }));
    expect(html).toContain('data-subclasse-ativa="berserker"');
    expect(html).toContain(arteDaSubclasse('berserker')!.estandarte);
    expect(html).toContain('role="tablist"');
    expect(html).toContain('Resetar subclasse');
  });
});
