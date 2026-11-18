import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CLASSES } from '@/rules/classes';
import { SUBCLASSES } from '@/rules/subclasses';
import { idDaUltimate, IDS_DAS_ULTIMATES, videoDaUltimate } from '../ultimates';

describe('ultimates (vídeos do Yuri)', () => {
  it('as 6 classes e as 12 subclasses têm a ultimate, sem repetir', () => {
    expect(IDS_DAS_ULTIMATES).toHaveLength(CLASSES.length + SUBCLASSES.length);
    expect(new Set(IDS_DAS_ULTIMATES).size).toBe(IDS_DAS_ULTIMATES.length);
  });
  it('cada ultimate tem os dois vídeos (cinematográfica e corte), e eles são leves', () => {
    for (const id of IDS_DAS_ULTIMATES) {
      for (const modo of ['cinematica', 'corte'] as const) {
        const arq = join(process.cwd(), 'public', videoDaUltimate(id, modo));
        expect(existsSync(arq), arq).toBe(true);
        expect(statSync(arq).size, arq).toBeLessThanOrEqual(1024 * 1024);
      }
    }
  });
  it('o nome da habilidade na luta leva ao id da ultimate', () => {
    expect(idDaUltimate('Ira do Bárbaro')).toBe('barbaro_ira_do_barbaro');
    expect(idDaUltimate('Desvario Final')).toBe('berserker_desvario_final');
    expect(idDaUltimate('Meteoro')).toBe('arquimago_meteoro');
    expect(idDaUltimate('Golpe Bárbaro')).toBeUndefined();
  });
});
