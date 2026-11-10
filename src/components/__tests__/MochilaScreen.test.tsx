import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MochilaScreen } from '@/components/mochila/MochilaScreen';
import { MATERIAIS } from '@/rules/materiais';
import { ORBES_ARMADURA } from '@/rules/armaduras';
import type { CharacterDocument } from '@/server/characterService';

vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

const base = { uid: 'u', nome: 'Yuri', nivel: 12, ouro: 12500, diamantes: 7 } as unknown as CharacterDocument;
const com = (extra: object) => ({ ...base, ...extra }) as unknown as CharacterDocument;
const render = (c: CharacterDocument, aba?: 'todos' | 'monstros' | 'mundo' | 'orbes' | 'especiais') => renderToStaticMarkup(<MochilaScreen character={c} abaInicial={aba} />);

describe('Tela da Mochila', () => {
  it('mostra os saldos, o resumo de emblemas e as 5 abas com a contagem de itens', () => {
    const html = render(com({ inventario: { [MATERIAIS[0].id]: 2, [ORBES_ARMADURA[0].id]: 1 } }));
    expect(html).toContain('Saldos');
    expect(html).toContain('12.500');
    expect(html).toContain('Diamantes');
    expect(html).toContain('Emblemas');
    for (const aba of ['Todos (2)', 'Monstros (1)', 'Orbes (1)', 'Mundo (0)', 'Especiais (0)']) expect(html).toContain(aba);
    expect(html).toContain(MATERIAIS[0].nome);
    expect(html).toContain('×2');
    expect(html).not.toContain('role="dialog"');
  });

  it('os 6 saldos aparecem com o total no rótulo (os 4 novos com ícone próprio)', () => {
    const html = render(com({ fragmentosAlma: 1500, essenciaHabilidade: 3, fragmentosAscensao: 0, essenciaDeSoberano: 2 }));
    for (const r of ['Ouro: 12.500', 'Diamantes: 7', 'Fragmentos de alma: 1.500', 'Essência de habilidade: 3', 'Fragmentos de ascensão: 0', 'Essência de Soberano: 2']) expect(html).toContain(r);
  });

  it('o item escolhido mostra o detalhe embaixo, com a quantidade', () => {
    const html = render(com({ inventario: { [MATERIAIS[0].id]: 5 } }));
    expect(html).toContain(`Detalhe: ${MATERIAIS[0].nome}`);
    expect(html).toContain('Cai de');
    expect(html).toContain('×5');
  });

  it('o atalho dos emblemas só aparece quando há emblemas e leva à aba da ficha', () => {
    expect(render(base)).not.toContain('Abrir emblemas');
    const html = render(com({ emblemasItens: [{ id: 'a', tipo: 'dargan', estrelas: 1 }], emblemasEquipados: [] }));
    expect(html).toContain('1 emblema · 0 equipados');
    expect(html).toContain('href="/personagem?aba=emblemas"');
  });

  it('sem nenhum item, mostra a mochila vazia com o atalho para a Caçada', () => {
    const html = render(base);
    expect(html).toContain('mochila está vazia');
    expect(html).toContain('href="/cacada"');
  });

  it('com itens só em outra aba, a aba aberta avisa que está vazia', () => {
    const html = render(com({ inventario: { [ORBES_ARMADURA[0].id]: 1 } }), 'monstros');
    expect(html).toContain('Nenhum material de monstro');
    expect(html).not.toContain('mochila está vazia');
  });

  it('a aba Todos junta as categorias, da mais rara para a mais comum', () => {
    const html = render(com({ inventario: { [MATERIAIS[0].id]: 1, [ORBES_ARMADURA[4].id]: 1 } }));
    expect(html.indexOf(ORBES_ARMADURA[4].nome)).toBeLessThan(html.indexOf(MATERIAIS[0].nome));
  });
});
