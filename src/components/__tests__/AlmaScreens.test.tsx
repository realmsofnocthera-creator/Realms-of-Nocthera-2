import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AlmaScreen } from '@/components/alma/AlmaScreen';
import { ColecaoDaAlma } from '@/components/alma/ColecaoDaAlma';
import { tiposDaRaridadeDeCarta } from '@/rules/almas';
import type { CharacterDocument } from '@/server/characterService';

vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

const base = { uid: 'u1', nome: 'Aria', nivel: 25, classeId: 'cavaleiro' } as unknown as CharacterDocument;
const tipo = tiposDaRaridadeDeCarta('comum')[0];

describe('Telas da Alma (7.8)', () => {
  it('antes do nível 25 a Alma avisa que está bloqueada', () => {
    const html = renderToStaticMarkup(<AlmaScreen personagem={{ ...base, nivel: 24 }} tokenFresco={async () => 't'} />);
    expect(html).toContain('A Alma abre no nível 25');
    expect(html).not.toContain('Espaços de Alma');
  });

  it('no nível 25 mostra os 9 espaços (3 de Alma, 3 de Corpo, 3 de Mente) e as moedas', () => {
    const html = renderToStaticMarkup(<AlmaScreen personagem={{ ...base, poeiraDeAlma: 30, cacosDeAlma: 7 } as CharacterDocument} tokenFresco={async () => 't'} />);
    for (const c of ['Espaços de Alma', 'Espaços de Corpo', 'Espaços de Mente']) expect(html).toContain(c);
    expect((html.match(/vazio/g) ?? []).length).toBe(9);
    expect(html).toContain('Poeira de alma');
    expect(html).toContain('Nenhuma carta guardada');
  });

  it('mostra a carta equipada e a guardada com os efeitos', () => {
    const personagem = {
      ...base,
      cartasItens: [
        { id: 'c1', tipo: tipo.id, efeitos: [{ efeito: 'forca', valor: 2 }], despertar: 0 },
        { id: 'c2', tipo: tiposDaRaridadeDeCarta('comum')[1].id, efeitos: [{ efeito: 'hp', valor: 1 }], despertar: 0 },
      ],
      cartasEquipadas: ['c1'],
    } as unknown as CharacterDocument;
    const html = renderToStaticMarkup(<AlmaScreen personagem={personagem} tokenFresco={async () => 't'} />);
    expect(html).toContain(tipo.nome);
    expect(html).toContain('Desequipar');
    expect(html).toContain('Equipar');
    expect(html).toContain('+2 de Força');
  });

  it('Coleção: 54 cartas, as descobertas aparecem com o nome e as outras como ???', () => {
    const html = renderToStaticMarkup(<ColecaoDaAlma personagem={{ ...base, cartasDescobertas: [tipo.id] } as CharacterDocument} />);
    expect(html).toContain('de 54 cartas');
    expect(html).toContain(tipo.nome);
    expect(html).toContain('???');
    expect(html).toContain('Conjunto Comum');
    expect(html).toContain('Conjunto Mítico');
  });
});
