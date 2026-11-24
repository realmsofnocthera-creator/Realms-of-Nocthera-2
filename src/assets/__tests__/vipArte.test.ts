import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { previaDaRecompensa, retratoDaSkinVip } from '@/assets/vipArte';
import { RECOMPENSAS_DO_VIP } from '@/rules/vipRecompensas';

const arquivos = (p: NonNullable<ReturnType<typeof previaDaRecompensa>>): string[] => (p.tipo === 'video' ? [p.mp4, p.webm] : [p.src]);

describe('artes das recompensas do VIP (pacote do Yuri)', () => {
  it('as 16 recompensas têm prévia, e todo arquivo existe e respeita o limite de 350 KB (os vídeos, 1 MB)', () => {
    for (const x of RECOMPENSAS_DO_VIP) {
      const p = previaDaRecompensa(x);
      expect(p, x.id).not.toBeNull();
      for (const f of arquivos(p!)) {
        expect(existsSync(`public${f}`), f).toBe(true);
        expect(statSync(`public${f}`).size, f).toBeLessThanOrEqual((p!.tipo === 'video' ? 1024 : 350) * 1024);
      }
    }
  });
  it('as skins têm retrato e as folhas de quadros têm os quadros do manifesto', () => {
    for (const n of [4, 7, 10]) {
      expect(existsSync(`public${retratoDaSkinVip(n)}`)).toBe(true);
      const p = previaDaRecompensa({ id: `vip-${n}-skin`, nivel: n, tipo: 'skin' });
      expect(p?.tipo === 'folha' && p.ms.length).toBe(p?.tipo === 'folha' ? p.quadros : -1);
    }
    expect(retratoDaSkinVip(5)).toBeNull();
  });
});
