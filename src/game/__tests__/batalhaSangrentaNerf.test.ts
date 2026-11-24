import { describe, expect, it } from 'vitest';
import { NERF_DA_BATALHA_SANGRENTA, monstroDaBatalhaSangrenta } from '@/game/batalhaSangrenta';
import { MONSTROS_CACADA, MONSTROS_CACADA_MAP } from '@/rules/cacada';
import { CHEFES_ESPECIAIS_MAP } from '@/rules/chefesEspeciais';

describe('Batalha Sangrenta: nerf de todos os monstros do modo', () => {
  it('a vida cai pela metade e o ataque a 60%, sem mudar o monstro da Caçada', () => {
    const base = MONSTROS_CACADA[40];
    const antes = JSON.stringify(base);
    const n = monstroDaBatalhaSangrenta(base);
    expect(n.hp).toBe(Math.round(base.hp * NERF_DA_BATALHA_SANGRENTA.vida));
    expect(n.atributos.forca).toBe(Math.round(base.atributos.forca * NERF_DA_BATALHA_SANGRENTA.ataque));
    expect(n.id).toBe(base.id);
    expect(JSON.stringify(base)).toBe(antes);
    expect(NERF_DA_BATALHA_SANGRENTA.vida).toBeLessThanOrEqual(0.5);
  });
  it('vale para os chefes Especiais (inclusive o ataque mágico) e nunca zera um atributo que existia', () => {
    for (const id of ['darius-carrasco-escarlate', 'noctharion-dragao-do-eclipse-eterno', 'varkhazar-dragao-da-carnificina']) {
      const base = CHEFES_ESPECIAIS_MAP[id];
      const n = monstroDaBatalhaSangrenta(base);
      expect(n.hp, id).toBeLessThan(base.hp);
      expect(n.atributos.forca > 0 ? n.atributos.forca : 1, id).toBeGreaterThan(0);
      if (base.atributos.inteligencia > 0) expect(n.atributos.inteligencia).toBeGreaterThan(0);
      if (base.atributos.forca > 0) expect(n.atributos.forca).toBeLessThan(base.atributos.forca);
    }
  });
  it('o Sobreescudo definido no monstro acompanha a vida; sem ele, o motor usa 10% da vida nova', () => {
    const base = { ...MONSTROS_CACADA_MAP[MONSTROS_CACADA[0].id], sobreescudoInicial: 1000 };
    expect(monstroDaBatalhaSangrenta(base).sobreescudoInicial).toBe(500);
    expect(monstroDaBatalhaSangrenta(MONSTROS_CACADA[0]).sobreescudoInicial).toBeUndefined();
  });
});
