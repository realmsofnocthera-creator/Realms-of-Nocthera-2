import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PRACA_DA_GUILDA } from '@/assets/guildaUi';

const publico = (c: string) => join(process.cwd(), 'public', c);

describe('Vídeos da praça da guilda (peso e formato)', () => {
  it('os dois vídeos existem, têm o nome com versão e são leves (o AV1 abaixo de 500 KB, o H.264 abaixo de 700 KB)', () => {
    expect(PRACA_DA_GUILDA.videoAv1).toMatch(/praca-v\d+\.av1\.mp4$/);
    expect(PRACA_DA_GUILDA.videoH264).toMatch(/praca-v\d+\.h264\.mp4$/);
    const av1 = publico(PRACA_DA_GUILDA.videoAv1);
    const h264 = publico(PRACA_DA_GUILDA.videoH264);
    expect(existsSync(av1)).toBe(true);
    expect(existsSync(h264)).toBe(true);
    expect(statSync(av1).size).toBeLessThan(500 * 1024);
    expect(statSync(h264).size).toBeLessThan(700 * 1024);
  });

  it('são arquivos MP4 de verdade, e o AV1 declara o codec que o código promete ao navegador', () => {
    for (const c of [PRACA_DA_GUILDA.videoAv1, PRACA_DA_GUILDA.videoH264]) {
      const b = readFileSync(publico(c));
      expect(b.subarray(4, 8).toString()).toBe('ftyp');
    }
    const b = readFileSync(publico(PRACA_DA_GUILDA.videoAv1));
    const i = b.indexOf('av1C');
    expect(i).toBeGreaterThan(0);
    const nivel = b[i + 5] & 0x1f;
    const perfil = b[i + 5] >> 5;
    const alta = (b[i + 6] >> 7) & 1;
    const etiqueta = `av01.${perfil}.${String(nivel).padStart(2, '0')}${alta ? 'H' : 'M'}.08`;
    expect(PRACA_DA_GUILDA.tipoAv1).toContain(etiqueta);
  });
});
