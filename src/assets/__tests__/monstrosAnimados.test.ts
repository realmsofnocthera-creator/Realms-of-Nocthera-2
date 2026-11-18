import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import monstrosManifesto from '../monstrosManifesto.json';
import { ANIMACAO_DO_MONSTRO } from '@/lib/cacadaArte';
import { MONSTROS_CACADA_DADOS } from '@/rules/cacada';

type Folha = { quadros: number; largura: number; altura: number; ms: number[] };
const manifesto = monstrosManifesto as unknown as Record<string, { estrela: number; idle: Folha; ataque: Folha & { impacto: number } }>;
const raiz = join(__dirname, '..', '..', '..', 'public');

/** Largura e altura de um WebP (VP8L lossless ou VP8X/VP8 lossy). */
function medirWebp(arquivo: string): { w: number; h: number } {
  const b = readFileSync(arquivo);
  const tipo = b.toString('ascii', 12, 16);
  if (tipo === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (tipo === 'VP8L') {
    const v = b.readUInt32LE(21);
    return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 };
  }
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
}

describe('monstros animados', () => {
  const ids = Object.keys(manifesto);

  it('todos os ids existem no jogo', () => {
    const todos = new Set(MONSTROS_CACADA_DADOS.map((m) => m.id));
    for (const id of ids) expect(todos.has(id), id).toBe(true);
  });

  it('cada monstro tem as duas folhas, com o tamanho certo e até 350 KB', () => {
    for (const id of ids) {
      const m = manifesto[id];
      for (const nome of ['idle', 'ataque'] as const) {
        const f = m[nome];
        const arq = join(raiz, 'images/cacada/monstros', `${id}-${nome}.webp`);
        expect(statSync(arq).size, `${id} ${nome}`).toBeLessThanOrEqual(350 * 1024);
        expect(f.ms.length, `${id} ${nome} ms`).toBe(f.quadros);
        const { w, h } = medirWebp(arq);
        expect(w, `${id} ${nome} largura`).toBe(f.quadros * f.largura);
        expect(h, `${id} ${nome} altura`).toBe(f.altura);
      }
    }
  });

  it('o impacto cai dentro do ataque', () => {
    for (const id of ids) {
      const a = manifesto[id].ataque;
      expect(a.impacto, id).toBeGreaterThan(0);
      expect(a.impacto, id).toBeLessThan(a.ms.reduce((x, y) => x + y, 0));
    }
  });

  it('a animação montada aponta para as folhas', () => {
    for (const id of ids) {
      const a = ANIMACAO_DO_MONSTRO[id];
      expect(a.parado.src).toBe(`/images/cacada/monstros/${id}-idle.webp`);
      expect(a.ataque.src).toBe(`/images/cacada/monstros/${id}-ataque.webp`);
      expect(a.proporcao).toBeCloseTo(manifesto[id].idle.largura / manifesto[id].idle.altura);
    }
  });
});
