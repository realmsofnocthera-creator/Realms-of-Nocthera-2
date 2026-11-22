import { describe, expect, it } from 'vitest';
import { buscarNoMapa, mapaDeEntradas, mapaPorId, temId } from '../mapaSeguro';
import { ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import { CLASSES_MAP } from '@/rules/classes';
import { COLECIONAVEL_MAP } from '@/rules/colecionaveis';
import { CONQUISTA_MAP } from '@/rules/conquistas';
import { MATERIAIS_MAP } from '@/rules/materiais';
import { MATERIAIS_MUNDO_MAP } from '@/rules/materiaisArmas';
import { MONSTERS_MAP } from '@/rules/monsters';
import { MONSTROS_CACADA_MAP } from '@/rules/cacada';
import { PECAS_ARMADURA_MAP } from '@/rules/armadurasCatalogo';
import { RACES_MAP } from '@/rules/races';
import { TIPO_DE_CARTA_MAP } from '@/rules/almas';
import { TIPO_EMBLEMA_MAP } from '@/rules/emblemasCatalogo';
import { TITULO_MAP } from '@/rules/titulos';
import { CHEFES_ESPECIAIS_MAP } from '@/rules/chefesEspeciais';
import { CATEGORIAS_ARMA_MAP } from '@/rules/armas';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { ORBES_ARMADURA_MAP } from '@/rules/armaduras';

const PERIGOSOS = ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf', 'isPrototypeOf', 'prototype'];

describe('mapas de catálogo sem protótipo', () => {
  it('mapaPorId e mapaDeEntradas não têm protótipo e guardam "__proto__" como chave comum', () => {
    const m = mapaPorId([{ id: 'a', n: 1 }, { id: '__proto__', n: 2 }]);
    expect(Object.getPrototypeOf(m)).toBeNull();
    expect(m.a.n).toBe(1);
    expect(Object.keys(m)).toEqual(['a', '__proto__']);
    expect(Object.keys(mapaDeEntradas([['x', 1]]))).toEqual(['x']);
  });

  it('temId e buscarNoMapa só aceitam chave própria', () => {
    const comum = { a: 1 } as Record<string, number>;
    expect(temId(comum, 'a')).toBe(true);
    for (const p of PERIGOSOS) {
      expect(temId(comum, p), p).toBe(false);
      expect(buscarNoMapa(comum, p), p).toBeUndefined();
    }
    expect(temId(comum, 5)).toBe(false);
    expect(temId(comum, undefined)).toBe(false);
    expect(buscarNoMapa(comum, 'a')).toBe(1);
  });

  it('todo catálogo recusa os ids do protótipo (e continua achando os ids de verdade)', () => {
    const mapas: Record<string, Record<string, unknown>> = {
      MATERIAIS_MAP, MATERIAIS_MUNDO_MAP, ARMAS_BASE_MAP, MONSTERS_MAP, MONSTROS_CACADA_MAP, CHEFES_ESPECIAIS_MAP, COLECIONAVEL_MAP, CONQUISTA_MAP,
      TIPO_DE_CARTA_MAP, TIPO_EMBLEMA_MAP, TITULO_MAP, PECAS_ARMADURA_MAP, CLASSES_MAP, RACES_MAP, CATEGORIAS_ARMA_MAP, EMBLEMA_RARIDADE_MAP, ORBES_ARMADURA_MAP,
    };
    for (const [nome, mapa] of Object.entries(mapas)) {
      expect(Object.getPrototypeOf(mapa), nome).toBeNull();
      expect(Object.keys(mapa).length, nome).toBeGreaterThan(0);
      for (const p of PERIGOSOS) {
        expect(mapa[p], `${nome}[${p}]`).toBeUndefined();
        expect(p in mapa, `${p} in ${nome}`).toBe(false);
        expect(temId(mapa, p), `temId ${nome} ${p}`).toBe(false);
      }
      const primeiro = Object.keys(mapa)[0];
      expect(temId(mapa, primeiro), `${nome} ${primeiro}`).toBe(true);
    }
  });
});
