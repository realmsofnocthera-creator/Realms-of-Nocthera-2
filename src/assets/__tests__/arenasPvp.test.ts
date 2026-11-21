import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ARENAS_PVP, type ModoDoPvp } from '../arenasPvp';

const publico = join(__dirname, '..', '..', '..', 'public');
const MODOS: ModoDoPvp[] = ['arena', 'ranqueada', 'campeonato'];

describe('arenas de combate PvP', () => {
  it('cada modo tem arena com vídeo (AV1 e H.264) e capa, sem arquivo sobrando', () => {
    for (const m of MODOS) {
      const a = ARENAS_PVP[m];
      for (const f of [a.imagem, a.videoAv1, a.videoH264]) expect(existsSync(join(publico, f)), f).toBe(true);
      expect(statSync(join(publico, a.imagem)).size).toBeLessThanOrEqual(350 * 1024);
    }
    const usados = new Set(Object.values(ARENAS_PVP).flatMap((a) => [a.imagem, a.videoAv1, a.videoH264].map((f) => f.split('/').pop())));
    for (const dir of ['images/arena/pvp', 'videos/arena']) for (const f of readdirSync(join(publico, dir))) expect(usados.has(f), f).toBe(true);
  });
});
