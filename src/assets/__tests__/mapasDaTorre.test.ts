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
});

describe('versões dos mapas', () => {
  it('todos os mapas são da v2 e não sobra arquivo antigo', () => {
    for (const [n, m] of Object.entries(MAPAS_DA_TORRE)) {
      expect(m.videoH264, n).toContain('-v2.');
      expect(m.imagem, n).toContain('-v2.');
    }
    for (const dir of [join(publico, 'videos', 'torre'), join(publico, 'images', 'torre', 'mapas')]) {
      const usados = new Set(Object.values(MAPAS_DA_TORRE).flatMap((m) => [m.imagem, m.videoAv1, m.videoH264].map((f) => f.split('/').pop())));
      for (const f of readdirSync(dir)) expect(usados.has(f), f).toBe(true);
    }
  });
});
