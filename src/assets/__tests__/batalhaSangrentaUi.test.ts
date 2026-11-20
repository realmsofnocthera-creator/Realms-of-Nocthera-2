import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as ui from '../batalhaSangrentaUi';
import { DIFICULDADES_BATALHA } from '@/game/batalhaSangrenta';

const publico = join(__dirname, '..', '..', '..', 'public');

describe('arte da Batalha Sangrenta', () => {
  it('as cinco dificuldades têm moldura e retrato, e todas as peças existem com até 350 KB', () => {
    const usados = new Set<string>([...Object.values(ui.BATALHA_UI), ui.RETRATO_DO_SEGUNDO_CHEFE]);
    for (const d of DIFICULDADES_BATALHA) {
      const q = ui.QUADROS[d.id];
      expect(q, d.id).toBeDefined();
      usados.add(q.moldura);
      usados.add(q.retrato);
    }
    for (const f of usados) {
      expect(existsSync(join(publico, f)), f).toBe(true);
      expect(statSync(join(publico, f)).size, f).toBeLessThanOrEqual(350 * 1024);
    }
    for (const f of readdirSync(join(publico, 'images/batalha-sangrenta')).filter((x) => x.includes('.'))) expect(usados.has(`/images/batalha-sangrenta/${f}`), f).toBe(true);
  });

  it('as molduras cabem na grade de 360 x 540, uma abaixo da outra sem se sobrepor', () => {
    const lista = DIFICULDADES_BATALHA.map((d) => ui.QUADROS[d.id]);
    lista.forEach((q, i) => {
      expect(20 + q.l).toBeLessThanOrEqual(360);
      expect(q.y + q.a).toBeLessThanOrEqual(540);
      if (i > 0) expect(q.y).toBeGreaterThanOrEqual(lista[i - 1].y + lista[i - 1].a - 12);
      expect(q.yNos).toBeLessThan(q.a);
    });
    expect(ui.FIM_DAS_MOLDURAS + 14 + 27).toBeLessThanOrEqual(540);
  });
});
