import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MAPAS_DA_CACADA } from '../mapasDaCacada';
import { CENARIO_ESTRELA } from '@/lib/cacadaArte';
import { ESTRELAS_CACADA } from '@/rules/cacada';

const publico = (c: string) => join(process.cwd(), 'public', c);

describe('mapas da Caçada', () => {
  it('há um mapa para cada estrela, de 1★ a 9★', () => {
    expect(Object.keys(MAPAS_DA_CACADA).map(Number).sort((a, b) => a - b)).toEqual(ESTRELAS_CACADA.map((e) => e.estrela));
    for (const e of ESTRELAS_CACADA) expect(CENARIO_ESTRELA[e.estrela]).toBe(MAPAS_DA_CACADA[e.estrela].imagem);
  });
  it('os vídeos (AV1 e H.264) existem e cada capa é uma imagem de 1024 x 1536 de até 350 KB', async () => {
    for (const [estrela, m] of Object.entries(MAPAS_DA_CACADA)) {
      for (const c of [m.videoAv1, m.videoH264]) {
        expect(existsSync(publico(c)), c).toBe(true);
        expect(statSync(publico(c)).size, c).toBeLessThanOrEqual(2 * 1024 * 1024);
      }
      expect(existsSync(publico(m.imagem)), m.imagem).toBe(true);
      expect(statSync(publico(m.imagem)).size, m.imagem).toBeLessThanOrEqual(350 * 1024);
      const meta = await sharp(publico(m.imagem)).metadata();
      expect([meta.width, meta.height], `capa ${estrela}`).toEqual([LARGURA_DO_MAPA, ALTURA_DO_MAPA]);
    }
  });
  it('os nomes dos arquivos de vídeo levam versão (ficam um ano em cache)', () => {
    for (const m of Object.values(MAPAS_DA_CACADA)) {
      expect(m.videoAv1).toMatch(/-v\d+\./);
      expect(m.videoH264).toMatch(/-v\d+\./);
    }
  });
});
