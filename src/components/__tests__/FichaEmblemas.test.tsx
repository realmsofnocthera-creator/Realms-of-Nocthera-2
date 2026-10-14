import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { FichaEmblemaModal, FichaResumoEmblemas, FichaSlotsEmblema } from '@/components/ficha/FichaEmblemas';
import { FichaSidebar } from '@/components/ficha/FichaSidebar';
import { habilidadesEmAcao, inventarioDeEmblemas, slotsDeEmblema } from '@/lib/emblemasTela';
import type { CharacterDocument } from '@/server/characterService';

const base = {
  emblemasItens: [
    { id: 'a', tipo: 'dargan', estrelas: 1 },
    { id: 'b', tipo: 'dargan', estrelas: 1 },
    { id: 'c', tipo: 'dargan', estrelas: 1 },
    { id: 'd', tipo: 'lautrec', estrelas: 4 },
  ],
  emblemasEquipados: ['a', 'b'],
} as unknown as CharacterDocument;
const vazio = {} as unknown as CharacterDocument;

describe('Aba Emblemas da ficha', () => {
  it('os 4 espaços mostram os equipados e os vazios', () => {
    const slots = slotsDeEmblema(base);
    expect(slots.map((s) => s.emblema?.nome ?? null)).toEqual(['Dargan, o Saqueador Pálido', 'Dargan, o Saqueador Pálido', null, null]);
    const html = renderToStaticMarkup(<FichaSlotsEmblema character={base} onAbrir={() => {}} />);
    expect(html).toContain('Espaço 1: Emblema Dargan, o Saqueador Pálido');
    expect(html).toContain('Espaço 3: vazio');
    expect(html).toContain('Espaço 4: vazio');
  });

  it('dois emblemas iguais equipados sobem a habilidade para o nível 2', () => {
    const h = habilidadesEmAcao(base);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ nome: 'Instinto de Carniceiro', nivel: 2 });
    const html = renderToStaticMarkup(<FichaResumoEmblemas character={base} />);
    expect(html).toContain('Instinto de Carniceiro');
    expect(html).toContain('Nv. 2');
    expect(html).toContain('Causa 8% de dano adicional contra inimigos com menos de 40% de HP.');
  });

  it('sem emblemas equipados o resumo explica como funciona', () => {
    expect(renderToStaticMarkup(<FichaResumoEmblemas character={vazio} />)).toContain('Nenhum emblema equipado');
  });

  it('o inventário agrupa por tipo (do mais raro) e por estrela, com o custo da fusão', () => {
    const g = inventarioDeEmblemas(base);
    expect(g.map((x) => x.tipo.id)).toEqual(['lautrec', 'dargan']);
    const dargan = g[1].porEstrela[0];
    expect(dargan).toMatchObject({ estrelas: 1, total: 3, equipados: 2, custoDaFusao: 2, podeFundir: false });
    expect(dargan.livres).toEqual(['c']);
    expect(g[0].porEstrela[0]).toMatchObject({ estrelas: 4, custoDaFusao: null, podeFundir: false });
  });

  it('o modal mostra as habilidades de cada estrela e os botões Equipar, Desequipar e Fundir', () => {
    const html = renderToStaticMarkup(<FichaEmblemaModal character={base} onClose={() => {}} />);
    expect(html).toContain('Emblema Dargan, o Saqueador Pálido');
    expect(html).toContain('Último Saque');
    expect(html).toContain('2/4 equipados');
    expect(html).toContain('Desequipar');
    expect(html).toContain('Equipar');
    expect(html).toContain('Fundir 2');
    expect(html).toContain('Apoteose do Tormento');
    expect(renderToStaticMarkup(<FichaEmblemaModal character={vazio} onClose={() => {}} />)).toContain('Você ainda não tem emblemas');
  });

  it('na barra lateral, Emblemas abre quando a ficha sabe trocar de aba', () => {
    const aberta = renderToStaticMarkup(<FichaSidebar aba="personagem" onMudarAba={() => {}} />);
    expect(aberta.match(/aria-disabled="true"/g)).toHaveLength(1);
    expect(renderToStaticMarkup(<FichaSidebar aba="emblemas" onMudarAba={() => {}} />)).toContain('aria-current="page"');
  });
});
