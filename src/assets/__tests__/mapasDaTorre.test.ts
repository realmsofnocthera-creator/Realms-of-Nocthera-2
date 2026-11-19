import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAPAS_DA_TORRE, mapaDoAndar, TOTAL_DE_MAPAS_DA_TORRE } from '../mapasDaTorre';

const publico = join(__dirname, '..', '..', '..', 'public');

describe('mapas da Torre Celestial', () => {
  it('um mapa por capítulo de 10 andares', () => {
    expect(Object.keys(MAPAS_DA_TORRE)).toHaveLength(TOTAL_DE_MAPAS_DA_TORRE);
    expect([1, 10, 11, 100, 101, 290, 291, 300].map(mapaDoAndar)).toEqual([1, 1, 2, 10, 11, 29, 30, 30]);
    expect(mapaDoAndar(0)).toBe(1);
    expect(mapaDoAndar(999)).toBe(30);
  });

  it('os arquivos existem e a capa tem até 350 KB', () => {
    for (const [n, m] of Object.entries(MAPAS_DA_TORRE)) {
      for (const f of [m.imagem, m.videoAv1, m.videoH264]) expect(existsSync(join(publico, f)), `${n} ${f}`).toBe(true);
      expect(statSync(join(publico, m.imagem)).size, `${n} capa`).toBeLessThanOrEqual(350 * 1024);
    }
  });

  it('as posições dos mapas de plataformas ficam dentro do mapa, com o monstro mais ao fundo e à direita do herói', () => {
    for (const [n, m] of Object.entries(MAPAS_DA_TORRE)) {
      const c = m.cena;
      if (Number(n) > 10) {
        expect(c, n).toBeUndefined(); // o campo contínuo (v2) usa as posições da Caçada
        continue;
      }
      if (!c) throw new Error(`mapa ${n} sem posições`);
      for (const v of [c.monstroX, c.monstroPes, c.jogadorX, c.jogadorPes]) {
        expect(v, n).toBeGreaterThan(0);
        expect(v, n).toBeLessThan(1);
      }
      expect(c.monstroPes, n).toBeLessThan(c.jogadorPes);
      expect(c.monstroX, n).toBeGreaterThan(0.55);
    }
  });
});

describe('versões dos mapas', () => {
  it('os mapas de 11 a 30 são da v2 e não sobra arquivo antigo', () => {
    for (const [n, m] of Object.entries(MAPAS_DA_TORRE)) {
      const v = Number(n) >= 11 ? 2 : 1;
      expect(m.videoH264, n).toContain(`-v${v}.`);
      expect(m.imagem, n).toContain(`-v${v}.`);
    }
    for (const dir of [join(publico, 'videos', 'torre'), join(publico, 'images', 'torre', 'mapas')]) {
      const usados = new Set(Object.values(MAPAS_DA_TORRE).flatMap((m) => [m.imagem, m.videoAv1, m.videoH264].map((f) => f.split('/').pop())));
      for (const f of readdirSync(dir)) expect(usados.has(f), f).toBe(true);
    }
  });
});
