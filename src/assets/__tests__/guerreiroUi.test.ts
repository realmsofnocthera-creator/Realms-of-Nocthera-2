import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cartaDoGuerreiro, GUERREIRO_UI, INTRO_DO_GUERREIRO, MOLDURAS_DO_PAINEL, POSICAO_DAS_CARTAS } from '../guerreiroUi';
import { CHEFES_GUERREIRO } from '@/rules/guerreiroChefes';

describe('mesa de tarô do Guerreiro', () => {
  it('as imagens ficam até 350 KB e a intro existe', () => {
    const pasta = join(__dirname, '..', 'images', 'guerreiro');
    for (const f of readdirSync(pasta)) expect(statSync(join(pasta, f)).size, f).toBeLessThanOrEqual(350 * 1024);
    for (const f of Object.values(INTRO_DO_GUERREIRO)) expect(existsSync(join(__dirname, '..', '..', '..', 'public', f)), f).toBe(true);
    for (const [k, v] of Object.entries(GUERREIRO_UI)) expect(v, k).toBeTruthy();
  });

  it('há uma carta para cada dificuldade, nos três tamanhos, e o verso', () => {
    expect(CHEFES_GUERREIRO).toHaveLength(10);
    for (const t of [34, 50, 96] as const) {
      const src = new Set(CHEFES_GUERREIRO.map((c) => cartaDoGuerreiro(c.dificuldade, t)));
      expect(src.size).toBe(10);
      expect(src.has(cartaDoGuerreiro(1, t, true))).toBe(false);
    }
  });

  it('as posições das 10 cartas cabem na tela de 360 x 540 e as molduras do painel também', () => {
    for (const [p, limite] of [[POSICAO_DAS_CARTAS.aberta, 540], [POSICAO_DAS_CARTAS.compacta, 360]] as const) {
      expect(p.x).toHaveLength(10);
      expect(p.y).toHaveLength(10);
      p.x.forEach((x, i) => {
        expect(x - p.largura / 2).toBeGreaterThanOrEqual(0);
        expect(x + p.largura / 2).toBeLessThanOrEqual(360);
        expect(p.y[i] + p.altura).toBeLessThanOrEqual(limite);
      });
    }
    for (const x of MOLDURAS_DO_PAINEL.x) expect(x + MOLDURAS_DO_PAINEL.lado).toBeLessThanOrEqual(360);
    expect(MOLDURAS_DO_PAINEL.y + MOLDURAS_DO_PAINEL.lado).toBeLessThanOrEqual(540);
  });
});
