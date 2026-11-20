import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ARENAS_DO_GUERREIRO } from '../arenasDoGuerreiro';
import { CHEFES_GUERREIRO } from '@/rules/guerreiroChefes';

const publico = join(__dirname, '..', '..', '..', 'public');

describe('arenas do Guerreiro', () => {
  it('há uma arena para cada dificuldade, com vídeo (AV1 e H.264) e capa', () => {
    for (const c of CHEFES_GUERREIRO) {
      const a = ARENAS_DO_GUERREIRO[c.dificuldade];
      expect(a, c.id).toBeDefined();
      for (const f of [a.imagem, a.videoAv1, a.videoH264]) expect(existsSync(join(publico, f)), `${c.dificuldade} ${f}`).toBe(true);
      expect(statSync(join(publico, a.imagem)).size, `${c.dificuldade} capa`).toBeLessThanOrEqual(350 * 1024);
    }
  });

  it('não sobra arquivo de arena sem uso', () => {
    const usados = new Set(Object.values(ARENAS_DO_GUERREIRO).flatMap((a) => [a.imagem, a.videoAv1, a.videoH264].map((f) => f.split('/').pop())));
    for (const dir of [join(publico, 'videos', 'guerreiro'), join(publico, 'images', 'guerreiro', 'arenas')]) {
      for (const f of readdirSync(dir).filter((x) => x.startsWith('arena-'))) expect(usados.has(f), f).toBe(true);
    }
  });
});
