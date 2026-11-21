import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ARTE_DOS_CHEFES_MUNDIAIS, ESTADOS_DO_CHEFE_MUNDIAL } from '../chefesMundiaisArte';
import { clipeAtivo } from '@/components/cacada/CenaDoChefe';
import { CHEFES_MUNDIAIS, chefeDoDia } from '@/rules/chefeMundial';

const publico = join(__dirname, '..', '..', '..', 'public');

describe('arte dos chefes mundiais', () => {
  it('os 7 chefes têm cena, camada e os 4 clipes, em AV1 e H.264', () => {
    expect(CHEFES_MUNDIAIS).toHaveLength(7);
    for (const c of CHEFES_MUNDIAIS) {
      const a = ARTE_DOS_CHEFES_MUNDIAIS[c.id];
      expect(a, c.id).toBeDefined();
      for (const f of [a.arena, a.camada]) expect(existsSync(join(publico, f)), f).toBe(true);
      for (const e of ESTADOS_DO_CHEFE_MUNDIAL) for (const f of [a.clipes[e].av1, a.clipes[e].h264]) expect(existsSync(join(publico, f)), f).toBe(true);
      expect(a.alvo.x).toBeGreaterThan(0.3);
      expect(a.alvo.x).toBeLessThan(0.7);
      expect(a.alvo.pes).toBeGreaterThan(a.alvo.altura);
    }
  });

  it('as imagens ficam até 350 KB e não sobra arquivo sem uso', () => {
    const usados = new Set(Object.values(ARTE_DOS_CHEFES_MUNDIAIS).flatMap((a) => [a.arena, a.camada, ...ESTADOS_DO_CHEFE_MUNDIAL.flatMap((e) => [a.clipes[e].av1, a.clipes[e].h264])]).map((f) => f.split('/').pop()));
    for (const dir of ['images/chefe-mundial', 'videos/chefe-mundial']) {
      for (const f of readdirSync(join(publico, dir)).filter((x) => x.includes('.'))) { // as peças da tela ficam na subpasta `tela`, conferida no teste dela
        expect(usados.has(f), f).toBe(true);
        if (dir.startsWith('images')) expect(statSync(join(publico, dir, f)).size, f).toBeLessThanOrEqual(350 * 1024);
      }
    }
  });

  it('de segunda a domingo, do mais fraco ao mais devastador, na ordem da arte do Yuri', () => {
    // 2026-11-23 é segunda-feira
    const ids = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'].map((d) => chefeDoDia(d).id);
    expect(ids).toEqual(['solvaris', 'pyrathon', 'cryonax', 'zephyrak', 'nyxoloth', 'xerothul', 'orvakar']);
  });
});

describe('qual clipe a cena do chefe mostra', () => {
  it('o evento manda; sem evento, a fúria ou o idle', () => {
    expect(clipeAtivo(null, false)).toBe('idle');
    expect(clipeAtivo(null, true)).toBe('furia');
    expect(clipeAtivo({ tipo: 'ataque', id: 'a-1' }, true)).toBe('ataque');
    expect(clipeAtivo({ tipo: 'golpe', id: 'g-1' }, false)).toBe('golpe');
  });
});
