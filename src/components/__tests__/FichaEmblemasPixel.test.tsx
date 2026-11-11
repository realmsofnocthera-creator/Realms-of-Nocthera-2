import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { FichaEmblemasPixel } from '@/components/ficha/FichaEmblemasPixel';
import { TEXTOS_DA_FICHA, textoDaFicha } from '@/rules/textosDaFicha';
import { ESPACOS_DO_CIRCULO } from '@/assets/emblemasUi';
import type { CharacterDocument } from '@/server/characterService';

const t = TEXTOS_DA_FICHA.emblemas;
const base = {
  uid: 'u', nome: 'Yes', classeId: 'samurai', avatarId: 'samurai', nivel: 30,
  atributos: {}, habilidadesEquipadas: {}, armas: [], armaduras: [], inventario: {},
  emblemasItens: [
    { id: 'a', tipo: 'dargan', estrelas: 1 }, { id: 'b', tipo: 'dargan', estrelas: 1 }, { id: 'c', tipo: 'dargan', estrelas: 1 },
    { id: 'd', tipo: 'lautrec', estrelas: 4 },
  ],
  emblemasEquipados: ['a', 'b'],
} as unknown as CharacterDocument;
const vazio = { ...base, emblemasItens: [], emblemasEquipados: [] } as unknown as CharacterDocument;
const render = (c: CharacterDocument) => renderToStaticMarkup(<FichaEmblemasPixel character={c} />);

describe('Aba Emblemas (pixel)', () => {
  it('o círculo tem 4 espaços e os centros ficam dentro dele', () => {
    expect(ESPACOS_DO_CIRCULO.centros).toHaveLength(4);
    for (const [x, y] of ESPACOS_DO_CIRCULO.centros) { expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(100); expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(100); }
    expect(render(base).match(/aria-label="Espaço \d/g) ?? render(base).match(/Espaço/g)).not.toBeNull();
  });

  it('mostra as habilidades em ação e os atributos, sem abrir o inventário', () => {
    const html = render(base);
    expect(html).toContain('Instinto de Carniceiro');
    expect(html).toContain('Nv. 2');
    expect(html).not.toContain('role="dialog"');
    expect(html).toContain(t.habilidades);
    expect(html).toContain(t.inventario);
  });

  it('sem emblemas explica como funciona', () => {
    expect(render(vazio)).toContain(t.semEmblemas);
  });

  it('os textos novos vêm do código', () => {
    expect(textoDaFicha(t.equipadoVarios, { n: 2 })).toBe('2 equipados');
    expect(t.equipadoUm).toBe('1 equipado');
  });
});
