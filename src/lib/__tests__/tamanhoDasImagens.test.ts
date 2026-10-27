import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Trava de peso das imagens (custo de saída de dados do Cloud Run e tempo de carga no celular).
 * Imagem nova acima do teto deve ser recomprimida antes de entrar (ver scripts/otimizar-imagens.mjs;
 * para artes grandes e cheias de detalhe, AVIF costuma pesar bem menos que WebP na mesma qualidade).
 */
const RAIZ = path.resolve(__dirname, '../../..');
const PASTAS = ['public', 'src/assets/images', 'src/app'];
const TETO_BYTES = 350 * 1024;
const EXTENSOES = /\.(webp|avif|png|jpe?g|gif)$/i;

function listar(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listar(p) : [p];
  });
}

describe('peso das imagens', () => {
  it('nenhuma imagem passa de 350 KB', () => {
    const grandes = PASTAS.flatMap((pasta) => listar(path.join(RAIZ, pasta)))
      .filter((f) => EXTENSOES.test(f))
      .map((f) => ({ arquivo: path.relative(RAIZ, f), kb: Math.round(statSync(f).size / 1024) }))
      .filter((i) => i.kb * 1024 > TETO_BYTES);
    expect(grandes).toEqual([]);
  });
});
