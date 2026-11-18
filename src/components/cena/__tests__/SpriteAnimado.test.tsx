import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { posicaoDoQuadroNaFolha, SpriteAnimado } from '../SpriteAnimado';
import { ANIMACAO_DO_HEROI, animacaoDoHeroi } from '@/lib/cacadaArte';
import { CLASSES } from '@/rules/classes';
import { SUBCLASSES } from '@/rules/subclasses';

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

describe('animações dos heróis', () => {
  it('toda classe e toda subclasse do jogo tem a animação, de frente e de costas', () => {
    const ids = [...CLASSES.map((c) => c.id), ...SUBCLASSES.map((x) => x.id)];
    expect(ids.length).toBeGreaterThanOrEqual(18);
    for (const id of ids) {
      expect(ANIMACAO_DO_HEROI[id], id).toBeDefined();
      expect(ANIMACAO_DO_HEROI[id].costas).toBeDefined();
      expect(ANIMACAO_DO_HEROI[id].frente).toBeDefined();
    }
  });
  it('cada folha existe, é leve, tem transparência, o tamanho certo e um tempo por quadro', async () => {
    for (const [id, par] of Object.entries(ANIMACAO_DO_HEROI)) {
      for (const lado of ['frente', 'costas'] as const) {
        const a = par[lado];
        expect(a.parado.ms, `${id} ${lado} idle`).toHaveLength(a.parado.quadros);
        expect(a.ataque.ms, `${id} ${lado} ataque`).toHaveLength(a.ataque.quadros);
        expect(a.impacto, `${id} ${lado} impacto`).toBeGreaterThan(0);
        expect(a.impacto, `${id} ${lado} impacto`).toBeLessThan(a.ataque.ms.reduce((x, y) => x + y, 0));
        for (const f of [a.parado, a.ataque]) {
          const arquivo = join(process.cwd(), 'public', f.src);
          expect(existsSync(arquivo), f.src).toBe(true);
          expect(statSync(arquivo).size, f.src).toBeLessThanOrEqual(350 * 1024);
          const meta = await sharp(arquivo).metadata();
          expect(meta.hasAlpha, f.src).toBe(true);
          expect([meta.width, meta.height], f.src).toEqual([a.largura * f.quadros, a.altura]);
        }
      }
    }
  });
  it('a subclasse vale mais que a classe, e sem subclasse vale a classe', () => {
    expect(animacaoDoHeroi('barbaro', 'berserker')).toBe(ANIMACAO_DO_HEROI.berserker);
    expect(animacaoDoHeroi('barbaro', null)).toBe(ANIMACAO_DO_HEROI.barbaro);
    expect(animacaoDoHeroi('barbaro', 'subclasse-que-nao-existe')).toBe(ANIMACAO_DO_HEROI.barbaro);
    expect(animacaoDoHeroi('classe-que-nao-existe')).toBeUndefined();
  });
});
