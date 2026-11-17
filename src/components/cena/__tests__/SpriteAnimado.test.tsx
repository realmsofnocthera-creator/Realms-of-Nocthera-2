import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { posicaoDoQuadroNaFolha, SpriteAnimado } from '../SpriteAnimado';
import { ANIMACAO_DO_HEROI } from '@/lib/cacadaArte';

describe('SpriteAnimado', () => {
  it('a posição do quadro na folha vai de 0% a 100%', () => {
    expect(posicaoDoQuadroNaFolha(0, 4)).toBe(0);
    expect(posicaoDoQuadroNaFolha(3, 4)).toBe(100);
    expect(posicaoDoQuadroNaFolha(1, 4)).toBeCloseTo(33.333, 2);
    expect(posicaoDoQuadroNaFolha(0, 1)).toBe(0);
  });
  it('começa parado, no primeiro quadro', () => {
    const b = ANIMACAO_DO_HEROI.barbaro.costas;
    const h = renderToStaticMarkup(<SpriteAnimado parado={b.parado} ataque={b.ataque} golpe={null} rotulo="Bárbaro" />);
    expect(h).toContain('data-folha="parado"');
    expect(h).toContain('data-quadro="0"');
    expect(h).toContain('aria-label="Bárbaro"');
  });
});

describe('animação do Bárbaro', () => {
  it('cada folha existe, é leve e tem o tamanho de quadros certo (de frente e de costas)', async () => {
    for (const lado of ['frente', 'costas'] as const) {
      const a = ANIMACAO_DO_HEROI.barbaro[lado];
      expect(a.parado.ms).toHaveLength(a.parado.quadros);
      expect(a.ataque.ms).toHaveLength(a.ataque.quadros);
      for (const f of [a.parado, a.ataque]) {
        const arquivo = join(process.cwd(), 'public', f.src);
        expect(existsSync(arquivo), f.src).toBe(true);
        expect(statSync(arquivo).size, f.src).toBeLessThanOrEqual(350 * 1024);
        const meta = await sharp(arquivo).metadata();
        expect(meta.hasAlpha, f.src).toBe(true);
        expect((meta.width ?? 0) / f.quadros, f.src).toBeCloseTo(a.proporcao * (meta.height ?? 0), 5);
      }
    }
  });
});
