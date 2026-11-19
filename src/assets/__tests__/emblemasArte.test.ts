import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EMBLEMAS_ANIMADOS, iconeAnimadoDoEmblema, iconeDoEmblema } from '../emblemasArte';
import { IconeDoEmblema } from '@/components/ficha/IconeDoEmblema';
import { TIPOS_EMBLEMA } from '@/rules/emblemasCatalogo';

const publico = join(__dirname, '..', '..', '..', 'public');

describe('arte dos emblemas', () => {
  it('cada um dos 25 emblemas tem a arte nos dois tamanhos', () => {
    expect(TIPOS_EMBLEMA).toHaveLength(25);
    for (const t of TIPOS_EMBLEMA) {
      for (const tam of [32, 64] as const) expect(existsSync(join(publico, iconeDoEmblema(t.id, tam))), `${t.id} ${tam}`).toBe(true);
    }
  });

  it('os 5 Míticos têm uma animação por estrela e os outros não', () => {
    expect([...EMBLEMAS_ANIMADOS].sort()).toEqual(['aurelion', 'lana', 'lautrec', 'nimb', 'nymeris']);
    for (const id of EMBLEMAS_ANIMADOS) {
      for (const e of [1, 2, 3, 4]) expect(existsSync(join(publico, iconeAnimadoDoEmblema(id, e)!)), `${id} ${e}`).toBe(true);
    }
    expect(iconeAnimadoDoEmblema('dargan', 1)).toBeUndefined();
    expect(iconeAnimadoDoEmblema('lautrec', 9)).toContain('4estrela');
    expect(iconeAnimadoDoEmblema('lautrec', 0)).toContain('1estrela');
  });

  it('nenhum arquivo passa de 350 KB e não sobra arquivo sem uso', () => {
    const dirs = [join(publico, 'images', 'emblemas'), join(publico, 'images', 'emblemas', 'animados')];
    for (const d of dirs) for (const f of readdirSync(d).filter((x) => x.endsWith('.webp'))) expect(statSync(join(d, f)).size, f).toBeLessThanOrEqual(350 * 1024);
    expect(readdirSync(dirs[0]).filter((f) => f.endsWith('.webp'))).toHaveLength(50);
    expect(readdirSync(dirs[1])).toHaveLength(20);
  });

  it('o ícone dos Míticos usa a animação, com a imagem parada para quem reduz movimento', () => {
    const mitico = renderToStaticMarkup(React.createElement(IconeDoEmblema, { tipo: 'nimb', estrelas: 2 }));
    expect(mitico).toContain('/images/emblemas/animados/nimb-2estrela-64.webp');
    expect(mitico).toContain('prefers-reduced-motion');
    expect(mitico).toContain('/images/emblemas/nimb-64.webp');
    const comum = renderToStaticMarkup(React.createElement(IconeDoEmblema, { tipo: 'dargan', tamanho: 32 }));
    expect(comum).toContain('/images/emblemas/dargan-32.webp');
    expect(comum).not.toContain('<picture');
  });
});
