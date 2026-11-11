import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FichaEquipamentoPixel } from '@/components/ficha/FichaEquipamentoPixel';
import { TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';
import type { CharacterDocument } from '@/server/characterService';

const personagem = {
  uid: 'u', nome: 'Yes', racaId: 'humano', classeId: 'samurai', avatarId: 'samurai', nivel: 30,
  atributos: { vigor: 65, sorte: 10, forca: 100, vitalidade: 70, arcano: 0, inteligencia: 0, agilidade: 0 },
  armas: [{ id: 'a1', baseId: 'ferro-de-cacada', categoria: 'espadaGrande', atributo: 'forca', pontos: 4, reforjas: 0, criadaEm: '' }],
  armaduras: [
    { id: 'p1', pecaId: 'vargheist-elmo', atributo: 'vigor', pontos: 30, reforjas: 0, xp: 0, criadaEm: '' },
    { id: 'p2', pecaId: 'vargheist-peitoral', atributo: 'vigor', pontos: 32, reforjas: 0, xp: 0, criadaEm: '' },
  ],
  equipamento: { armaId: 'a1', armadura: { elmo: 'p1', peitoral: 'p2' } },
} as unknown as CharacterDocument;
const render = (c = personagem) => renderToStaticMarkup(<FichaEquipamentoPixel character={c} />);

describe('Aba Equipamentos em pixel', () => {
  it('mostra os 6 espaços ao redor do personagem, o que está equipado e o que está vazio', () => {
    const html = render();
    for (const nome of ['Arma', 'Elmo', 'Peitoral', 'Luvas', 'Perneiras', 'Botas']) expect(html).toContain(`aria-label="${nome}:`);
    expect(html).toContain('Ferro de Caçada');
    expect(html).toContain('Elmo de Vargheist');
    expect(html).toContain('Arte de corpo inteiro de Yes');
    expect(html.match(/Vazio/g)!.length).toBeGreaterThanOrEqual(3);
  });

  it('tem o botão de menu (status detalhado) e a tabela de habilidades por peça, sem pop-up aberto', () => {
    const html = render();
    expect(html).toContain(`aria-label="${TEXTOS_DA_FICHA.equipamentos.menu}"`);
    const tabela = html.slice(html.indexOf(`aria-label="${TEXTOS_DA_FICHA.equipamentos.tabela.titulo}"`));
    expect(tabela).toContain('Olho Crítico');
    expect(tabela).toContain('Reforço de Ataque');
    expect(html).not.toContain('role="dialog"');
  });

  it('sem habilidades de armadura equipadas, a tabela avisa', () => {
    const html = render({ ...personagem, equipamento: { armaId: 'a1', armadura: {} } } as unknown as CharacterDocument);
    expect(html).toContain(TEXTOS_DA_FICHA.equipamentos.tabela.semHabilidades);
  });
});
