import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as ui from '../chefeMundialTelaUi';
import { CHEFES_MUNDIAIS } from '@/rules/chefeMundial';

const publico = join(__dirname, '..', '..', '..', 'public');

describe('arte da tela do Chefe Mundial', () => {
  it('cada chefe tem fundo e todas as peças existem, com até 350 KB', () => {
    const usados = new Set<string>([...Object.values(ui.TELA_DO_CHEFE), ...[1, 2, 3, 4].map(ui.linhaDoRanking), ...CHEFES_MUNDIAIS.map((c) => ui.fundoDoChefe(c.id))]);
    for (const f of usados) {
      expect(existsSync(join(publico, f)), f).toBe(true);
      expect(statSync(join(publico, f)).size, f).toBeLessThanOrEqual(350 * 1024);
    }
    // a peça do botão desligado/apertado também entra (o botão só usa uma por vez)
    for (const f of readdirSync(join(publico, 'images/chefe-mundial/tela'))) expect(usados.has(`/images/chefe-mundial/tela/${f}`), f).toBe(true);
  });

  it('a posição das peças cabe na grade de 360 x 540', () => {
    for (const [nome, p] of Object.entries(ui.POSICAO)) {
      expect(p.x, nome).toBeGreaterThanOrEqual(0);
      expect(p.y, nome).toBeGreaterThanOrEqual(0);
      expect(p.x + p.l, nome).toBeLessThanOrEqual(360);
      expect(p.y + p.a, nome).toBeLessThanOrEqual(540);
    }
    for (const e of [...ui.ESPACOS_DA_BANDEJA, ...ui.ESPACOS_DO_PAINEL]) {
      expect(e.x + e.l).toBeLessThanOrEqual(360);
      expect(e.y + e.a).toBeLessThanOrEqual(540);
    }
    const ultima = ui.LINHAS.primeiraY + ui.LINHAS.passo * 9 + ui.LINHAS.a;
    expect(ultima).toBeLessThanOrEqual(ui.POSICAO.painelRank.y + ui.POSICAO.painelRank.a);
  });

  it('a linha do ranking: ouro, prata, bronze e as demais', () => {
    expect(ui.linhaDoRanking(1)).toContain('linha-1');
    expect(ui.linhaDoRanking(3)).toContain('linha-3');
    expect(ui.linhaDoRanking(4)).toContain('linha-4');
    expect(ui.linhaDoRanking(10)).toContain('linha-4');
  });
});
