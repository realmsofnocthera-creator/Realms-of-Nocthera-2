import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifestoJson from '../batalhaChefesManifesto.json';
import { ARENAS_DA_BATALHA } from '../arenasDaBatalha';
import { ANIMACAO_DO_MONSTRO } from '@/lib/cacadaArte';
import { CHEFES_ESPECIAIS } from '@/game/batalhaSangrenta';
import { DIFICULDADES_BATALHA } from '@/game/batalhaSangrenta';

type Folha = { quadros: number; largura: number; altura: number; ms: number[] };
const manifesto = manifestoJson as unknown as Record<string, { idle: Folha; ataque: Folha & { impacto: number }; golpe: Folha }>;
const publico = join(__dirname, '..', '..', '..', 'public');

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

describe('chefes da Batalha Sangrenta animados', () => {
  const ids = Object.values(CHEFES_ESPECIAIS).flat();

  it('os 6 chefes têm idle, ataque e golpe, com o tamanho certo e até 350 KB', () => {
    expect(Object.keys(manifesto).sort()).toEqual([...new Set(ids)].sort());
    for (const [id, m] of Object.entries(manifesto)) {
      for (const nome of ['idle', 'ataque', 'golpe'] as const) {
        const f = m[nome];
        const arq = join(publico, 'images/batalha-sangrenta/chefes', `${id}-${nome}.webp`);
        expect(statSync(arq).size, `${id} ${nome}`).toBeLessThanOrEqual(350 * 1024);
        expect(f.ms.length, `${id} ${nome} ms`).toBe(f.quadros);
        const { w, h } = medirWebp(arq);
        expect(w, `${id} ${nome} largura`).toBe(f.quadros * f.largura);
        expect(h, `${id} ${nome} altura`).toBe(f.altura);
        expect(w, `${id} ${nome} cabe no WebP`).toBeLessThanOrEqual(16383);
      }
      expect(m.ataque.impacto, id).toBeGreaterThan(0);
      expect(m.ataque.impacto, id).toBeLessThan(m.ataque.ms.reduce((a, b) => a + b, 0));
      const a = ANIMACAO_DO_MONSTRO[id];
      expect(a.reacao?.src, id).toContain('-golpe.webp');
    }
  });

  it('o laço do idle dura cerca de 4 s', () => {
    for (const [id, m] of Object.entries(manifesto)) expect(m.idle.ms.reduce((a, b) => a + b, 0), id).toBeGreaterThanOrEqual(3800);
  });
});

describe('arenas da Batalha Sangrenta', () => {
  it('há uma arena para cada dificuldade, com vídeo (AV1 e H.264) e capa até 350 KB, sem arquivo sobrando', () => {
    for (const d of DIFICULDADES_BATALHA) {
      const a = ARENAS_DA_BATALHA[d.id];
      expect(a, d.id).toBeDefined();
      for (const f of [a.imagem, a.videoAv1, a.videoH264]) expect(existsSync(join(publico, f)), f).toBe(true);
      expect(statSync(join(publico, a.imagem)).size).toBeLessThanOrEqual(350 * 1024);
    }
    const usados = new Set(Object.values(ARENAS_DA_BATALHA).flatMap((a) => [a.imagem, a.videoAv1, a.videoH264].map((f) => f.split('/').pop())));
    for (const dir of ['videos/batalha-sangrenta', 'images/batalha-sangrenta/arenas']) for (const f of readdirSync(join(publico, dir))) expect(usados.has(f), f).toBe(true);
  });
});
