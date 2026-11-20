import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifestoJson from '../guerreiroChefesManifesto.json';
import { ANIMACAO_DO_MONSTRO } from '@/lib/cacadaArte';
import { CHEFES_GUERREIRO } from '@/rules/guerreiroChefes';

type Folha = { quadros: number; largura: number; altura: number; ms: number[] };
const manifesto = manifestoJson as unknown as Record<string, { dificuldade: number; idle: Folha; ataque: Folha & { impacto: number } }>;
const raiz = join(__dirname, '..', '..', '..', 'public', 'images', 'guerreiro', 'chefes');

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

describe('chefes do Guerreiro animados', () => {
  it('os 10 chefes têm animação, na dificuldade certa', () => {
    expect(Object.keys(manifesto)).toHaveLength(10);
    for (const c of CHEFES_GUERREIRO) {
      expect(manifesto[c.id], c.id).toBeDefined();
      expect(manifesto[c.id].dificuldade, c.id).toBe(c.dificuldade);
      expect(ANIMACAO_DO_MONSTRO[c.id], c.id).toBeDefined();
    }
  });

  it('as folhas têm o tamanho certo e até 350 KB, e o impacto cai dentro do ataque', () => {
    for (const [id, m] of Object.entries(manifesto)) {
      for (const nome of ['idle', 'ataque'] as const) {
        const f = m[nome];
        const arq = join(raiz, `${id}-${nome}.webp`);
        expect(statSync(arq).size, `${id} ${nome}`).toBeLessThanOrEqual(350 * 1024);
        expect(f.ms.length, `${id} ${nome} ms`).toBe(f.quadros);
        const { w, h } = medirWebp(arq);
        expect(w, `${id} ${nome} largura`).toBe(f.quadros * f.largura);
        expect(h, `${id} ${nome} altura`).toBe(f.altura);
      }
      expect(m.ataque.impacto, id).toBeGreaterThan(0);
      expect(m.ataque.impacto, id).toBeLessThan(m.ataque.ms.reduce((a, b) => a + b, 0));
    }
  });
});
